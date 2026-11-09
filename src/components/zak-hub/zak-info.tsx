import type { ReactNode } from "react";
import Link from "next/link";
import { CircleArrowRight } from "lucide-react";
import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { CREAM, PANEL_SHELL } from "@/components/processing/info-panels";
import { RichText } from "@/components/rich-text/rich-text";
import { pluralRu } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Condition } from "@/payload-types";
import { ZAK_TEMPLATE_COPY } from "./copy";
import { SectionLink } from "./section-link";

/**
 * Cream block that closes the tempered-glass hub and the thickness cards (Paper mockups
 * `2560_zakalennoe-steklo` / `2560_zak_tolshchina_10mm`, frame `info`): it touches the footer
 * (top corners rounded) and holds, 96 px apart, the light-teal panels «Сроки и доставка» /
 * «Для кого» (hub only), the FAQ and the dark drawing-form panel (passed in as children).
 */

export function CreamBlock({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col gap-24 rounded-t-4xl px-(--ig-gutter) pt-(--ig-gutter) pb-24 max-md:gap-16 max-md:pt-12 max-md:pb-16 max-sm:gap-12 max-sm:rounded-t-xl max-sm:pt-8 max-sm:pb-12",
        CREAM
      )}
      data-testid="zak-info"
    >
      {children}
    </div>
  );
}

const WORKING_DAYS = ["рабочий день", "рабочих дня", "рабочих дней"] as const;

function LeadTimeTile({ label, days }: { label: string; days: number }) {
  return (
    <div
      className="bg-surface flex flex-1 flex-col gap-1 rounded-lg p-6 max-sm:p-4"
      data-lead-time=""
    >
      <span className="text-text-2 text-[14px] leading-[1.3]">{label}</span>
      <span className="text-[30px] leading-[1.2] font-bold tabular-nums max-sm:text-[24px]">
        от {days}{" "}
        <span className="text-[18px] font-medium max-sm:text-base">
          {pluralRu(days, WORKING_DAYS)}
        </span>
      </span>
    </div>
  );
}

/** Rich-text paragraphs of a panel: 17 px, links at the size of the text. */
const PANEL_TEXT =
  "flex flex-col gap-4 text-[17px] leading-[1.55] max-sm:text-base [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_a]:text-[length:inherit]";

export interface TimingPanelProps {
  block: BlockOf<"richText">;
  /** Companion `cta` block whose link buttons become the arrow links. */
  companion: BlockOf<"cta"> | undefined;
  conditions: Condition | null;
  ctx: PlaceholderContext;
}

/** «Сроки и доставка»: two lead-time tiles (`conditions` global), the text, the links. */
export function TimingPanel({ block, companion, conditions, ctx }: TimingPanelProps) {
  const headingId = "zak-timing-title";
  const links = (companion?.buttons ?? []).flatMap((button) => {
    const link = resolveLink(button.link);
    const label = fill(button.label, ctx);
    return link && label ? [{ key: button.id ?? label, href: link.href, label }] : [];
  });
  const candidates: Array<{ label: string; days: number | undefined }> = [
    { label: ZAK_TEMPLATE_COPY.timingTempered, days: conditions?.leadTimeDays },
    { label: ZAK_TEMPLATE_COPY.timingTriplex, days: conditions?.triplexLeadTimeDays },
  ];
  const tiles = candidates.flatMap(({ label, days }) =>
    days !== undefined && days > 0 ? [{ label, days }] : []
  );

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={headingId}
      className={cn(PANEL_SHELL, "scroll-mt-24 p-10 max-sm:p-5")}
      data-section="timing"
    >
      <h2 id={headingId} className="ig-h2 m-0">
        {fill(block.heading, ctx)}
      </h2>
      {tiles.length > 0 ? (
        <div className="flex gap-4 max-sm:flex-col max-sm:gap-3">
          {tiles.map((tile) => (
            <LeadTimeTile key={tile.label} label={tile.label} days={tile.days} />
          ))}
        </div>
      ) : null}
      <div className={PANEL_TEXT}>
        <RichText data={block.content} ctx={ctx} disableContainer />
      </div>
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-x-7">
          {links.map((link) => (
            <SectionLink key={link.key} href={link.href}>
              {link.label}
            </SectionLink>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** «Для кого»: white rows linking to the audience pages. */
export function AudiencesPanel({
  block,
  ctx,
}: {
  block: BlockOf<"cards">;
  ctx: PlaceholderContext;
}) {
  const headingId = "zak-audiences-title";
  const items = (block.items ?? []).flatMap((item, index) => {
    const title = fill(item.title, ctx);
    const link = resolveLink(item.link);
    return title
      ? [{ key: item.id ?? String(index), title, text: fill(item.text, ctx), href: link?.href }]
      : [];
  });
  if (items.length === 0) return null;

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={headingId}
      className={cn(PANEL_SHELL, "scroll-mt-24 p-10 max-sm:p-5")}
      data-section="audiences"
    >
      <h2 id={headingId} className="ig-h2 m-0">
        {fill(block.heading, ctx)}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-6 p-0 max-sm:gap-3">
        {items.map((item) => {
          const body = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[20px] leading-[1.2] font-semibold">{item.title}</span>
                {item.text ? (
                  <span className="text-ink-3 text-[15px] leading-[1.5]">{item.text}</span>
                ) : null}
              </span>
              {item.href ? (
                <CircleArrowRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="text-brand size-11 shrink-0 transition-transform duration-200 group-hover/row:translate-x-0.5 motion-reduce:transition-none max-sm:size-9"
                />
              ) : null}
            </>
          );
          const rowClass =
            "bg-surface text-text flex items-center gap-5 rounded-lg px-7 py-6 no-underline max-sm:gap-3 max-sm:px-4 max-sm:py-4";
          return (
            <li key={item.key} className="flex">
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    rowClass,
                    "group/row hover:shadow-card-hover focus-visible:outline-brand w-full transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={cn(rowClass, "w-full")}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
