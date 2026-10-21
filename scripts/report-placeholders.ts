/**
 * Report «where temporary (placeholder) images are used» (task 38).
 *
 *   pnpm payload run scripts/report-placeholders.ts
 *
 * Walks every collection and global of the Payload config, follows each `upload` /
 * `relationship` field pointing at `media` (inside groups, named tabs, arrays and blocks) and
 * the Lexical rich text (`upload` nodes, internal links to media, nested block nodes), and
 * lists the slots holding a media with `isPlaceholder: true`.
 *
 * Drafts count (wave-6 review): for draft-enabled collections and globals the LATEST version is
 * read (an editor's draft or the published document) and, when it is a draft, the published
 * version too — a placeholder still live on the site is listed even if a draft replaced it. The
 * «Статус» column says which version holds the image: «опубликован», «черновик» or both.
 *
 * Output: stdout and `docs/reports/placeholder-media.md` (collection | document with its admin
 * link | status | field | media file), plus placeholders that nothing references. Read-only: no
 * revalidation needed.
 *
 * Used by editors (what is left to replace) and at acceptance (how many placeholders remain).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSeedContext } from "@/seed/context";

import type { FlattenedBlock, FlattenedField, Payload } from "payload";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs", "reports", "placeholder-media.md");
const MEDIA = "media";

/** Collections that never hold site content (or are the media library itself). */
const SKIPPED_COLLECTIONS = new Set([MEDIA, "search"]);

/** Which version of a document holds the image. */
type VersionState = "published" | "draft";

interface Usage {
  scope: "collection" | "global";
  slug: string;
  docId: string | null;
  docLabel: string;
  field: string;
  mediaId: string;
  states: Set<VersionState>;
}

interface PlaceholderMedia {
  id: string;
  filename: string;
  alt: string;
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null;

const pointsAtMedia = (relationTo: string | string[]) =>
  Array.isArray(relationTo) ? relationTo.includes(MEDIA) : relationTo === MEDIA;

/** Ids of `media` in an upload/relationship value (single, hasMany, polymorphic). */
function mediaIds(value: unknown, polymorphic: boolean): string[] {
  const items = Array.isArray(value) ? value : [value];
  const ids: string[] = [];
  for (const item of items) {
    if (polymorphic) {
      if (isObject(item) && item.relationTo === MEDIA) {
        const inner = item.value;
        if (typeof inner === "string") ids.push(inner);
        else if (isObject(inner) && typeof inner.id === "string") ids.push(inner.id);
      }
    } else if (typeof item === "string") ids.push(item);
    else if (isObject(item) && typeof item.id === "string") ids.push(item.id);
  }
  return ids;
}

/** Resolves a block row's config (inline blocks or `blockReferences` slugs). */
function blockOf(
  payload: Payload,
  field: Extract<FlattenedField, { type: "blocks" }>,
  blockType: unknown
): FlattenedBlock | undefined {
  const candidates: (FlattenedBlock | string)[] = [
    ...(field.blocks as FlattenedBlock[]),
    ...(field.blockReferences ?? []),
  ];
  for (const candidate of candidates) {
    const block =
      typeof candidate === "string"
        ? (payload.config.blocks?.find((b) => b.slug === candidate) as FlattenedBlock | undefined)
        : candidate;
    if (block?.slug === blockType) return block;
  }
  return undefined;
}

/**
 * Media references inside a Lexical document: `upload` nodes (`relationTo: media`), internal
 * links whose target is a media (`fields.doc`), and the fields of block / inline-block nodes.
 * The editor has no upload feature today, but seeded or imported JSON may still carry such
 * nodes — and the feature may come back.
 */
function walkLexical(
  payload: Payload,
  node: unknown,
  fieldPath: string,
  onMedia: (fieldPath: string, id: string) => void
): void {
  if (!isObject(node)) return;
  if (node.type === "upload" && node.relationTo === MEDIA) {
    for (const id of mediaIds(node.value, false)) onMedia(`${fieldPath}(upload)`, id);
  }
  const fields = isObject(node.fields) ? node.fields : null;
  if (fields) {
    if (node.type === "link" || node.type === "autolink") {
      for (const id of mediaIds(fields.doc, true)) onMedia(`${fieldPath}(link)`, id);
    }
    const blockType = fields.blockType;
    const block =
      typeof blockType === "string"
        ? (payload.config.blocks?.find((b) => b.slug === blockType) as FlattenedBlock | undefined)
        : undefined;
    if (block) {
      walk(payload, block.flattenedFields, fields, `${fieldPath}(${block.slug})`, onMedia);
    }
  }
  const children = isObject(node.root) ? [node.root] : node.children;
  if (Array.isArray(children)) {
    for (const child of children) walkLexical(payload, child, fieldPath, onMedia);
  }
}

/** Calls `onMedia(path, id)` for every media reference under `fields` of `data`. */
function walk(
  payload: Payload,
  fields: readonly FlattenedField[],
  data: Json,
  prefix: string,
  onMedia: (fieldPath: string, id: string) => void
): void {
  for (const field of fields) {
    if (!("name" in field) || !field.name) continue;
    const value = data[field.name];
    const fieldPath = prefix ? `${prefix}.${field.name}` : field.name;
    if (value === undefined || value === null) continue;

    switch (field.type) {
      case "upload":
      case "relationship":
        if (pointsAtMedia(field.relationTo)) {
          for (const id of mediaIds(value, Array.isArray(field.relationTo))) onMedia(fieldPath, id);
        }
        break;
      case "group":
      case "tab":
        if (isObject(value)) walk(payload, field.flattenedFields, value, fieldPath, onMedia);
        break;
      case "richText":
        walkLexical(payload, value, fieldPath, onMedia);
        break;
      case "array":
        if (Array.isArray(value)) {
          value.forEach((row, index) => {
            if (isObject(row))
              walk(payload, field.flattenedFields, row, `${fieldPath}[${index}]`, onMedia);
          });
        }
        break;
      case "blocks":
        if (Array.isArray(value)) {
          value.forEach((row, index) => {
            if (!isObject(row)) return;
            const block = blockOf(payload, field, row.blockType);
            if (block) {
              walk(
                payload,
                block.flattenedFields,
                row,
                `${fieldPath}[${index}](${block.slug})`,
                onMedia
              );
            }
          });
        }
        break;
      default:
        break;
    }
  }
}

/** Whether any field (at any nesting) can reference `media`: other collections are not read. */
function hasMediaField(payload: Payload, fields: readonly FlattenedField[]): boolean {
  return fields.some((field) => {
    switch (field.type) {
      case "upload":
      case "relationship":
        return pointsAtMedia(field.relationTo);
      // Lexical JSON may hold upload nodes / media links whatever the editor features are.
      case "richText":
        return true;
      case "group":
      case "tab":
      case "array":
        return hasMediaField(payload, field.flattenedFields);
      case "blocks":
        return [...(field.blocks as FlattenedBlock[]), ...(field.blockReferences ?? [])].some(
          (candidate) => {
            const block =
              typeof candidate === "string"
                ? (payload.config.blocks?.find((b) => b.slug === candidate) as
                    FlattenedBlock | undefined)
                : candidate;
            return block ? hasMediaField(payload, block.flattenedFields) : false;
          }
        );
      default:
        return false;
    }
  });
}

function labelOf(doc: Json): string {
  for (const key of ["path", "title", "name", "slug"]) {
    const value = doc[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return String(doc.id ?? "—");
}

async function loadPlaceholders(payload: Payload): Promise<Map<string, PlaceholderMedia>> {
  const result = await payload.find({
    collection: MEDIA,
    where: { isPlaceholder: { equals: true } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    sort: "filename",
  });
  return new Map(
    result.docs.map((doc) => [
      doc.id,
      { id: doc.id, filename: doc.filename ?? doc.id, alt: doc.alt ?? "" },
    ])
  );
}

/** Usages keyed by document + field + media: a draft and its published version merge. */
class UsageSet {
  private readonly byKey = new Map<string, Usage>();

  add(usage: Omit<Usage, "states">, state: VersionState): void {
    const key = `${usage.slug}|${usage.docId ?? ""}|${usage.field}|${usage.mediaId}`;
    const existing = this.byKey.get(key);
    if (existing) existing.states.add(state);
    else this.byKey.set(key, { ...usage, states: new Set([state]) });
  }

  list(): Usage[] {
    return [...this.byKey.values()];
  }
}

const hasDrafts = (versions: unknown): boolean =>
  isObject(versions) && (versions.drafts === true || isObject(versions.drafts));

/** Version state of a document; collections without drafts are always live. */
const stateOf = (doc: Json): VersionState => (doc._status === "draft" ? "draft" : "published");

/**
 * Versions of a collection to scan: the latest version of every document (`draft: true` reads
 * the newest draft or published version) plus, for documents whose latest version is a draft,
 * their published version (what the site shows).
 */
async function collectionVersions(
  payload: Payload,
  slug: string,
  drafts: boolean
): Promise<Array<{ doc: Json; state: VersionState }>> {
  const findAll = async (draft: boolean) =>
    (
      (
        await payload.find({
          collection: slug as never,
          depth: 0,
          limit: 0,
          pagination: false,
          overrideAccess: true,
          draft,
        })
      ).docs as unknown[]
    ).filter(isObject);

  const latest = await findAll(drafts);
  const versions = latest.map((doc) => ({ doc, state: stateOf(doc) }));
  const draftIds = new Set(versions.filter((v) => v.state === "draft").map((v) => v.doc.id));
  if (drafts && draftIds.size > 0) {
    for (const doc of await findAll(false)) {
      if (draftIds.has(doc.id) && doc._status === "published") {
        versions.push({ doc, state: "published" });
      }
    }
  }
  return versions;
}

/** Same as `collectionVersions` for a global (one document). */
async function globalVersions(
  payload: Payload,
  slug: string,
  drafts: boolean
): Promise<Array<{ doc: Json; state: VersionState }>> {
  const read = async (draft: boolean) =>
    (await payload.findGlobal({
      slug: slug as never,
      depth: 0,
      overrideAccess: true,
      draft,
    })) as unknown;
  const latest = await read(drafts);
  if (!isObject(latest)) return [];
  const versions = [{ doc: latest, state: stateOf(latest) }];
  if (drafts && versions[0]?.state === "draft") {
    const published = await read(false);
    if (isObject(published) && published._status === "published") {
      versions.push({ doc: published, state: "published" });
    }
  }
  return versions;
}

async function collectUsages(
  payload: Payload,
  placeholders: Map<string, PlaceholderMedia>
): Promise<Usage[]> {
  const usages = new UsageSet();
  for (const collection of payload.config.collections) {
    if (SKIPPED_COLLECTIONS.has(collection.slug) || collection.slug.startsWith("payload-"))
      continue;
    if (!hasMediaField(payload, collection.flattenedFields)) continue;
    const versions = await collectionVersions(
      payload,
      collection.slug,
      hasDrafts(collection.versions)
    );
    for (const { doc, state } of versions) {
      walk(payload, collection.flattenedFields, doc, "", (field, id) => {
        if (!placeholders.has(id)) return;
        const usage = {
          scope: "collection" as const,
          slug: collection.slug,
          docId: String(doc.id),
          docLabel: labelOf(doc),
          field,
          mediaId: id,
        };
        usages.add(usage, state);
      });
    }
  }
  for (const global of payload.config.globals) {
    if (!hasMediaField(payload, global.flattenedFields)) continue;
    for (const { doc, state } of await globalVersions(
      payload,
      global.slug,
      hasDrafts(global.versions)
    )) {
      walk(payload, global.flattenedFields, doc, "", (field, id) => {
        if (!placeholders.has(id)) return;
        const usage = {
          scope: "global" as const,
          slug: global.slug,
          docId: null,
          docLabel: global.slug,
          field,
          mediaId: id,
        };
        usages.add(usage, state);
      });
    }
  }
  return usages.list();
}

/** Report label of the versions holding the image. */
function statusLabel(states: ReadonlySet<VersionState>): string {
  if (states.has("published") && states.has("draft")) return "опубликован + черновик";
  return states.has("draft") ? "черновик" : "опубликован";
}

const adminUrl = (usage: Usage) =>
  usage.scope === "global"
    ? `/admin/globals/${usage.slug}/`
    : `/admin/collections/${usage.slug}/${usage.docId}/`;

/** Markdown table cell: pipes and line breaks would break the row. */
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ");

function renderReport(placeholders: Map<string, PlaceholderMedia>, usages: Usage[]): string {
  const used = new Set(usages.map((u) => u.mediaId));
  const unused = [...placeholders.values()].filter((m) => !used.has(m.id));
  const documents = new Set(usages.map((u) => `${u.slug}:${u.docId ?? ""}`));
  const liveMedia = new Set(usages.filter((u) => u.states.has("published")).map((u) => u.mediaId));
  const draftOnly = usages.filter((u) => !u.states.has("published")).length;
  const sorted = [...usages].sort(
    (a, b) =>
      a.slug.localeCompare(b.slug) ||
      a.docLabel.localeCompare(b.docLabel) ||
      a.field.localeCompare(b.field)
  );

  const lines = [
    "# Временные изображения на сайте",
    "",
    `Сформировано скриптом \`scripts/report-placeholders.ts\` ${new Date().toISOString().slice(0, 10)}.`,
    "",
    `- Временных изображений в медиатеке: **${placeholders.size}**`,
    `- Используются: **${used.size}** — в ${usages.length} полях ${documents.size} документов (с учётом черновиков)`,
    `- Видны на сайте (опубликованные версии): **${liveMedia.size}**; полей только в черновиках: ${draftOnly}`,
    `- Не используются нигде: **${unused.length}**`,
    "",
    "## Как заменить",
    "",
    "1. Откройте документ по ссылке из таблицы и замените изображение в указанном поле настоящим фото (с осмысленным alt).",
    "2. Сохраните и опубликуйте документ.",
    "3. Старое временное изображение остаётся в медиатеке с меткой «Временное» (фильтр «Временные изображения» над списком медиафайлов). Когда оно больше нигде не используется — удалите его.",
    "",
    "## Где используются",
    "",
    "Статус — в какой версии документа стоит изображение: «опубликован» (видно на сайте), «черновик» (последняя неопубликованная версия) или обе.",
    "",
    "| Коллекция | Документ | Статус | Поле | Файл |",
    "|---|---|---|---|---|",
    ...sorted.map((usage) => {
      const media = placeholders.get(usage.mediaId);
      return `| ${usage.slug} | [${cell(usage.docLabel)}](${adminUrl(usage)}) | ${statusLabel(usage.states)} | \`${usage.field}\` | ${cell(media?.filename ?? usage.mediaId)} |`;
    }),
    "",
  ];
  if (unused.length > 0) {
    lines.push(
      "## Не используются",
      "",
      "| Файл | alt | Медиафайл |",
      "|---|---|---|",
      ...unused.map(
        (m) =>
          `| ${cell(m.filename)} | ${cell(m.alt)} | [открыть](/admin/collections/media/${m.id}/) |`
      ),
      ""
    );
  }
  return lines.join("\n");
}

try {
  const ctx = await getSeedContext({ log: (msg) => process.stdout.write(`[report] ${msg}\n`) });
  const placeholders = await loadPlaceholders(ctx.payload);
  const usages = await collectUsages(ctx.payload, placeholders);
  const report = renderReport(placeholders, usages);
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, report, "utf8");
  process.stdout.write(`${report}\n`);
  ctx.log(`отчёт записан: ${path.relative(ROOT, REPORT_PATH)}`);
  process.exit(0);
} catch (error) {
  console.error("report-placeholders: ошибка —", error instanceof Error ? error.message : error);
  process.exit(1);
}
