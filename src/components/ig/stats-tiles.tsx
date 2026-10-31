import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatItem {
  value: ReactNode;
  text: ReactNode;
}

export interface StatsTilesProps {
  items: StatItem[];
  /** Frosted glass over a photo — ONLY for the Home hero, nowhere else. */
  glass?: boolean;
  className?: string | undefined;
}

/**
 * Stat tiles (`.ig-stats`, 3 columns): big tabular figure + caption.
 * ≤599 px: one column, each tile is a row (28 px figure in a 118 px slot), white background
 * without blur, horizontal dividers — as `.stats` in `Home.dc.html`.
 */
export function StatsTiles({ items, glass = false, className }: StatsTilesProps) {
  return (
    <div
      className={cn(
        "ig-stats max-sm:grid-cols-1",
        glass &&
          "ig-stats--glass max-sm:border-hairline max-sm:bg-surface max-sm:[backdrop-filter:none] max-sm:[-webkit-backdrop-filter:none]",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="ig-stat-tile max-sm:not-first:border-hairline max-sm:flex-row max-sm:items-center max-sm:gap-4 max-sm:px-[18px] max-sm:py-4 max-sm:not-first:border-t max-sm:not-first:border-l-0"
        >
          <span className="ig-stat text-hero-stat whitespace-nowrap max-sm:w-[118px] max-sm:flex-none">
            {item.value}
          </span>
          <p className="ig-stat-tile__text">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
