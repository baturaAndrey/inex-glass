"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TocItem } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";

export interface ArticleTocProps {
  items: readonly TocItem[];
  className?: string | undefined;
}

/** Minimum number of H2 for a table of contents to be useful. */
export const MIN_TOC_ITEMS = 2;

/**
 * The heading counts as "being read" once it passes this line: below the sticky header
 * (64 px collapsed + margin) and above the lower part of the viewport.
 */
const OBSERVER_MARGIN = "-96px 0px -60% 0px";

/**
 * Scroll-spy: the last heading above the reading line is active. Without JS (or before
 * hydration) the list is plain anchor links. Shared with the «На странице» card of the
 * «Как заказать» subpages (`@/components/how-to-order/subpage-toc`).
 */
export function useActiveHeading(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || ids.length === 0) return undefined;
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return undefined;

    const visible = new Set<string>();
    const update = () => {
      // A heading inside the band wins; otherwise the last heading scrolled past.
      const inBand = ids.find((id) => visible.has(id));
      if (inBand) {
        setActive(inBand);
        return;
      }
      const passed = headings.filter((element) => element.getBoundingClientRect().top < 96);
      setActive(passed.at(-1)?.id ?? null);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        update();
      },
      { rootMargin: OBSERVER_MARGIN }
    );
    headings.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const LABEL = "text-text-2 text-xs leading-4 font-medium tracking-[0.08em] uppercase";
const TITLE = "Содержание";

function TocLinks({ items, active }: { items: readonly TocItem[]; active: string | null }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "focus-visible:outline-brand block rounded-md px-3.5 py-2.5 text-[15px] leading-[18px] no-underline transition-colors duration-(--ig-dur-base) focus-visible:outline-2 focus-visible:-outline-offset-2",
                isActive
                  ? "bg-primary-light text-primary-dark font-medium"
                  : "text-ink-3 hover:text-primary-pressed"
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

/**
 * «Содержание» of an article (Paper mockup `2560_blog_statya`, frame `aside`): links to its H2,
 * the section being read on a light-teal plate. ≥1101 px a white card at the top of the sticky
 * aside; ≤1100 px a collapsed disclosure above the text. Without JS: plain anchor links.
 */
export function ArticleToc({ items, className }: ArticleTocProps) {
  const [ids] = useState(() => items.map((item) => item.id));
  // Before the first heading is reached the first section is the current one (mockup).
  const active = useActiveHeading(ids) ?? ids[0] ?? null;
  if (items.length < MIN_TOC_ITEMS) return null;

  return (
    <nav aria-label={TITLE} className={className} data-testid="article-toc">
      {/* ≥1101 px: the card of the sticky aside. */}
      <div className="bg-surface border-hairline flex flex-col gap-1.5 rounded-[20px] border p-7 max-md:hidden">
        <span className={cn(LABEL, "pb-2")}>{TITLE}</span>
        <TocLinks items={items} active={active} />
      </div>
      {/* ≤1100 px: a disclosure above the article. */}
      <details className="bg-surface border-hairline group/toc rounded-lg border md:hidden">
        <summary className="focus-visible:outline-brand flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 py-3 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
          <span className={LABEL}>{TITLE}</span>
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
