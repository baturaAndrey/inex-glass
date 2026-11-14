import { mkdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { adminToken } from "./admin";
import type { APIRequestContext } from "@playwright/test";

/**
 * Portfolio fixtures of `e2e/objects.spec.ts`, created through the Payload REST API as an admin:
 * 3 test photos, own taxonomies (`e2e-*` slugs), 30 PUBLISHED objects named «[e2e] Объект NN»
 * (types / cities / products spread evenly, the 3 newest with three photos and a full spec) and
 * one DRAFT object. Everything is removed by `teardownObjectsFixtures` (also leftovers of an
 * interrupted run, before creating new ones).
 *
 * Admin session: the shared e2e admin (`./admin`).
 *
 * The listing counts ALL published objects, so two viewport projects must not hold fixtures at
 * the same time: a cross-process lock (a directory in the OS temp dir) serialises them.
 */

export const E2E_OBJECT_PREFIX = "[e2e]";
export const FIXTURE_OBJECTS = 30;
export const PHOTOS_PER_DETAIL_OBJECT = 3;

const SLUG_PREFIX = "e2e-obj";
const MEDIA_PREFIX = "e2e-objects-photo";

export const FIXTURE_PRODUCTS = [
  { slug: "e2e-prod-peregorodki", name: "E2E Перегородки", quizType: "partitions" },
  { slug: "e2e-prod-ograzhdeniya", name: "E2E Ограждения", quizType: "railings" },
  { slug: "e2e-prod-fasady", name: "E2E Фасады", quizType: "facade" },
] as const;
export const FIXTURE_TYPES = [
  { slug: "e2e-type-tc", name: "E2E ТЦ" },
  { slug: "e2e-type-arena", name: "E2E Арена" },
  { slug: "e2e-type-office", name: "E2E Офис" },
] as const;
export const FIXTURE_CITIES = [
  { slug: "e2e-city-chelyabinsk", name: "E2E Челябинск" },
  { slug: "e2e-city-omsk", name: "E2E Омск" },
] as const;

export interface FixtureObject {
  id: string;
  slug: string;
  name: string;
  /** Objects with 3 photos and a full spec. */
  detailed: boolean;
}

export interface ObjectsFixtures {
  token: string;
  objects: FixtureObject[];
  draft: FixtureObject;
}

type Doc = { id: string };

/** Two-digit number so «По алфавиту» and «Сначала новые» give opposite orders. */
const pad = (n: number) => String(n).padStart(2, "0");
export const fixtureName = (n: number) => `${E2E_OBJECT_PREFIX} Объект ${pad(n)}`;

// ---------------------------------------------------------------------------------------------
// Cross-process lock
// ---------------------------------------------------------------------------------------------

const LOCK_DIR = path.join(os.tmpdir(), "inex-glass-e2e-objects.lock");
const LOCK_POLL_MS = 1_000;
const LOCK_STALE_MS = 15 * 60_000;

/** Waits until this process owns the fixtures lock (a crashed holder expires after 15 min). */
export async function acquireFixturesLock(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      return;
    } catch {
      try {
        if (Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS) {
          rmSync(LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // released meanwhile
      }
      if (Date.now() > deadline) throw new Error(`objects fixtures: lock ${LOCK_DIR} is busy`);
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    }
  }
}

export function releaseFixturesLock(): void {
  rmSync(LOCK_DIR, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------------------------

const auth = (token: string) => ({ Authorization: `JWT ${token}` });

async function createDoc(
  request: APIRequestContext,
  token: string,
  collection: string,
  data: Record<string, unknown>,
  query = ""
): Promise<Doc> {
  let last = "";
  for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
    const response = await request.post(`/api/${collection}/${query}`, {
      headers: auth(token),
      data,
    });
    if (response.ok()) return ((await response.json()) as { doc: Doc }).doc;
    last = `${response.status()} ${await response.text()}`;
    // Only server errors of the loaded dev server are retried; validation errors are bugs.
    if (response.status() < 500) break;
    // The failed request may still have written the document: reuse it by its unique slug.
    if (typeof data.slug === "string") {
      const found = await request.get(
        `/api/${collection}/?where[slug][equals]=${encodeURIComponent(data.slug)}&depth=0&limit=1`,
        { headers: auth(token) }
      );
      const existing = found.ok() ? ((await found.json()) as { docs: Doc[] }).docs[0] : undefined;
      if (existing) return existing;
    }
    await new Promise((resolve) => setTimeout(resolve, DELETE_RETRY_MS * attempt));
  }
  throw new Error(`POST /api/${collection}/: ${last}`);
}

const CREATE_ATTEMPTS = 3;

/**
 * Deletes every document matching a `like` condition, one by one: a bulk `DELETE ?where=` runs
 * the deletions concurrently and some of them fail under the dev server's load.
 */
async function deleteWhereLike(
  request: APIRequestContext,
  token: string,
  collection: string,
  field: string,
  value: string
): Promise<void> {
  const query = `where[${field}][like]=${encodeURIComponent(value)}&limit=500&depth=0`;
  const list = await request.get(`/api/${collection}/?${query}`, { headers: auth(token) });
  if (!list.ok()) {
    throw new Error(`GET /api/${collection}/: ${list.status()} ${await list.text()}`);
  }
  const { docs } = (await list.json()) as { docs: Doc[] };
  for (const doc of docs) {
    await deleteWithRetry(request, token, `/api/${collection}/${doc.id}/`);
  }
}

const DELETE_ATTEMPTS = 4;
const DELETE_RETRY_MS = 1_500;

/**
 * Deleting an upload occasionally fails on Windows while the image optimizer still holds the
 * file (HTTP 500 / 403 from Payload); a later attempt succeeds.
 */
async function deleteWithRetry(
  request: APIRequestContext,
  token: string,
  url: string
): Promise<void> {
  let last = "";
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt++) {
    const response = await request.delete(url, { headers: auth(token) });
    if (response.ok() || response.status() === 404) return;
    last = `${response.status()} ${await response.text()}`;
    await new Promise((resolve) => setTimeout(resolve, DELETE_RETRY_MS * attempt));
  }
  throw new Error(`DELETE ${url}: ${last}`);
}

async function uploadPhoto(request: APIRequestContext, token: string, index: number): Promise<Doc> {
  // Distinct colours: switching photos must change what is shown.
  const hues = [
    { r: 38, g: 125, b: 112 },
    { r: 50, g: 75, b: 100 },
    { r: 180, g: 140, b: 60 },
  ];
  const buffer = await sharp({
    create: { width: 1200, height: 750, channels: 3, background: hues[index % hues.length]! },
  })
    .jpeg({ quality: 70 })
    .toBuffer();
  const response = await request.post("/api/media/", {
    headers: auth(token),
    multipart: {
      file: { name: `${MEDIA_PREFIX}-${index + 1}.jpg`, mimeType: "image/jpeg", buffer },
      _payload: JSON.stringify({ alt: `Тестовое фото объекта ${index + 1}` }),
    },
  });
  if (!response.ok()) {
    throw new Error(`POST /api/media/: ${response.status()} ${await response.text()}`);
  }
  return ((await response.json()) as { doc: Doc }).doc;
}

/** Removes every fixture document (current or left over by an interrupted run). */
export async function teardownObjectsFixtures(
  request: APIRequestContext,
  token: string
): Promise<void> {
  await deleteWhereLike(request, token, "objects", "slug", SLUG_PREFIX);
  await deleteWhereLike(request, token, "products", "slug", "e2e-prod-");
  await deleteWhereLike(request, token, "object-types", "slug", "e2e-type-");
  await deleteWhereLike(request, token, "cities", "slug", "e2e-city-");
  await deleteWhereLike(request, token, "media", "filename", MEDIA_PREFIX);
}

/** Runs `tasks` with at most `limit` in flight (keeps the dev server responsive). */
async function inBatches<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  for (let start = 0; start < tasks.length; start += limit) {
    results.push(...(await Promise.all(tasks.slice(start, start + limit).map((task) => task()))));
  }
  return results;
}

export async function setupObjectsFixtures(request: APIRequestContext): Promise<ObjectsFixtures> {
  const token = await adminToken(request);
  await teardownObjectsFixtures(request, token);

  const photos: Doc[] = [];
  for (let index = 0; index < PHOTOS_PER_DETAIL_OBJECT; index++) {
    photos.push(await uploadPhoto(request, token, index));
  }
  const create = (collection: string, items: ReadonlyArray<Record<string, unknown>>) =>
    Promise.all(
      items.map((item, index) =>
        createDoc(request, token, collection, { ...item, order: (index + 1) * 10 })
      )
    );
  const products = await create("products", FIXTURE_PRODUCTS);
  const types = await create("object-types", FIXTURE_TYPES);
  const cities = await create("cities", FIXTURE_CITIES);

  const base = Date.UTC(2020, 0, 1, 12);
  const objectData = (n: number) => {
    const detailed = n > FIXTURE_OBJECTS - 3;
    const slug = `${SLUG_PREFIX}-${pad(n)}`;
    const photoRows = (detailed ? photos : photos.slice(0, 1)).map((photo, index) => ({
      image: photo.id,
      alt: `${fixtureName(n)}: фото ${index + 1}`,
    }));
    const spec = detailed
      ? [
          {
            product: "Перегородки",
            thickness: "10",
            kind: "закалённое",
            triplexFormula: "",
            processing: "шлифовка кромки",
          },
          {
            product: "Ограждения",
            thickness: "8+8",
            kind: "триплекс",
            triplexFormula: "8.8.2",
            processing: "полировка",
          },
          {
            product: "Козырёк",
            thickness: "6+6",
            kind: "триплекс",
            triplexFormula: "6.6.4",
            processing: "отверстия",
          },
        ]
      : [{ product: "Перегородки", thickness: "10", kind: "закалённое" }];
    return {
      slug,
      detailed,
      data: {
        name: fixtureName(n),
        slug,
        _status: "published",
        sortDate: new Date(base + n * 86_400_000).toISOString(),
        city: cities[n % cities.length]!.id,
        objectType: types[n % types.length]!.id,
        products: [products[n % products.length]!.id],
        year: 2010 + (n % 14),
        task: `Тестовая задача объекта ${pad(n)}.`,
        spec,
        photos: photoRows,
      },
    };
  };

  const objects = await inBatches(
    Array.from({ length: FIXTURE_OBJECTS }, (_, index) => async () => {
      const { slug, detailed, data } = objectData(index + 1);
      const doc = await createDoc(request, token, "objects", data);
      return { id: doc.id, slug, name: data.name, detailed };
    }),
    3
  );

  const draftSlug = `${SLUG_PREFIX}-draft`;
  const draftDoc = await createDoc(
    request,
    token,
    "objects",
    { name: `${E2E_OBJECT_PREFIX} Черновик`, slug: draftSlug, _status: "draft" },
    "?draft=true"
  );

  return {
    token,
    objects,
    draft: {
      id: draftDoc.id,
      slug: draftSlug,
      name: `${E2E_OBJECT_PREFIX} Черновик`,
      detailed: false,
    },
  };
}
