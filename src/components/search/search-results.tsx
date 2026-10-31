import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Chip } from "@/components/ig/chip";
import { QuizLink } from "@/components/page/quiz-cta";
import { pluralRu } from "@/lib/domain/plural";
import { paginationItems, searchPageCount, searchPageHref } from "@/lib/search/pagination";
import { snippetSegments } from "@/lib/search/snippet";
import { SEARCH_KIND_LABELS, SEARCH_PAGE_PATH, type SearchHit } from "@/lib/search/types";
import { cn } from "@/lib/utils";

/**
 * Result list of `/poisk/` (task 35): title link, path, snippet with the matched words marked,
 * kind badge; pagination `?q=…&page=N`; the empty state with section links and the quiz CTA.
 * The snippet arrives sanitized (`sanitizeSnippet`) and is rendered as React text + `<mark>`
 * elements, never as raw HTML.
 */

/** Sections offered when nothing is found (ТЗ: same idea as the 404 page). */
export const SEARCH_EMPTY_SECTIONS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Закалённое стекло", href: "/zakalennoe-steklo/" },
  { label: "Обработка стекла", href: "/obrabotka-stekla/" },
  { label: "Стеклянные конструкции", href: "/steklyannye-konstrukcii/" },
  { label: "Как заказать", href: "/kak-zakazat/" },
  { label: "Объекты", href: "/obekty/" },
  { label: "Контакты", href: "/kontakty/" },
];

const RESULT_FORMS = ["результат", "результата", "результатов"] as const;

function Snippet({ snippet }: { snippet: string }) {
  const segments = snippetSegments(snippet);
  if (segments.length === 0) return null;
  return (
    <p className="ig-body text-ink-2 m-0 [overflow-wrap:anywhere]">
      {segments.map((segment, index) =>
        segment.mark ? (
          <mark key={index} className="bg-primary-light text-text rounded-[3px] px-0.5">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </p>
  );
}

function ResultItem({ hit }: { hit: SearchHit }) {
  return (
    <li className="border-hairline flex flex-col gap-2 border-b py-6 first:pt-0 last:border-b-0">
      <span className="ig-micro text-text-2">{SEARCH_KIND_LABELS[hit.kind]}</span>
      <h2 className="ig-h4 m-0">
        <Link
          href={hit.url}
          className="text-text hover:text-primary-pressed underline-offset-4 transition-colors duration-(--ig-dur-base) hover:underline"
        >
          {hit.title || hit.url}
        </Link>
      </h2>
      <span className="ig-small text-text-2 [overflow-wrap:anywhere]">{hit.url}</span>
      <Snippet snippet={hit.snippet} />
    </li>
  );
}

const PAGE_LINK_CLASS =
  "grid h-11 min-w-11 place-items-center rounded-full border px-3 text-[15px] font-medium tabular-nums no-underline transition-colors duration-(--ig-dur-base)";
const PAGE_LINK_IDLE =
  "border-line bg-surface text-text hover:border-brand hover:text-primary-pressed";

function Pagination({ query, page, count }: { query: string; page: number; count: number }) {
  const items = paginationItems(page, count);
  if (items.length === 0) return null;
  return (
    <nav aria-label="Страницы результатов" className="mt-10 max-sm:mt-8">
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {page > 1 ? (
          <li>
            <Link
              href={searchPageHref(query, page - 1)}
              aria-label="Предыдущая страница"
              className={cn(PAGE_LINK_CLASS, PAGE_LINK_IDLE)}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={2} className="size-4" />
            </Link>
          </li>
        ) : null}
        {items.map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-text-2 px-1">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={searchPageHref(query, item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  PAGE_LINK_CLASS,
                  item === page
                    ? "border-primary-dark bg-primary-dark text-white hover:text-white"
                    : PAGE_LINK_IDLE
                )}
              >
                {item}
              </Link>
            </li>
          )
        )}
        {page < count ? (
          <li>
            <Link
              href={searchPageHref(query, page + 1)}
              aria-label="Следующая страница"
              className={cn(PAGE_LINK_CLASS, PAGE_LINK_IDLE)}
            >
              <ChevronRight aria-hidden="true" strokeWidth={2} className="size-4" />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function EmptyState({ query, failed }: { query: string; failed: boolean }) {
  return (
    <div className="flex flex-col items-start gap-6" data-testid="search-empty">
      <div className="flex items-start gap-4">
        <SearchX aria-hidden="true" strokeWidth={2} className="text-brand mt-1 size-7 flex-none" />
        <div className="flex flex-col gap-2">
          <p className="ig-h5 m-0 [overflow-wrap:anywhere]">
            {failed
              ? "Поиск временно недоступен"
              : query
                ? `Ничего не найдено по запросу «${query}»`
                : "Введите запрос, чтобы найти страницу"}
          </p>
          <p className="ig-body text-text-2 m-0">
            {failed
              ? "Попробуйте позже или перейдите в нужный раздел."
              : "Проверьте написание или выберите раздел сайта."}
          </p>
        </div>
      </div>
      <nav aria-label="Разделы сайта" className="w-full">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {SEARCH_EMPTY_SECTIONS.map((section) => (
            <li key={section.href}>
              <Chip href={section.href}>{section.label}</Chip>
            </li>
          ))}
        </ul>
      </nav>
      <QuizLink src={SEARCH_PAGE_PATH} />
    </div>
  );
}

export interface SearchResultsProps {
  /** The query as typed (shown as text only). */
  query: string;
  hits: readonly SearchHit[];
  total: number;
  /** 1-based page. */
  page: number;
  /** The database query failed: show the outage message instead of «nothing found». */
  failed?: boolean | undefined;
}

export function SearchResults({ query, hits, total, page, failed = false }: SearchResultsProps) {
  if (hits.length === 0) {
    // A page past the end of a non-empty result: point back to the first page.
    if (total > 0) {
      return (
        <p className="ig-body m-0">
          На этой странице результатов нет.{" "}
          <Link href={searchPageHref(query)} className="ig-link">
            К первой странице
          </Link>
        </p>
      );
    }
    return <EmptyState query={query} failed={failed} />;
  }
  return (
    <div data-testid="search-results">
      <p className="ig-small text-text-2 m-0 mb-6" aria-live="polite">
        Найдено {total} {pluralRu(total, RESULT_FORMS)}
      </p>
      <ol className="m-0 list-none p-0">
        {hits.map((hit) => (
          <ResultItem key={hit.url} hit={hit} />
        ))}
      </ol>
      <Pagination query={query} page={page} count={searchPageCount(total)} />
    </div>
  );
}
