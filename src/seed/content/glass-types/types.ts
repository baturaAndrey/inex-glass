/**
 * Seed shapes of the `glass-types` documents. Pure data, no Payload: the slice
 * `src/seed/slices/glass-types.ts` converts them (markdown → Lexical, image files → `media`),
 * the test `src/seed/slices/glass-types.test.ts` checks them. How each shape maps to a section
 * of the page: `./README.md`.
 *
 * Markup conventions:
 * - `md` strings are Markdown, converted to Lexical by the slice (`[text](/path/)`, `**bold**`,
 *   `- lists`, `1. lists`, `### sub-headings`, `> note`).
 * - Table cells and footnotes are plain text fields; they may contain the same inline markup,
 *   which the template renders (`InlineText`).
 * - A column label of a single space (`EMPTY_HEADER`) is an empty header cell.
 */

import type { QuizKindId, QuizTypeId } from "@/lib/domain";

export type GlassTypeSlug =
  | "matovoe"
  | "tonirovannoe"
  | "okrashennoe"
  | "osvetlennoe"
  | "dlya-mebeli"
  | "riflenoe"
  | "mollirovannoe"
  | "tripleks";

export interface SeedLink {
  label: string;
  url: string;
}

/** Where the teksty copy of a document comes from (file in `res/inex-glass-handoff/teksty/`). */
export interface TekstySource {
  file: string;
  /** Start of the `# N. …` heading of the section; `null` — the whole file. */
  section: string | null;
}

/**
 * Where the copy of a document comes from. `teksty` — verbatim from `source` (the test checks it
 * word by word). `paper` — the approved Paper mockup `2560_glass_<slug>`: statements the mockup
 * marked «[уточнить]» are listed in `pendingApproval` (without the mark, verbatim as in the copy)
 * and in `docs/inex/drafts/service-pages-paper-drafts.md`, section «Виды стекла — тексты на
 * согласовании (2026-11-09)».
 */
export type CopySeed =
  { source: "teksty" } | { source: "paper"; mockup: string; pendingApproval: readonly string[] };

export interface TableCellContent {
  value: string;
  positive?: boolean;
  href?: string;
}

/** A site table (`tables[]` of the document or a standalone `table` layout block). */
export interface GlassTypeTableContent {
  heading: string;
  lead?: string;
  role: "parameters" | "comparison" | "schemes" | "other";
  mobileMode: "cards" | "pairs";
  columns: Array<{ label: string; align?: "left" | "center" | "right"; numeric?: boolean }>;
  rows: Array<Array<string | TableCellContent>>;
  footnote?: string;
}

/**
 * The comparison table of an «about» section (white panel on the right, mockup
 * `2560_glass_matovoe`). Stored as a `table` block right after the `richText` block.
 */
export interface AboutTableSeed {
  /** Micro caps caption above the table («Два способа сделать стекло матовым»). */
  caption: string;
  /** Column headers, shown in caps; the first is the corner above the labels (`EMPTY_HEADER`). */
  columns: string[];
  /** Rows: the label (bold primary-dark), then one value per column (inline markup allowed). */
  rows: string[][];
  /** 1-based column whose header is brand-coloured (the recommended / highlighted option). */
  highlightColumn?: number;
  footnote?: string;
}

/** A photo or diagram shipped with the seed (`src/seed/media/glass-types/<file>`). */
export interface ImageSeed {
  /** Path inside `src/seed/media/glass-types/` (`matovoe.webp`, `diagrams/tripleks-layers.webp`). */
  file: string;
  /** Russian alt text; for a diagram it describes what the diagram shows. */
  alt: string;
  kind?: "photo" | "illustration" | "scheme";
  /**
   * A stand-in picture until the client's photo arrives: uploaded with «Временное изображение»
   * (`isPlaceholder`), so it shows up in the admin's «Временные изображения» filter.
   */
  temporary?: boolean;
}

/**
 * One spec tile under the hero (section «specs»), stored as a row of the `tables[]` entry with
 * the columns «Параметр | Значение | Пояснение». `accent` — the light-teal tile.
 */
export interface SpecSeed {
  label: string;
  value: string;
  text?: string;
  accent?: boolean;
}

/** One numbered card of «Где применяют» (section «use-cases»). */
export interface UseCaseSeed {
  title: string;
  text?: string;
  /** Internal path: the whole card links there. */
  href?: string;
}

export interface CalloutItemContent {
  lead?: string;
  /** Markdown. */
  text: string;
}

export type LayoutContent =
  /**
   * Text section. With a `heading` it is the «about» section of the page (H2, text, list with
   * teal dots); `figure` (diagram) or `table` (comparison table) adds the white panel on the
   * right. Without a heading — plain site text.
   */
  | {
      kind: "richText";
      heading?: string;
      md: string;
      figure?: { image: ImageSeed; caption: string };
      table?: AboutTableSeed;
    }
  /** Site callout block (legacy pages; new pages use `importantItems`). */
  | { kind: "callout"; tone: "warning" | "info"; title?: string; items: CalloutItemContent[] }
  /** Numbered cards (section «use-cases»): 3 per row or 4 per row. */
  | { kind: "cards"; heading: string; sub?: string; columns: 3 | 4; items: UseCaseSeed[] }
  /** A full-width site table section. */
  | { kind: "table"; table: GlassTypeTableContent }
  /** Panels of the closing cream block (section «how-to-order»), one per column. */
  | {
      kind: "twoColumns";
      left: { heading: string; md: string };
      right?: { heading: string; md: string };
    };

export interface VariantContent {
  key: string;
  name: string;
  description: string;
  application?: string;
  swatchKind: "color" | "image" | "pattern";
  swatchColor?: string;
  patternKey?: string;
}

export interface GlassTypeContent {
  slug: GlassTypeSlug;
  title: string;
  urlBase: "zakalennoe-steklo" | "root";
  /** Expected computed `path` (the collection hook derives it from `slug` + `urlBase`). */
  path: string;
  breadcrumbLabel: string;
  order: number;
  showInHub: boolean;
  /** Hub card; `text` is also the line of the «Другие виды стекла» card (first letter capital). */
  card: { title: string; text?: string };
  /** teksty section of the document (verbatim check for `copy.source: "teksty"`). */
  source: TekstySource;
  copy: CopySeed;
  seo: { h1: string; title: string; description: string };
  /** Hero lead (Markdown). teksty leads end with `{условия}`. */
  intro: string;
  /** Hero photo. Without it the hero shows the `.ig-ph` placeholder until one is uploaded. */
  heroImage?: ImageSeed;
  /** Captions of the photo placeholders of the hero («[Фото: …]» notes of teksty). */
  heroPhotoCaptions?: string[];
  /** Spec tiles under the hero; usually 4, the last one `accent`. */
  specs?: SpecSeed[];
  variantsHeading?: string;
  variants?: VariantContent[];
  /** Markdown. */
  variantsNote?: string;
  variantsCallout?: { title?: string; body: string };
  /** Site tables (legacy pages; new pages put tables into the about panel). */
  tables?: GlassTypeTableContent[];
  /** «Что важно знать до заказа»: bold-lead lines of the plaque. */
  importantItems?: CalloutItemContent[];
  /** The pill button of the plaque («Матирование →»). */
  importantButton?: SeedLink;
  /** Page sections in order (about, use-cases, …; how-to-order panels last). */
  layout?: LayoutContent[];
  /** «Где применяют» as plain items (legacy; new pages use a `cards` layout block). */
  applications?: Array<{ text: string; link?: SeedLink }>;
  /**
   * Cards of «Другие виды стекла», in order. Without it the page shows the next three types by
   * `order`.
   */
  related?: readonly [GlassTypeSlug, GlassTypeSlug, GlassTypeSlug];
  /** Links to other pages (not glass types), shown as the site link list. */
  relatedLinks?: SeedLink[];
  showSamples: boolean;
  faq?: Array<{ question: string; answer: string }>;
  limits: {
    thickMin?: number;
    thickMax?: number;
    allowedThicknesses?: number[];
    sizeMinW?: number;
    sizeMinH?: number;
    sizeMaxW?: number;
    sizeMaxH?: number;
    radius?: Array<{ thicknessFrom: number; thicknessTo: number; minRadius: number }>;
    notes?: string;
  };
  quizPrefill: { type: QuizTypeId; kind?: QuizKindId };
}
