"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useActiveHeading } from "@/components/blog/article-toc";
import type { TocItem } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";
import { HOW_TO_ORDER_TEMPLATE_COPY } from "./copy";

/**
 * «На странице» of a «Как заказать» subpage (Paper mockup `2560_kak-zakazat_trebovaniya`, frame
 * `toc`): links to the H2 of the article, the section being read highlighted (light teal with a
 * brand bar on the left). ≥1101 px a white card in the sticky left column; ≤1100 px a collapsed
 * «На странице» disclosure above the article. Without JS: plain anchor links.
 */

const LABEL = "text-text-2 text-[13px] leading-4 font-medium tracking-[0.06em] uppercase";

function TocLinks({ items, active }: { items: readonly TocItem[]; active: string | null }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "focus-visible:outline-brand block rounded-md border-l-[3px] px-3 py-2.5 text-base leading-5 no-underline transition-colors duration-(--ig-dur-base) focus-visible:outline-2 focus-visible:-outline-offset-2",
                isActive
                  ? "bg-primary-light border-brand text-primary-pressed font-medium"
                  : "text-ink-3 hover:text-primary-pressed border-transparent"
              )}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function SubpageToc({ items }: { items: readonly TocItem[] }) {
  const [ids] = useState(() => items.map((item) => item.id));
  // Before the first heading is reached the first section is the current one (mockup).
  const active = useActiveHeading(ids) ?? ids[0] ?? null;

  return (
    <nav aria-label={HOW_TO_ORDER_TEMPLATE_COPY.toc} data-testid="subpage-toc">
      {/* ≥1101 px: the sticky card. */}
      <div className="bg-surface border-hairline flex flex-col gap-1 rounded-lg border p-6 max-md:hidden">
        <span className={cn(LABEL, "pb-2")}>{HOW_TO_ORDER_TEMPLATE_COPY.toc}</span>
        <TocLinks items={items} active={active} />
      </div>
      {/* ≤1100 px: a disclosure above the article. */}
      <details className="bg-surface border-hairline group/toc rounded-lg border md:hidden">
        <summary className="focus-visible:outline-brand flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 py-3 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
          <span className={LABEL}>{HOW_TO_ORDER_TEMPLATE_COPY.toc}</span>
          <ChevronDown
            aria-hidden="true"
            strokeWidth={2}
            className="text-text-2 size-5 transition-transform duration-200 group-open/toc:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="px-3 pb-3">
          <TocLinks items={items} active={active} />
        </div>
      </details>
    </nav>
  );
}
