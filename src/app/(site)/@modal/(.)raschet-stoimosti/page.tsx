import { QuizModal } from "@/components/quiz/quiz-modal";
import { getQuizConfig } from "@/lib/cms/quiz-config";
import { parseQuizSearchParams } from "@/lib/quiz/prefill";
import type { QuizSearchParams } from "@/lib/quiz/prefill";

/**
 * Intercepted `/raschet-stoimosti/` (task-34): a client navigation from any `(site)` page opens
 * the quiz in a modal over that page. A direct visit, reload or new tab renders the full page
 * `raschet-stoimosti/page.tsx` instead. Rendered per request: the quiz config carries «now».
 */
export const dynamic = "force-dynamic";

export default async function QuizModalRoute({
  searchParams,
}: {
  searchParams: Promise<QuizSearchParams>;
}) {
  const [params, config] = await Promise.all([searchParams, getQuizConfig()]);
  const { prefill, entryPage, resume } = parseQuizSearchParams(params);
  return <QuizModal config={config} prefill={prefill} entryPage={entryPage} resume={resume} />;
}
