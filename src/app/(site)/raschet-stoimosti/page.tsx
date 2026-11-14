import { headers } from "next/headers";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { PageShell } from "@/components/page/page-shell";
import { Quiz } from "@/components/quiz/quiz";
import { QuizHeader } from "@/components/quiz/quiz-header";
import { getQuizConfig } from "@/lib/cms/quiz-config";
import { parseQuizSearchParams, QUIZ_PAGE_PATH, sanitizeEntryPath } from "@/lib/quiz/prefill";
import type { QuizSearchParams } from "@/lib/quiz/prefill";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, siteOrigin } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * «Расчёт стоимости» — the full quiz page (task-34): a direct visit, reload, new tab or a link
 * from another site. Client navigations inside the site open the same quiz as a modal
 * (`@modal/(.)raschet-stoimosti`). Indexable (P0), one H1 — the quiz heading inside the card
 * (`Kviz.dc.html`). Rendered per request: it reads the URL pre-fill, the referrer and the quiz
 * config carries «now»; the metadata never depends on the query (canonical without it).
 */

/** Title / description verbatim from `docs/inex/17-meta.md` («Сервис «Как заказать»»). */
const TITLE = "Расчёт стоимости закалённого стекла по чертежу | Inex Glass";
const DESCRIPTION =
  "Ответьте на 7 вопросов и прикрепите чертёж — пришлём КП с ценой, сроком и доставкой в среднем за 2–3 рабочих дня.";
const BREADCRUMB_LABEL = "Расчёт стоимости";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    seo: null,
    path: QUIZ_PAGE_PATH,
    fallbackTitle: TITLE,
    fallbackDescription: DESCRIPTION,
  });
}

/**
 * Entry page without `src`: the same-origin `Referer` path (the page the visitor came from on a
 * full load), `''` otherwise. Hosts are compared with the request host and the configured site
 * origin (a proxy may rewrite one of them).
 */
async function referrerEntryPage(): Promise<string> {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  if (!referer) return "";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "";
  }
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  let siteHost = "";
  try {
    siteHost = new URL(siteOrigin()).host;
  } catch {
    // Invalid SITE_URL is rejected by `getEnv()` already; keep the request host check only.
  }
  if (url.host !== host && url.host !== siteHost) return "";
  return sanitizeEntryPath(url.pathname);
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<QuizSearchParams>;
}) {
  const [params, config] = await Promise.all([searchParams, getQuizConfig()]);
  const { prefill, entryPage, resume } = parseQuizSearchParams(params);
  // Fallback chain of the page mode: `src` → same-origin referrer → the quiz page itself.
  const entry = entryPage || (await referrerEntryPage()) || QUIZ_PAGE_PATH;
  const crumbs = buildBreadcrumbs(QUIZ_PAGE_PATH, { lastLabel: BREADCRUMB_LABEL });

  return (
    <PageShell
      path={QUIZ_PAGE_PATH}
      breadcrumbs={crumbs}
      hideBreadcrumbs
      showConditions={false}
      quiz={false}
    >
      <section className="bg-bg py-12 max-sm:py-8 max-sm:pb-0">
        <Container className="flex flex-col gap-6 max-sm:gap-4">
          <Breadcrumbs items={crumbs} />
          {/* Phones: the card goes edge to edge (no radius / side borders, see `QuizFrame`);
              wider: it clips its static footer to the rounded corners. */}
          <div className="max-sm:-mx-(--ig-gutter) sm:*:overflow-hidden">
            <Quiz
              config={config}
              prefill={prefill}
              entryPage={entry}
              variant="page"
              resume={resume}
              header={<QuizHeader as="h1" />}
            />
          </div>
        </Container>
      </section>
    </PageShell>
  );
}
