import type { ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { resolveLink } from "@/components/blocks/shared";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Accordion } from "@/components/ig/accordion";
import { Button } from "@/components/ig/button";
import { Callout } from "@/components/ig/callout";
import { Section, type SectionVariant } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { DRAWING_CTA_LABEL, QuizLink, fillLabel } from "@/components/page/quiz-cta";
import { RichText, safeExternalHref } from "@/components/rich-text/rich-text";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { JsonLd, faqLd } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { GlassType } from "@/payload-types";

/**
 * Typed sections of the glass-type template (`GlassTypePage`): tables, «Что важно знать»,
 * «Где применяют», FAQ and the closing buttons. Markup and spacing follow the `ct-*` classes of
 * `Osvetl.dc.html` / `Riflenoe.dc.html`, rewritten with Tailwind and the `ig-*` primitives.
 * The section background (`variant`) is chosen by the template, which keeps the bg ↔ sf rhythm.
 */

export type GlassTypeTable = NonNullable<GlassType["tables"]>[number];
export type GlassTypeImportantItem = NonNullable<GlassType["importantItems"]>[number];
export type GlassTypeApplication = NonNullable<GlassType["applications"]>[number];
export type GlassTypeRelatedLink = NonNullable<GlassType["relatedLinks"]>[number];
export type GlassTypeFaqItem = NonNullable<GlassType["faq"]>[number];
export type GlassTypeQuizPrefill = GlassType["quizPrefill"];

/* ------------------------------------------------------------------------------------------ */
/* Inline text                                                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * Inline markup allowed in plain-text CMS fields (table cells, footnotes, leads): `**bold**` and
 * links `[text](/path/)`. teksty put cross-links into such places («… подбирает расчётом
 * инженер. → [Проектирование]»), and a rich-text field there would be overkill for editors.
 */
const INLINE_TOKEN = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*/g;

/** Internal (`/path/`, `#anchor`) links use the router; anything unsafe stays plain text. */
function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const safe = safeExternalHref(href);
  if (!safe) return <>{children}</>;
  if (safe.startsWith("/") || safe.startsWith("#")) return <Link href={safe}>{children}</Link>;
  return (
    <a href={safe} rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** CMS text with placeholders substituted and the inline markup above rendered. */
export function InlineText({
  text,
  ctx,
}: {
  text: string | null | undefined;
  ctx: PlaceholderContext;
}) {
  const value = text ? replacePlaceholders(text, ctx) : "";
  if (!value) return null;

  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of value.matchAll(INLINE_TOKEN)) {
    const index = match.index;
    if (index > last) parts.push(value.slice(last, index));
    const [, linkText, href, bold] = match;
    parts.push(
      linkText !== undefined && href !== undefined ? (
        <InlineLink key={index} href={href}>
          {linkText}
        </InlineLink>
      ) : (
        <strong key={index}>{bold}</strong>
      )
    );
    last = index + match[0].length;
  }
  if (last < value.length) parts.push(value.slice(last));
  return <>{parts}</>;
}

/** `true` for a string with visible characters (column labels may be a single space). */
const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim() !== "";

/* ------------------------------------------------------------------------------------------ */
/* Section chrome                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** `.ct-h2`: section heading with the prototype's 16 px gap below. */
export function SectionTitle({ id, children }: { id?: string | undefined; children: ReactNode }) {
  return (
    <h2 id={id} className="ig-h2 mb-6 max-w-[900px] max-sm:mb-4">
      {children}
    </h2>
  );
}

interface TypedSectionProps {
  variant: SectionVariant;
  /** `id` of the section heading (`aria-labelledby`). */
  headingId?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

function TypedSection({ variant, headingId, className, children }: TypedSectionProps) {
  return (
    <Section
      variant={variant}
      className={className}
      {...(headingId ? { "aria-labelledby": headingId } : {})}
    >
      {children}
    </Section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tables                                                                                     */
/* ------------------------------------------------------------------------------------------ */

type TableCell = NonNullable<NonNullable<GlassTypeTable["rows"]>[number]["cells"]>[number];

/** Highlight of a «выгодное значение» cell (`.ct-pos`); `!` beats the zebra row background. */
const POSITIVE_CELL = "bg-primary-light! text-primary-dark font-medium";

function CellContent({ cell, ctx }: { cell: TableCell | undefined; ctx: PlaceholderContext }) {
  if (!cell) return null;
  const content = <InlineText text={cell.value} ctx={ctx} />;
  return hasText(cell.href) ? <InlineLink href={cell.href.trim()}>{content}</InlineLink> : content;
}

interface TableViewProps {
  table: GlassTypeTable;
  ctx: PlaceholderContext;
  /** `id` of the table heading (accessible name of the table). */
  labelledBy?: string | undefined;
}

const ALIGN_CLASS = { left: "text-left", center: "text-center", right: "text-right" } as const;

/**
 * Desktop table (≥600 px). `parameters` — «ключ — значение» without a header row, keys muted;
 * `comparison` / `schemes` / `other` — with a header row (an empty first header stays empty).
 */
function DesktopTable({ table, ctx, labelledBy }: TableViewProps) {
  const columns = table.columns ?? [];
  const rows = table.rows ?? [];
  const isParameters = table.role === "parameters";

  return (
    <div
      className={cn("ig-table-wrap max-sm:hidden", isParameters && "max-w-[900px]")}
      data-table-view="desktop"
    >
      <table className="ig-table" aria-labelledby={labelledBy}>
        {isParameters ? null : (
          <thead>
            <tr>
              {columns.map((column, index) =>
                hasText(column.label) ? (
                  <th
                    key={column.id ?? index}
                    scope="col"
                    className={ALIGN_CLASS[column.align ?? "left"]}
                  >
                    {replacePlaceholders(column.label, ctx)}
                  </th>
                ) : (
                  // An empty corner cell is not a header (no empty `th` for screen readers).
                  <td key={column.id ?? index} />
                )
              )}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columns.map((column, columnIndex) => {
                const cell = row.cells?.[columnIndex];
                return (
                  <td
                    key={column.id ?? columnIndex}
                    data-positive={cell?.positive ? "" : undefined}
                    className={cn(
                      ALIGN_CLASS[column.align ?? "left"],
                      column.numeric && "ig-num",
                      isParameters && columnIndex === 0 && "text-text-2 w-[220px] max-md:w-[180px]",
                      cell?.positive && POSITIVE_CELL
                    )}
                  >
                    <CellContent cell={cell} ctx={ctx} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Phone cards (`.ig-mcard`, ≤599 px): the first cell is the title, the other columns follow as
 * «label / value» (labels above the values: the cells are sentences, not numbers).
 */
function MobileCards({ table, ctx }: TableViewProps) {
  const columns = table.columns ?? [];
  return (
    <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex" data-table-view="cards">
      {(table.rows ?? []).map((row, rowIndex) => (
        <li key={row.id ?? rowIndex} className="ig-mcard">
          <p className="text-h6 m-0 font-semibold">
            <CellContent cell={row.cells?.[0]} ctx={ctx} />
          </p>
          <dl className="m-0 flex flex-col gap-2">
            {columns.slice(1).map((column, index) => {
              const cell = row.cells?.[index + 1];
              const label = hasText(column.label) ? replacePlaceholders(column.label, ctx) : null;
              return (
                <div key={column.id ?? index} className="flex flex-col gap-0.5">
                  {label ? <dt className="text-small text-text-2">{label}</dt> : null}
                  <dd
                    className={cn(
                      "text-small m-0",
                      cell?.positive && "text-primary-dark font-medium"
                    )}
                  >
                    <CellContent cell={cell} ctx={ctx} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/**
 * Phone pairs (`.ig-pair`, ≤599 px) for comparisons: the criterion and the «ordinary» values on
 * a neutral strip, the last («our») column on the primary-light strip.
 */
function MobilePairs({ table, ctx }: TableViewProps) {
  const columns = table.columns ?? [];
  const lastIndex = columns.length - 1;
  const last = columns[lastIndex];
  return (
    <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex" data-table-view="pairs">
      {(table.rows ?? []).map((row, rowIndex) => (
        <li key={row.id ?? rowIndex} className="ig-pair">
          <div className="ig-pair__self bg-bg">
            <span className="ig-pair__lbl text-text-2">
              <CellContent cell={row.cells?.[0]} ctx={ctx} />
            </span>
            {columns.slice(1, lastIndex).map((column, index) => (
              <span key={column.id ?? index} className="block">
                {hasText(column.label) ? `${replacePlaceholders(column.label, ctx)}: ` : null}
                <CellContent cell={row.cells?.[index + 1]} ctx={ctx} />
              </span>
            ))}
          </div>
          {last && lastIndex > 0 ? (
            <div className="ig-pair__inex">
              {hasText(last.label) ? (
                <span className="ig-pair__lbl">{replacePlaceholders(last.label, ctx)}</span>
              ) : null}
              <CellContent cell={row.cells?.[lastIndex]} ctx={ctx} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export interface TableSectionProps {
  table: GlassTypeTable;
  ctx: PlaceholderContext;
  variant: SectionVariant;
  headingId: string;
}

/** One entry of `tables[]`: heading, lead, table (cards / pairs on phones), footnote. */
export function TableSection({ table, ctx, variant, headingId }: TableSectionProps) {
  if ((table.columns ?? []).length === 0 || (table.rows ?? []).length === 0) return null;
  const heading = table.heading ? replacePlaceholders(table.heading, ctx).trim() : "";
  const labelledBy = heading ? headingId : undefined;

  return (
    <TypedSection variant={variant} headingId={labelledBy}>
      <div data-glass-table={table.role ?? "other"}>
        {heading ? <SectionTitle id={headingId}>{heading}</SectionTitle> : null}
        {hasText(table.lead) ? (
          <p className="ig-body mb-6 max-w-[880px]">
            <InlineText text={table.lead} ctx={ctx} />
          </p>
        ) : null}
        <DesktopTable table={table} ctx={ctx} labelledBy={labelledBy} />
        {table.mobileMode === "pairs" ? (
          <MobilePairs table={table} ctx={ctx} />
        ) : (
          <MobileCards table={table} ctx={ctx} />
        )}
        {hasText(table.footnote) ? (
          <p className="text-small text-text-2 mt-4 mb-0 max-w-[900px]">
            <InlineText text={table.footnote} ctx={ctx} />
          </p>
        ) : null}
      </div>
    </TypedSection>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* «Что важно знать»                                                                          */
/* ------------------------------------------------------------------------------------------ */

export interface ImportantSectionProps {
  title: string;
  items: GlassTypeImportantItem[];
  ctx: PlaceholderContext;
  variant: SectionVariant;
}

/** Warning callout with «**lead.** text» items (`importantItems`). */
export function ImportantSection({ title, items, ctx, variant }: ImportantSectionProps) {
  if (items.length === 0) return null;
  return (
    <TypedSection variant={variant}>
      <Callout
        variant="warning"
        className="max-w-[1100px]"
        title={replacePlaceholders(title, ctx)}
        items={items.map((item, index) => (
          // Paragraphs of the item are inlined so the bold lead runs into the text.
          <div key={item.id ?? index} className="[&>p]:inline">
            {hasText(item.lead) ? <strong>{replacePlaceholders(item.lead, ctx)} </strong> : null}
            <RichText data={item.text} ctx={ctx} disableContainer />
          </div>
        ))}
      />
    </TypedSection>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* «Где применяют»                                                                            */
/* ------------------------------------------------------------------------------------------ */

/** A `linkField()` value with a resolvable href and a visible label, or `null`. */
function labelledLink(link: GlassTypeApplication["link"] | null | undefined) {
  const resolved = resolveLink(link);
  return resolved?.label ? { href: resolved.href, label: resolved.label } : null;
}

export interface ApplicationsSectionProps {
  applications: GlassTypeApplication[];
  relatedLinks: GlassTypeRelatedLink[];
  ctx: PlaceholderContext;
  variant: SectionVariant;
  headingId: string;
}

const APPLICATIONS_TITLE = "Где применяют";

/** Uses of the glass (list, each with an optional arrow link) and the related-pages row. */
export function ApplicationsSection({
  applications,
  relatedLinks,
  ctx,
  variant,
  headingId,
}: ApplicationsSectionProps) {
  const related = relatedLinks.flatMap((item, index) => {
    const link = labelledLink(item.link);
    return link ? [{ key: item.id ?? String(index), ...link, item }] : [];
  });
  if (applications.length === 0 && related.length === 0) return null;

  return (
    <TypedSection variant={variant} headingId={headingId}>
      <SectionTitle id={headingId}>{APPLICATIONS_TITLE}</SectionTitle>
      {applications.length > 0 ? (
        <ul
          className="ig-body marker:text-brand m-0 flex max-w-[1100px] list-disc flex-col gap-2 pl-6"
          data-applications=""
        >
          {applications.map((item, index) => {
            const link = labelledLink(item.link);
            return (
              <li key={item.id ?? index} className="pl-1">
                <span>{replacePlaceholders(item.text, ctx)}</span>
                {hasText(item.description) ? (
                  <span className="text-text-2">
                    {" "}
                    — {replacePlaceholders(item.description, ctx)}
                  </span>
                ) : null}
                {link ? (
                  <>
                    {" "}
                    <TextLink href={link.href} variant="arrow" className="ml-2 align-baseline">
                      {replacePlaceholders(link.label, ctx)}
                    </TextLink>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {related.length > 0 ? (
        <ul
          className={cn(
            "m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0",
            applications.length > 0 && "mt-6"
          )}
          data-related-links=""
        >
          {related.map(({ key, href, label, item }) => (
            <li key={key}>
              <TextLink
                href={href}
                variant="arrow"
                {...(hasText(item.description)
                  ? { title: replacePlaceholders(item.description, ctx) }
                  : {})}
              >
                {replacePlaceholders(label, ctx)}
              </TextLink>
            </li>
          ))}
        </ul>
      ) : null}
    </TypedSection>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* FAQ                                                                                        */
/* ------------------------------------------------------------------------------------------ */

const FAQ_TITLE = "Частые вопросы";

export interface FaqSectionProps {
  items: GlassTypeFaqItem[];
  ctx: PlaceholderContext;
  variant: SectionVariant;
  headingId: string;
  /** Emit the page's `FAQPage` JSON-LD (off when a layout FAQ block already does). */
  jsonLd: boolean;
}

/** «Частые вопросы»: accordion with the first answer open + `FAQPage` JSON-LD. */
export function FaqSection({ items, ctx, variant, headingId, jsonLd }: FaqSectionProps) {
  const questions = items.filter((item) => hasText(item.question));
  if (questions.length === 0) return null;

  return (
    <TypedSection variant={variant} headingId={headingId}>
      <SectionTitle id={headingId}>{FAQ_TITLE}</SectionTitle>
      <Accordion
        type="multiple"
        defaultOpen={["faq-0"]}
        headingLevel={3}
        className="max-w-[1100px]"
        items={questions.map((item, index) => ({
          id: `faq-${index}`,
          title: replacePlaceholders(item.question, ctx),
          content: <RichText data={item.answer} ctx={ctx} />,
        }))}
      />
      {jsonLd ? (
        <JsonLd
          data={faqLd(
            questions.map((item) => ({
              question: replacePlaceholders(item.question, ctx),
              answer: replacePlaceholders(lexicalToPlainText(item.answer), ctx),
            }))
          )}
        />
      ) : null}
    </TypedSection>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Closing buttons                                                                            */
/* ------------------------------------------------------------------------------------------ */

export interface FinalCtaSectionProps {
  prefill: GlassTypeQuizPrefill;
  /** Page path: quiz `src`. */
  path: string;
  /** Document slug: `source` of the form lead. */
  slug: string;
  ctx: PlaceholderContext;
  variant: SectionVariant;
}

/** «Рассчитать стоимость» + the secondary form («Отправить чертёж» by default). */
export function FinalCtaSection({ prefill, path, slug, ctx, variant }: FinalCtaSectionProps) {
  const secondaryForm = prefill?.secondaryForm ?? "drawing";
  const formKey: FormKey | null = secondaryForm === "none" ? null : secondaryForm;
  const secondaryLabel = fillLabel(prefill?.secondaryLabel, ctx) || DRAWING_CTA_LABEL;

  return (
    <TypedSection variant={variant}>
      <div
        className="flex flex-wrap gap-3 max-sm:flex-col max-sm:items-stretch max-sm:[&_.ig-btn]:w-full"
        data-final-cta=""
      >
        <QuizLink prefill={prefill} src={path} size="l" ctx={ctx} />
        {formKey ? (
          <FormTrigger formKey={formKey} params={{ label: secondaryLabel, source: slug }} asChild>
            <Button
              variant="secondary"
              size="l"
              leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
            >
              {secondaryLabel}
            </Button>
          </FormTrigger>
        ) : null}
      </div>
    </TypedSection>
  );
}
