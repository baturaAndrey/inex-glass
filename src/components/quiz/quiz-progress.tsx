import { QUIZ_STEP_COUNT, type QuizStep } from "./types";

/** «Шаг N из 7» with the progress bar (`.qz-prog`); the fill animates its width over 320 ms. */
export function QuizProgress({ step }: { step: QuizStep }) {
  const label = `Шаг ${step} из ${QUIZ_STEP_COUNT}`;
  return (
    <div className="flex items-center gap-3.5" data-slot="quiz-progress">
      <div
        role="progressbar"
        aria-label="Прогресс"
        aria-valuemin={1}
        aria-valuemax={QUIZ_STEP_COUNT}
        aria-valuenow={step}
        aria-valuetext={label}
        className="bg-well h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
      >
        <div
          className="bg-brand h-full rounded-full transition-[width] duration-(--ig-dur-slow) ease-(--ig-ease) motion-reduce:transition-none"
          style={{ width: `${(step / QUIZ_STEP_COUNT) * 100}%` }}
        />
      </div>
      <span
        className="text-text-2 flex-none text-[13px] leading-none font-medium"
        aria-hidden="true"
      >
        {label}
      </span>
    </div>
  );
}
