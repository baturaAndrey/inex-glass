"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { quizSrc } from "@/lib/domain/quiz-src";

/** `sessionStorage` key with the last visited site path (entry page of the quiz modal). */
export const LAST_PATH_KEY = "inex:last-path";
const QUIZ_PATH = /^\/raschet-stoimosti(?:\/|$)/;

/**
 * Remembers the current page path in `sessionStorage[LAST_PATH_KEY]` on every navigation, so
 * the quiz modal opened by a link without `src` («Мой расчёт», plain links in texts) still knows
 * the page it was opened from. The quiz route itself is skipped; secret paths are masked
 * (`/zakaz/<token>/` → `/zakaz/`). Renders nothing; mounted once in the site layout.
 */
export function PathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || QUIZ_PATH.test(pathname)) return;
    try {
      window.sessionStorage.setItem(LAST_PATH_KEY, quizSrc(pathname));
    } catch {
      // Storage blocked (privacy mode, quota): the quiz falls back to «/».
    }
  }, [pathname]);

  return null;
}

/** The remembered path, or `''` (no storage, nothing stored yet). */
export function readLastPath(): string {
  try {
    return window.sessionStorage.getItem(LAST_PATH_KEY) ?? "";
  } catch {
    return "";
  }
}
