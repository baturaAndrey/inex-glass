import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { Section, SectionHead } from "@/components/ig/section";
import { Terms } from "@/components/ig/terms";
import type { TermItem } from "@/components/ig/terms";
import { getConditions } from "@/lib/cms/globals";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import type { Crumb } from "@/lib/seo/breadcrumbs";
import { breadcrumbListLd, JsonLd } from "@/lib/seo/jsonld";
import type { Condition } from "@/payload-types";
import { QuizCta } from "./quiz-cta";
import type { QuizPrefill } from "./quiz-cta";

/**
 * Common frame of a public page: breadcrumbs (+ BreadcrumbList JSON-LD, not on the home page),
 * the page content, the «Условия» section built from the `conditions` global and the quiz CTA.
 *
 * Pages switch parts off when they do not fit: `showConditions={false}` (quiz / order pages),
 * `quiz={false}`, `hideBreadcrumbs` (home).
 */

export interface PageShellProps {
  /** Page path with a trailing slash: `/zakalennoe-steklo/`. */
  path: string;
  /** Label of the current crumb (`breadcrumbLabel` / document title). */
  breadcrumbLabel?: string | null | undefined;
  /** Alias of `breadcrumbLabel`. */
  lastLabel?: string | null | undefined;
  /** Ready-made crumbs instead of the ones built from `path`. */
  breadcrumbs?: Crumb[] | undefined;
  /** Do not render the visual crumbs (the hero renders them itself); JSON-LD is still output. */
  hideBreadcrumbs?: boolean | undefined;
  /** «Условия» section from the `conditions` global (default `true`). */
  showConditions?: boolean | undefined;
  /** Quiz CTA with the page pre-fill, or `false` to hide it. */
  quiz?: QuizPrefill | false | undefined;
  children: ReactNode;
}

const CONDITIONS_HEADING_ID = "page-conditions";

/** Conditions list of the frame, all values from the CMS global. */
export function conditionItems(conditions: Condition | null): TermItem[] {
  if (!conditions) return [];
  const leadTime = conditions.leadTimeText?.trim();
  const leadTimeWithTriplex =
    leadTime && Number.isFinite(conditions.triplexLeadTimeDays)
      ? `${leadTime}, триплекс — от ${conditions.triplexLeadTimeDays}`
      : leadTime;
  return [
    conditions.minOrderText,
    leadTimeWithTriplex,
    conditions.kpText,
    conditions.noUrgentText,
    conditions.noInstallText,
    conditions.priceFixedText,
  ]
    .map((text) => text?.trim())
    .filter((text): text is string => Boolean(text))
    .map((text) => ({ text }));
}

export async function PageShell({
  path,
  breadcrumbLabel,
  lastLabel,
  breadcrumbs,
  hideBreadcrumbs = false,
  showConditions = true,
  quiz = {},
  children,
}: PageShellProps) {
  const crumbs = breadcrumbs ?? buildBreadcrumbs(path, { lastLabel: breadcrumbLabel ?? lastLabel });
  const crumbsLd = crumbs.length > 0 ? breadcrumbListLd(crumbs, path) : null;
  const terms = showConditions ? conditionItems(await getConditions()) : [];
  const showQuiz = quiz !== false;

  return (
    <>
      <JsonLd data={crumbsLd} />
      {!hideBreadcrumbs && crumbs.length > 0 ? (
        <Container className="pt-6 max-sm:pt-4">
          <Breadcrumbs items={crumbs} />
        </Container>
      ) : null}

      {children}

      {terms.length > 0 || showQuiz ? (
        <Section
          variant="sf"
          {...(terms.length > 0 ? { "aria-labelledby": CONDITIONS_HEADING_ID } : {})}
        >
          {terms.length > 0 ? (
            <>
              <SectionHead title="Условия" headingId={CONDITIONS_HEADING_ID} />
              <Terms items={terms} />
            </>
          ) : null}
          {quiz !== false ? (
            <QuizCta
              prefill={quiz}
              src={path}
              className={terms.length > 0 ? "mt-10 max-sm:mt-6" : undefined}
            />
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
