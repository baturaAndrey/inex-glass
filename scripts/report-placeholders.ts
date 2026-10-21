/**
 * Report «where temporary (placeholder) images are used» (task 38).
 *
 *   pnpm payload run scripts/report-placeholders.ts
 *
 * Walks every collection and global of the Payload config, follows each `upload` /
 * `relationship` field pointing at `media` (inside groups, named tabs, arrays and blocks) and
 * lists the slots holding a media with `isPlaceholder: true`. Output: stdout and
 * `docs/reports/placeholder-media.md` (collection | document with its admin link | field |
 * media file), plus placeholders that nothing references. Read-only: no revalidation needed.
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

interface Usage {
  scope: "collection" | "global";
  slug: string;
  docId: string | null;
  docLabel: string;
  field: string;
  mediaId: string;
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

async function collectUsages(
  payload: Payload,
  placeholders: Map<string, PlaceholderMedia>
): Promise<Usage[]> {
  const usages: Usage[] = [];
  for (const collection of payload.config.collections) {
    if (SKIPPED_COLLECTIONS.has(collection.slug) || collection.slug.startsWith("payload-"))
      continue;
    if (!hasMediaField(payload, collection.flattenedFields)) continue;
    const result = await payload.find({
      collection: collection.slug as never,
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    });
    for (const raw of result.docs as unknown[]) {
      if (!isObject(raw)) continue;
      walk(payload, collection.flattenedFields, raw, "", (field, id) => {
        if (!placeholders.has(id)) return;
        usages.push({
          scope: "collection",
          slug: collection.slug,
          docId: String(raw.id),
          docLabel: labelOf(raw),
          field,
          mediaId: id,
        });
      });
    }
  }
  for (const global of payload.config.globals) {
    if (!hasMediaField(payload, global.flattenedFields)) continue;
    const data = (await payload.findGlobal({
      slug: global.slug as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown;
    if (!isObject(data)) continue;
    walk(payload, global.flattenedFields, data, "", (field, id) => {
      if (!placeholders.has(id)) return;
      usages.push({
        scope: "global",
        slug: global.slug,
        docId: null,
        docLabel: global.slug,
        field,
        mediaId: id,
      });
    });
  }
  return usages;
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
    `- Используются: **${used.size}** — в ${usages.length} полях ${documents.size} документов`,
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
    "| Коллекция | Документ | Поле | Файл |",
    "|---|---|---|---|",
    ...sorted.map((usage) => {
      const media = placeholders.get(usage.mediaId);
      return `| ${usage.slug} | [${cell(usage.docLabel)}](${adminUrl(usage)}) | \`${usage.field}\` | ${cell(media?.filename ?? usage.mediaId)} |`;
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
