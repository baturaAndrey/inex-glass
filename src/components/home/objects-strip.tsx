import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlockImage, hasText, asMedia, fill } from "@/components/blocks/shared";
import type { BlockOf, BlockProps } from "@/components/blocks/types";
import { Button } from "@/components/ig/button";
import { Card } from "@/components/ig/card";
import { Placeholder } from "@/components/ig/placeholder";
import { listPublished } from "@/lib/cms/queries";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Object as PortfolioObject } from "@/payload-types";

const OBJECTS_PATH = "/obekty/";
const DEFAULT_LIMIT = 8;
const DEFAULT_ALL_LABEL = "Все объекты";

/**
 * Cards per half-track of a column. The track is two identical halves (scrolled by -50%), so each
 * half must be taller than the visible window (852 px desktop / 560 / 420): four cards are,
 * at every breakpoint. Columns with fewer objects are topped up with hidden repeats.
 */
const MIN_CARDS_PER_HALF = 4;
/** Marquee speed: seconds per card of a half-track (4 cards → 60 s per loop). */
const SECONDS_PER_CARD = 15;

/** Column width: ~23vw at ≥1101 (half of the block minus gutters), ~48vw / ~45vw below. */
const OBJECT_IMAGE_SIZES = "(max-width: 599px) 45vw, (max-width: 1100px) 48vw, 460px";
/** Tall photos in the desktop columns, wider ones on tablets (the window is only 560 px high). */
const OBJECT_MEDIA_CLASS = "aspect-[4/5] max-md:aspect-[4/3] max-sm:aspect-[4/5]";
/** `\_` keeps the underscores of `.ig-card__*`: a bare `_` means a space in arbitrary variants. */
const OBJECT_CARD_CLASS = String.raw`w-full [&_.ig-card\_\_body]:gap-1 [&_.ig-card\_\_body]:px-5 [&_.ig-card\_\_body]:pt-4 [&_.ig-card\_\_body]:pb-5 [&_.ig-card\_\_title]:text-h5 max-sm:[&_.ig-card\_\_body]:px-3 max-sm:[&_.ig-card\_\_body]:pt-3 max-sm:[&_.ig-card\_\_body]:pb-3 max-sm:[&_.ig-card\_\_title]:text-h6`;

/**
 * Column track: `animate-objects-marquee` (keyframes in globals.css) scrolls it by -50% — up;
 * the second column runs it in reverse — down. Paused while the pointer or focus is inside the
 * columns; `prefers-reduced-motion` leaves the columns static.
 */
const TRACK_CLASS =
  "animate-objects-marquee will-change-transform group-hover/objects:[animation-play-state:paused] group-focus-within/objects:[animation-play-state:paused] motion-reduce:animate-none";

export interface HomeObjectsStripProps extends BlockProps<"objectsFeed"> {
  /** `objects-fallback` cards block: object names shown while no featured object is published. */
  fallback?: BlockOf<"cards"> | undefined;
}

/** One card of the marquee: a stable key and its rendering (the same node is reused in copies). */
interface ObjectItem {
  key: string;
  node: ReactNode;
}

/** A column: accessible `items` once, then `filler` repeats so a half-track fills the window. */
interface MarqueeColumn {
  items: ObjectItem[];
  filler: ObjectItem[];
}

/** Featured published objects, newest first (`sortDate`), at most `limit`. */
async function loadFeatured(limit: number): Promise<PortfolioObject[]> {
  const result = await listPublished("objects", {
    where: { featured: { equals: true } },
    limit,
    sort: "-sortDate",
  });
  return result.docs as PortfolioObject[];
}

/** «Челябинск» from the populated city relation. */
function objectCity(doc: PortfolioObject): string | null {
  return typeof doc.city === "object" && doc.city !== null ? doc.city.name : null;
}

function featuredCard(doc: PortfolioObject, href: string): ReactNode {
  const photo = doc.photos?.[0];
  const media = photo ? asMedia(photo.image) : null;
  return (
    <Card
      className={OBJECT_CARD_CLASS}
      href={href}
      arrow={false}
      title={doc.name}
      sub={objectCity(doc) ?? undefined}
      image={
        media ? (
          <BlockImage
            media={media}
            alt={photo?.alt}
            size="card"
            sizes={OBJECT_IMAGE_SIZES}
            frameClassName={OBJECT_MEDIA_CLASS}
          />
        ) : (
          <Placeholder className={OBJECT_MEDIA_CLASS} />
        )
      }
    />
  );
}

function fallbackCard(name: string): ReactNode {
  return (
    <Card
      className={OBJECT_CARD_CLASS}
      title={name}
      image={<Placeholder className={OBJECT_MEDIA_CLASS} />}
    />
  );
}

/** Repeats `pool` cyclically until `items + filler` reaches `MIN_CARDS_PER_HALF`. */
function topUp(items: ObjectItem[], pool: ObjectItem[]): ObjectItem[] {
  const missing = Math.max(0, MIN_CARDS_PER_HALF - items.length);
  if (pool.length === 0) return [];
  return Array.from({ length: missing }, (_, index) => pool[index % pool.length]!);
}

/**
 * Splits the cards into two columns (even / odd positions), so every object is rendered and
 * reachable exactly once. With a single object the second column consists of hidden repeats only.
 */
function splitColumns(all: ObjectItem[]): [MarqueeColumn, MarqueeColumn] {
  const first = all.filter((_, index) => index % 2 === 0);
  const second = all.filter((_, index) => index % 2 === 1);
  return [
    { items: first, filler: topUp(first, first) },
    { items: second, filler: topUp(second, second.length > 0 ? second : all) },
  ];
}

const LIST_CLASS = "m-0 list-none p-0";
/** Spacing as bottom padding (not `gap`): both halves stay exactly equal, so -50% loops seamlessly. */
const ITEM_CLASS = "flex pb-3.5 max-sm:pb-3";

/** A purely visual copy: hidden from assistive technology and out of the tab order. */
function HiddenCopy({ items, prefix }: { items: ObjectItem[]; prefix: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={LIST_CLASS} aria-hidden="true" inert data-objects-copy="">
      {items.map((item, index) => (
        <li key={`${prefix}-${index}-${item.key}`} className={ITEM_CLASS}>
          {item.node}
        </li>
      ))}
    </ul>
  );
}

function ObjectsColumn({ column, reverse }: { column: MarqueeColumn; reverse?: boolean }) {
  const half = [...column.items, ...column.filler];
  const style = {
    "--objects-marquee-duration": `${half.length * SECONDS_PER_CARD}s`,
  } as CSSProperties;
  return (
    <div className="min-w-0">
      <div className={cn(TRACK_CLASS, reverse && "[animation-direction:reverse]")} style={style}>
        {column.items.length > 0 ? (
          <ul className={LIST_CLASS}>
            {column.items.map((item) => (
              <li key={item.key} className={ITEM_CLASS}>
                {item.node}
              </li>
            ))}
          </ul>
        ) : null}
        <HiddenCopy items={column.filler} prefix="fill" />
        <HiddenCopy items={half} prefix="loop" />
      </div>
    </div>
  );
}

/**
 * Block 8 — «Объекты» (layout of divan.ru «Идеи интерьеров»): a cream block within the 1920 px
 * container; on the left the heading, sub and «Все объекты», on the right two columns of object
 * cards in an endless vertical marquee (left column up, right column down). The endless motion is
 * an approved exception to DESIGN.md §8; it pauses on hover / focus and stops for
 * `prefers-reduced-motion`.
 *
 * Featured objects of the portfolio (photo, name, city), or — while none is published — the
 * inactive fallback cards with placeholders and names only, so the page never shows fictitious
 * published objects. Decided on the server.
 */
export async function HomeObjectsStrip({ block, ctx, section, fallback }: HomeObjectsStripProps) {
  const limit = block.limit ?? DEFAULT_LIMIT;
  const featured = (await loadFeatured(limit)).flatMap((doc) => {
    const href = docUrl("objects", doc);
    return href ? [{ doc, href }] : [];
  });
  const fallbackNames = (fallback?.items ?? [])
    .map((item) => fill(item.title, ctx))
    .filter(Boolean);
  if (featured.length === 0 && fallbackNames.length === 0) return null;
  const allLabel = fill(block.allLinkLabel, ctx) || DEFAULT_ALL_LABEL;
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);

  const items: ObjectItem[] =
    featured.length > 0
      ? featured.map(({ doc, href }) => ({ key: doc.id, node: featuredCard(doc, href) }))
      : fallbackNames.map((name, index) => ({
          key: `fallback-${index}`,
          node: fallbackCard(name),
        }));
  const [up, down] = splitColumns(items);

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={heading ? section.headingId : undefined}
      className="bg-warning-bg mx-auto grid w-full max-w-[1920px] scroll-mt-24 grid-cols-2 overflow-hidden max-md:grid-cols-1 md:h-[clamp(600px,44.375vw,852px)]"
    >
      <div className="flex min-w-0 flex-col items-start justify-center gap-10 pr-10 pl-(--ig-gutter) max-md:gap-6 max-md:pt-[72px] max-md:pr-(--ig-gutter) max-md:pb-10 max-sm:pt-12 max-sm:pb-8">
        {heading || sub ? (
          <div className="flex max-w-[640px] flex-col gap-4 max-sm:gap-3">
            {heading ? (
              <h2 id={section.headingId} className="ig-h2">
                {heading}
              </h2>
            ) : null}
            {sub ? <p className="text-lead-l text-text-2 m-0 text-pretty">{sub}</p> : null}
          </div>
        ) : null}
        {block.showAllLink !== false ? (
          <Button asChild size="l" rightIcon={<ArrowRight aria-hidden="true" />}>
            <Link href={OBJECTS_PATH}>{allLabel}</Link>
          </Button>
        ) : null}
      </div>
      <div
        className="group/objects grid min-w-0 grid-cols-2 gap-3.5 overflow-hidden pr-(--ig-gutter) max-md:h-[560px] max-md:pl-(--ig-gutter) max-sm:h-[420px] max-sm:gap-3"
        data-objects={featured.length > 0 ? "featured" : "fallback"}
      >
        <ObjectsColumn column={up} />
        <ObjectsColumn column={down} reverse />
      </div>
    </section>
  );
}
