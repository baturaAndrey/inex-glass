import { QuizModalSkeleton } from "@/components/quiz/quiz-modal-skeleton";

/**
 * Suspense fallback of the intercepted quiz route (force-dynamic): shown at once on the client
 * navigation while the server renders the modal (task 39).
 */
export default function QuizModalLoading() {
  return <QuizModalSkeleton />;
}
