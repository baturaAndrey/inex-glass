"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ORDER_PATH_PREFIX } from "./nav-paths";

/** Scroll position (px) after which the header turns compact… */
const COMPACT_ON_Y = 80;
/** …and before which it expands again. The gap (hysteresis) prevents flicker around one value. */
const COMPACT_OFF_Y = 40;

export interface HeaderShellProps {
  /** Full three-row header (server-rendered rows). */
  full: ReactNode;
  /** Simplified header of the client order page `/zakaz/<token>/`. */
  order: ReactNode;
}

/** Compact state from the scroll position with hysteresis. */
function nextCompact(current: boolean, scrollY: number): boolean {
  return current ? scrollY >= COMPACT_OFF_Y : scrollY > COMPACT_ON_Y;
}

/**
 * Client shell of the site header.
 * - Chooses the header by path (`/zakaz/*` → `order`, otherwise `full`), so the root layout stays
 *   static/ISR and never reads `headers()`.
 * - Full header: a spacer with the full header height (`--ig-header-h`, per breakpoint) keeps the
 *   page from jumping (CLS 0); inside it the header is `position: fixed`. On scroll (rAF,
 *   passive listener) it sets `data-compact`: rows 1 and 3 collapse, row 2 shrinks to 64 px and
 *   a shadow appears. Rows react through `group-data-[compact=true]/header:*` classes.
 */
export function HeaderShell({ full, order }: HeaderShellProps) {
  const pathname = usePathname() ?? "/";
  const isOrderPage = pathname.startsWith(ORDER_PATH_PREFIX);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (isOrderPage) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setCompact((current) => nextCompact(current, window.scrollY));
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    // Restored scroll position (reload, back navigation): sync on the first frame.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [isOrderPage]);

  if (isOrderPage) return <>{order}</>;

  return (
    <div className="h-(--ig-header-h) flex-none">
      <header
        data-compact={compact ? "true" : "false"}
        className="group/header data-[compact=true]:shadow-card fixed inset-x-0 top-0 z-40 transition-shadow duration-(--ig-dur-base) motion-reduce:transition-none"
      >
        {full}
      </header>
    </div>
  );
}
