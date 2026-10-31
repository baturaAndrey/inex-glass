"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ig/button";
import { pageQuizOnScreen } from "@/components/quiz/modal-trigger";
import { quizSrc } from "@/lib/domain/quiz-src";
import { cn } from "@/lib/utils";
import { QUIZ_PATH } from "./nav-paths";

/** Moved to the pure `@/lib/domain/quiz-src` (shared with server components); kept for imports. */
export { quizSrc };

/** Quiz URL with the current page as `src` (prefill context and analytics, task-20). */
export function quizHref(pathname: string): string {
  return `${QUIZ_PATH}?src=${encodeURIComponent(quizSrc(pathname))}`;
}

/**
 * On the quiz page itself the CTA only brings the page quiz into view — the same outcome as the
 * modal route closing itself there (`QuizModal`), without a navigation round trip that would
 * flash the modal's loading skeleton and race its `router.back()` (task 39).
 */
function onQuizPageClick(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const pageQuiz = pageQuizOnScreen();
  if (!pageQuiz) return;
  event.preventDefault();
  pageQuiz.scrollIntoView({ block: "start" });
}

export interface CalcLinkProps {
  /** `full` — text + icon; `icon` — square icon button (tablet / order header on phones). */
  variant?: "full" | "icon";
  label?: string;
  className?: string | undefined;
}

/**
 * The main CTA «Рассчитать стоимость». A soft navigation (`next/link`) on purpose: the
 * intercepting route `@modal` (task-34) then opens the quiz in a modal over the current page.
 */
export function CalcLink({
  variant = "full",
  label = "Рассчитать стоимость",
  className,
}: CalcLinkProps) {
  const pathname = usePathname() ?? "/";
  const href = quizHref(pathname);
  // `usePathname` may omit the trailing slash of `trailingSlash: true` URLs.
  const onQuizPage = `${pathname.replace(/\/$/, "")}/` === QUIZ_PATH;
  // Spread, not `onClick={undefined}` (exactOptionalPropertyTypes).
  const linkProps = onQuizPage ? { onClick: onQuizPageClick } : {};

  if (variant === "icon") {
    return (
      <Button
        asChild
        variant="primary"
        size="icon"
        aria-label={label}
        className={cn("size-11 flex-none", className)}
      >
        <Link href={href} {...linkProps}>
          <Calculator aria-hidden="true" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="primary"
      leftIcon={<Calculator aria-hidden="true" />}
      // Header size of the prototype: 44 px high, 15 px text.
      className={cn("h-11 flex-none px-[22px] text-[15px]", className)}
    >
      <Link href={href} {...linkProps}>
        {label}
      </Link>
    </Button>
  );
}
