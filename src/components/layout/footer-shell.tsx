"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ORDER_PATH_PREFIX } from "./nav-paths";

export interface FooterShellProps {
  /** Full site footer (server-rendered). */
  full: ReactNode;
  /** Minimal footer of the client order page `/zakaz/<token>/`. */
  order: ReactNode;
}

/**
 * Chooses the footer by path (`/zakaz/*` → `order`, otherwise `full`), the same mechanism as
 * `HeaderShell`: the root layout stays static/ISR and never reads `headers()`. `usePathname()`
 * is known during server rendering, so the HTML already carries the right footer (no swap after
 * hydration, no layout shift).
 */
export function FooterShell({ full, order }: FooterShellProps) {
  const pathname = usePathname() ?? "/";
  return <>{pathname.startsWith(ORDER_PATH_PREFIX) ? order : full}</>;
}
