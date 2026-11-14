import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import {
  asMedia,
  BlockImage,
  fill,
  hasText,
  isExternalHref,
  resolveLink,
} from "@/components/blocks/shared";
import type { BlockOf, BlockSectionInfo } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import { Section, type SectionVariant } from "@/components/ig/section";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Media } from "@/payload-types";

/**
 * Building blocks of the catalog pages (`ct-*` of `ZakHub.dc.html` / `Thick10.dc.html`), shared
 * by the hub `/zakalennoe-steklo/` and the thickness cards:
 * - `CtSection` — full-width section (rhythm 96 / 72 / 48) with the compact catalog heading
 *   (`.ct-h2`: 16 px below, not the 40 px of the generic block header) and an optional lead;
 * - `CtParagraph` — body paragraph of 17 px, ≈880 px measure (`.ct-p`);
 * - `CtCards` / `CtCardsSection` — grid of white `ct-card`s (auto-fit, min 300 px, gap 20).
 */

export interface CtSectionProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  variant: SectionVariant;
  /** `<h2>` text; the section is labelled by it. */
  heading?: ReactNode;
  headingId: string;
  /** Paragraph under the heading (`.ct-p`). */
  lead?: ReactNode;
  containerClassName?: string | undefined;
  children?: ReactNode;
}

export function CtSection({
  variant,
  heading,
  headingId,
  lead,
  className,
  containerClassName,
  children,
  ...props
}: CtSectionProps) {
  return (
    <Section
      variant={variant}
      aria-labelledby={heading ? headingId : undefined}
      className={cn("scroll-mt-24", className)}
      containerClassName={containerClassName}
      {...props}
    >
      {heading ? (
        <h2 id={headingId} className="ig-h2 mb-4 max-w-[900px] text-balance">
          {heading}
        </h2>
      ) : null}
      {lead ? <CtParagraph>{lead}</CtParagraph> : null}
      {children}
    </Section>
  );
}

/** `.ct-p`: 17 / 1.6, max 880 px, ink. */
export function CtParagraph({
  className,
  ...props
}: ComponentPropsWithoutRef<"p"> & { className?: string | undefined }) {
  return (
    <p
      className={cn(
        "text-ink-3 m-0 mb-4 max-w-[880px] text-[17px] leading-[1.6] text-pretty last:mb-0 max-sm:text-base",
        className
      )}
      {...props}
    />
  );
}

export interface CtCardItem {
  key: string;
  title: string;
  text?: string | undefined;
  /** Link cards are `<a>` with hover lift; others are plain cards. */
  href?: string | undefined;
  newTab?: boolean | undefined;
  /** Card image (`cards` item `image`), shown edge to edge above the text. */
  image?: Media | undefined;
}

const CARD_CLASS =
  "bg-surface shadow-card flex h-full flex-col gap-2 rounded-lg p-6 text-inherit no-underline max-sm:p-5";
/** A card with a media strip: the padding moves to the text so the image runs edge to edge. */
const MEDIA_CARD_CLASS = "gap-0 overflow-hidden p-0 max-sm:p-0";
const MEDIA_BODY_CLASS = "flex flex-col gap-2 p-6 max-sm:p-5";
const LINK_CARD_CLASS =
  "transition-[transform,box-shadow] duration-(--ig-dur-base) hover:-translate-y-0.5 hover:shadow-card-hover hover:text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)";
/** Compact strip (the prototype's wide placeholder `.ph-wide`), not the 4:3 of `.ig-card`. */
const MEDIA_FRAME_CLASS = "aspect-[16/10]";
/**
 * Column width of the auto-fit grid (min 300 px, gap 20): one column on phones, two on tablets,
 * three up to ~1400 px (1366: 3 × ≈400 px), four and more beyond (1920: 5 × ≈340 px).
 */
const MEDIA_SIZES =
  "(max-width: 659px) 100vw, (max-width: 1100px) 50vw, (max-width: 1400px) 33vw, 25vw";

/**
 * Media of a card in a grid that has images: the image, or — for a card without one (e.g.
 * «Прозрачное», which has no page of its own) — a neutral `ig-ph` strip of the same height, so
 * the text of neighbouring cards stays aligned.
 */
function CardMediaStrip({ image }: { image: Media | undefined }) {
  if (image) {
    return (
      <BlockImage
        media={image}
        size="card"
        sizes={MEDIA_SIZES}
        frameClassName={MEDIA_FRAME_CLASS}
      />
    );
  }
  return <Placeholder ratio="16/10" label="" />;
}

interface CardBodyProps extends Pick<CtCardItem, "title" | "text" | "image"> {
  /** Some card of the grid has an image: every card gets a media strip. */
  withMedia: boolean;
}

function CardBody({ title, text, image, withMedia }: CardBodyProps) {
  const content = (
    <>
      <h3 className="text-primary-dark m-0 text-lg leading-[1.35] font-semibold">{title}</h3>
      {text ? <p className="text-ink-2 m-0 text-[15px] leading-[1.55]">{text}</p> : null}
    </>
  );
  if (!withMedia) return content;
  return (
    <>
      <CardMediaStrip image={image} />
      <div className={MEDIA_BODY_CLASS}>{content}</div>
    </>
  );
}

/** Grid of `ct-card`s: `repeat(auto-fit, minmax(min(300px, 100%), 1fr))`, gap 20. */
export function CtCards({ items, className }: { items: CtCardItem[]; className?: string }) {
  if (items.length === 0) return null;
  const withMedia = items.some((item) => item.image);
  return (
    <ul
      className={cn(
        "m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5 p-0",
        className
      )}
      data-ct-cards=""
    >
      {items.map((item) => (
        <li key={item.key} className="flex">
          {item.href ? (
            <CardLink item={item} withMedia={withMedia} />
          ) : (
            <div className={cn(CARD_CLASS, withMedia && MEDIA_CARD_CLASS, "w-full")}>
              <CardBody
                title={item.title}
                text={item.text}
                image={item.image}
                withMedia={withMedia}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function CardLink({ item, withMedia }: { item: CtCardItem; withMedia: boolean }) {
  const href = item.href ?? "";
  const className = cn(CARD_CLASS, withMedia && MEDIA_CARD_CLASS, LINK_CARD_CLASS, "w-full");
  const body = (
    <CardBody title={item.title} text={item.text} image={item.image} withMedia={withMedia} />
  );
  if (isExternalHref(href) || item.newTab) {
    return (
      <a
        href={href}
        className={className}
        target={item.newTab ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

/** Items of a `cards` block as `ct-card`s (placeholders substituted, blank titles skipped). */
export function cardsBlockItems(block: BlockOf<"cards">, ctx: PlaceholderContext): CtCardItem[] {
  return (block.items ?? [])
    .filter((item) => hasText(item.title))
    .map((item, index) => {
      const link = resolveLink(item.link);
      const text = fill(item.text, ctx);
      const image = asMedia(item.image);
      return {
        key: item.id ?? `card-${index}`,
        title: fill(item.title, ctx),
        ...(text ? { text } : {}),
        ...(link ? { href: link.href, newTab: link.newTab } : {}),
        ...(image ? { image } : {}),
      };
    });
}

export interface CtCardsSectionProps {
  block: BlockOf<"cards">;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
  /** Content under the grid (e.g. the «Рядом:» bridge of the kinds section). */
  footer?: ReactNode;
}

/**
 * A `cards` block (layout `ctCards`) as a catalog section: heading, optional sub paragraph and
 * the card grid. Used for «Как мы снижаем риск ошибки», «Обработка до закалки», «Для кого».
 */
export function CtCardsSection({ block, ctx, section, footer }: CtCardsSectionProps) {
  const items = cardsBlockItems(block, ctx);
  if (items.length === 0 && !footer) return null;
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  return (
    <CtSection
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      heading={heading || undefined}
      headingId={section.headingId}
      lead={sub || undefined}
    >
      <CtCards items={items} />
      {footer}
    </CtSection>
  );
}
