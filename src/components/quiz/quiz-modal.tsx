"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { readLastPath } from "./path-tracker";
import { Quiz } from "./quiz";
import { QUIZ_META_LINE, QUIZ_TITLE } from "./quiz-header";
import type { QuizConfig, QuizPrefill } from "./types";

/**
 * Modal shell of the quiz for the intercepting route `@modal/(.)raschet-stoimosti` (task-34):
 * a soft navigation to `/raschet-stoimosti/` opens the quiz over the current page; closing
 * (`X`, `Esc`, overlay click) goes back in history, so the page below is neither re-rendered nor
 * scrolled. The shell owns only the container, height and scrolling — the steps, the footer and
 * the draft are `<Quiz variant="modal">` (task-20). Closing never clears the draft.
 *
 * ≥600 px: centred window up to 880 px wide and `100dvh − 48px` high, the quiz body scrolls on
 * its own. ≤599 px: full screen (`h-dvh`), the «Назад / Далее» footer is sticky at the bottom
 * with the safe-area inset (`QuizFooter`).
 */

/** Fallback entry page when neither `src` nor a remembered path exists. */
const DEFAULT_ENTRY_PAGE = "/";
/** A page-mode quiz already on screen (the modal was opened from `/raschet-stoimosti/` itself). */
const PAGE_QUIZ_SELECTOR = '[data-slot="quiz"][data-variant="page"]';
/** The intercepted route; any other path means the visitor navigated away from the modal. */
const QUIZ_ROUTE = /^\/raschet-stoimosti\/?$/;

export interface QuizModalProps {
  config: QuizConfig;
  prefill?: QuizPrefill | undefined;
  /** Validated `src` of the link; `''` → the path remembered by `PathTracker`, then `/`. */
  entryPage?: string | undefined;
  /** «Мой расчёт»: restore the saved draft. */
  resume?: boolean | undefined;
}

/** Whether the page under the modal is the quiz page (client only; `false` on the server). */
function pageQuizOnScreen(): HTMLElement | null {
  return typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(PAGE_QUIZ_SELECTOR);
}

/** The focused element outside any dialog (the link that opened the modal), with its `href`. */
function activeTrigger(): { element: HTMLElement; href: string | null } | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;
  if (active.closest("[role=dialog]")) return null;
  return { element: active, href: active.getAttribute("href") };
}

export function QuizModal({ config, prefill, entryPage = "", resume = false }: QuizModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  // The modal only exists after a client navigation, so reading browser storage in the state
  // initialiser cannot cause a hydration mismatch; it is fixed for the life of the modal because
  // the quiz reports `quiz_start` with it on mount.
  const [entry] = useState(() => {
    if (entryPage || typeof window === "undefined") return entryPage;
    return readLastPath() || DEFAULT_ENTRY_PAGE;
  });
  const [overPageQuiz] = useState(() => pageQuizOnScreen() !== null);

  // `router.back()` exactly once: a second Esc / click during the transition would leave the
  // page the visitor came from. Never reset: it also guards the Strict Mode double effect run.
  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (window.history.length <= 1) router.push(DEFAULT_ENTRY_PAGE);
    else router.back();
  }, [router]);

  // Opened from the quiz page itself (header CTA / «Мой расчёт» there): no second quiz on top.
  // A plain CTA goes back and brings the page quiz into view; «Мой расчёт» reloads the URL as a
  // full page so the saved draft is restored there.
  useEffect(() => {
    if (!overPageQuiz) return;
    if (resume) {
      window.location.reload();
      return;
    }
    close();
    pageQuizOnScreen()?.scrollIntoView({ block: "start" });
  }, [overPageQuiz, resume, close]);

  // Focus returns to the trigger (the link that opened the modal). It is captured during the
  // first render, while the previous DOM is still in place: the phone sticky CTA is unmounted in
  // the same commit that mounts the modal (it is hidden on the quiz path). The route change
  // unmounts the dialog while it is still `open`, so Radix' own restore cannot be relied upon
  // (under Strict Mode it remembers an element inside the dialog). `unmountedRef` tells the real
  // unmount from the Strict Mode double effect run.
  const [trigger] = useState(activeTrigger);
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      if (!unmountedRef.current) return;
      if (!trigger) return;
      // The phone sticky CTA re-mounts when the URL goes back: focus its new link (same `href`;
      // the header renders hidden copies of the same CTA, so only a rendered one counts).
      const target = trigger.element.isConnected
        ? trigger.element
        : trigger.href
          ? Array.from(
              document.querySelectorAll<HTMLElement>(`a[href="${CSS.escape(trigger.href)}"]`)
            ).find((link) => link.getClientRects().length > 0)
          : undefined;
      target?.focus({ preventScroll: true });
    },
    [trigger]
  );

  // A client navigation away from the open modal (a link inside it) keeps the last state of the
  // `@modal` slot: there is deliberately no slot catch-all (`@modal/[...slug]` would also capture
  // `/admin/*` of the `(payload)` root layout). The shell closes itself by pathname instead.
  if (overPageQuiz || !QUIZ_ROUTE.test(pathname)) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="quiz-modal-overlay"
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          data-slot="quiz-modal"
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "bg-surface text-text shadow-modal fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden outline-none",
            "max-h-[calc(100dvh-48px)] w-[calc(100%-48px)] max-w-[880px] rounded-(--ig-r-xl)",
            "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:shadow-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ease-ig duration-(--ig-dur-base) motion-reduce:animate-none"
          )}
        >
          <Quiz
            config={config}
            prefill={prefill}
            entryPage={entry}
            variant="modal"
            resume={resume}
            onClose={close}
            header={<QuizModalHeader onClose={close} />}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * `QuizHeader` markup (`.qz-head__row` of `Kviz.dc.html`) on Radix `Title` / `Description`, so
 * the dialog is labelled by the heading and described by the meta line.
 */
function QuizModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <DialogPrimitive.Title className="text-text m-0 text-[28px] leading-[1.2] font-bold max-sm:text-[22px]">
          {QUIZ_TITLE}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-small text-text-2 mt-1.5 mb-0">
          {QUIZ_META_LINE}
        </DialogPrimitive.Description>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="bg-bg text-text hover:bg-well grid size-11 flex-none cursor-pointer place-items-center rounded-full transition-colors duration-(--ig-dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
