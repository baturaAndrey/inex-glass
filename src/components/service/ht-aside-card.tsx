import type { ReactNode } from "react";
import { Check } from "lucide-react";

export interface HtAsideCardProps {
  title: string;
  items: string[];
  /** Primary action under the list (full-width quiz button). */
  action?: ReactNode;
}

/**
 * «Условия» card next to the hub timeline (`.ht-aside` / `.ht-card` of `HowTo.dc.html`): sticky
 * under the compact header on wide screens (64 + 24 = 88 px), a plain block in the one-column
 * layout (≤1100 px).
 */
export function HtAsideCard({ title, items, action }: HtAsideCardProps) {
  return (
    <aside
      data-testid="ht-aside"
      className="sticky top-[calc(var(--ig-header-compact-h)+24px)] max-md:static"
    >
      <div className="bg-surface shadow-card flex flex-col gap-5 rounded-xl p-7 max-sm:p-5">
        <h2 className="m-0 text-2xl leading-[1.3] font-semibold max-sm:text-xl">{title}</h2>
        {items.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-base leading-[1.4] font-medium">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check
                  aria-hidden="true"
                  strokeWidth={2}
                  className="text-brand mt-px size-5 flex-none"
                />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {action}
      </div>
    </aside>
  );
}
