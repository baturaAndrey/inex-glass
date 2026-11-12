import { Fragment, type ReactNode } from "react";
import { Info, MapPin } from "lucide-react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import {
  BlockImage,
  asMedia,
  fill,
  hasText,
  resolveLink,
  type LinkValue,
} from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import { TextLink } from "@/components/ig/text-link";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { inlineBold, parseCardText } from "./card-text";

/**
 * Sections of `/proektirovanie/` and `/proizvodstvo/` (Paper mockups `2560_proektirovanie` /
 * `2560_proizvodstvo`, 2026-11-12). Each one reads a block of the page document (the route picks
 * them by `anchorId`); photos fall back to placeholders until an editor uploads them.
 */

const EYEBROW = "m-0 text-[13px] leading-4 font-semibold tracking-[0.08em] uppercase";
const PHOTO = "Фото";

interface Common {
  ctx: PlaceholderContext;
  headingId: string;
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="ig-h2 m-0 text-balance">
      {children}
    </h2>
  );
}

/** «Название →» link of a card or a step. */
function ArrowLink({
  link,
  label,
  onDark = false,
}: {
  link: LinkValue | null | undefined;
  label?: string | null | undefined;
  onDark?: boolean;
}) {
  const resolved = resolveLink(link);
  const text = (label ?? "").trim() || resolved?.label;
  if (!resolved || !text) return null;
  return (
    <TextLink
      href={resolved.href}
      variant="arrow"
      className={cn("text-[15px] font-medium", onDark && "text-on-navy hover:text-on-navy-2")}
    >
      {text}
    </TextLink>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Facts strip                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** A short value («800 м²») is a figure; longer ones are a phrase. */
const isFigure = (value: string) => /\d/.test(value) && value.length <= 10;

/**
 * Facts under the hero, from a `table` block: column labels; row 1 — values; row 2 (optional) —
 * notes. `light`: a white strip (design); `dark`: the deep-teal strip (production).
 */
export function FactsStrip({
  block,
  ctx,
  tone,
}: {
  block: BlockOf<"table">;
  ctx: PlaceholderContext;
  tone: "light" | "dark";
}) {
  const columns = block.table?.columns ?? [];
  const [values, notes] = block.table?.rows ?? [];
  if (columns.length === 0 || !values) return null;
  const dark = tone === "dark";
  return (
    <dl
      className={cn(
        // Gap under the hero photo (mockup: 40 px).
        "m-0 mt-10 grid max-md:grid-cols-1 max-sm:mt-6",
        dark
          ? "bg-primary-dark text-on-navy grid-cols-3 rounded-xl px-12 py-10 max-lg:px-8 max-sm:rounded-lg max-sm:px-5 max-sm:py-6"
          : "bg-surface grid-cols-[1.4fr_1fr_1fr] rounded-lg py-8 max-sm:py-5"
      )}
      data-testid={`facts-${tone}`}
    >
      {columns.map((column, index) => {
        const value = fill(values.cells?.[index]?.value, ctx);
        const note = fill(notes?.cells?.[index]?.value, ctx);
        return (
          <div
            key={column.id ?? index}
            className={cn(
              "flex flex-col gap-2.5",
              dark
                ? "px-10 not-first:border-l not-first:border-white/15 first:pl-0 last:pr-0 max-lg:px-6 max-md:px-0 max-md:not-first:border-t max-md:not-first:border-l-0 max-md:not-first:pt-6 max-md:not-last:pb-6"
                : "border-hairline px-8 not-first:border-l max-md:not-first:border-t max-md:not-first:border-l-0 max-md:not-first:pt-5 max-md:not-last:pb-5 max-sm:px-5"
            )}
          >
            <dt className={cn(EYEBROW, dark ? "text-line-teal" : "text-text-2")}>
              {fill(column.label, ctx)}
            </dt>
            <dd className="m-0 flex flex-col gap-2.5">
              <span
                className={
                  dark
                    ? isFigure(value)
                      ? "text-[56px] leading-none font-bold tracking-[-0.02em] tabular-nums max-lg:text-[44px] max-sm:text-[36px]"
                      : "text-[24px] leading-[1.35] font-semibold max-lg:text-[20px]"
                    : "text-text text-[17px] leading-normal"
                }
              >
                {value}
              </span>
              {note ? (
                <span className="text-on-navy-2 text-base leading-normal">{note}</span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Numbered rows («Какие проблемы снимает проект»)                                             */
/* ------------------------------------------------------------------------------------------ */

export function NumberedRows({ block, ctx, headingId }: Common & { block: BlockOf<"cards"> }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  return (
    <section
      aria-labelledby={headingId}
      className="grid grid-cols-[560px_minmax(0,1fr)] items-start gap-20 max-xl:grid-cols-[400px_minmax(0,1fr)] max-xl:gap-12 max-md:grid-cols-1 max-md:gap-8"
      data-testid="engineering-problems"
    >
      <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
      <ol className="border-line m-0 list-none border-t p-0">
        {items.map((item, index) => (
          <li
            key={item.id ?? index}
            className="border-line flex gap-8 border-b py-8 max-sm:gap-4 max-sm:py-6"
          >
            <span
              aria-hidden="true"
              className="text-brand w-14 shrink-0 text-[24px] leading-[1.3] font-semibold tabular-nums max-sm:w-8 max-sm:text-lg"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 flex-col gap-2.5">
              <h3 className="m-0 text-[24px] leading-[1.3] font-semibold max-sm:text-lg">
                {fill(item.title, ctx)}
              </h3>
              {hasText(item.text) ? (
                <p className="text-text-2 m-0 max-w-[900px] text-[17px] leading-[1.55] max-sm:text-base">
                  {fill(item.text, ctx)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Two levels of a project (compare block)                                                     */
/* ------------------------------------------------------------------------------------------ */

export function LevelCards({ block, ctx, headingId }: Common & { block: BlockOf<"compare"> }) {
  const rows = block.rows ?? [];
  const sides = [
    { title: fill(block.leftTitle, ctx), key: "left" as const, dark: false },
    { title: fill(block.rightTitle, ctx), key: "right" as const, dark: true },
  ];
  const sub = fill(block.sub, ctx);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid="engineering-levels"
    >
      <div className="flex items-end justify-between gap-20 max-md:flex-col max-md:items-start max-md:gap-4">
        <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
        {sub ? (
          <p className="text-text-2 m-0 w-[640px] max-w-full shrink-0 text-[17px] leading-[1.55] max-md:w-auto">
            {sub}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-sm:gap-4">
        {sides.map((side, index) => (
          <article
            key={side.key}
            className={cn(
              "flex flex-col gap-7 rounded-lg p-10 max-lg:p-8 max-sm:gap-5 max-sm:p-5",
              side.dark ? "bg-primary-dark text-on-navy" : "bg-surface"
            )}
          >
            <div className="flex flex-col gap-3">
              <p className={cn(EYEBROW, side.dark ? "text-line-teal" : "text-text-2")}>
                Уровень {index + 1}
              </p>
              <h3 className="m-0 text-[32px] leading-[1.2] font-bold max-sm:text-[22px]">
                {side.title}
              </h3>
            </div>
            <dl className="m-0 flex flex-col">
              {rows.map((row, rowIndex) => (
                <div
                  key={row.id ?? rowIndex}
                  className={cn(
                    "grid grid-cols-[140px_minmax(0,1fr)] gap-6 border-t py-[18px] max-sm:grid-cols-1 max-sm:gap-1 max-sm:py-3 md:min-h-[85px] md:last:min-h-0",
                    side.dark ? "border-white/15" : "border-hairline"
                  )}
                >
                  <dt
                    className={cn(
                      "text-[15px] leading-normal font-medium",
                      side.dark ? "text-line-teal" : "text-text-2"
                    )}
                  >
                    {fill(row.topic, ctx)}
                  </dt>
                  <dd className="m-0 text-base leading-normal">{fill(row[side.key], ctx)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Feature cards: photo on top («Что проектируем») or on the side («Что делаем в цехе»)       */
/* ------------------------------------------------------------------------------------------ */

function CardPhoto({ image, className }: { image: unknown; className: string }) {
  const media = asMedia(image);
  if (media) {
    return (
      <BlockImage
        media={media}
        size="card"
        sizes="(max-width: 1100px) 100vw, 600px"
        frameClassName={cn("aspect-auto", className)}
      />
    );
  }
  return <Placeholder label={PHOTO} className={cn("aspect-auto rounded-none", className)} />;
}

export function FeatureCards({
  block,
  ctx,
  headingId,
  variant,
}: Common & { block: BlockOf<"cards">; variant: "top" | "side" }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  const sub = fill(block.sub, ctx);
  const side = variant === "side";
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid={`engineering-cards-${variant}`}
    >
      <div className="flex flex-col gap-4">
        <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
        {sub ? <p className="text-text-2 m-0 text-[17px] leading-[1.55]">{sub}</p> : null}
      </div>
      <ul
        className={cn(
          "m-0 grid list-none gap-6 p-0 max-sm:gap-4",
          side
            ? "grid-cols-2 max-xl:grid-cols-1"
            : "grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1"
        )}
      >
        {items.map((item, index) => {
          const text = parseCardText(fill(item.text, ctx));
          return (
            <li
              key={item.id ?? index}
              className={cn(
                "bg-surface flex overflow-hidden",
                side
                  ? "border-line rounded-xl border max-sm:flex-col max-sm:rounded-lg"
                  : "flex-col rounded-lg"
              )}
            >
              <CardPhoto
                image={item.image}
                className={
                  side
                    ? "w-[340px] shrink-0 max-lg:w-[260px] max-sm:aspect-[16/9] max-sm:w-full"
                    : "h-[300px] shrink-0 max-sm:aspect-[4/3] max-sm:h-auto"
                }
              />
              <div
                className={cn(
                  "flex grow flex-col gap-4",
                  side ? "gap-5 px-9 pt-9 pb-10 max-lg:p-6 max-sm:p-5" : "p-8 max-sm:p-5"
                )}
              >
                <h3
                  className={cn(
                    "m-0",
                    side
                      ? "text-[26px] leading-[1.2] font-bold max-sm:text-xl"
                      : "text-[24px] leading-[1.3] font-semibold max-sm:text-xl"
                  )}
                >
                  {fill(item.title, ctx)}
                </h3>
                {text.intro.map((line, lineIndex) => (
                  <p
                    key={lineIndex}
                    className={cn(
                      "m-0 text-base leading-normal",
                      side ? "text-text font-medium" : "text-text-2"
                    )}
                  >
                    {inlineBold(line)}
                  </p>
                ))}
                {text.bullets.length > 0 ? (
                  <ul
                    className={cn(
                      "m-0 flex list-none flex-col p-0",
                      side ? "gap-3" : "border-hairline gap-2.5 border-t pt-4"
                    )}
                  >
                    {text.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={bulletIndex}
                        className={cn(
                          "flex items-start gap-3 leading-normal",
                          side ? "text-ink-3 text-base" : "text-text text-[15px]"
                        )}
                      >
                        {side ? (
                          <span
                            aria-hidden="true"
                            className="bg-brand mt-2.5 size-1.5 shrink-0 rounded-full"
                          />
                        ) : (
                          <span aria-hidden="true" className="shrink-0">
                            —
                          </span>
                        )}
                        <span>{inlineBold(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto empty:hidden">
                  <ArrowLink link={item.link} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tables («Что входит в работу», «Что делают партнёры»)                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Two-column table in a white card. `plain` (scope): uppercase header over a hairline, footnote
 * under the rows. `boxed` (partners): bordered card with a tinted header row. ≤599 px the rows
 * become stacked pairs.
 */
export function TablePanel({
  block,
  ctx,
  variant,
  caption,
  className,
}: {
  block: BlockOf<"table">;
  ctx: PlaceholderContext;
  variant: "plain" | "boxed";
  caption: string;
  className?: string | undefined;
}) {
  const columns = block.table?.columns ?? [];
  const rows = block.table?.rows ?? [];
  const footnote = fill(block.table?.footnote, ctx);
  const boxed = variant === "boxed";
  const firstCol = boxed ? "w-[420px] max-xl:w-[300px]" : "w-[280px] max-lg:w-[220px]";
  return (
    <div
      className={cn(
        "bg-surface min-w-0",
        boxed
          ? "border-line overflow-hidden rounded-xl border max-sm:rounded-lg"
          : "rounded-lg px-10 pt-2 pb-8 max-lg:px-8 max-sm:px-5 max-sm:pb-5",
        className
      )}
    >
      <table className="w-full border-collapse text-left max-sm:block">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-sm:hidden">
          <tr className={boxed ? "bg-tint-green" : "border-line border-b"}>
            {columns.map((column, index) => (
              <th
                key={column.id ?? index}
                scope="col"
                className={cn(
                  EYEBROW,
                  "text-text-2 align-bottom",
                  boxed ? "px-8 py-[18px]" : "pt-5 pb-3.5",
                  index === 0 && firstCol,
                  index === 0 && !boxed && "pr-8"
                )}
              >
                {fill(column.label, ctx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-sm:block">
          {rows.map((row, rowIndex) => {
            const [head, ...cells] = row.cells ?? [];
            return (
              <tr
                key={row.id ?? rowIndex}
                className={cn(
                  "max-sm:flex max-sm:flex-col max-sm:gap-1",
                  boxed
                    ? "border-hairline border-t max-sm:px-5 max-sm:py-4"
                    : "border-hairline border-b max-sm:py-4"
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "text-text align-top text-lg leading-[1.4] font-semibold max-sm:p-0 max-sm:text-base",
                    boxed ? "px-8 py-6" : "py-[22px] pr-8",
                    firstCol,
                    "max-sm:w-auto"
                  )}
                >
                  {fill(head?.value, ctx)}
                </th>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cell.id ?? cellIndex}
                    className={cn(
                      "text-ink-3 align-top leading-[1.55] max-sm:p-0 max-sm:text-[15px]",
                      boxed ? "px-8 py-6 text-[17px]" : "py-[22px] text-base"
                    )}
                  >
                    {fill(cell.value, ctx)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footnote ? (
        <p className="text-text-2 m-0 pt-6 text-[15px] leading-normal max-sm:pt-4">{footnote}</p>
      ) : null}
    </div>
  );
}

/** «Что делают партнёры»: heading on the left, the boxed table on the right. */
export function SideTableSection({ block, ctx, headingId }: Common & { block: BlockOf<"table"> }) {
  const heading = fill(block.heading, ctx);
  return (
    <section
      aria-labelledby={headingId}
      className="grid grid-cols-[560px_minmax(0,1fr)] items-start gap-20 max-xl:grid-cols-[400px_minmax(0,1fr)] max-xl:gap-12 max-md:grid-cols-1 max-md:gap-8"
      data-testid="engineering-partners"
    >
      <Heading id={headingId}>{heading}</Heading>
      <TablePanel block={block} ctx={ctx} variant="boxed" caption={heading} />
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* «Что входит в работу» + «Кто проектирует»                                                   */
/* ------------------------------------------------------------------------------------------ */

export function ScopeSection({
  block,
  team,
  ctx,
  headingId,
  teamHeadingId,
}: Common & {
  block: BlockOf<"table">;
  team: BlockOf<"cta"> | null;
  teamHeadingId: string;
}) {
  const heading = fill(block.heading, ctx);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid="engineering-scope"
    >
      <Heading id={headingId}>{heading}</Heading>
      <div className="grid grid-cols-[minmax(0,1fr)_520px] items-stretch gap-6 max-xl:grid-cols-[minmax(0,1fr)_420px] max-md:grid-cols-1 max-sm:gap-4">
        <TablePanel block={block} ctx={ctx} variant="plain" caption={heading} />
        {team ? <TeamPanel block={team} ctx={ctx} headingId={teamHeadingId} /> : null}
      </div>
    </section>
  );
}

/** «Кто проектирует»: the section name is the H2 (eyebrow style), the claim is the big line. */
function TeamPanel({ block, ctx, headingId }: Common & { block: BlockOf<"cta"> }) {
  const media = asMedia((block as { image?: unknown }).image);
  return (
    <section
      aria-labelledby={headingId}
      className="bg-primary-dark text-on-navy flex flex-col gap-5 rounded-lg p-10 max-lg:p-8 max-sm:p-5"
      data-testid="engineering-team"
    >
      <h2 id={headingId} className={cn(EYEBROW, "text-line-teal")}>
        {fill(block.heading, ctx)}
      </h2>
      {hasText(block.title) ? (
        <p className="m-0 text-[32px] leading-[1.2] font-bold text-balance max-lg:text-[26px] max-sm:text-[22px]">
          {fill(block.title, ctx)}
        </p>
      ) : null}
      {block.body ? (
        <div className="text-on-navy-2 text-[17px] leading-[1.55] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-inherit">
          <RichText data={block.body} ctx={ctx} disableContainer />
        </div>
      ) : null}
      {media ? (
        <BlockImage
          media={media}
          size="card"
          sizes="520px"
          frameClassName="min-h-45 grow rounded-md aspect-auto"
        />
      ) : (
        <div
          aria-hidden="true"
          className="text-on-navy-2 grid min-h-45 grow place-items-center rounded-md bg-white/5 text-xs leading-4 font-medium tracking-[0.06em] uppercase"
        >
          {PHOTO}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Steps                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Numbered step cards; the last one is deep-teal. `big`: 48 px digits, 4 per row (design, 8
 * steps); `circle`: digit in a tinted circle, 5 per row (production).
 */
export function StepCards({
  block,
  ctx,
  headingId,
  marker,
}: Common & { block: BlockOf<"steps">; marker: "big" | "circle" }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  const circle = marker === "circle";
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid={`engineering-steps-${marker}`}
    >
      <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
      <ol
        className={cn(
          "m-0 grid list-none p-0 max-sm:grid-cols-1",
          circle
            ? "grid-cols-5 gap-4 max-xl:grid-cols-3 max-md:grid-cols-2"
            : "grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:gap-4"
        )}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={item.id ?? index}
              className={cn(
                "flex flex-col gap-3.5 max-sm:p-5",
                circle ? "rounded-xl px-7 py-8 max-sm:rounded-lg" : "rounded-lg p-8",
                last
                  ? "bg-primary-dark text-on-navy"
                  : cn("bg-surface", circle && "border-line border")
              )}
            >
              {circle ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold",
                    last ? "bg-brand text-on-navy" : "bg-primary-light text-primary-dark"
                  )}
                >
                  {index + 1}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[48px] leading-none font-bold tabular-nums max-sm:text-[36px]",
                    last ? "text-line-teal" : "text-brand"
                  )}
                >
                  {index + 1}
                </span>
              )}
              <h3 className="m-0 text-xl leading-[1.3] font-semibold">{fill(item.title, ctx)}</h3>
              {hasText(item.text) ? (
                <p
                  className={cn(
                    "m-0 leading-normal",
                    circle ? "text-base" : "text-[15px]",
                    last ? "text-on-navy-2" : "text-text-2"
                  )}
                >
                  {fill(item.text, ctx)}
                </p>
              ) : null}
              <div className="mt-auto empty:hidden">
                <ArrowLink link={item.link} label={item.linkLabel} onDark={last} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Workshop zones                                                                              */
/* ------------------------------------------------------------------------------------------ */

function FlowArrow({ partition = false }: { partition?: boolean }) {
  return (
    <li
      aria-hidden="true"
      className="flex w-7 shrink-0 flex-col items-center justify-center gap-2 max-md:h-7 max-md:w-auto max-md:flex-row"
    >
      {partition ? (
        <span className="bg-gray-1 w-1 grow rounded-xs max-md:h-1 max-md:w-auto" />
      ) : null}
      <svg
        viewBox="0 0 24 24"
        className="text-brand size-7 shrink-0 max-md:rotate-90"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      {partition ? (
        <span className="bg-gray-1 w-1 grow rounded-xs max-md:h-1 max-md:w-auto" />
      ) : null}
    </li>
  );
}

/**
 * «Как устроен цех»: zones 1–4 as a one-way flow (a partition between 2 and 3, the last zone in
 * deep teal), then zone 5 (warehouse, outside the flow) and the crane note (`callout` block).
 */
export function ZonesFlow({
  block,
  crane,
  ctx,
  headingId,
}: Common & { block: BlockOf<"cards">; crane: BlockOf<"callout"> | null }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  const flow = items.slice(0, 4);
  const extra = items.slice(4);
  const sub = fill(block.sub, ctx);
  const zoneNumber = (index: number) => String(index + 1).padStart(2, "0");
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid="engineering-zones"
    >
      <div className="flex items-end justify-between gap-20 max-md:flex-col max-md:items-start max-md:gap-4">
        <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
        {sub ? (
          <p className="text-ink-3 text-lead-m m-0 w-[820px] max-w-full shrink-0 max-md:w-auto">
            {sub}
          </p>
        ) : null}
      </div>
      <ol className="m-0 flex list-none gap-3 p-0 max-md:flex-col">
        {flow.map((item, index) => {
          const last = index === flow.length - 1;
          return (
            <Fragment key={item.id ?? index}>
              {index > 0 ? <FlowArrow partition={index === 2} /> : null}
              <li
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-4 rounded-xl p-8 max-lg:p-6 max-sm:rounded-lg max-sm:p-5",
                  last ? "bg-primary-dark text-on-navy" : "bg-surface border-line border"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[48px] leading-none font-bold tracking-[-0.02em] tabular-nums max-sm:text-[36px]",
                    last ? "text-line-teal" : "text-brand"
                  )}
                >
                  {zoneNumber(index)}
                </span>
                <h3 className="m-0 text-[22px] leading-[1.25] font-semibold">
                  {fill(item.title, ctx)}
                </h3>
                {hasText(item.text) ? (
                  <p
                    className={cn(
                      "m-0 text-base leading-normal",
                      last ? "text-on-navy-2" : "text-text-2"
                    )}
                  >
                    {fill(item.text, ctx)}
                  </p>
                ) : null}
              </li>
            </Fragment>
          );
        })}
      </ol>
      {extra.length > 0 || crane ? (
        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-sm:gap-4">
          {extra.map((item, index) => (
            <div
              key={item.id ?? index}
              className="bg-well flex items-start gap-6 rounded-xl p-8 max-sm:gap-4 max-sm:rounded-lg max-sm:p-5"
            >
              <span
                aria-hidden="true"
                className="text-text-2 shrink-0 text-[48px] leading-none font-bold tracking-[-0.02em] tabular-nums max-sm:text-[36px]"
              >
                {zoneNumber(flow.length + index)}
              </span>
              <div className="flex flex-col gap-2.5">
                <h3 className="m-0 text-[22px] leading-[1.25] font-semibold">
                  {fill(item.title, ctx)}
                </h3>
                {hasText(item.text) ? (
                  <p className="text-text-2 m-0 text-base leading-normal">{fill(item.text, ctx)}</p>
                ) : null}
              </div>
            </div>
          ))}
          {crane?.body ? (
            <div
              className="bg-primary-light flex items-start gap-5 rounded-xl p-8 max-sm:gap-3 max-sm:rounded-lg max-sm:p-5"
              data-testid="engineering-crane"
            >
              <Info aria-hidden="true" className="text-primary-pressed size-7 shrink-0" />
              <div className="text-text text-lg leading-normal font-medium [&_p]:m-0 [&_p]:max-w-none [&_p]:text-inherit">
                <RichText data={crane.body} ctx={ctx} disableContainer />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Site gallery («Площадка»)                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function SiteGallery({ block, ctx, headingId }: Common & { block: BlockOf<"cards"> }) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  const location = fill(block.sub, ctx);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-10 max-sm:gap-6"
      data-testid="engineering-site"
    >
      <div className="flex items-end justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <Heading id={headingId}>{fill(block.heading, ctx)}</Heading>
        {location ? (
          <p className="text-text m-0 flex items-center gap-2.5 text-[19px] leading-normal font-medium max-sm:text-base">
            <MapPin aria-hidden="true" className="text-brand size-[22px] shrink-0" />
            {location}
          </p>
        ) : null}
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-x-6 gap-y-6 p-0 max-md:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-5">
        {items.map((item, index) => {
          const media = asMedia(item.image);
          return (
            <li key={item.id ?? index} className="flex flex-col gap-3 max-sm:gap-2">
              {media ? (
                <BlockImage
                  media={media}
                  size="card"
                  sizes="(max-width: 1100px) 50vw, 33vw"
                  frameClassName="aspect-[577/360] rounded-lg"
                />
              ) : (
                <Placeholder ratio="577/360" label={PHOTO} className="rounded-lg" />
              )}
              <p className="text-text m-0 text-base leading-[1.4] font-medium max-sm:text-sm">
                {fill(item.title, ctx)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Light «Монтаж» panel                                                                        */
/* ------------------------------------------------------------------------------------------ */

export function LightPanel({
  block,
  ctx,
  page,
  headingId,
}: Common & { block: BlockOf<"cta">; page: BlockPageContext }) {
  const title = fill(block.title, ctx) || fill(block.heading, ctx);
  return (
    <section
      aria-labelledby={headingId}
      className="bg-primary-light flex items-end justify-between gap-16 rounded-xl px-16 py-14 max-lg:px-12 max-lg:py-12 max-md:flex-col max-md:items-start max-md:gap-8 max-sm:rounded-lg max-sm:px-5 max-sm:py-8"
      data-testid="engineering-montage"
    >
      <div className="flex max-w-[880px] min-w-0 flex-col gap-5 max-sm:gap-3">
        <Heading id={headingId}>{title}</Heading>
        {block.body ? (
          <div className="text-text-2 text-lead-m text-pretty [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
            <RichText data={block.body} ctx={ctx} disableContainer />
          </div>
        ) : null}
      </div>
      <CtaButtons
        buttons={block.buttons}
        ctx={ctx}
        page={page}
        className="shrink-0 max-sm:w-full"
      />
    </section>
  );
}
