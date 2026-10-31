"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefillBadgeText } from "./derive";
import { loadDraft } from "./persistence";
import { QuizFooter } from "./quiz-footer";
import { QuizProgress } from "./quiz-progress";
import { hasPrefill, initialQuizState } from "./state";
import { Step1Type } from "./steps/step-1-type";
import { Step2Glass } from "./steps/step-2-glass";
import { Step3Volume } from "./steps/step-3-volume";
import { Step4Processing } from "./steps/step-4-processing";
import { Step5File } from "./steps/step-5-file";
import { Step6Delivery } from "./steps/step-6-delivery";
import { Step7Contacts } from "./steps/step-7-contacts";
import { QuizSuccess } from "./success";
import { useQuiz } from "./use-quiz";
import type { QuizStepProps } from "./steps/parts";
import type { QuizErrorField, QuizProps, QuizStep, QuizUiState } from "./types";

export type { QuizConfig, QuizPrefill, QuizProps } from "./types";

/** (не из teksty) Shown above the progress when a saved draft was restored. */
export const RESUME_NOTE = "Продолжаем ваш расчёт";
const PHONE_PLACEHOLDER = "{телефон}";

const STEPS: Record<QuizStep, (props: QuizStepProps) => ReactNode> = {
  1: Step1Type,
  2: Step2Glass,
  3: Step3Volume,
  4: Step4Processing,
  5: Step5File,
  6: Step6Delivery,
  7: Step7Contacts,
};

const noopSubscribe = () => () => {};

/**
 * Quiz «Расчёт стоимости» (7 steps). Renders the optional `header`, the pre-fill badge, the
 * progress, the current step, the footer and the success screen. It renders NO modal shell, no
 * close button of its own and no page `h1` — see `QuizHeader`.
 *
 * Layout contract for the shells (task-34): the root is `flex min-h-0 flex-1 flex-col`, the
 * step body scrolls (`overflow-y-auto`), the footer is sticky at the bottom (on the page only
 * below 600 px).
 */
export function Quiz(props: QuizProps) {
  // A draft lives in localStorage, which the server cannot read. With `resume` the first
  // (server + hydration) render shows an empty frame and the real quiz mounts on the client,
  // so the restored state never causes a hydration mismatch.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  if (props.resume && !isClient) {
    return <QuizFrame variant={props.variant ?? "page"} header={props.header} busy />;
  }
  return <QuizInner {...props} />;
}

/**
 * State of the first render. With `resume` the saved draft wins and the quiz continues at the
 * saved step (this render is client-only, see `Quiz`). Without it the first render must match
 * the server HTML, so it holds only the pre-fill; the draft is merged in after mount (see
 * `QuizInner`).
 */
function initialStateOf(props: QuizProps): QuizUiState {
  return initialQuizState({
    prefill: props.prefill,
    resume: props.resume,
    draft: props.resume ? loadDraft() : null,
  });
}

/** `tel:` href from a displayed phone («+7 (351) 247-05-57» → `tel:+73512470557`). */
function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

function SubmitErrorBanner({ template, phone }: { template: string; phone: string }) {
  const [before, after] = template.includes(PHONE_PLACEHOLDER)
    ? (template.split(PHONE_PLACEHOLDER, 2) as [string, string])
    : [`${template} `, ""];
  return (
    <div
      role="alert"
      data-slot="quiz-submit-error"
      className="bg-danger-bg text-small text-danger-text flex items-start gap-2.5 rounded-(--ig-r-md) px-3.5 py-3"
    >
      <TriangleAlert aria-hidden="true" className="mt-px size-[18px] flex-none" />
      <span>
        {before}
        <a
          href={telHref(phone)}
          className="font-medium whitespace-nowrap underline underline-offset-2"
        >
          {phone}
        </a>
        {after}
      </span>
    </div>
  );
}

function QuizInner(props: QuizProps) {
  const { config, prefill, entryPage = "", variant = "page", header } = props;
  const [initial] = useState(() => initialStateOf(props));
  const q = useQuiz({ config, initial, entryPage, variant });
  const { state, restore } = q;

  // Without `resume` a saved draft is still the base: its answers and contacts are kept, the
  // URL pre-fill overrides only the fields it carries (task-34), and the quiz starts at step 1.
  // A layout effect, so the merged state is painted right away, without a flash of the empty
  // quiz. Without this a plain CTA would start empty and the first answer would overwrite the
  // saved calculation.
  const resume = Boolean(props.resume);
  useLayoutEffect(() => {
    if (resume) return;
    const draft = loadDraft();
    if (draft) restore(initialQuizState({ prefill, draft }));
    // Once per mount: later prop changes do not restart the quiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseId = useId();
  const fieldId = (field: QuizErrorField | string) => `${baseId}-${field}`;
  const titleId = fieldId("title");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Every step change: scroll the body to the top and move focus to the new step heading.
  const shownStepRef = useRef(state.step);
  useEffect(() => {
    if (shownStepRef.current === state.step) return;
    shownStepRef.current = state.step;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    document.getElementById(titleId)?.focus();
  }, [state.step, titleId]);

  // Submit errors: focus the first invalid field (after the step switch above).
  useEffect(() => {
    if (!q.focusRequest) return;
    const element = document.getElementById(fieldId(q.focusRequest.field));
    if (!element) return;
    const target = element.matches("input, textarea, select, button")
      ? element
      : element.querySelector<HTMLElement>('[tabindex="0"], input, textarea, button');
    target?.focus();
    // `fieldId` is derived from the stable `baseId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.focusRequest]);

  const done = q.status === "done";
  const badge = !state.resumed && hasPrefill(prefill) ? prefillBadgeText(prefill) : null;
  const StepBody = STEPS[state.step];

  const head = done ? null : (
    <>
      {state.resumed ? (
        <p className="text-small text-text-2 m-0" data-slot="quiz-resumed">
          {RESUME_NOTE}
        </p>
      ) : null}
      {badge ? (
        <span
          data-slot="quiz-prefill"
          className="bg-primary-light text-primary-dark inline-flex min-h-[30px] items-center gap-2 self-start rounded-(--ig-r-sm) px-3 py-1.5 text-[13px] leading-[1.3] font-medium"
        >
          <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
          {badge}
        </span>
      ) : null}
      <QuizProgress step={state.step} />
    </>
  );

  return (
    <QuizFrame variant={variant} header={header} head={head}>
      {done ? (
        <QuizSuccess title={config.forms.thankYouTitle} text={config.forms.thankYouText} />
      ) : (
        <>
          <div
            ref={bodyRef}
            data-slot="quiz-body"
            data-step={state.step}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pt-7 pb-2",
              "max-sm:gap-5 max-sm:px-4 max-sm:pt-5",
              variant === "page" && "sm:min-h-[420px]"
            )}
          >
            <StepBody q={q} fieldId={fieldId} titleId={titleId} />
            {state.step === 7 && q.submitFailed ? (
              <SubmitErrorBanner template={config.forms.submitErrorText} phone={config.phone} />
            ) : null}
          </div>
          <QuizFooter
            isFirst={state.step === 1}
            isLast={state.step === 7}
            variant={variant}
            submitLooksDisabled={state.answers.consent !== true}
            submitting={q.status === "submitting"}
            onBack={q.back}
            onNext={q.next}
            onSubmit={() => void q.submit()}
          />
        </>
      )}
    </QuizFrame>
  );
}

/**
 * Card frame: on the page a white card up to 880 px with radius 24 (full width without radius
 * on phones); in the modal a plain column that fills the shell.
 */
function QuizFrame({
  variant,
  header,
  head = null,
  busy = false,
  children,
}: {
  variant: "page" | "modal";
  /** Consumer heading block (`QuizHeader`). */
  header: ReactNode;
  /** Resume note, pre-fill badge and progress. */
  head?: ReactNode;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-slot="quiz"
      data-variant={variant}
      aria-busy={busy || undefined}
      className={cn(
        "bg-surface text-text relative flex min-h-0 flex-1 flex-col",
        variant === "page" &&
          "border-hairline shadow-card mx-auto w-full max-w-[880px] rounded-(--ig-r-xl) border max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none"
      )}
    >
      {header || head || busy ? (
        <div className="border-hairline flex flex-col gap-3.5 border-b px-8 pt-7 pb-5 max-sm:px-4 max-sm:pt-4 max-sm:pb-3.5">
          {header}
          {head}
        </div>
      ) : null}
      {busy ? <div className="min-h-[420px] max-sm:min-h-[60vh]" /> : children}
    </div>
  );
}
