import { sql } from "@payloadcms/db-postgres";
import { customType, index } from "@payloadcms/db-postgres/drizzle/pg-core";
import { searchPlugin } from "@payloadcms/plugin-search";
import { documentToText } from "@/lib/search/lexical-to-text";
import { normalizeRu } from "@/lib/search/normalize";
import { SEARCH_COLLECTIONS, type SearchKind } from "@/lib/search/types";
import { docUrl } from "@/lib/seo/doc-url";
import { isAdmin } from "../access";
import { rel } from "../slugs";
import type { postgresAdapter } from "@payloadcms/db-postgres";
import type { DocToSync } from "@payloadcms/plugin-search/types";
import type { Payload, Plugin, PayloadRequest } from "payload";

/**
 * Site search index (task 35): `@payloadcms/plugin-search` keeps the `search` collection in sync
 * with the public collections (afterChange / beforeDelete hooks), and a generated `tsvector`
 * column with a GIN index (`searchSchemaHooks`, `afterSchemaInit`) makes it searchable with
 * Postgres FTS (`src/lib/search/query.ts`).
 *
 * Contract of the plugin registry (task 10): this file exports `searchPluginEntry: Plugin` and
 * `searchSchemaHooks`; `src/payload/plugins/index.ts` and `payload.config.ts` stay untouched.
 *
 * Indexed: published documents only (`syncDrafts: false`; un-publishing removes the entry,
 * `deleteDrafts: true`); `thicknesses` / `processing-services` have no drafts and are always
 * indexed. Service pages (legal documents, `/zakaz/…`, pages closed with `seo.noindex`) are
 * skipped and their stale entries removed (`skipSync`). The first fill / a full rebuild:
 * `pnpm payload run scripts/reindex-search.ts`.
 */

export const SEARCH_SLUG = "search";

/** Weight of each collection in the ranking (`rank * (1 + priority / 10)`). */
export const SEARCH_PRIORITIES: Readonly<Record<SearchKind, number>> = {
  "glass-types": 10,
  thicknesses: 10,
  constructions: 10,
  "processing-services": 8,
  pages: 8,
  articles: 5,
  objects: 3,
};

/** Paths of pages that never appear in the site search. */
const EXCLUDED_PAGE_PREFIXES: readonly string[] = ["/zakaz/"];

type AnyDoc = Record<string, unknown>;

const isObject = (value: unknown): value is AnyDoc => typeof value === "object" && value !== null;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * `true` for documents that must not be in the index whatever their status: legal pages
 * (privacy policy, consent), order pages and pages closed from indexing.
 */
export function isExcludedFromSearch(collection: string, doc: unknown): boolean {
  if (collection !== "pages" || !isObject(doc)) return false;
  if (doc.template === "legal") return true;
  if (isObject(doc.seo) && doc.seo.noindex === true) return true;
  const path = typeof doc.path === "string" ? doc.path : "";
  return EXCLUDED_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** `n` of a thickness (the only collection whose texts use `{N}` for the document itself). */
function thicknessN(collection: string, doc: AnyDoc): string | null {
  if (collection !== "thicknesses") return null;
  return typeof doc.n === "number" || typeof doc.n === "string" ? String(doc.n) : null;
}

/**
 * Text prepared for the index: a thickness' `{N}` gets its own `n` (a fixed fact of the
 * document, unlike prices); every other placeholder is dropped, never resolved — the index would
 * go stale when the globals change.
 */
function fillPlaceholders(value: string, n: string | null): string {
  const withN = n ? value.replace(/\{N\}/g, n) : value;
  return withN
    .replace(/\{[^{}]+\}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Displayed title of a document: the H1 (`seo.h1`), then `title` / `name`. A thickness has no
 * title of its own: «Закалённое стекло N мм» (the H1 template of the seed) is the fallback.
 */
export function searchTitle(collection: string, doc: AnyDoc, fallback?: string | null): string {
  const seo = isObject(doc.seo) ? doc.seo : {};
  const n = thicknessN(collection, doc);
  const thicknessFallback = n ? `Закалённое стекло ${n} мм` : null;
  const raw =
    text(seo.h1) ?? text(doc.title) ?? text(doc.name) ?? thicknessFallback ?? text(fallback) ?? "";
  return fillPlaceholders(raw, n);
}

/**
 * Fields written to the `search` entry of a document. `bodyText` keeps the letter case (it is
 * also the source of the result snippets) but folds «ё» into «е» like `normalizeRu`, which the
 * `russian` dictionary does not do; `titleNorm` is fully normalized. A thickness document holds
 * little copy of its own (the page is built from its group), so «Толщина N мм» is added: people
 * search «толщина 10».
 */
export function buildSearchFields(collection: string, doc: AnyDoc, fallbackTitle?: string | null) {
  const title = searchTitle(collection, doc, fallbackTitle);
  const n = thicknessN(collection, doc);
  const lead = n ? `${title}. Толщина ${n} мм.` : title;
  const body = fillPlaceholders(documentToText(doc, { lead }), n)
    .replace(/ё/g, "е")
    .replace(/Ё/g, "Е");
  return {
    title,
    url: docUrl(collection, doc),
    kind: collection,
    titleNorm: normalizeRu(title),
    bodyText: body,
  };
}

/** Removes every `search` entry of a document (used when it becomes excluded). */
export async function removeFromSearch(
  payload: Payload,
  collection: string,
  id: unknown,
  req?: PayloadRequest
): Promise<void> {
  if (typeof id !== "string" && typeof id !== "number") return;
  await payload.delete({
    collection: rel(SEARCH_SLUG),
    where: {
      and: [{ "doc.relationTo": { equals: collection } }, { "doc.value": { equals: id } }],
    },
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  });
}

export const searchPluginEntry: Plugin = searchPlugin({
  collections: [...SEARCH_COLLECTIONS],
  defaultPriorities: { ...SEARCH_PRIORITIES },
  syncDrafts: false,
  deleteDrafts: true,
  skipSync: async ({ collectionSlug, doc, req }) => {
    if (!isExcludedFromSearch(collectionSlug, doc)) return false;
    // The plugin only skips the write: drop an entry left from before the page became excluded.
    await removeFromSearch(req.payload, collectionSlug, (doc as AnyDoc | undefined)?.id, req);
    return true;
  },
  beforeSync: ({ collectionSlug, originalDoc, searchDoc }): DocToSync => ({
    ...searchDoc,
    ...buildSearchFields(collectionSlug, originalDoc, searchDoc.title),
  }),
  searchOverrides: {
    slug: SEARCH_SLUG,
    labels: { singular: "Запись поиска", plural: "Поисковый индекс" },
    // REST / GraphQL closed to visitors: the site reads the index with raw SQL
    // (`searchSite`). Admins keep read access for the list view and the «Reindex» action.
    access: { read: isAdmin, update: isAdmin, delete: isAdmin },
    admin: {
      group: "Служебное",
      defaultColumns: ["title", "kind", "url", "priority"],
      description:
        "Индекс поиска по сайту обновляется автоматически при публикации документов. Приоритет влияет на порядок выдачи.",
    },
    fields: ({ defaultFields }) => [
      ...defaultFields,
      { name: "url", type: "text", label: "Адрес", admin: { readOnly: true } },
      { name: "kind", type: "text", label: "Тип", admin: { readOnly: true } },
      { name: "titleNorm", type: "text", label: "Заголовок (норм.)", admin: { readOnly: true } },
      { name: "bodyText", type: "textarea", label: "Текст", admin: { readOnly: true } },
    ],
  },
});

/** `afterSchemaInit` hooks of the Postgres adapter (Payload 3.91). */
type PostgresSchemaHooks = NonNullable<Parameters<typeof postgresAdapter>[0]["afterSchemaInit"]>;

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/**
 * `search.tsv`: GENERATED ALWAYS … STORED from the normalized title (weight A) and body
 * (weight B), plus the GIN index `search_tsv_gin`. Both expressions are IMMUTABLE (`regconfig`
 * literal), as Postgres requires for generated columns. Drizzle never writes generated columns,
 * so Payload's inserts / updates are unaffected.
 */
export const searchSchemaHooks: PostgresSchemaHooks = [
  ({ schema, extendTable }) => {
    const table = schema.tables[SEARCH_SLUG];
    if (!table) return schema;
    extendTable({
      table,
      columns: {
        tsv: tsvector("tsv").generatedAlwaysAs(
          sql`setweight(to_tsvector('russian'::regconfig, coalesce(title_norm, '')), 'A') || setweight(to_tsvector('russian'::regconfig, coalesce(body_text, '')), 'B')`
        ),
      },
      extraConfig: (t) => ({
        search_tsv_gin: index("search_tsv_gin").using("gin", t.tsv),
      }),
    });
    return schema;
  },
];
