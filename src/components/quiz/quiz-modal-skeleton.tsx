"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageQuizOnScreen, rememberPendingTrigger } from "./modal-trigger";
import { QUIZ_META_LINE, QUIZ_TITLE } from "./quiz-header";

/**
 * Instant feedback for the intercepted quiz route (`@modal/(.)raschet-stoimosti/loading.tsx`):
 * the route is rendered per request, so without it the first click on «Рассчитать стоимость»
 * waits for the server with nothing on screen (review note of wave 6, task 39).
 *
 * A tiny client component: the same overlay and window geometry as `QuizModal` (centred 880 px
 * window ≥600 px, full screen ≤599 px) with the quiz heading and a spinner, replaced by the real
 * modal as soon as it streams in. Not a dialog yet — only a polite status for screen readers.
 *
 * The root is `display: contents` (no box of its own): on a client navigation Next scrolls a
 * newly rendered segment into view when its top-level boxes are off screen. An in-flow wrapper
 * (the `@modal` slot sits after the footer) scrolled the page under the modal to the bottom; a
 * boxless root, like the portalled `QuizModal`, leaves the scroll position alone.
 */
export function QuizModalSkeleton() {
  // Render phase of the navigation commit: the old DOM (and the focused trigger) is still in
  // place. On the quiz page itself the modal closes at once — no overlay flash there.
  const [overPageQuiz] = useState(() => {
    rememberPendingTrigger();
    return pageQuizOnScreen() !== null;
  });
  if (overPageQuiz) return null;

  return (
    <div data-slot="quiz-modal-skeleton" role="status" aria-live="polite" className="contents">
      <div
        aria-hidden="true"
        className="animate-in fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none"
      />
      <div
        className={cn(
          "bg-surface text-text shadow-modal fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-hidden p-8",
          "max-h-[calc(100dvh-48px)] min-h-[min(480px,calc(100dvh-48px))] w-[calc(100%-48px)] max-w-[880px] rounded-(--ig-r-xl)",
          "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:p-4 max-sm:shadow-none",
          "animate-in fade-in-0 zoom-in-95 ease-ig duration-(--ig-dur-base) motion-reduce:animate-none"
        )}
      >
        <div aria-hidden="true" className="min-w-0">
          <p className="text-text m-0 text-[28px] leading-[1.2] font-bold max-sm:text-[22px]">
            {QUIZ_TITLE}
          </p>
          <p className="text-small text-text-2 mt-1.5 mb-0">{QUIZ_META_LINE}</p>
        </div>
        <div className="grid flex-1 place-items-center">
          <Loader2
            aria-hidden="true"
            className="text-text-2 size-8 animate-spin motion-reduce:animate-none"
          />
          <span className="sr-only">Загрузка расчёта стоимости</span>
        </div>
      </div>
    </div>
  );
}
