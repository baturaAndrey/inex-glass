import { notFound } from "next/navigation";
import { Container } from "@/components/ig/container";
import { Quiz } from "@/components/quiz/quiz";
import { QuizHeader } from "@/components/quiz/quiz-header";
import type { QuizPrefill } from "@/components/quiz/types";
import { getQuizConfig } from "@/lib/cms/quiz-config";
import { QUIZ_KIND_IDS, QUIZ_TYPE_IDS, quizSrc, THICKNESSES } from "@/lib/domain";
import type { QuizKindId, QuizTypeId } from "@/lib/domain";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";

/**
 * Dev harness of the quiz (task-20) for e2e and visual checks at 375 / 1366 / 1920. The real
 * routes (`/raschet-stoimosti/`, the modal, the full URL parser) are task-34. 404 when
 * SITE_ENV=production, never indexed; rendered per request (the quiz config carries «now»).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI kit — квиз",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const oneOf = <T extends string>(ids: readonly T[], value: string | undefined): T | undefined =>
  value !== undefined && (ids as readonly string[]).includes(value) ? (value as T) : undefined;

/** Minimal harness parser: `type`, `thick`, `vid` by the domain ids (full parser — task-34). */
function prefillOf(params: SearchParams): QuizPrefill | undefined {
  const type = oneOf<QuizTypeId>(QUIZ_TYPE_IDS, first(params.type));
  const thick = Number(first(params.thick));
  const thickness = (THICKNESSES as readonly number[]).includes(thick) ? thick : undefined;
  const kind = oneOf<QuizKindId>(QUIZ_KIND_IDS, first(params.vid));
  if (!type && thickness === undefined && !kind) return undefined;
  return {
    ...(type ? { type } : {}),
    ...(thickness !== undefined ? { thickness } : {}),
    ...(kind ? { kind } : {}),
  };
}

function srcOf(params: SearchParams): string {
  const src = first(params.src);
  return src?.startsWith("/") && !src.startsWith("//") ? quizSrc(src) : "";
}

export default async function UiKitQuizPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (getEnv().SITE_ENV === "production") notFound();

  const [params, config] = await Promise.all([searchParams, getQuizConfig()]);
  const prefill = prefillOf(params);

  return (
    <Container className="py-8 max-sm:px-0 max-sm:py-0">
      {/* The real quiz route hides the phone «Рассчитать стоимость» bar (`HIDDEN_PATH` of
          StickyCta); the harness does the same so the quiz footer is not covered. */}
      <style>{".ig-sticky-cta{display:none!important}"}</style>
      <Quiz
        config={config}
        prefill={prefill}
        entryPage={srcOf(params)}
        resume={first(params.resume) === "1"}
        variant="page"
        header={<QuizHeader as="h1" />}
      />
    </Container>
  );
}
