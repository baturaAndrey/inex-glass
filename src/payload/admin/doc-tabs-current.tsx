"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Marks the current document tab («Редактировать», «Версии», «Сводка», «Управление», …) with
 * `aria-current="page"`.
 *
 * Payload's `DocumentTabLink` cannot do it here: with `trailingSlash: true` its `formatAdminURL`
 * returns `/admin/collections/<slug>/`, the tab hrefs become `/admin/collections/<slug>//<id>/…`
 * and never match the pathname, so no tab gets `doc-tab--active`. This component compares the
 * hrefs with `location.pathname` after normalising slashes and marks the tab with the longest
 * matching path (the edit tab's path is a prefix of every other tab's). A tab Payload did mark
 * active (globals) keeps the mark and gets `aria-current` too.
 *
 * Rendered once by the admin nav (present on every admin page). The tabs are re-rendered by
 * Payload on navigation and by the RSC payload, so a `MutationObserver` re-applies the mark;
 * the work is a handful of `.doc-tab` elements per animation frame at most. The CSS fallback in
 * `_edit-form.scss` (first tab) covers the moment before hydration only.
 */

const TAB_SELECTOR = ".doc-tabs .doc-tab";
const PAYLOAD_ACTIVE_CLASS = "doc-tab--active";

/** `/a//b/c/` → `/a/b/c` (the root stays `/`). */
function normalizePath(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

/** Path of a same-origin tab link, or `null` (no href, external link). */
function tabPath(tab: Element): string | null {
  const href = tab.getAttribute("href");
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin ? normalizePath(url.pathname) : null;
  } catch {
    return null;
  }
}

const isWithin = (current: string, path: string): boolean =>
  current === path || current.startsWith(`${path}/`);

function markCurrentTab(): void {
  const tabs = Array.from(document.querySelectorAll(TAB_SELECTOR));
  if (tabs.length === 0) return;

  // Where Payload does match (globals: no id segment, no double slash) it renders the current
  // tab as a `<div>` without href: keep its choice.
  let match: Element | null =
    tabs.find((tab) => tab.classList.contains(PAYLOAD_ACTIVE_CLASS)) ?? null;
  const current = normalizePath(window.location.pathname);
  let matchLength = match ? Number.POSITIVE_INFINITY : -1;
  for (const tab of tabs) {
    const path = tabPath(tab);
    if (path && isWithin(current, path) && path.length > matchLength) {
      match = tab;
      matchLength = path.length;
    }
  }

  for (const tab of tabs) {
    if (tab === match) {
      if (tab.getAttribute("aria-current") !== "page") tab.setAttribute("aria-current", "page");
    } else if (tab.hasAttribute("aria-current")) {
      tab.removeAttribute("aria-current");
    }
  }
}

export function DocTabsCurrent(): null {
  // A client navigation changes the pathname; the observer below catches the re-rendered tabs.
  const pathname = usePathname();

  useEffect(() => {
    markCurrentTab();
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        markCurrentTab();
      });
    });
    // Attribute changes are not observed: our own `aria-current` writes never re-trigger it.
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
