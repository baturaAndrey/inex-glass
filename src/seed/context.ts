import { getPayload } from "payload";
import { requestSiteRevalidation } from "@/lib/cms/revalidate-token";
import { getEnv } from "@/lib/env";
import config from "@payload-config";
import { rememberSeedWrite } from "./marker";
import type {
  CollectionSlug,
  DataFromCollectionSlug,
  DataFromGlobalSlug,
  GlobalSlug,
  Payload,
  RequiredDataFromCollectionSlug,
  Where,
} from "payload";

/**
 * Seed runtime shared by `src/seed/index.ts`, `globals.ts`, `minimal.ts` and the Wave-5 slices.
 *
 * Every write goes through the Local API with `overrideAccess: true` and
 * `context: { disableRevalidate: true }`: the revalidation hooks (task 06/07) skip
 * `revalidateTag`, which only works inside a Next.js request.
 */
export interface SeedContext {
  payload: Payload;
  log: (msg: string) => void;
  /** Overwrite documents and globals that already exist (CLI `--force`). */
  force: boolean;
  options: { minimal: boolean };
}

/** «Edited in the admin?» — seed write markers live in `./marker.ts`. */
export { mayOverwrite, rememberSeedWrite } from "./marker";

/** `req.context` of every seed write (honoured by `src/payload/hooks/revalidate.ts`). */
export const SEED_REQUEST_CONTEXT = { disableRevalidate: true } as const;

type SeedContextOptions = {
  force?: boolean;
  minimal?: boolean;
  log?: (msg: string) => void;
};

const defaultLog = (msg: string): void => {
  process.stdout.write(`[seed] ${msg}\n`);
};

/**
 * Boots Payload for the seed. Outside production Payload regenerates `src/payload-types.ts` on
 * init; that file belongs to the wave owner, so type generation is switched off here.
 */
export async function getSeedContext(opts: SeedContextOptions = {}): Promise<SeedContext> {
  const sanitized = await config;
  sanitized.typescript = { ...sanitized.typescript, autoGenerate: false };
  const payload = await getPayload({ config: sanitized });
  return {
    payload,
    log: opts.log ?? defaultLog,
    force: opts.force ?? false,
    options: { minimal: opts.minimal ?? true },
  };
}

/**
 * Expires the CMS cache of the running site after the seed (its writes skip the revalidation
 * hooks, and `revalidateTag` does not exist outside Next). Calls the signed
 * `POST <SITE_URL>/api/revalidate/` (see `src/lib/cms/cache.ts`); when the site is unreachable
 * the seed still succeeds and prints what to do instead.
 */
export async function revalidateSite(ctx: SeedContext): Promise<void> {
  const env = getEnv();
  // The purge hits whatever site SITE_URL points at — seeding a test/staging DB with the dev
  // `.env` would purge the dev server instead of the target. Say which site is purged.
  ctx.log(
    `сброс кэша сайта по SITE_URL=${env.SITE_URL} — при сиде не-dev БД задайте SITE_URL целевого сервера`
  );
  const result = await requestSiteRevalidation({
    siteUrl: env.SITE_URL,
    secret: env.PAYLOAD_SECRET,
  });
  if (result.ok) {
    ctx.log(`кэш сайта сброшен: ${result.url}`);
    return;
  }
  ctx.log(
    [
      `кэш сайта НЕ сброшен (${result.url}: ${result.reason}).`,
      "  Если сайт запущен с другим SITE_URL/PAYLOAD_SECRET — новые страницы могут отдавать 404",
      "  из кэша. Сбросьте кэш: перезапустите сайт (dev: перезапуск `pnpm dev`; Docker: redeploy",
      "  контейнера). См. docs/deploy.md, «Кэш Next».",
    ].join("\n")
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Upserts                                                                                    */
/* ------------------------------------------------------------------------------------------ */

export type UpsertAction = "created" | "updated" | "skipped";

export interface UpsertResult<TSlug extends CollectionSlug> {
  doc: DataFromCollectionSlug<TSlug>;
  action: UpsertAction;
}

export interface UpsertOptions {
  /**
   * Update an existing document instead of skipping it. Defaults to `ctx.force`. A slice that
   * owns the full content of a document created earlier as a placeholder may pass `true`.
   */
  overwrite?: boolean;
  /**
   * Save as a draft (drafts-enabled collections only; also skips required-field validation).
   * Published documents are created by passing `_status: "published"` in `data` instead.
   */
  draft?: boolean;
  /** Label used in the log line; defaults to the JSON of `where`. */
  label?: string;
}

/**
 * Creates the document matching `where`, or — when it exists — skips it (default) or updates it
 * (`overwrite` / `--force`). `where` must identify at most one document (a unique key such as
 * `slug`, `path`, `n`, `key`); more matches are a seed bug and throw.
 *
 * Fields the seed does not pass are never touched on update, so editor changes to other fields
 * survive a forced re-run.
 */
export async function upsertByField<TSlug extends CollectionSlug>(
  ctx: SeedContext,
  collection: TSlug,
  where: Where,
  data: RequiredDataFromCollectionSlug<TSlug>,
  opts: UpsertOptions = {}
): Promise<UpsertResult<TSlug>> {
  const { payload } = ctx;
  const label = `${collection} ${opts.label ?? JSON.stringify(where)}`;
  const existing = await payload.find({
    collection,
    where,
    limit: 2,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  if (existing.docs.length > 1) {
    throw new Error(`${label}: ключ upsert не уникален (${existing.docs.length} документа)`);
  }

  /*
   * The Local API option types are conditional on the concrete collection slug; with a generic
   * `TSlug` TypeScript cannot resolve them, so `data` is passed through `never` and the result is
   * narrowed back. Callers are still type-checked against `RequiredDataFromCollectionSlug`.
   */
  const draftArg = opts.draft ? { draft: true as const } : {};
  const current = existing.docs[0];
  if (current) {
    if (!(opts.overwrite ?? ctx.force)) {
      ctx.log(`${label}: есть, пропуск`);
      return { doc: current, action: "skipped" };
    }
    const doc = (await payload.update({
      collection,
      id: current.id,
      data: data as never,
      depth: 0,
      ...draftArg,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    })) as DataFromCollectionSlug<TSlug>;
    ctx.log(`${label}: обновлён`);
    await rememberSeedWrite(ctx, collection, doc.id);
    return { doc, action: "updated" };
  }

  const doc = (await payload.create({
    collection,
    data: data as never,
    depth: 0,
    ...draftArg,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  })) as DataFromCollectionSlug<TSlug>;
  ctx.log(`${label}: создан`);
  await rememberSeedWrite(ctx, collection, doc.id);
  return { doc, action: "created" };
}

/** Upsert by the unique `slug` field taken from `data.slug`. */
export function upsertBySlug<TSlug extends CollectionSlug>(
  ctx: SeedContext,
  collection: TSlug,
  data: RequiredDataFromCollectionSlug<TSlug> & { slug: string },
  opts: UpsertOptions = {}
): Promise<UpsertResult<TSlug>> {
  return upsertByField(ctx, collection, { slug: { equals: data.slug } }, data, {
    label: data.slug,
    ...opts,
  });
}

/**
 * Upsert by the public `path`. The path is computed by the collection hooks from `slug`
 * (and `parent` / `pathPrefix` / `isHome`), so the expected value is passed explicitly.
 */
export function upsertByPath<TSlug extends CollectionSlug>(
  ctx: SeedContext,
  collection: TSlug,
  path: string,
  data: RequiredDataFromCollectionSlug<TSlug>,
  opts: UpsertOptions = {}
): Promise<UpsertResult<TSlug>> {
  return upsertByField(ctx, collection, { path: { equals: path } }, data, {
    label: path,
    ...opts,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Globals                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Seedable fields of a global (system fields are maintained by Payload). */
export type GlobalSeedData<TSlug extends GlobalSlug> = Omit<
  DataFromGlobalSlug<TSlug>,
  "id" | "globalType" | "createdAt" | "updatedAt"
>;

/**
 * Writes a global unless it has already been saved (an editor may have changed it) — then it is
 * skipped unless `overwrite` / `--force`. Fields absent from `data` keep their stored value or
 * get the schema `defaultValue` on the first write.
 */
export async function upsertGlobal<TSlug extends GlobalSlug>(
  ctx: SeedContext,
  slug: TSlug,
  data: Partial<GlobalSeedData<TSlug>>,
  opts: Pick<UpsertOptions, "overwrite"> = {}
): Promise<UpsertAction> {
  const { payload } = ctx;
  // Postgres returns `{}` (not null) when the global row does not exist yet.
  const stored = (await payload.db.findGlobal({ slug })) as Record<string, unknown> | null;
  const exists = stored !== null && Object.keys(stored).length > 0;
  if (exists && !(opts.overwrite ?? ctx.force)) {
    ctx.log(`global ${slug}: есть, пропуск`);
    return "skipped";
  }
  await payload.updateGlobal({
    slug,
    // `updateGlobal` expects payload's internal `DeepPartial` of the same generated type; a
    // top-level `Partial` of it is structurally narrower, but TS cannot prove that generically.
    data: data as never,
    depth: 0,
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  ctx.log(`global ${slug}: ${exists ? "обновлён" : "создан"}`);
  return exists ? "updated" : "created";
}

/* ------------------------------------------------------------------------------------------ */
/* Dates                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * Calendar date (`YYYY-MM-DD`) as stored by day-only date fields: noon UTC, so the date part
 * stays the same in every Russian time zone and `iso.slice(0, 10)` returns the original date.
 */
export function seedDate(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new Error(`seedDate: ожидается YYYY-MM-DD, получено ${day}`);
  return `${day}T12:00:00.000Z`;
}
