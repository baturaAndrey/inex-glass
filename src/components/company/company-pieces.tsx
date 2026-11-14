import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fill, hasText, resolveLink, asMedia, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { OrderTable } from "@/components/how-to-order/order-table";
import { Button } from "@/components/ig/button";
import { TextLink } from "@/components/ig/text-link";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Panels of «О компании» (Paper mockup `2560_o-kompanii`, 2026-11, section `content`). Each one
 * renders one block of the `pages` document `/o-kompanii/` (placed by role in the route):
 *
 * - `table` → «Что делаем мы, а что — заводы-партнёры» (`RolesTable`, the «Как заказать» table);
 * - `cards` with photos → two photo panels with the text at the bottom (`PhotoPanels`);
 * - `linkList` → «С кем работаем», outline pills linking the segment pages (`ChipsPanel`);
 * - `cta` strip → «Объекты», its «a · b · c» text as tinted pills + the arrow link (`PillsPanel`);
 * - «Команда» → the tinted panel with the «Сотрудники» button (`TeamPanel`).
 */

/** Shared white panel of the mockup: 24 px radius, hairline border, 48 px padding. */
export const WHITE_PANEL =
  "bg-surface border-hairline flex min-w-0 flex-col gap-7 rounded-xl border p-12 max-lg:p-10 max-md:p-8 max-sm:gap-5 max-sm:p-5";

/** Panel heading: H3 of the type scale (32 px desktop, 22 px phone). */
export const PANEL_HEADING = "ig-h3 m-0 text-balance";

/** Pill: 44 px tall touch target (DESIGN §11), 16 px medium text. */
export const PILL =
  "inline-flex min-h-11 items-center rounded-full px-5 py-3 text-base leading-5 font-medium";

/* ------------------------------------------------------------------------------------------ */
/* Roles table                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Cells the partners do not take: «—» in the muted colour. */
const EMPTY_CELL = /^[—–-]$/u;

export function RolesTable({
  block,
  ctx,
  headingId,
}: {
  block: BlockOf<"table">;
  ctx: PlaceholderContext;
  headingId: string;
}) {
  const heading = fill(block.heading, ctx);
  const columns = (block.table?.columns ?? []).map((column) => ({
    label: fill(column.label, ctx),
    // Mockup: two equal columns.
    width: "50%",
  }));
  const rows = (block.table?.rows ?? []).map((row, rowIndex) => ({
    key: row.id ?? String(rowIndex),
    cells: (row.cells ?? []).map((cell, index) => {
      const value = fill(cell.value, ctx);
      if (EMPTY_CELL.test(value.trim())) {
        return (
          <span key={index} className="text-muted">
            {value}
          </span>
        );
      }
      return value;
    }),
  }));
  if (columns.length === 0 || rows.length === 0) return null;
  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : {})}
      className="flex flex-col gap-6 max-sm:gap-4"
      data-testid="company-roles"
    >
      {heading ? (
        <h2 id={headingId} className="ig-h2 m-0 text-balance">
          {heading}
        </h2>
      ) : null}
      <OrderTable columns={columns} rows={rows} caption={heading || undefined} accentFirstColumn />
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Photo panels                                                                               */
/* ------------------------------------------------------------------------------------------ */

/**
 * Page-colour mist over the lower part of the photo (mockup: transparent at 25 % → 90 % at 60 %
 * → 96 %), so the heading and the text read on any photo. ≤599 px the text takes most of the
 * shorter panel, so the mist starts higher.
 */
const MIST =
  "bg-[linear-gradient(180deg,transparent_25%,color-mix(in_oklab,var(--ig-bg)_90%,transparent)_60%,color-mix(in_oklab,var(--ig-bg)_96%,transparent)_100%)] max-sm:bg-[linear-gradient(180deg,transparent_5%,color-mix(in_oklab,var(--ig-bg)_90%,transparent)_38%,color-mix(in_oklab,var(--ig-bg)_96%,transparent)_100%)]";

/** Two panels side by side (half of the 1780 px content at 1920), one column ≤1100 px. */
const PHOTO_SIZES = "(max-width: 1100px) 100vw, (min-width: 1920px) 880px, 50vw";

export function PhotoPanels({ block, ctx }: { block: BlockOf<"cards">; ctx: PlaceholderContext }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;
  return (
    <div
      className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-sm:gap-4"
      data-testid="company-photo-panels"
    >
      {items.map((item, index) => {
        const media = asMedia(item.image);
        const src = media ? mediaSrc(media) : null;
        const headingId = `company-panel-${index + 1}`;
        return (
          <section
            key={item.id ?? index}
            aria-labelledby={headingId}
            className="border-line bg-well relative isolate flex min-h-[480px] items-end overflow-hidden rounded-xl border p-12 max-lg:min-h-[440px] max-lg:p-10 max-md:min-h-[400px] max-md:p-8 max-sm:min-h-[360px] max-sm:p-5"
          >
            {media && src ? (
              <Image
                src={src}
                alt={media.alt?.trim() ?? ""}
                fill
                sizes={PHOTO_SIZES}
                className="-z-20 object-cover"
              />
            ) : null}
            <span aria-hidden="true" className={cn("absolute inset-0 -z-10", MIST)} />
            <div className="flex max-w-[640px] flex-col gap-3.5 max-sm:gap-2">
              <h2 id={headingId} className={PANEL_HEADING}>
                {fill(item.title, ctx)}
              </h2>
              {hasText(item.text) ? (
                <p className="text-ink-2 m-0 text-[17px] leading-[1.55] text-pretty max-sm:text-base">
                  {fill(item.text, ctx)}
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Pills panels                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** «С кем работаем»: outline pills, each one a link to its segment page. */
export function ChipsPanel({
  block,
  ctx,
  headingId,
}: {
  block: BlockOf<"linkList">;
  ctx: PlaceholderContext;
  headingId: string;
}) {
  const heading = fill(block.heading, ctx);
  const items = (block.items ?? []).flatMap((item, index) => {
    const link = resolveLink(item.link);
    const label = fill(link?.label, ctx);
    return link && label ? [{ key: item.id ?? String(index), href: link.href, label }] : [];
  });
  if (items.length === 0) return null;
  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : {})}
      className={WHITE_PANEL}
      data-testid="company-clients"
    >
      {heading ? (
        <h2 id={headingId} className={PANEL_HEADING}>
          {heading}
        </h2>
      ) : null}
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.key} className="flex">
            <Link
              href={item.href}
              className={cn(
                PILL,
                "border-line text-text hover:border-brand hover:text-primary-pressed focus-visible:outline-brand ease-ig border no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «a · b · c» → `[a, b, c]` (the teksty list of the «Объекты» line). */
export const splitDotList = (text: string): string[] =>
  text
    .split(/\s+·\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * «Объекты»: the object names as tinted pills (plain text, the objects have no pages of their
 * own yet) and «Все объекты →» next to the heading. From a `cta` strip (heading, body, link).
 */
export function PillsPanel({
  block,
  ctx,
  headingId,
}: {
  block: BlockOf<"cta">;
  ctx: PlaceholderContext;
  headingId: string;
}) {
  const heading = fill(block.heading, ctx) || fill(block.title, ctx);
  const text = block.body ? fill(lexicalToPlainText(block.body), ctx) : "";
  const pills = splitDotList(text.replace(/\s+/g, " "));
  const link = resolveLink(block.link);
  const linkLabel = fill(link?.label, ctx);
  if (!heading && pills.length === 0) return null;
  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : {})}
      className={WHITE_PANEL}
      data-testid="company-objects"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {heading ? (
          <h2 id={headingId} className={PANEL_HEADING}>
            {heading}
          </h2>
        ) : null}
        {link && linkLabel ? (
          <TextLink href={link.href} variant="arrow" className="font-medium">
            {linkLabel}
          </TextLink>
        ) : null}
      </div>
      {pills.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {pills.map((pill, index) => (
            <li key={`${index}-${pill}`} className={cn(PILL, "bg-primary-light text-primary-dark")}>
              {pill}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Team                                                                                       */
/* ------------------------------------------------------------------------------------------ */

export interface TeamPanelProps {
  title: string;
  text: string;
  linkLabel: string;
  href: string;
  headingId: string;
  className?: string | undefined;
}

/** «Команда»: tinted panel, the text on top and «Сотрудники →» at the bottom. */
export function TeamPanel({ title, text, linkLabel, href, headingId, className }: TeamPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "bg-primary-light flex min-w-0 flex-col justify-between gap-8 rounded-xl p-12 max-lg:p-10 max-md:p-8 max-sm:gap-6 max-sm:p-5",
        className
      )}
      data-testid="team-teaser"
    >
      <div className="flex flex-col gap-4 max-sm:gap-3">
        <h2 id={headingId} className={PANEL_HEADING}>
          {title}
        </h2>
        <p className="text-ink-2 m-0 text-[17px] leading-[1.55] max-sm:text-base">{text}</p>
      </div>
      <Button
        asChild
        variant="secondary"
        size="l"
        className="self-start max-sm:self-stretch"
        rightIcon={<ArrowRight aria-hidden="true" />}
      >
        <Link href={href}>{linkLabel}</Link>
      </Button>
    </section>
  );
}
