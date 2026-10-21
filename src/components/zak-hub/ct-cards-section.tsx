import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { fill, hasText, isExternalHref, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockSectionInfo } from "@/components/blocks/types";
import { Section, type SectionVariant } from "@/components/ig/section";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

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
}

const CARD_CLASS =
  "bg-surface shadow-card flex h-full flex-col gap-2 rounded-lg p-6 text-inherit no-underline max-sm:p-5";
const LINK_CARD_CLASS =
  "transition-[transform,box-shadow] duration-(--ig-dur-base) hover:-translate-y-0.5 hover:shadow-card-hover hover:text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)";

function CardBody({ title, text }: Pick<CtCardItem, "title" | "text">) {
  return (
    <>
      <h3 className="text-primary-dark m-0 text-lg leading-[1.35] font-semibold">{title}</h3>
      {text ? <p className="text-ink-2 m-0 text-[15px] leading-[1.55]">{text}</p> : null}
    </>
  );
}

/** Grid of `ct-card`s: `repeat(auto-fit, minmax(min(300px, 100%), 1fr))`, gap 20. */
export function CtCards({ items, className }: { items: CtCardItem[]; className?: string }) {
  if (items.length === 0) return null;
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
            <CardLink item={item} />
          ) : (
            <div className={cn(CARD_CLASS, "w-full")}>
              <CardBody title={item.title} text={item.text} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function CardLink({ item }: { item: CtCardItem }) {
  const href = item.href ?? "";
  const className = cn(CARD_CLASS, LINK_CARD_CLASS, "w-full");
  const body = <CardBody title={item.title} text={item.text} />;
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
      return {
        key: item.id ?? `card-${index}`,
        title: fill(item.title, ctx),
        ...(text ? { text } : {}),
        ...(link ? { href: link.href, newTab: link.newTab } : {}),
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
