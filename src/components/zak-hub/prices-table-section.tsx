import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Callout } from "@/components/ig/callout";
import type { SectionVariant } from "@/components/ig/section";
import { RichText } from "@/components/rich-text/rich-text";
import { getConditions, getPrices } from "@/lib/cms/globals";
import { replacePlaceholders, THICKNESSES } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import {
  buildPricesCaption,
  isPriceListFresh,
  tablePriceLabel,
  thicknessHref,
  thicknessLabel,
  weightValue,
} from "@/lib/thickness-view";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Condition } from "@/payload-types";
import { CtSection } from "./ct-cards-section";

/**
 * «Цены на закалённое стекло» (`#ceny`, the target of «Акции» in the header): price table from
 * the `prices` global with the 45-day rule, «Входит / Считается отдельно» and the «Что нужно
 * учесть» callout from `conditions`. Rendered by the hub and by the `pricesTable` block on any
 * page. All numbers come from the domain library; nothing here is a constant.
 *
 * Desktop: `.ig-table`, every row is a link to its thickness card (a stretched link — one tab
 * stop per row, no client JS). ≤599: the same rows as `.ig-mcard` links.
 */

export const PRICES_ANCHOR = "ceny";

export type PricesTableLayout = "table" | "cards" | "both";

export interface PricesTableSectionProps {
  ctx: PlaceholderContext;
  variant: SectionVariant;
  headingId: string;
  heading?: string | undefined;
  /** Section id; `ceny` by default. */
  anchorId?: string | undefined;
  /** Caption template (placeholders); `prices.caption` of the global when empty. */
  captionTemplate?: string | null | undefined;
  /** `table`/`both` — table with phone cards; `cards` — cards at every width. */
  layout?: PricesTableLayout | null | undefined;
  showCaption?: boolean | null | undefined;
  showPromo?: boolean | null | undefined;
  showWeight?: boolean | null | undefined;
  showIncluded?: boolean | null | undefined;
  showCallout?: boolean | null | undefined;
}

interface PriceRow {
  n: number;
  href: string;
  label: string;
  price: { state: "price" | "calc"; label: string };
  weight: string;
}

/**
 * A link stretched over its whole row / card (`::after` covers the positioned ancestor).
 * Same technique as `DataTable`.
 */
const STRETCHED_LINK =
  "text-text font-semibold no-underline after:absolute after:inset-0 after:content-[''] hover:text-text focus-visible:outline-none focus-visible:after:-outline-offset-2 focus-visible:after:outline-2 focus-visible:after:outline-(--ig-focus-outline)";

function PriceValue({ price }: { price: PriceRow["price"] }) {
  return price.state === "price" ? <b className="font-bold">{price.label}</b> : <>{price.label}</>;
}

function PricesTable({ rows, showWeight }: { rows: PriceRow[]; showWeight: boolean }) {
  return (
    <div className="ig-table-wrap max-w-[900px]">
      <table className="ig-table">
        <thead>
          <tr>
            <th scope="col">Толщина</th>
            <th scope="col">Цена от, ₽/м²</th>
            {showWeight ? <th scope="col">Вес</th> : null}
            <th scope="col" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.n} className="is-link relative" data-thickness={row.n}>
              <td>
                <Link href={row.href} className={STRETCHED_LINK}>
                  {row.label}
                </Link>
              </td>
              <td className="ig-num" data-price-state={row.price.state}>
                <PriceValue price={row.price} />
              </td>
              {showWeight ? <td className="ig-num">{row.weight}&nbsp;кг/м²</td> : null}
              <td className="text-primary-pressed text-right" aria-hidden="true">
                <ArrowRight strokeWidth={2} className="inline-block size-5 align-middle" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceCards({
  rows,
  showWeight,
  className,
}: {
  rows: PriceRow[];
  showWeight: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("m-0 list-none flex-col gap-3 p-0", className)}>
      {rows.map((row) => (
        <li key={row.n} data-thickness={row.n}>
          <Link
            href={row.href}
            className="ig-mcard text-text hover:border-brand hover:text-text no-underline transition-colors duration-(--ig-dur-base) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[22px] leading-none font-bold">{row.label}</span>
              <span className="ig-price-s tabular-nums" data-price-state={row.price.state}>
                {row.price.label}
              </span>
            </span>
            {showWeight ? (
              <dl className="m-0">
                <div className="ig-mcard__row">
                  <dt>Вес</dt>
                  <dd>{row.weight}&nbsp;кг/м²</dd>
                </div>
              </dl>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function IncludedColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "in" | "out";
}) {
  if (!title && items.length === 0) return null;
  return (
    <div
      className={cn("rounded-lg p-7 max-sm:p-5", tone === "in" ? "bg-primary-light" : "bg-bg")}
      data-included={tone}
    >
      {title ? <h3 className="m-0 mb-3 text-[22px] leading-[1.3] font-semibold">{title}</h3> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 text-base leading-normal">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={2}
              className="text-brand mt-0.5 size-5 flex-none"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * «Что нужно учесть»: the CMS text already starts with the title in the seed («Что нужно учесть:
 * минимальный заказ…»), as in the prototype (bold lead-in inside the paragraph). Then the
 * title is rendered bold in place; otherwise it is the callout title above the rich text.
 */
function ConditionsCallout({
  conditions,
  ctx,
}: {
  conditions: Condition | null;
  ctx: PlaceholderContext;
}) {
  if (!conditions?.callout) return null;
  const title = conditions.calloutTitle?.trim() ?? "";
  const plain = replacePlaceholders(lexicalToPlainText(conditions.callout), ctx).trim();
  if (!plain) return null;
  const leadIn = title ? new RegExp(`^${escapeRegExp(title)}\\s*:\\s*`, "u").exec(plain) : null;

  return (
    <Callout variant="info" className="mt-6">
      {leadIn ? (
        <p>
          <b>{title}:</b> {plain.slice(leadIn[0].length)}
        </p>
      ) : (
        <>
          {title ? <p className="ig-callout__title">{title}</p> : null}
          <RichText data={conditions.callout} ctx={ctx} className="gap-2 [&_p]:m-0" />
        </>
      )}
    </Callout>
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function PricesTableSection({
  ctx,
  variant,
  headingId,
  heading,
  anchorId,
  captionTemplate,
  layout,
  showCaption = true,
  showPromo = false,
  showWeight = true,
  showIncluded = true,
  showCallout = false,
}: PricesTableSectionProps) {
  const [pricesDoc, conditions] = await Promise.all([
    getPrices(),
    showCallout ? getConditions() : Promise.resolve(null),
  ]);
  const { prices, promo, now } = ctx;

  const rows: PriceRow[] = THICKNESSES.map((n) => ({
    n,
    href: thicknessHref(n),
    label: thicknessLabel(n),
    price: tablePriceLabel(n, prices, now),
    weight: weightValue(n),
  }));
  const state = isPriceListFresh(prices, now) ? "price" : "calc";
  const caption =
    showCaption !== false
      ? buildPricesCaption({
          template: captionTemplate?.trim() || pricesDoc?.caption,
          prices,
          promo,
          now,
          showPromo: Boolean(showPromo),
          staleLabel: pricesDoc?.staleLabel,
        })
      : "";
  const withWeight = showWeight !== false;
  const included = (pricesDoc?.included ?? []).map((item) => item.text.trim()).filter(Boolean);
  const extra = (pricesDoc?.extra ?? []).map((item) => item.text.trim()).filter(Boolean);
  const showColumns =
    showIncluded !== false && (included.length > 0 || extra.length > 0) && pricesDoc !== null;

  return (
    <CtSection
      variant={variant}
      id={anchorId?.trim() || PRICES_ANCHOR}
      heading={heading || undefined}
      headingId={headingId}
      data-price-state={state}
      data-prices-table=""
    >
      {caption ? (
        <p className="text-small text-text-2 m-0 mb-4 max-w-[900px]" data-prices-caption="">
          {caption}
        </p>
      ) : null}

      {layout === "cards" ? (
        <PriceCards
          rows={rows}
          showWeight={withWeight}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        />
      ) : (
        <>
          <div className="max-sm:hidden">
            <PricesTable rows={rows} showWeight={withWeight} />
          </div>
          <PriceCards rows={rows} showWeight={withWeight} className="hidden max-sm:flex" />
        </>
      )}

      {showColumns ? (
        <div className="mt-10 grid grid-cols-2 gap-6 max-sm:grid-cols-1 max-sm:gap-4">
          <IncludedColumn title={pricesDoc.includedTitle} items={included} tone="in" />
          <IncludedColumn title={pricesDoc.extraTitle} items={extra} tone="out" />
        </div>
      ) : null}

      {showCallout ? <ConditionsCallout conditions={conditions} ctx={ctx} /> : null}
    </CtSection>
  );
}
