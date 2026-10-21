import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ObjectsPaginationProps {
  page: number;
  totalPages: number;
  /** URL of page N (keeps the filter query, see `buildObjectsHref`). */
  hrefFor: (page: number) => string;
  className?: string | undefined;
}

/** Pages always shown around the current one. */
const SIBLINGS = 1;

type PageItem = number | "gap";

/** «1 … 4 5 6 … 12»: first, last, the current page with its neighbours; single gaps filled in. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  const pages = new Set<number>([1, totalPages]);
  for (let n = page - SIBLINGS; n <= page + SIBLINGS; n++) {
    if (n >= 1 && n <= totalPages) pages.add(n);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) items.push("gap");
    items.push(n);
  });
  return items;
}

const ITEM =
  "inline-flex h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-md px-3 text-[15px] font-medium tabular-nums no-underline transition-colors duration-(--ig-dur-base)";
const LINK = "text-text hover:bg-well hover:text-primary-dark";

/**
 * Real page links (`<a>`) under the grid, so crawlers reach every page; «Показать ещё» only
 * reveals cards of the current page. Hidden when there is a single page.
 */
export function ObjectsPagination({
  page,
  totalPages,
  hrefFor,
  className,
}: ObjectsPaginationProps) {
  if (totalPages <= 1) return null;
  const items = pageItems(page, totalPages);
  return (
    <nav aria-label="Страницы" className={cn("mt-10 flex justify-center", className)}>
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
        {page > 1 ? (
          <li>
            <Link href={hrefFor(page - 1)} className={cn(ITEM, LINK, "gap-1")} rel="prev">
              <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
              <span className="max-sm:sr-only">Назад</span>
            </Link>
          </li>
        ) : null}
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className={cn(ITEM, "text-text-2 px-1")}>
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span aria-current="page" className={cn(ITEM, "bg-primary text-white")}>
                  {item}
                </span>
              ) : (
                <Link
                  href={hrefFor(item)}
                  className={cn(ITEM, LINK)}
                  aria-label={`Страница ${item}`}
                >
                  {item}
                </Link>
              )}
            </li>
          )
        )}
        {page < totalPages ? (
          <li>
            <Link href={hrefFor(page + 1)} className={cn(ITEM, LINK, "gap-1")} rel="next">
              <span className="max-sm:sr-only">Вперёд</span>
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
