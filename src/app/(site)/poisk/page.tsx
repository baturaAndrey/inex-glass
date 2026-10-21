import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { Section } from "@/components/ig/section";
import { PageShell } from "@/components/page/page-shell";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { readPageParam, readQueryParam, searchOffset } from "@/lib/search/pagination";
import { searchSite } from "@/lib/search/query";
import { SEARCH_PAGE_PATH, SEARCH_PAGE_SIZE, type SearchResult } from "@/lib/search/types";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * `/poisk/?q=…&page=N` — site search results (task 35). Reads `searchParams`, so the page is
 * dynamic by itself (no ISR, no `force-dynamic` needed). `noindex, follow` + `Disallow: /poisk/`
 * in robots.txt (task 36): a deliberate pair (ТЗ §8.3, §8.6). No canonical.
 *
 * The query is shown as React text only (escaped); snippets come sanitized from `searchSite`.
 * The header (global) carries the «Рассчитать стоимость» button on the first screen; the page
 * ends with the quiz CTA of the page frame.
 */

const TITLE = "Поиск по сайту";
const TITLE_ID = "search-title";
const CRUMB_LABEL = "Поиск";
/**
 * Neutral functional description: 17-meta / teksty give none for the search page (copy to be
 * approved by Inex).
 */
const DESCRIPTION =
  "Поиск по страницам сайта Inex Glass: закалённое стекло и триплекс, обработка стекла, конструкции, объекты и статьи блога.";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildMetadata({
    seo: { title: `${TITLE}${TITLE_BRAND_SUFFIX}`, description: DESCRIPTION },
    path: SEARCH_PAGE_PATH,
    fallbackTitle: TITLE,
    forceNoindex: true,
  });
  // Deliberately no canonical (noindex + `Disallow: /poisk/`): drop the one buildMetadata adds.
  return { ...metadata, alternates: null };
}

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY: SearchResult = { hits: [], total: 0 };

async function runSearch(
  query: string,
  page: number
): Promise<{ result: SearchResult; failed: boolean }> {
  if (!query) return { result: EMPTY, failed: false };
  try {
    const result = await searchSite({
      q: query,
      limit: SEARCH_PAGE_SIZE,
      offset: searchOffset(page),
    });
    return { result, failed: false };
  } catch (error) {
    console.error("poisk: search failed", error);
    return { result: EMPTY, failed: true };
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = readQueryParam(params.q);
  const page = readPageParam(params.page);
  const { result, failed } = await runSearch(query, page);
  const crumbs = buildBreadcrumbs(SEARCH_PAGE_PATH, { lastLabel: CRUMB_LABEL });
  const heading = query ? `Результаты по запросу «${query}»` : TITLE;

  return (
    <PageShell
      path={SEARCH_PAGE_PATH}
      breadcrumbs={crumbs}
      hideBreadcrumbs
      showConditions={false}
      // The empty state carries its own «Рассчитать стоимость»: no second CTA block under it.
      quiz={result.hits.length > 0 ? {} : false}
    >
      <section
        aria-labelledby={TITLE_ID}
        className="bg-surface border-hairline border-b pt-10 pb-12 max-sm:pt-6 max-sm:pb-8"
      >
        <Container className="flex flex-col gap-6">
          <Breadcrumbs items={crumbs} />
          <h1
            id={TITLE_ID}
            className="ig-h2 m-0 max-w-[1100px] [overflow-wrap:anywhere] max-sm:text-[28px] max-sm:leading-[1.2]"
          >
            {heading}
          </h1>
          <SearchForm defaultValue={query} className="max-w-[720px]" />
        </Container>
      </section>
      <Section variant="bg" aria-label="Результаты поиска">
        <div className="max-w-[880px]">
          <SearchResults
            query={query}
            hits={result.hits}
            total={result.total}
            page={page}
            failed={failed}
          />
        </div>
      </Section>
    </PageShell>
  );
}
