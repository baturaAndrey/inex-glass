import type { ReactNode } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { fill } from "@/components/blocks/shared";
import { PANEL_HEADING, PILL, WHITE_PANEL } from "@/components/company/company-pieces";
import { TextLink } from "@/components/ig/text-link";
import {
  splitFirstList,
  splitLeadingHeading,
  splitTrailingLinks,
  type PlainLink,
} from "@/components/rich-text/lexical-parts";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";

/**
 * Panels of the construction pages (Paper mockup `2560_steklyannye-peregorodki`, section
 * `FCI-0`): white panels with a heading, rich text and a closing row of arrow links; the profile
 * systems as pills; the glass bullets with teal dots; the warning block «Главный риск — проём»
 * with its list as white sub-cards. Everything is read from CMS rich text — the helpers of
 * `@/components/rich-text/lexical-parts` only cut it into the parts the layout shows apart.
 */

/** Rich text of a panel: 17 px ink-3 paragraphs, bold leads in the text colour, dot lists. */
export const PANEL_TEXT = cn(
  "flex min-w-0 flex-col gap-4",
  "[&_p]:text-ink-3 [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[17px] [&_p]:leading-[1.55] max-sm:[&_p]:text-base",
  "[&_strong]:text-text [&_strong]:font-semibold [&_a]:text-[length:inherit]",
  // Lists: teal dots (bullets) / bold brand numbers, 16 px, 16 px apart.
  "[&_ul]:text-ink-3 [&_ul]:max-w-none [&_ul]:list-none [&_ul]:gap-4 [&_ul]:pl-0 [&_ul]:text-base [&_ul]:leading-[1.55]",
  "[&_ul>li]:relative [&_ul>li]:pl-5 [&_ul>li]:before:absolute [&_ul>li]:before:top-[9px] [&_ul>li]:before:left-0 [&_ul>li]:before:size-2 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-brand [&_ul>li]:before:content-['']",
  "[&_ol]:text-ink-3 [&_ol]:max-w-none [&_ol]:gap-3 [&_ol]:text-base [&_ol]:leading-[1.55] [&_ol]:marker:font-bold [&_ol]:marker:text-primary-pressed"
);

/** «Все объекты →», «Документы →»: arrow links under the text. */
export function PanelLinks({
  links,
  className,
}: {
  links: readonly PlainLink[];
  className?: string | undefined;
}) {
  if (links.length === 0) return null;
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      {links.map((link) => (
        <TextLink
          key={`${link.href}-${link.label}`}
          href={link.href}
          variant="arrow"
          external={link.external}
          className="font-medium"
        >
          {link.label}
        </TextLink>
      ))}
    </div>
  );
}

export interface TextPanelProps {
  /** Heading; without it the leading heading of the rich text is used. */
  heading?: string | null | undefined;
  headingId: string;
  body: RichTextData | null | undefined;
  ctx: PlaceholderContext;
  /** Links added after the ones that close the text (e.g. «Все объекты» when the text has none). */
  extraLinks?: readonly PlainLink[] | undefined;
  /** Content under the text (object cards). */
  children?: ReactNode;
  testId?: string | undefined;
  className?: string | undefined;
}

/** White panel: heading, rich text, the closing links as an arrow-link column. */
export function TextPanel({
  heading,
  headingId,
  body,
  ctx,
  extraLinks = [],
  children,
  testId = "construction-panel",
  className,
}: TextPanelProps) {
  const lead = heading ? { heading, body: body ?? null } : splitLeadingHeading(body);
  const { body: text, links } = splitTrailingLinks(lead.body);
  const allLinks = [
    ...links,
    ...extraLinks.filter((extra) => !links.some((link) => link.href === extra.href)),
  ];
  const title = fill(lead.heading, ctx);
  if (!title && !text && allLinks.length === 0 && !children) return null;
  return (
    <section
      {...(title ? { "aria-labelledby": headingId } : {})}
      className={cn(WHITE_PANEL, "gap-5", className)}
      data-testid={testId}
    >
      {title ? (
        <h2 id={headingId} className={PANEL_HEADING}>
          {title}
        </h2>
      ) : null}
      {text ? <RichText data={text} ctx={ctx} className={PANEL_TEXT} /> : null}
      {children}
      <PanelLinks links={allLinks} />
    </section>
  );
}

/** Two panels side by side (one column ≤1100 px); a single panel takes the full width. */
export function PanelRow({ children, count }: { children: ReactNode; count: number }) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-6 max-md:grid-cols-1 max-sm:gap-4",
        count > 1 ? "grid-cols-2" : "grid-cols-1"
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Profile systems + glass                                                                    */
/* ------------------------------------------------------------------------------------------ */

type ProfileSystem = NonNullable<Construction["profileSystems"]>[number];

/**
 * Large value plates (mockup `2560_furnitura`, «Зажимной профиль»: the glass thicknesses):
 * 26 px bold on primary-light, smaller on phones.
 */
const PLATE =
  "inline-flex items-center rounded-full px-[30px] py-[18px] text-[26px] leading-8 font-bold tabular-nums max-sm:px-5 max-sm:py-3 max-sm:text-[20px] max-sm:leading-6";

/**
 * «Профильные системы»: intro text (slot `profile`) and the systems as tinted pills; with
 * `size="plate"` the entries are large value plates («10 мм», «12 мм»… on `/furnitura/`).
 */
export function ProfilePanel({
  heading,
  intro,
  systems,
  ctx,
  size = "pill",
}: {
  heading: string;
  intro: ReactNode;
  systems: readonly ProfileSystem[];
  ctx: PlaceholderContext;
  size?: "pill" | "plate" | undefined;
}) {
  const shape = size === "plate" ? PLATE : cn(PILL, "font-semibold");
  const headingId = "construction-profiles-title";
  const pills = systems.flatMap((system, index) => {
    const name = fill(system.name, ctx);
    return name ? [{ key: system.id ?? String(index), name, url: system.url?.trim() || null }] : [];
  });
  return (
    <section
      aria-labelledby={headingId}
      className={cn(WHITE_PANEL, "gap-6")}
      data-testid="construction-profiles"
    >
      <h2 id={headingId} className={PANEL_HEADING}>
        {heading}
      </h2>
      {intro}
      {pills.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {pills.map((pill) => (
            <li key={pill.key} className="flex">
              {pill.url ? (
                <Link
                  href={pill.url}
                  className={cn(
                    shape,
                    "bg-primary-light text-primary-dark hover:bg-line-teal focus-visible:outline-brand no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  )}
                >
                  {pill.name}
                </Link>
              ) : (
                <span className={cn(shape, "bg-primary-light text-primary-dark")}>{pill.name}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Glass bullets (one rich text each): teal dots, bold leads, links inline. */
export function GlassPanel({
  heading,
  bullets,
  ctx,
}: {
  heading: string;
  bullets: readonly RichTextData[];
  ctx: PlaceholderContext;
}) {
  const headingId = "construction-glass-title";
  return (
    <section
      aria-labelledby={headingId}
      className={cn(WHITE_PANEL, "gap-6")}
      data-testid="construction-glass"
    >
      <h2 id={headingId} className={PANEL_HEADING}>
        {heading}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-3">
            <span aria-hidden="true" className="bg-brand mt-[9px] size-2 shrink-0 rounded-full" />
            <div className="text-ink-3 [&_strong]:text-text min-w-0 text-base leading-[1.55] [&_a]:text-[length:inherit] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_strong]:font-semibold">
              <RichText data={bullet} ctx={ctx} disableContainer />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Warning block                                                                              */
/* ------------------------------------------------------------------------------------------ */

/** Rich text of the warning block: 16 px ink-3, links at the size of the text. */
const WARNING_TEXT =
  "text-ink-3 flex flex-col gap-3 text-base leading-[1.55] [&_a]:text-[length:inherit] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_strong]:text-text [&_strong]:font-semibold";

/**
 * «Главный риск — проём» (mockup frame `FJV-0`): warning panel; on the left the icon, the title
 * and the lead (text before the list), on the right the list items as white cards — numbered for
 * a numbered list — with the closing links of the text at the bottom of the last card. A text
 * without a list stays in the left column. ≤1535 px the cards go under the lead (one row; one
 * column ≤1100 px).
 */
export function WarningPanel({
  title,
  headingId,
  body,
  ctx,
  testId = "construction-warning",
}: {
  title: string;
  headingId: string;
  body: RichTextData | null | undefined;
  ctx: PlaceholderContext;
  testId?: string | undefined;
}) {
  const { before, items, ordered, after } = splitFirstList(body);
  const { body: afterText, links } = splitTrailingLinks(after);
  const lastIndex = items.length - 1;
  const columns = Math.min(items.length, 3);
  const List = ordered ? "ol" : "ul";

  return (
    <section
      {...(title ? { "aria-labelledby": headingId } : { "aria-label": "Важно" })}
      className="bg-warning-bg border-warning flex gap-10 rounded-xl border p-12 max-xl:flex-col max-xl:gap-8 max-lg:p-10 max-md:p-8 max-sm:gap-6 max-sm:p-5"
      data-testid={testId}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          items.length > 0
            ? "w-[360px] shrink-0 max-xl:w-auto max-xl:max-w-[880px]"
            : "max-w-[1100px]"
        )}
      >
        <TriangleAlert
          aria-hidden="true"
          strokeWidth={1.75}
          className="text-warning-text size-10"
        />
        {title ? (
          <h2 id={headingId} className={PANEL_HEADING}>
            {title}
          </h2>
        ) : null}
        {before ? <RichText data={before} ctx={ctx} className={WARNING_TEXT} /> : null}
        {afterText ? <RichText data={afterText} ctx={ctx} className={WARNING_TEXT} /> : null}
        {items.length === 0 ? <PanelLinks links={links} /> : null}
      </div>
      {items.length > 0 ? (
        <List
          className={cn(
            "m-0 grid min-w-0 flex-1 list-none gap-4 p-0 max-md:grid-cols-1 max-sm:gap-3",
            columns === 3 && "grid-cols-3",
            columns === 2 && "grid-cols-2",
            columns === 1 && "grid-cols-1"
          )}
        >
          {items.map((item, index) => (
            <li key={index} className="bg-surface flex flex-col gap-2.5 rounded-lg p-7 max-sm:p-5">
              {ordered ? (
                <span
                  aria-hidden="true"
                  className="text-warning-text text-[28px] leading-[34px] font-bold tabular-nums"
                >
                  {index + 1}
                </span>
              ) : null}
              <RichText data={item} ctx={ctx} className={WARNING_TEXT} />
              {index === lastIndex ? <PanelLinks links={links} className="mt-auto pt-2" /> : null}
            </li>
          ))}
        </List>
      ) : null}
    </section>
  );
}
