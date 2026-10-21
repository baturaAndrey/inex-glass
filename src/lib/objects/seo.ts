import { OBJECTS_BASE_PATH, objectsPagePath } from "./filters";
import { formatThickness } from "./format";
import type { SpecRow } from "./format";

/**
 * SEO of the portfolio (pure functions): fallback meta of an object page, meta rules of the
 * listing and its pages.
 *
 * OBJECT PAGE FALLBACK (decision of task 30 — `docs/inex/17-meta.md` has no object meta):
 * the SEO group of the document wins; empty fields fall back to
 * - title: `«<name>» — спецификация стекла | Inex Glass`, at most 65 characters (the name is
 *   shortened with «…»); a name that already carries «ёлочки» (`ТРК «Урал»`) is not wrapped again;
 * - description: `<Тип>, <Город>: <изделия>. Спецификация стекла: <вид>, <толщина> мм.` with
 *   missing parts skipped; shorter than 120 characters → a neutral closing sentence is added when
 *   it fits; longer than 160 → cut at a word boundary with «…».
 */

export const LISTING_H1 = "Объекты";
/** Title of `/obekty/` (17-meta: no brand suffix). The CMS document's `seo.title` wins. */
export const LISTING_TITLE = "Объекты Inex — перегородки, ограждения, фасады из стекла";
export const LISTING_DESCRIPTION =
  "1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту.";

export const OBJECT_TITLE_MAX = 65;
export const OBJECT_DESCRIPTION_MIN = 120;
export const OBJECT_DESCRIPTION_MAX = 160;

const TITLE_TAIL = " — спецификация стекла | Inex Glass";
const DESCRIPTION_TAIL = "Фото объекта, задача и что поставляли — Inex Glass.";
const ELLIPSIS = "…";

const clean = (value: string | null | undefined): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

/** «Name» in Russian quotes unless the name already contains them. */
function quoted(name: string): string {
  return /[«»"„“]/.test(name) ? name : `«${name}»`;
}

/** Cuts `text` to `max` characters at a word boundary and appends «…» when shortened. */
export function truncateByWord(text: string, max: number): string {
  const value = clean(text);
  if (value.length <= max) return value;
  const room = value.slice(0, max - ELLIPSIS.length + 1);
  const cut = room.lastIndexOf(" ");
  const head = (cut > 0 ? room.slice(0, cut) : room.slice(0, max - ELLIPSIS.length)).replace(
    /[\s,.:;—-]+$/,
    ""
  );
  return `${head}${ELLIPSIS}`;
}

/** Fallback `<title>` of an object page (≤ 65 characters). */
export function objectFallbackTitle(name: string): string {
  const base = clean(name);
  const full = `${quoted(base)}${TITLE_TAIL}`;
  if (full.length <= OBJECT_TITLE_MAX) return full;
  const wrapped = quoted(base) !== base;
  // Room for the name itself: total − tail − quotes − ellipsis.
  const room = OBJECT_TITLE_MAX - TITLE_TAIL.length - (wrapped ? 2 : 0) - ELLIPSIS.length;
  const short = `${base.slice(0, Math.max(room, 1)).trimEnd()}${ELLIPSIS}`;
  return `${wrapped ? `«${short}»` : short}${TITLE_TAIL}`;
}

export interface ObjectDescriptionInput {
  name: string;
  type?: string | null | undefined;
  city?: string | null | undefined;
  products?: ReadonlyArray<string | null | undefined> | undefined;
  /** First spec row. */
  spec?: SpecRow | null | undefined;
}

/** Fallback meta description of an object page (120–160 characters when the data allows). */
export function objectFallbackDescription(input: ObjectDescriptionInput): string {
  const head = [clean(input.type), clean(input.city)].filter(Boolean).join(", ");
  const products = (input.products ?? []).map(clean).filter(Boolean).join(", ");
  const first = [head, products].filter(Boolean).join(": ");
  const specText = [clean(input.spec?.kind), formatThickness(input.spec?.thickness)]
    .filter(Boolean)
    .join(", ");

  const sentences: string[] = [];
  if (first) sentences.push(`${first}.`);
  if (specText) sentences.push(`Спецификация стекла: ${specText}.`);
  if (sentences.length === 0) sentences.push(`${quoted(clean(input.name))} — объект Inex Glass.`);

  let text = sentences.join(" ");
  const withTail = `${text} ${DESCRIPTION_TAIL}`;
  if (text.length < OBJECT_DESCRIPTION_MIN && withTail.length <= OBJECT_DESCRIPTION_MAX) {
    text = withTail;
  }
  return truncateByWord(text, OBJECT_DESCRIPTION_MAX);
}

export interface ListingSeoInput {
  /** Requested page (1 for `/obekty/`). */
  page: number;
  totalPages: number;
  /** The URL has filter / sort parameters (`hasFilterParams`). */
  filtered: boolean;
}

export interface ListingSeo {
  /** Path of the document (Open Graph URL). */
  path: string;
  /** Canonical path. */
  canonical: string;
  noindex: boolean;
  /** Page number for «— страница N» in the title (`undefined` → no suffix). */
  titlePage: number | undefined;
  /** `rel="prev"` / `rel="next"` paths. */
  previous: string | null;
  next: string | null;
}

/**
 * Meta rules of the listing:
 * - any filter / sort parameter (also on `/obekty/page/N/`) → `noindex, follow`, canonical
 *   `/obekty/`, no prev/next;
 * - otherwise page 1 and pages 2+ are indexable with a self canonical; pages 2+ get
 *   «— страница N» in the title; prev/next point at the neighbouring pages.
 */
export function listingSeo({ page, totalPages, filtered }: ListingSeoInput): ListingSeo {
  if (filtered) {
    return {
      path: objectsPagePath(page),
      canonical: OBJECTS_BASE_PATH,
      noindex: true,
      titlePage: undefined,
      previous: null,
      next: null,
    };
  }
  const path = objectsPagePath(page);
  return {
    path,
    canonical: path,
    noindex: false,
    titlePage: page > 1 ? page : undefined,
    previous: page > 1 ? objectsPagePath(page - 1) : null,
    next: page < totalPages ? objectsPagePath(page + 1) : null,
  };
}
