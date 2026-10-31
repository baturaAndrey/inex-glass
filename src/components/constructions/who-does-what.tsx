import type { ReactNode } from "react";
import { Check, HardHat, PencilRuler, type LucideIcon } from "lucide-react";
import { fill } from "@/components/blocks/shared";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";

/** The schema has no heading fields for this section (task-26 open question 2): constants. */
export const WHO_DOES_WHAT_HEADING = "Кто что делает";
export const WHO_INEX_TITLE = "Inex Glass";
export const WHO_TEAM_TITLE = "Ваша бригада";

type WhoDoesWhat = NonNullable<Construction["whoDoesWhat"]>;

interface ColumnProps {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone: "inex" | "team";
}

const TONE = {
  inex: {
    column: "bg-primary-light",
    icon: "bg-brand text-white",
    check: "text-primary-pressed",
  },
  team: {
    column: "bg-surface border-line border",
    icon: "bg-warning text-warning-text",
    check: "text-warning-text",
  },
} as const;

/** One column (`.p5-who__col`): icon tile + title, checked list. */
function Column({ title, items, icon: Icon, tone }: ColumnProps) {
  const styles = TONE[tone];
  return (
    <div
      className={cn("flex flex-col gap-[18px] rounded-3xl p-8 max-sm:p-5", styles.column)}
      data-who={tone}
    >
      <h3 className="m-0 flex items-center gap-3.5 text-[22px] leading-[1.3] font-semibold">
        <span
          aria-hidden="true"
          className={cn("grid size-12 flex-none place-items-center rounded-[14px]", styles.icon)}
        >
          <Icon strokeWidth={2} className="size-[26px]" />
        </span>
        {title}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[17px] leading-normal max-sm:text-[16px]">
        {items.map((text, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={2}
              className={cn("mt-0.5 size-5 flex-none", styles.check)}
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface WhoDoesWhatSectionProps {
  data: WhoDoesWhat;
  ctx: PlaceholderContext;
  variant: SectionVariant;
  /** Appended under the columns (the inex.su strip in the hub prototype). */
  footer?: ReactNode;
}

/** «Кто что делает»: Inex Glass prepares the kit, the client's crew installs it. */
export function WhoDoesWhatSection({ data, ctx, variant, footer }: WhoDoesWhatSectionProps) {
  const left = (data.leftItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  const right = (data.rightItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  if (left.length === 0 && right.length === 0) return null;
  const headingId = "construction-who-title";
  return (
    <Section variant={variant} aria-labelledby={headingId} data-section="who-does-what">
      <SectionHead title={WHO_DOES_WHAT_HEADING} headingId={headingId} />
      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1 max-md:gap-6">
        <Column title={WHO_INEX_TITLE} items={left} icon={PencilRuler} tone="inex" />
        <Column title={WHO_TEAM_TITLE} items={right} icon={HardHat} tone="team" />
      </div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </Section>
  );
}
