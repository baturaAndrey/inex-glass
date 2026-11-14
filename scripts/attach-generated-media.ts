/**
 * Uploads the generated placeholder images (`public/generated/manifest.json`, task 09) into the
 * `media` collection (`isPlaceholder: true`) and attaches them to empty image fields of the
 * seeded documents (task 38).
 *
 *   pnpm payload run scripts/attach-generated-media.ts -- [options]
 *
 * Options (`payload run` forwards only positionals, hence the `--`; dashes are optional):
 *   --dry-run                     plan only: no upload, no document writes, no revalidation
 *   --only=<collection>           limit the bindings to one collection (pages, glass-types,
 *                                 processing-services, constructions, articles)
 *   --force-replace-placeholders  replace slots holding ANOTHER placeholder (real images are
 *                                 never replaced, with or without the flag)
 *   --no-revalidate               skip `POST /api/revalidate/` at the end
 *
 * Idempotent: media are found by `generatedId` (= manifest id; not by filename — Payload renames
 * an upload whose file already exists in MEDIA_DIR), uploaded as `gen-<id>.webp`. A re-run
 * uploads nothing new. Payload re-encodes the original on upload, so the stored file cannot be
 * compared with the source; the source fingerprint is kept in `sourceUrl`
 * (`/generated/<id>.webp?sha256=<16 hex>`). When a regenerated file differs (needsRedo entries
 * after `gen-images.ts --only-redo`), the SAME media document gets the new file, so every
 * reference keeps pointing at it.
 * Slots are filled only when empty (`canAttach` in `./attach-map.ts`); each changed document is
 * written once, as the published version (`draft: false`), with revalidation hooks off.
 *
 * Editor drafts are never clobbered (checked in --dry-run too): a `draft: false` write is based on
 * the PUBLISHED version and becomes the newest version, so a newer unpublished editor draft would
 * drop out of the admin, and a never-published document would get published. Such documents of
 * draft-enabled collections are skipped (`skipped: newer draft`) without failing the run; re-run
 * after the editor publishes, or attach the image by hand.
 *
 * Exit code 1 when an entry fails (unreadable file, invalid alt, write error), its target is
 * missing from `ATTACH_MAP`, or a mapped target is not found: a document / hero binding finds
 * nothing, or a card-only target matches no card (listed in the closing summary; `cardLinks`
 * beside a document binding are optional extras). Documented schema gaps (`noTarget` in the map) are listed but do not
 * fail the run.
 *
 * Production: run in the `tools` container with the media volume (`/data/media` = MEDIA_DIR)
 * mounted, otherwise the files land where the app does not serve them.
 */
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getEnv } from "@/lib/env";
import { getSeedContext, revalidateSite, SEED_REQUEST_CONTEXT } from "@/seed/context";
import type { SeedContext } from "@/seed/context";

import {
  ATTACH_COLLECTIONS,
  LAYOUT_COLLECTIONS,
  bindingTouches,
  canAttach,
  isWrite,
  resolveTarget,
} from "./attach-map";
import type { AttachCollection, AttachDecision, Binding, DocImageField } from "./attach-map";
import { ManifestEntrySchema } from "./image-prompts/schema";
import type { ManifestEntry } from "./image-prompts/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "generated", "manifest.json");

/** Upload ceiling (task 38): larger sources are re-encoded to WebP q80. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const REENCODE_QUALITY = 80;

const MEDIA_KIND: Record<ManifestEntry["kind"], "background" | "illustration"> = {
  background: "background",
  "card-illustration": "illustration",
};

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

interface Args {
  dryRun: boolean;
  only: AttachCollection | null;
  forceReplace: boolean;
  revalidate: boolean;
  unknown: string[];
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    dryRun: false,
    only: null,
    forceReplace: false,
    revalidate: true,
    unknown: [],
  };
  for (const arg of argv) {
    if (arg === "--") continue;
    const token = arg.replace(/^-+/, "");
    if (token === "dry-run") args.dryRun = true;
    else if (token === "force-replace-placeholders") args.forceReplace = true;
    else if (token === "no-revalidate") args.revalidate = false;
    // Kept for the CLI described in the task; revalidation is on by default.
    else if (token === "revalidate") args.revalidate = true;
    else if (token.startsWith("only=")) {
      const value = token.slice("only=".length).trim();
      if (!(ATTACH_COLLECTIONS as readonly string[]).includes(value)) {
        throw new Error(
          `--only: неизвестная коллекция «${value}» (${ATTACH_COLLECTIONS.join(", ")})`
        );
      }
      args.only = value as AttachCollection;
    } else args.unknown.push(arg);
  }
  return args;
}

/* ------------------------------------------------------------------------------------------ */
/* Result rows                                                                                */
/* ------------------------------------------------------------------------------------------ */

type RowResult =
  | "attached"
  | "replaced placeholder"
  | "unchanged"
  | "skipped: already has real image"
  | "skipped: has placeholder"
  | "skipped: no document"
  | "skipped: no hero block"
  | "skipped: no matching card"
  | "skipped: newer draft"
  | "no target"
  | "error";

interface Row {
  entryId: string;
  mediaId: string;
  target: string;
  result: RowResult;
  note?: string;
}

const DECISION_RESULT: Record<AttachDecision, RowResult> = {
  attach: "attached",
  replace: "replaced placeholder",
  unchanged: "unchanged",
  "skip-real": "skipped: already has real image",
  "skip-placeholder": "skipped: has placeholder",
};

/* ------------------------------------------------------------------------------------------ */
/* Manifest                                                                                   */
/* ------------------------------------------------------------------------------------------ */

type ParsedEntry = { ok: true; entry: ManifestEntry } | { ok: false; id: string; error: string };

/** Entry-by-entry validation: one bad entry (e.g. an empty alt) is reported, not fatal. */
async function readManifest(): Promise<ParsedEntry[]> {
  const raw: unknown = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${MANIFEST_PATH}: ожидается массив записей`);
  return raw.map((item: unknown, index): ParsedEntry => {
    const parsed = ManifestEntrySchema.safeParse(item);
    if (parsed.success) return { ok: true, entry: parsed.data };
    const id =
      typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : `#${index}`;
    const error = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, id, error };
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Media upload                                                                               */
/* ------------------------------------------------------------------------------------------ */

interface UploadSource {
  data: Buffer;
  mimetype: string;
  name: string;
  hash: string;
}

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

/** WebP source (AVIF if the manifest has only AVIF), re-encoded when above 2 MB. */
async function loadSource(entry: ManifestEntry): Promise<UploadSource> {
  const candidates: Array<[string, string]> = [
    [entry.files.webp, "image/webp"],
    [entry.files.avif, "image/avif"],
  ];
  for (const [publicPath, sourceType] of candidates) {
    const absolute = path.join(PUBLIC_DIR, publicPath.replace(/^\/+/, ""));
    let data: Buffer;
    try {
      data = await readFile(absolute);
    } catch {
      continue;
    }
    let mimetype = sourceType;
    if (data.length > MAX_UPLOAD_BYTES) {
      data = await sharp(data).webp({ quality: REENCODE_QUALITY }).toBuffer();
      mimetype = "image/webp";
    }
    const ext = mimetype === "image/avif" ? "avif" : "webp";
    return { data, mimetype, name: `gen-${entry.id}.${ext}`, hash: sha256(data) };
  }
  throw new Error(`нет файла ${entry.files.webp} / ${entry.files.avif}`);
}

interface MediaDocLite {
  id: string;
  alt?: string | null;
  sourceUrl?: string | null;
}

type MediaOutcome = { id: string; action: "created" | "reused" | "file replaced" | "alt updated" };

/** Hex digits of the source hash kept in `sourceUrl` (enough to detect a regenerated file). */
const FINGERPRINT_LENGTH = 16;

/** `sourceUrl` of a generated media: the public source path plus its content fingerprint. */
const sourceUrlOf = (publicPath: string, hash: string) =>
  `${publicPath}?sha256=${hash.slice(0, FINGERPRINT_LENGTH)}`;

/**
 * Finds the media of the entry (`generatedId`) or uploads it. A changed source replaces the file
 * of the SAME document (references stay valid); a changed alt is updated in place.
 */
async function ensureMedia(
  ctx: SeedContext,
  entry: ManifestEntry,
  dryRun: boolean
): Promise<MediaOutcome> {
  const { payload } = ctx;
  const source = await loadSource(entry);
  const found = await payload.find({
    collection: "media",
    where: { generatedId: { equals: entry.id } },
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
  });
  if (found.docs.length > 1) {
    throw new Error(`в media несколько документов с generatedId=${entry.id}`);
  }
  const existing = found.docs[0] as MediaDocLite | undefined;
  const data = {
    alt: entry.alt,
    isPlaceholder: true,
    kind: MEDIA_KIND[entry.kind],
    generatedId: entry.id,
    sourceUrl: sourceUrlOf(entry.files.webp, source.hash),
  };
  const file = {
    data: source.data,
    mimetype: source.mimetype,
    name: source.name,
    size: source.data.length,
  };

  if (!existing) {
    if (dryRun) return { id: `(новый) ${source.name}`, action: "created" };
    const created = await payload.create({
      collection: "media",
      data,
      file,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    return { id: created.id, action: "created" };
  }

  const fileChanged = existing.sourceUrl !== data.sourceUrl;
  const altChanged = existing.alt !== entry.alt;
  if (!fileChanged && !altChanged) return { id: existing.id, action: "reused" };
  if (!dryRun) {
    await payload.update({
      collection: "media",
      id: existing.id,
      data: fileChanged ? data : { alt: entry.alt },
      ...(fileChanged ? { file } : {}),
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
  }
  return { id: existing.id, action: fileChanged ? "file replaced" : "alt updated" };
}

/* ------------------------------------------------------------------------------------------ */
/* Documents and slots                                                                        */
/* ------------------------------------------------------------------------------------------ */

type Json = Record<string, unknown>;

interface DocState {
  collection: AttachCollection;
  doc: Json;
  /** Top-level keys changed in memory; written in one update per document. */
  dirty: Set<string>;
  rows: Row[];
}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null;

/** An image slot of a loaded document: read/write the media id in memory. */
interface Slot {
  state: DocState;
  label: string;
  topKey: string;
  get: () => unknown;
  set: (id: string) => void;
}

const docLabel = (state: DocState) =>
  `${state.collection} ${String(state.doc.path ?? state.doc.slug ?? state.doc.id)}`;

function relationId(value: unknown): string | null {
  if (typeof value === "string" && value !== "") return value;
  if (isObject(value) && typeof value.id === "string") return value.id;
  return null;
}

function fieldSlot(state: DocState, field: DocImageField): Slot {
  if (field === "heroImage") {
    return {
      state,
      label: `${docLabel(state)} · heroImage`,
      topKey: "heroImage",
      get: () => state.doc.heroImage,
      set: (id) => {
        state.doc.heroImage = id;
      },
    };
  }
  return {
    state,
    label: `${docLabel(state)} · card.image`,
    topKey: "card",
    get: () => (isObject(state.doc.card) ? state.doc.card.image : null),
    set: (id) => {
      state.doc.card = { ...(isObject(state.doc.card) ? state.doc.card : {}), image: id };
    },
  };
}

function layoutOf(state: DocState): Json[] {
  return Array.isArray(state.doc.layout) ? state.doc.layout.filter(isObject) : [];
}

function heroBlockSlot(state: DocState): Slot | null {
  const layout = layoutOf(state);
  const index = layout.findIndex((block) => block.blockType === "hero");
  const block = layout[index];
  if (!block) return null;
  return {
    state,
    label: `${docLabel(state)} · layout[${index}] hero.image`,
    topKey: "layout",
    get: () => block.image,
    set: (id) => {
      block.image = id;
    },
  };
}

function cardLinkSlots(state: DocState, hrefs: readonly string[]): Slot[] {
  const slots: Slot[] = [];
  layoutOf(state).forEach((block, blockIndex) => {
    if (block.blockType !== "cards" || !Array.isArray(block.items)) return;
    block.items.filter(isObject).forEach((item, itemIndex) => {
      const link = isObject(item.link) ? item.link : null;
      const url =
        link && link.type === "custom" && typeof link.url === "string" ? link.url.trim() : "";
      if (!url || !hrefs.includes(url)) return;
      slots.push({
        state,
        label: `${docLabel(state)} · layout[${blockIndex}] cards.items[${itemIndex}] «${String(item.title ?? "")}»`,
        topKey: "layout",
        get: () => item.image,
        set: (id) => {
          item.image = id;
        },
      });
    });
  });
  return slots;
}

/** All documents of the touched collections, loaded once (published versions, depth 0). */
class DocStore {
  private readonly byCollection = new Map<AttachCollection, DocState[]>();

  constructor(private readonly ctx: SeedContext) {}

  async all(collection: AttachCollection): Promise<DocState[]> {
    const cached = this.byCollection.get(collection);
    if (cached) return cached;
    const result = await this.ctx.payload.find({
      collection,
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    });
    const states = result.docs.map((doc) => ({
      collection,
      doc: structuredClone(doc) as unknown as Json,
      dirty: new Set<string>(),
      rows: [],
    }));
    this.byCollection.set(collection, states);
    return states;
  }

  dirtyStates(): DocState[] {
    return [...this.byCollection.values()].flat().filter((state) => state.dirty.size > 0);
  }
}

/** Media id → isPlaceholder (`null` for ids of deleted media: the slot counts as empty). */
async function loadMediaFlags(ctx: SeedContext): Promise<Map<string, boolean>> {
  const result = await ctx.payload.find({
    collection: "media",
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: { isPlaceholder: true },
  });
  return new Map(result.docs.map((doc) => [doc.id, doc.isPlaceholder === true]));
}

/** Resolves a binding into slots; an empty result carries the reason. */
async function slotsOf(
  store: DocStore,
  binding: Binding,
  only: AttachCollection | null
): Promise<{ slots: Slot[]; empty: RowResult; where: string }> {
  switch (binding.kind) {
    case "docField": {
      const states = await store.all(binding.collection);
      const state = states.find((s) => s.doc.slug === binding.slug);
      return {
        slots: state ? [fieldSlot(state, binding.field)] : [],
        empty: "skipped: no document",
        where: `${binding.collection}/${binding.slug} · ${binding.field}`,
      };
    }
    case "eachDoc": {
      const states = await store.all(binding.collection);
      return {
        slots: states.map((state) => fieldSlot(state, binding.field)),
        empty: "skipped: no document",
        where: `${binding.collection}/* · ${binding.field}`,
      };
    }
    case "heroBlock": {
      const select = binding.select;
      const pages = (await store.all("pages")).filter((state) =>
        "home" in select
          ? state.doc.isHome === true
          : "path" in select
            ? state.doc.path === select.path
            : state.doc.template === select.template
      );
      const where = `pages ${JSON.stringify(select)} · hero.image`;
      if (pages.length === 0) return { slots: [], empty: "skipped: no document", where };
      const slots = pages.map(heroBlockSlot).filter((slot): slot is Slot => slot !== null);
      return { slots, empty: "skipped: no hero block", where };
    }
    case "cardLinks": {
      const collections = LAYOUT_COLLECTIONS.filter((c) => !only || c === only);
      const slots: Slot[] = [];
      for (const collection of collections) {
        for (const state of await store.all(collection)) {
          slots.push(...cardLinkSlots(state, binding.hrefs));
        }
      }
      return {
        slots,
        empty: "skipped: no matching card",
        where: `cards → ${binding.hrefs.join(", ")}`,
      };
    }
  }
}

/**
 * Why writing this document would clobber editor work, or `null` when the write is safe. Only
 * draft-enabled collections are affected: there a `draft: false` update is applied on top of the
 * PUBLISHED version and becomes the newest version, hiding (not merging) a newer draft.
 */
async function draftConflict(ctx: SeedContext, state: DocState): Promise<string | null> {
  const versions = ctx.payload.collections[state.collection]?.config.versions;
  if (!versions || !versions.drafts) return null;
  if (state.doc._status !== "published") {
    return "документ не опубликован — запись опубликовала бы черновик";
  }
  const latest = (await ctx.payload.findByID({
    collection: state.collection,
    id: String(state.doc.id),
    draft: true,
    depth: 0,
    overrideAccess: true,
  })) as unknown as Json;
  return latest._status === "draft"
    ? "есть черновик новее опубликованной версии — опубликуйте его и повторите запуск"
    : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Main                                                                                       */
/* ------------------------------------------------------------------------------------------ */

async function ensureMediaDir(dryRun: boolean): Promise<string> {
  const dir = path.resolve(getEnv().MEDIA_DIR);
  if (!dryRun) await mkdir(dir, { recursive: true });
  try {
    await access(dir, fsConstants.W_OK);
  } catch {
    if (!dryRun) throw new Error(`MEDIA_DIR ${dir} недоступен на запись (смонтирован ли том?)`);
  }
  return dir;
}

function printRows(rows: readonly Row[]): void {
  const width = (pick: (row: Row) => string) =>
    Math.min(60, Math.max(...rows.map((r) => pick(r).length), 4));
  const w1 = width((r) => r.entryId);
  const w2 = width((r) => r.mediaId);
  for (const row of rows) {
    const note = row.note ? ` — ${row.note}` : "";
    console.log(
      `${row.entryId.padEnd(w1)}  ${row.mediaId.padEnd(w2)}  ${row.target}  →  ${row.result}${note}`
    );
  }
}

async function main(args: Args): Promise<number> {
  const log = (msg: string) => process.stdout.write(`[attach] ${msg}\n`);
  const ctx = await getSeedContext({ log });
  const mediaDir = await ensureMediaDir(args.dryRun);
  log(
    `старт${args.dryRun ? " (dry-run)" : ""}${args.only ? `, only=${args.only}` : ""}` +
      `${args.forceReplace ? ", force-replace-placeholders" : ""}; MEDIA_DIR=${mediaDir}`
  );

  const parsed = await readManifest();
  const rows: Row[] = [];
  const needsRedo: ManifestEntry[] = [];
  const mediaActions = new Map<string, number>();
  /** Mapped targets whose document / hero block / card was not found (fail the run). */
  const notFound: string[] = [];
  let failed = false;

  const store = new DocStore(ctx);
  const mediaFlags = await loadMediaFlags(ctx);

  for (const item of parsed) {
    if (!item.ok) {
      failed = true;
      rows.push({ entryId: item.id, mediaId: "—", target: "—", result: "error", note: item.error });
      continue;
    }
    const { entry } = item;
    const resolved = resolveTarget(entry);
    const bindings = resolved.ok
      ? resolved.bindings.filter((b) => !args.only || bindingTouches(b, args.only))
      : [];
    // `--only` narrows the run to entries that touch that collection.
    if (args.only && bindings.length === 0) continue;
    if (entry.needsRedo) needsRedo.push(entry);

    let media: MediaOutcome;
    try {
      media = await ensureMedia(ctx, entry, args.dryRun);
    } catch (error) {
      failed = true;
      const note = error instanceof Error ? error.message : String(error);
      rows.push({ entryId: entry.id, mediaId: "—", target: resolved.key, result: "error", note });
      continue;
    }
    mediaActions.set(media.action, (mediaActions.get(media.action) ?? 0) + 1);
    mediaFlags.set(media.id, true);

    if (!resolved.ok) {
      if (resolved.unknown) failed = true;
      rows.push({
        entryId: entry.id,
        mediaId: media.id,
        target: resolved.key,
        result: "no target",
        note: resolved.reason,
      });
      continue;
    }

    // «Target not found» fails the run (wave-6 review): a document / hero binding that finds
    // nothing, or a card-only target (hub cards) whose `cardLinks` match no card. `cardLinks`
    // next to a document binding are optional extras (a home card may or may not exist), and
    // under `--only` the card scan covers one collection only, so those misses do not count.
    const cardsOptional = bindings.some((b) => b.kind !== "cardLinks");
    const cardMisses: string[] = [];
    let cardHits = 0;
    for (const binding of bindings) {
      const { slots, empty, where } = await slotsOf(store, binding, args.only);
      if (binding.kind === "cardLinks") {
        if (slots.length > 0) cardHits += 1;
        else cardMisses.push(`${entry.id} → ${where} (${empty})`);
      }
      if (slots.length === 0) {
        if (binding.kind !== "cardLinks") {
          failed = true;
          notFound.push(`${entry.id} → ${where} (${empty})`);
        }
        rows.push({ entryId: entry.id, mediaId: media.id, target: where, result: empty });
        continue;
      }
      for (const slot of slots) {
        const currentId = relationId(slot.get());
        const flag = currentId ? mediaFlags.get(currentId) : undefined;
        const existing =
          currentId && flag !== undefined ? { id: currentId, isPlaceholder: flag } : null;
        const decision = canAttach(existing, media.id, args.forceReplace);
        if (isWrite(decision)) {
          slot.set(media.id);
          slot.state.dirty.add(slot.topKey);
        }
        const row: Row = {
          entryId: entry.id,
          mediaId: media.id,
          target: slot.label,
          result: DECISION_RESULT[decision],
        };
        rows.push(row);
        if (isWrite(decision)) slot.state.rows.push(row);
      }
    }
    if (!cardsOptional && !args.only && cardHits === 0 && cardMisses.length > 0) {
      failed = true;
      notFound.push(...cardMisses);
    }
  }

  // One write per changed document: the published version, without extra drafts. Documents with
  // a newer editor draft are skipped first (a read-only check, so --dry-run reports them too).
  let draftSkipped = 0;
  for (const state of store.dirtyStates()) {
    let conflict: string | null;
    try {
      conflict = await draftConflict(ctx, state);
    } catch (error) {
      failed = true;
      const note = error instanceof Error ? error.message : String(error);
      for (const row of state.rows) Object.assign(row, { result: "error" as const, note });
      continue;
    }
    if (conflict) {
      draftSkipped += 1;
      for (const row of state.rows) {
        Object.assign(row, { result: "skipped: newer draft" as const, note: conflict });
      }
      continue;
    }
    if (args.dryRun) continue;
    const patch = Object.fromEntries([...state.dirty].map((key) => [key, state.doc[key]]));
    try {
      await ctx.payload.update({
        collection: state.collection,
        id: String(state.doc.id),
        data: patch as never,
        depth: 0,
        draft: false,
        overrideAccess: true,
        context: SEED_REQUEST_CONTEXT,
      });
    } catch (error) {
      failed = true;
      const note = error instanceof Error ? error.message : String(error);
      for (const row of state.rows) Object.assign(row, { result: "error" as const, note });
    }
  }

  console.log("");
  printRows(rows);
  console.log("");

  const count = (result: RowResult) => rows.filter((r) => r.result === result).length;
  log(
    `media: ${[...mediaActions].map(([action, n]) => `${action} ${n}`).join(", ") || "—"}; ` +
      `привязки: attached ${count("attached")}, replaced ${count("replaced placeholder")}, ` +
      `unchanged ${count("unchanged")}, real ${count("skipped: already has real image")}, ` +
      `placeholder ${count("skipped: has placeholder")}, ` +
      `newer draft ${count("skipped: newer draft")}, no target ${count("no target")}, ` +
      `errors ${count("error")}; ` +
      `документов к записи: ${store.dirtyStates().length - draftSkipped}` +
      (draftSkipped > 0 ? ` (пропущено из-за черновиков: ${draftSkipped})` : "")
  );
  if (notFound.length > 0) {
    log(
      `ОШИБКА: цели не найдены (${notFound.length}) — исправьте scripts/attach-map.ts или контент:`
    );
    for (const line of notFound) log(`  ${line}`);
  }
  if (needsRedo.length > 0) {
    log(`ждут перегенерации (needsRedo), загружены как есть: ${needsRedo.length}`);
    for (const entry of needsRedo) log(`  ${entry.id}: ${entry.redoReason ?? ""}`);
  }

  if (args.dryRun) {
    log("dry-run: ничего не записано");
  } else if (args.revalidate) {
    await revalidateSite(ctx);
  } else {
    log("напоминание: выполните revalidate (POST /api/revalidate/) или перезапустите сайт");
  }
  return failed ? 1 : 0;
}

// `payload run` rewrites process.argv to [node, bin, ...positionals]; skip the first two.
try {
  const args = parseArgs(process.argv.slice(2));
  if (args.unknown.length > 0)
    console.warn(`неизвестные аргументы пропущены: ${args.unknown.join(" ")}`);
  process.exit(await main(args));
} catch (error) {
  console.error("attach-generated-media: ошибка —", error instanceof Error ? error.message : error);
  const data = (error as { data?: unknown } | null)?.data;
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
