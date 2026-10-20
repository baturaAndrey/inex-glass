"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ig/button";
import { QUIZ_DRAFT_KEY } from "@/lib/domain/quiz-schema";
import { cn } from "@/lib/utils";
import { MY_CALC_URL } from "./nav-defaults";

/** Re-check the draft when another tab saves or clears it. */
function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === QUIZ_DRAFT_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** localStorage may be unavailable (privacy mode, blocked storage): treat as «no draft». */
function hasDraft(): boolean {
  try {
    return Boolean(window.localStorage.getItem(QUIZ_DRAFT_KEY));
  } catch {
    return false;
  }
}

/** The server never knows about the draft: no indicator in SSR / hydration markup. */
const noDraftOnServer = () => false;

export interface MyCalcLinkProps {
  href?: string;
  label?: string;
  className?: string | undefined;
}

/**
 * «Мой расчёт» icon: resumes the saved quiz draft. A small dot marks an existing draft
 * (`localStorage['inex-quiz-draft-v1']`, written by the quiz, task-20).
 */
export function MyCalcLink({
  href = MY_CALC_URL,
  label = "Мой расчёт",
  className,
}: MyCalcLinkProps) {
  const draft = useSyncExternalStore(subscribe, hasDraft, noDraftOnServer);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("relative size-11 flex-none", className)}
    >
      <Link href={href} title={label}>
        <ClipboardList aria-hidden="true" />
        {draft ? (
          <>
            <span
              aria-hidden="true"
              className="bg-primary ring-surface absolute top-2 right-2 size-2 rounded-full ring-2"
            />
            <span className="sr-only">есть сохранённый расчёт</span>
          </>
        ) : null}
      </Link>
    </Button>
  );
}
