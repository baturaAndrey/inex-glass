import type { CSSProperties, ReactNode } from "react";

/**
 * Tiny presentational pieces of the leads admin, styled with Payload's theme variables
 * (`--theme-*`, `--style-radius-*`) so they follow the admin's light/dark theme. Server-safe:
 * no hooks, usable from server and client components alike.
 */

export const mutedText: CSSProperties = {
  color: "var(--theme-elevation-500)",
  fontSize: "12px",
  lineHeight: "16px",
};

const badgeBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "1px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

export function Badge({
  children,
  color,
  background,
  title,
}: {
  children: ReactNode;
  color?: string;
  background?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        ...badgeBase,
        color: color ?? "var(--theme-elevation-800)",
        background: background ?? "var(--theme-elevation-100)",
      }}
    >
      {children}
    </span>
  );
}

export function Stack({ children, gap = 2 }: { children: ReactNode; gap?: number }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>{children}</span>
  );
}

export function Wrap({ children, gap = 4 }: { children: ReactNode; gap?: number }) {
  return <span style={{ display: "flex", flexWrap: "wrap", gap: `${gap}px` }}>{children}</span>;
}

/** Em dash for an empty cell. */
export const EMPTY = "—";
