import type { ComponentProps } from "react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { fill, hasText, sectionVariant } from "@/components/blocks/shared";
import type {
  BlockOf,
  BlockPageContext,
  BlockSectionInfo,
  BlockType,
  LayoutBlock,
} from "@/components/blocks/types";
import { FormSection } from "@/components/forms/form-section";
import type { PlaceholderContext } from "@/lib/domain";
import { HomeConstructionCards } from "./construction-cards";
import { HomeGlassCards } from "./glass-cards";
import { HomeHero } from "./hero";
import { HomeObjectsStrip } from "./objects-strip";
import { HomeOrderSteps } from "./order-steps";
import { HomeProcessingTiles } from "./processing-tiles";
import { HomeSegments } from "./segments";
import { HomeUsefulCards } from "./useful-cards";
import { HomeWhy } from "./why";

/**
 * Anchors (`anchorId`) by which the template finds its sections in the document layout; the
 * hero and the final form are found by `blockType`. Same values as the seed slice
 * (`src/seed/slices/home.ts`, `HOME_ANCHORS`).
 */
const SECTION_KEYS = {
  why: { anchor: "why", type: "compare" },
  glass: { anchor: "glass", type: "cards" },
  processing: { anchor: "processing", type: "cards" },
  constructions: { anchor: "constructions", type: "cards" },
  segments: { anchor: "segments", type: "cards" },
  steps: { anchor: "steps", type: "steps" },
  objects: { anchor: "objects", type: "objectsFeed" },
  objectsFallback: { anchor: "objects-fallback", type: "cards" },
  useful: { anchor: "useful", type: "cards" },
} as const satisfies Record<string, { anchor: string; type: BlockType }>;

type SectionKey = keyof typeof SECTION_KEYS;

/** Lead `source` of the final form. */
const FORM_SOURCE = "home-form";

interface Located<T extends BlockType> {
  block: BlockOf<T>;
  section: BlockSectionInfo;
}

/** Blocks of the layout with their position, split into template sections and extras. */
function locateSections(layout: LayoutBlock[]) {
  const used = new Set<number>();
  const info = (block: LayoutBlock, index: number, key: string): BlockSectionInfo => ({
    index,
    variant: sectionVariant("background" in block ? block.background : null, index),
    headingId: `home-${key}-title`,
  });

  function byType<T extends BlockType>(type: T, key: string): Located<T> | null {
    const index = layout.findIndex((block, i) => !used.has(i) && block.blockType === type);
    if (index === -1) return null;
    used.add(index);
    const block = layout[index] as BlockOf<T>;
    return { block, section: info(block, index, key) };
  }

  function byAnchor<K extends SectionKey>(
    key: K
  ): Located<(typeof SECTION_KEYS)[K]["type"]> | null {
    const { anchor, type } = SECTION_KEYS[key];
    const index = layout.findIndex(
      (block, i) =>
        !used.has(i) && block.blockType === type && "anchorId" in block && block.anchorId === anchor
    );
    if (index === -1) return null;
    used.add(index);
    const block = layout[index] as BlockOf<(typeof SECTION_KEYS)[K]["type"]>;
    return { block, section: info(block, index, anchor) };
  }

  const sections = {
    hero: byType("hero", "hero"),
    why: byAnchor("why"),
    glass: byAnchor("glass"),
    processing: byAnchor("processing"),
    constructions: byAnchor("constructions"),
    segments: byAnchor("segments"),
    steps: byAnchor("steps"),
    objects: byAnchor("objects"),
    objectsFallback: byAnchor("objectsFallback"),
    useful: byAnchor("useful"),
    form: byType("form", "form"),
  };
  // Blocks an editor added without a known key: rendered generically before the form.
  const extras = layout.filter((_, index) => !used.has(index));
  return { sections, extras };
}

type FormSectionProps = ComponentProps<typeof FormSection>;

/** `FormSection` props from the `form` block: CMS values override the form defaults. */
function formSectionProps(block: BlockOf<"form">, ctx: PlaceholderContext): FormSectionProps {
  const props: FormSectionProps = { formKey: block.formKey, source: FORM_SOURCE };
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  const bullets = (block.bullets ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  if (heading) props.heading = heading;
  if (sub) props.sub = sub;
  if (bullets.length > 0) props.bullets = bullets;
  if (typeof block.showContacts === "boolean") props.showContacts = block.showContacts;
  if (hasText(block.submitLabel)) props.submitLabel = fill(block.submitLabel, ctx);
  if (hasText(block.fileLabel)) props.fileLabel = fill(block.fileLabel, ctx);
  if (hasText(block.sourceLabel)) props.sourceLabel = fill(block.sourceLabel, ctx);
  if (block.params && typeof block.params === "object" && !Array.isArray(block.params)) {
    props.params = block.params as Record<string, unknown>;
  }
  if (block.variant) props.variant = block.variant;
  if (hasText(block.anchorId)) props.anchorId = block.anchorId;
  return props;
}

export interface HomePageProps {
  layout: LayoutBlock[] | null | undefined;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

/**
 * Home template (`/`): the 10 sections of `Home.dc.html` in a fixed order, each filled from the
 * matching block of the document. A missing block hides its section; unknown blocks render
 * through `RenderBlocks` before the final form.
 */
export async function HomePage({ layout, ctx, page }: HomePageProps) {
  const { sections, extras } = locateSections(layout ?? []);
  const s = sections;

  return (
    <>
      {s.hero ? <HomeHero {...s.hero} ctx={ctx} page={page} /> : null}
      {s.why ? <HomeWhy {...s.why} ctx={ctx} page={page} /> : null}
      {s.glass ? <HomeGlassCards {...s.glass} ctx={ctx} page={page} /> : null}
      {s.processing ? <HomeProcessingTiles {...s.processing} ctx={ctx} page={page} /> : null}
      {s.constructions ? (
        <HomeConstructionCards {...s.constructions} ctx={ctx} page={page} />
      ) : null}
      {s.segments ? <HomeSegments {...s.segments} ctx={ctx} page={page} /> : null}
      {s.steps ? <HomeOrderSteps {...s.steps} ctx={ctx} page={page} /> : null}
      {s.objects ? (
        <HomeObjectsStrip
          {...s.objects}
          ctx={ctx}
          page={page}
          fallback={s.objectsFallback?.block}
        />
      ) : null}
      {s.useful ? <HomeUsefulCards {...s.useful} ctx={ctx} page={page} /> : null}
      {extras.length > 0 ? <RenderBlocks blocks={extras} ctx={ctx} page={page} /> : null}
      {s.form ? <FormSection {...formSectionProps(s.form.block, ctx)} /> : null}
    </>
  );
}
