import Link from "next/link";
import { ArrowUpRight, Check, Info, Plus, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ig/container";
import { getConditions, getPrices } from "@/lib/cms/globals";
import { replacePlaceholders, THICKNESSES } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import {
  buildPricesCaption,
  isPriceListFresh,
  priceTile,
  thicknessHref,
} from "@/lib/thickness-view";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Condition } from "@/payload-types";
import { PRICES_ANCHOR } from "./prices-table-section";

/**
 * «Цены на закалённое стекло» of the hub (`#ceny`, the target of «Акции» in the header), Paper
 * mockup `2560_zakalennoe-steklo`, frame `prices`: the H2 with the price caption on the right,
 * eight thickness tiles (each a link to its card) and three panels — «Входит в цену «от»»,
 * «Считается отдельно» (the `prices` global) and the «Что нужно учесть» warning (`conditions`).
 *
 * Every number comes from the domain library (45-day rule, «по запросу» for 15 / 19 mm); tiles:
 * 8 in a row at ≥1366 px, 4 below, 2 on phones. The `pricesTable` block on other pages keeps
 * the table layout (`PricesTableSection`).
 */

export interface PriceTilesSectionProps {
  ctx: PlaceholderContext;
  heading: string;
  headingId: string;
  anchorId?: string | undefined;
  /** Caption template (placeholders); the `prices` global caption when empty. */
  captionTemplate?: string | null | undefined;
  showPromo?: boolean | null | undefined;
  showIncluded?: boolean | null | undefined;
  showCallout?: boolean | null | undefined;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * «Что нужно учесть»: the CMS text starts with its own title in the seed («Что нужно учесть:
 * минимальный заказ…»); the panel shows the title above, so the lead-in is dropped.
 */
function calloutOf(
  conditions: Condition | null,
  ctx: PlaceholderContext
): { title: string; text: string } | null {
  if (!conditions?.callout) return null;
  const title = conditions.calloutTitle?.trim() ?? "";
  const plain = replacePlaceholders(lexicalToPlainText(conditions.callout), ctx).trim();
  if (!plain) return null;
  const leadIn = title ? new RegExp(`^${escapeRegExp(title)}\\s*:\\s*`, "u").exec(plain) : null;
  return { title, text: upperFirst(leadIn ? plain.slice(leadIn[0].length) : plain) };
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone: "in" | "out" }) {
  const Icon: LucideIcon = tone === "in" ? Check : Plus;
  return (
    <div
      className="bg-surface border-hairline flex flex-col gap-4 rounded-lg border p-8 max-sm:p-5"
      data-included={tone}
    >
      {title ? (
        <h3
          className={cn(
            "m-0 text-[20px] leading-[1.3] font-semibold",
            tone === "in" ? "text-primary-pressed" : "text-navy"
          )}
        >
          {title}
        </h3>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-4 p-0 text-base leading-normal">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <Icon
              aria-hidden="true"
              strokeWidth={2.5}
              className={cn("mt-0.5 size-5 flex-none", tone === "in" ? "text-brand" : "text-navy")}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function PriceTilesSection({
  ctx,
  heading,
  headingId,
  anchorId,
  captionTemplate,
  showPromo,
  showIncluded = true,
  showCallout = true,
}: PriceTilesSectionProps) {
  const [pricesDoc, conditions] = await Promise.all([
    getPrices(),
    showCallout ? getConditions() : Promise.resolve(null),
  ]);
  const { prices, promo, now } = ctx;
  const state = isPriceListFresh(prices, now) ? "price" : "calc";
  const caption = buildPricesCaption({
    template: captionTemplate?.trim() || pricesDoc?.caption,
    prices,
    promo,
    now,
    showPromo: Boolean(showPromo),
    staleLabel: pricesDoc?.staleLabel,
  });
  const included = (pricesDoc?.included ?? []).map((item) => item.text.trim()).filter(Boolean);
  const extra = (pricesDoc?.extra ?? []).map((item) => item.text.trim()).filter(Boolean);
  const showLists = showIncluded !== false && pricesDoc !== null;
  const callout = showCallout ? calloutOf(conditions, ctx) : null;

  return (
    <section
      id={anchorId?.trim() || PRICES_ANCHOR}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-price-state={state}
      data-prices-table=""
    >
      <Container className="flex flex-col gap-8 max-sm:gap-5">
        <div className="flex items-end justify-between gap-x-12 gap-y-3 max-md:flex-col max-md:items-start">
          <h2 id={headingId} className="ig-h2 m-0 text-balance">
            {heading}
          </h2>
          {caption ? (
            <p
              className="text-text-2 m-0 max-w-[620px] text-right text-[15px] leading-[1.45] max-md:text-left"
              data-prices-caption=""
            >
              {caption}
            </p>
          ) : null}
        </div>

        <ul className="m-0 grid list-none grid-cols-8 gap-4 p-0 max-lg:grid-cols-4 max-sm:grid-cols-2 max-sm:gap-3">
          {THICKNESSES.map((n) => {
            const tile = priceTile(n, prices, now);
            return (
              <li key={n} className="flex" data-thickness={n}>
                <Link
                  href={thicknessHref(n)}
                  className="group/tile ease-ig bg-surface border-hairline text-text hover:border-brand hover:shadow-card-hover focus-visible:outline-brand flex w-full flex-col gap-5 rounded-lg border p-6 no-underline transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 max-xl:p-4 max-sm:gap-4 max-sm:p-4"
                  data-price-tile=""
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[32px] leading-none font-bold tabular-nums max-sm:text-[28px]">
                      {n} <span className="text-text-2 text-[18px] font-medium">мм</span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      strokeWidth={2}
                      className="text-brand size-5 shrink-0 transition-transform duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="flex flex-col gap-0.5" data-price-state={tile.state}>
                    <span className="text-text-2 text-[13px] leading-[1.4]">{tile.caption}</span>{" "}
                    <span className="text-[22px] leading-[1.2] font-bold whitespace-nowrap tabular-nums max-xl:text-[20px]">
                      {tile.value}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {showLists || callout ? (
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            {showLists && (included.length > 0 || pricesDoc.includedTitle) ? (
              <ListPanel title={pricesDoc.includedTitle} items={included} tone="in" />
            ) : null}
            {showLists && (extra.length > 0 || pricesDoc.extraTitle) ? (
              <ListPanel title={pricesDoc.extraTitle} items={extra} tone="out" />
            ) : null}
            {callout ? (
              <div
                role="note"
                className="bg-warning-bg border-warning flex flex-col gap-3 rounded-lg border p-8 max-sm:p-5"
              >
                {callout.title ? (
                  <h3 className="text-warning-text m-0 flex items-center gap-3 text-[20px] leading-[1.3] font-semibold">
                    <Info aria-hidden="true" strokeWidth={2} className="size-[22px] shrink-0" />
                    {callout.title}
                  </h3>
                ) : null}
                <p className="m-0 text-base leading-[1.55]">{callout.text}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
