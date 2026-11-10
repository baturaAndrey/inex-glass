import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

/** Round 48 px page buttons (Paper mockup `2560_obekty`, frame `pager`). */
const ITEM =
  "inline-flex h-12 min-w-12 items-center justify-center whitespace-nowrap rounded-full text-base leading-5 font-medium tabular-nums no-underline transition-colors duration-200 focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2";
const LINK =
  "bg-surface border-line text-text hover:border-brand hover:text-primary-pressed border";
/** «Назад» / «Дальше»: pills with an arrow; on phones only the arrow. */
const STEP = "gap-2 px-5.5 max-sm:px-0";

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
    <nav aria-label="Страницы" className={cn("mt-8 flex justify-center", className)}>
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0">
        {page > 1 ? (
          <li>
            <Link href={hrefFor(page - 1)} className={cn(ITEM, LINK, STEP)} rel="prev">
              <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2} />
              <span className="max-sm:sr-only">Назад</span>
            </Link>
          </li>
        ) : null}
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className={cn(ITEM, "text-text-2 min-w-6")}>
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span
                  aria-current="page"
                  className={cn(ITEM, "bg-primary font-semibold text-white")}
                >
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
            <Link href={hrefFor(page + 1)} className={cn(ITEM, LINK, STEP)} rel="next">
              <span className="max-sm:sr-only">Дальше</span>
              <ArrowRight aria-hidden="true" className="size-[18px]" strokeWidth={2} />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
