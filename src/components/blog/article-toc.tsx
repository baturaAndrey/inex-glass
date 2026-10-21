"use client";

import { useEffect, useState } from "react";
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
 * hydration) the list is plain anchor links.
 */
function useActiveHeading(ids: readonly string[]): string | null {
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

/** «Содержание» of an article: links to its H2 (`.ar-toc`), the current section highlighted. */
export function ArticleToc({ items, className }: ArticleTocProps) {
  const [ids] = useState(() => items.map((item) => item.id));
  const active = useActiveHeading(ids);
  if (items.length < MIN_TOC_ITEMS) return null;

  return (
    <nav
      aria-label="Содержание"
      className={cn("bg-bg flex flex-col gap-3 rounded-lg p-6 max-sm:p-5", className)}
    >
      <span className="ig-label">Содержание</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "block border-l-2 pl-3 text-[15px] leading-[1.4] font-medium no-underline transition-colors duration-(--ig-dur-base)",
                  "hover:border-brand hover:text-primary-pressed",
                  isActive ? "border-brand text-primary-pressed" : "border-line text-text"
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
