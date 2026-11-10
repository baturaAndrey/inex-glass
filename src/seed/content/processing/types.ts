/**
 * Seed shapes of the «Обработка стекла» section (hub + `processing-services`). Pure data, no
 * Payload: the slice `src/seed/slices/processing.ts` converts them (markdown → Lexical, image
 * files → `media`). How each shape maps to a section of the service page: `./README.md`.
 */

export type CellSeed = string | { value: string; href?: string; positive?: boolean };

export interface TableSeed {
  heading?: string;
  lead?: string;
  role?: "parameters" | "comparison" | "schemes" | "other";
  columns: string[];
  rows: CellSeed[][];
  footnote?: string;
}

/** A photo or diagram shipped with the seed (`src/seed/media/processing/<file>`). */
export interface ImageSeed {
  /** Path inside `src/seed/media/processing/` (`facet.webp`, `diagrams/facet.webp`). */
  file: string;
  /** Russian alt text; for a diagram it describes what the diagram shows. */
  alt: string;
  kind?: "photo" | "illustration" | "scheme";
}

/**
 * One spec tile under the hero (section «specs»). Stored as a row of the service's `tables[0]`
 * (columns «Параметр | Значение | Пояснение»): `label` → micro caps caption, `value` → the big
 * number, `text` → the description. `accent` (the light-teal tile) marks the value cell
 * `positive` («Выгодное значение»).
 */
export interface SpecSeed {
  label: string;
  value: string;
  text?: string;
  accent?: boolean;
}

/** One numbered card of «Где применяют» / «Виды …» (section «use-cases»). */
export interface UseCaseSeed {
  title: string;
  text?: string;
  /** Internal path: the whole card links there (no visual change but the hover lift). */
  href?: string;
  /**
   * Background photo of the card (`cards/<slug>-<n>.webp`, 4:3). With photos the block renders
   * as photo cards (like the constructions hub cards), without them as plain numbered cards.
   */
  image?: ImageSeed;
}

export type LayoutSeed =
  /**
   * Text section. On a service page with a `figure` it is the «about» section: text left,
   * white panel with the image right (stored as the `richText` block + a one-image `gallery`
   * block right after it).
   */
  | {
      blockType: "richText";
      heading?: string;
      md: string;
      figure?: { image: ImageSeed; caption?: string };
    }
  | { blockType: "table"; heading?: string; sub?: string; table: TableSeed }
  | {
      blockType: "callout";
      tone: "info" | "warning";
      title?: string;
      md?: string;
      items?: Array<{ lead?: string; md: string }>;
    }
  | {
      blockType: "holesCalculator";
      heading: string;
      sub?: string;
      anchorId: string;
      defaultThickness: "10";
      note?: string;
    }
  /** Numbered cards (section «use-cases»): 3 per row (`g3`) or 4 per row (`g4`). */
  | {
      blockType: "cards";
      heading: string;
      sub?: string;
      columns: 3 | 4;
      items: UseCaseSeed[];
    }
  /**
   * Panels of the closing cream block (section «how-to-order»), one panel per non-empty
   * column. On the hub: the whole info block.
   */
  | {
      blockType: "twoColumns";
      left: { heading: string; md: string };
      right?: { heading: string; md: string };
    };

export interface SeoSeed {
  h1: string;
  title: string;
  description: string;
}

export type QuizTypeSeed = "tempered" | "mirrors";

export type ProcessingSlug =
  "kromka" | "otverstiya-i-vyrezy" | "facet" | "matirovanie" | "pechat" | "plenki";

/**
 * Where the copy of a service comes from. `teksty` — verbatim from
 * `res/inex-glass-handoff/teksty/` (the slice test checks it word by word). `paper` — the
 * approved Paper mockup `2560_service_<name>` (client approval 2026-11-08); statements the
 * mockup marked «[уточнить]» are listed in `pendingApproval` (without the mark) and in
 * `docs/inex/drafts/service-pages-paper-drafts.md`.
 */
export type CopySeed =
  { source: "teksty" } | { source: "paper"; mockup: string; pendingApproval: readonly string[] };

export interface CalloutSeed {
  tone: "info" | "warning";
  title: string;
  /**
   * Text of the plaque. A last paragraph made only of a link (`→ [Обработка кромки](/…/)`)
   * becomes the pill button on the right of the plaque.
   */
  md: string;
}

export interface ServiceSeed {
  slug: ProcessingSlug;
  title: string;
  order: number;
  /** Label of the last breadcrumb (task spec «Крошки»). */
  breadcrumb: string;
  /** Title of the service on the hub / «Другая обработка» cards. */
  cardTitle: string;
  /** Main limit: the line under the card title (hub and «Другая обработка»). */
  keyLimit: string;
  /** Hero photo (also the card photo). */
  image: ImageSeed;
  seo: SeoSeed;
  /** Hero lead. */
  introMd: string;
  /** Spec tiles under the hero (`tables[0]`); usually 4, the last one `accent`. */
  specs?: SpecSeed[];
  /** Page sections in order (about, calculator, use-cases, …; how-to-order panels last). */
  layout: LayoutSeed[];
  /**
   * First panel of the closing block. A leading `## Heading` replaces the default heading
   * «Как указать в чертеже»; `> quote` lines become the white note card.
   */
  howToSpecifyMd?: string;
  /** Warning / info plaques after the use-cases (section «tempered-callout»). */
  callouts?: CalloutSeed[];
  faq?: Array<{ question: string; answerMd: string }>;
  /**
   * Cards of «Другая обработка», in order (`relatedLinks` → the services). Without it the page
   * shows the first three other services by `order`.
   */
  related?: readonly [ProcessingSlug, ProcessingSlug, ProcessingSlug];
  hasHoleCalculator?: boolean;
  ctaSecondaryLabel?: string;
  quizType: QuizTypeSeed;
  /** `none` — teksty have only «Рассчитать стоимость». */
  secondaryForm?: "drawing" | "none";
  copy: CopySeed;
}

export interface HubSeed {
  title: string;
  slug: string;
  breadcrumb: string;
  seo: SeoSeed;
  lead: string;
  layout: LayoutSeed[];
  /** Labels of the hero buttons. */
  primaryLabel: string;
  secondaryLabel: string;
  /** Background photo of the hero. */
  heroImage: ImageSeed;
}
