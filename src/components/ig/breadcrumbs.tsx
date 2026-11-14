import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Without `href` the crumb is plain text (e.g. «Инструменты» — no such section page). */
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string | undefined;
}

/**
 * Breadcrumbs (`.ig-crumbs`). The last item is the current page: never a link, `aria-current`.
 * Long chains wrap; anything that still does not fit scrolls inside the nav, never the page.
 * BreadcrumbList JSON-LD is rendered by the page framework (task-15), not here.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    // `-m-1 p-1`: room for the focus outline, which `overflow-x-auto` would otherwise clip.
    <nav
      aria-label="Хлебные крошки"
      className={cn("-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1", className)}
    >
      <ol className="ig-crumbs m-0 list-none p-0">
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          return (
            // The separator lives inside the item, so screen readers count only real crumbs.
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-2">
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span>{item.label}</span>
              )}
              {isCurrent ? null : (
                <ChevronRight
                  aria-hidden="true"
                  className="ig-crumbs__sep size-3.5 flex-none"
                  strokeWidth={2}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
