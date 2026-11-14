import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { adminToken } from "./admin";
import { acquireFixturesLock, releaseFixturesLock } from "./objects-fixtures";
import type { APIRequestContext } from "@playwright/test";

/**
 * One published «TEST» portfolio object for the acceptance a11y / visual passes (task 42): the
 * fresh seed publishes no objects (the inex.su import lands as drafts), so `/obekty/` has no
 * cards or filters and there is no object card to look at.
 *
 * Uses the seeded taxonomies (first city / object type / product) and three generated photos.
 * The objects listing counts ALL published objects, so the fixture holds the cross-process lock
 * of `objects-fixtures.ts` while it exists (`e2e/objects.spec.ts` waits for it, and vice versa).
 * Always call `remove()` — in `finally` and again in `afterEach` (idempotent): a test that
 * times out never reaches its `finally`, and a lock left behind blocks other specs for 15 min.
 */

export interface TestObject {
  slug: string;
  name: string;
  path: string;
  remove: () => Promise<void>;
}

const LOCK_TIMEOUT_MS = 10 * 60_000;
const DELETE_ATTEMPTS = 4;
const RETRY_MS = 1_500;
const PHOTO_COLORS = [
  { r: 38, g: 125, b: 112 },
  { r: 50, g: 75, b: 100 },
  { r: 180, g: 140, b: 60 },
];

type Doc = { id: string };
const auth = (token: string) => ({ Authorization: `JWT ${token}` });

async function firstId(request: APIRequestContext, token: string, collection: string) {
  const response = await request.get(`/api/${collection}/?limit=1&depth=0&sort=order`, {
    headers: auth(token),
  });
  if (!response.ok()) throw new Error(`GET /api/${collection}/: ${response.status()}`);
  const doc = ((await response.json()) as { docs: Doc[] }).docs[0];
  if (!doc) throw new Error(`acceptance object: the seed has no ${collection}`);
  return doc.id;
}

/** Deleting an upload occasionally fails on Windows while the optimizer holds the file. */
async function deleteWithRetry(request: APIRequestContext, token: string, url: string) {
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt++) {
    const response = await request.delete(url, { headers: auth(token) }).catch(() => null);
    if (response && (response.ok() || response.status() === 404)) return;
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS * attempt));
  }
}

const LISTING_WAIT_MS = 60_000;

/**
 * `/obekty/` is ISR with stale-while-revalidate on `collection:objects`: right after a publish
 * (or delete) the first request still gets the previous listing. Polls until the listing does
 * (or no longer does) link to the object.
 */
async function waitForListing(request: APIRequestContext, slug: string, present: boolean) {
  const deadline = Date.now() + LISTING_WAIT_MS;
  while (Date.now() < deadline) {
    const response = await request.get("/obekty/").catch(() => null);
    const html = response?.ok() ? await response.text() : "";
    if (html.includes(`/obekty/${slug}/`) === present) return;
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
  if (present) throw new Error(`acceptance object: /obekty/ does not list ${slug} after publish`);
}

export async function createTestObject(request: APIRequestContext): Promise<TestObject> {
  const token = await adminToken(request);
  await acquireFixturesLock(LOCK_TIMEOUT_MS);
  const tag = randomUUID().slice(0, 8);
  const slug = `acc-test-obj-${tag}`;
  const name = `TEST Приёмка: бизнес-центр ${tag}`;
  const media: string[] = [];
  let objectId: string | null = null;

  let removed = false;
  /** Idempotent: specs call it in `finally` AND in `afterEach` (a timed-out test skips `finally`). */
  const remove = async () => {
    if (removed) return;
    removed = true;
    try {
      if (objectId) {
        await deleteWithRetry(request, token, `/api/objects/${objectId}/`);
        // Serve the stale ISR listing once more so the next visitor gets the fresh one.
        await waitForListing(request, slug, false);
      }
      for (const id of media) await deleteWithRetry(request, token, `/api/media/${id}/`);
    } finally {
      releaseFixturesLock();
    }
  };

  try {
    for (const [index, background] of PHOTO_COLORS.entries()) {
      const buffer = await sharp({ create: { width: 1200, height: 750, channels: 3, background } })
        .jpeg({ quality: 70 })
        .toBuffer();
      const response = await request.post("/api/media/", {
        headers: auth(token),
        multipart: {
          file: { name: `acc-test-object-${tag}-${index + 1}.jpg`, mimeType: "image/jpeg", buffer },
          _payload: JSON.stringify({ alt: `Тестовое фото объекта ${index + 1}` }),
        },
      });
      if (!response.ok()) {
        throw new Error(`POST /api/media/: ${response.status()} ${await response.text()}`);
      }
      media.push(((await response.json()) as { doc: Doc }).doc.id);
    }

    const [city, objectType, product] = await Promise.all([
      firstId(request, token, "cities"),
      firstId(request, token, "object-types"),
      firstId(request, token, "products"),
    ]);
    const response = await request.post("/api/objects/", {
      headers: auth(token),
      data: {
        name,
        slug,
        _status: "published",
        sortDate: new Date().toISOString(),
        city,
        objectType,
        products: [product],
        year: 2024,
        task: "Тестовая задача: стеклянные перегородки офиса (данные приёмки, удаляются тестом).",
        spec: [
          { product: "Перегородки", thickness: "10", kind: "закалённое", processing: "шлифовка" },
          { product: "Ограждения", thickness: "8+8", kind: "триплекс", triplexFormula: "8.8.2" },
        ],
        photos: media.map((image, index) => ({ image, alt: `${name}: фото ${index + 1}` })),
      },
    });
    if (!response.ok()) {
      throw new Error(`POST /api/objects/: ${response.status()} ${await response.text()}`);
    }
    objectId = ((await response.json()) as { doc: Doc }).doc.id;
    await waitForListing(request, slug, true);
  } catch (error) {
    await remove();
    throw error;
  }

  return { slug, name, path: `/obekty/${slug}/`, remove };
}
