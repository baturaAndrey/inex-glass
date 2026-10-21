"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator } from "lucide-react";
import { quizHref } from "@/components/layout/calc-link";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** CSS variable with the bar height: the cookie banner and page bottoms keep clear of it. */
const STICKY_HEIGHT_VAR = "--ig-sticky-h";
/** No sticky button on the quiz itself and on client order pages. */
const HIDDEN_PATH = /^\/(?:raschet-stoimosti|zakaz)(?:\/|$)/;

export interface StickyCtaProps {
  className?: string | undefined;
}

/**
 * Phone-only (≤599 px) fixed «Рассчитать стоимость» bar. Links to the quiz with the current
 * page as `src` (`quizHref`: one rule with the header CTA, secret paths are masked). While
 * visible it publishes its height as `--ig-sticky-h` on `<html>`; the variable is removed when the bar is hidden (desktop, excluded paths) or unmounted.
 */
export function StickyCta({ className }: StickyCtaProps) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PATH.test(pathname);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (hidden || !bar) return;
    const root = document.documentElement;

    // `display: none` above 599 px gives height 0 → the variable is removed.
    const sync = () => {
      const height = Math.round(bar.getBoundingClientRect().height);
      if (height > 0) root.style.setProperty(STICKY_HEIGHT_VAR, `${height}px`);
      else root.style.removeProperty(STICKY_HEIGHT_VAR);
    };
    sync();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(STICKY_HEIGHT_VAR);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      ref={barRef}
      className={cn("ig-sticky-cta fixed inset-x-0 bottom-0 z-30 hidden max-sm:block", className)}
    >
      <Button asChild variant="primary" block leftIcon={<Calculator aria-hidden="true" />}>
        <Link href={quizHref(pathname)}>Рассчитать стоимость</Link>
      </Button>
    </div>
  );
}
