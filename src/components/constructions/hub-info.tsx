import type { ReactNode } from "react";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { fill } from "@/components/blocks/shared";
import {
  CREAM,
  InfoPanelCard,
  PANEL_SHELL,
  type InfoPanel,
} from "@/components/processing/info-panels";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";
import { WHO_DOES_WHAT_HEADING, WHO_INEX_TITLE } from "./who-does-what";

/**
 * Cream block that closes the hub `/steklyannye-konstrukcii/` (Paper mockup
 * `2560_steklyannye-konstrukcii`, frame `info`): two light-teal panels side by side —
 * «Кто что делает» (`whoDoesWhat`: Inex Glass vs «Монтаж») and «Почему комплект» (a rich-text
 * block; its quote is the warning note) — then the «Объекты» section and the final buttons
 * (passed in as `children`). Touches the footer: only the top corners are rounded. Panels stack
 * ≤1100 px.
 */

/** Right column of the hub (approved montage wording of 2026-11-09, ТЗ §11). */
export const WHO_MONTAGE_TITLE = "Монтаж";

type WhoDoesWhat = NonNullable<Construction["whoDoesWhat"]>;

const TONE = {
  inex: { title: "text-primary-pressed", icon: "text-brand" },
  montage: { title: "text-navy", icon: "text-navy" },
} as const;

function WhoColumn({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone: keyof typeof TONE;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="bg-surface flex min-w-0 flex-1 flex-col gap-[18px] rounded-lg p-7 max-sm:p-5"
      data-who={tone}
    >
      <h3 className={cn("m-0 text-[20px] leading-[1.3] font-semibold", TONE[tone].title)}>
        {title}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-[18px] p-0 text-[16px] leading-normal">
        {items.map((text, index) => (
          <li key={index} className="flex items-start gap-3">
            <Icon
              aria-hidden="true"
              strokeWidth={2.5}
              className={cn("mt-0.5 size-5 flex-none", TONE[tone].icon)}
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhoPanel({ data, ctx }: { data: WhoDoesWhat; ctx: PlaceholderContext }) {
  const left = (data.leftItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  const right = (data.rightItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  if (left.length === 0 && right.length === 0) return null;
  const headingId = "construction-who-title";
  return (
    <section
      aria-labelledby={headingId}
      className={cn(PANEL_SHELL, "gap-8 p-10 max-sm:gap-5")}
      data-section="who-does-what"
    >
      <h2 id={headingId} className="ig-h2 m-0">
        {WHO_DOES_WHAT_HEADING}
      </h2>
      <div className="flex gap-4 max-lg:flex-col">
        <WhoColumn title={WHO_INEX_TITLE} items={left} icon={Check} tone="inex" />
        <WhoColumn title={WHO_MONTAGE_TITLE} items={right} icon={ArrowRight} tone="montage" />
      </div>
    </section>
  );
}

export interface HubInfoProps {
  who: WhoDoesWhat | null | undefined;
  /** «Почему комплект…» panel (rich-text block with a heading); `null` hides it. */
  why: InfoPanel | null;
  ctx: PlaceholderContext;
  /** Objects section and the final buttons, under the panels. */
  children?: ReactNode;
}

export function HubInfo({ who, why, ctx, children }: HubInfoProps) {
  const showWho = Boolean(who?.enabled);
  const panels = [
    showWho && who ? <WhoPanel key="who" data={who} ctx={ctx} /> : null,
    why ? <InfoPanelCard key="why" panel={why} ctx={ctx} className="justify-between p-10" /> : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col gap-24 rounded-t-4xl px-(--ig-gutter) pt-(--ig-gutter) pb-24 max-md:gap-16 max-md:pt-12 max-md:pb-16 max-sm:gap-12 max-sm:rounded-t-xl max-sm:pt-8 max-sm:pb-12",
        CREAM
      )}
      data-testid="construction-hub-info"
    >
      {panels.length > 0 ? (
        <div
          className={cn(
            "grid items-stretch gap-6",
            panels.length > 1 ? "grid-cols-2 max-md:grid-cols-1" : "grid-cols-1"
          )}
        >
          {panels}
        </div>
      ) : null}
      {children}
    </div>
  );
}
