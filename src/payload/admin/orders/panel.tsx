import type { CSSProperties, ReactNode } from "react";

/**
 * Card frame of the «Управление» panels. The Payload admin has its own theme (no Tailwind, no
 * site tokens), so the panels use Payload's CSS variables and inline styles.
 */

const PANEL_STYLE: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-m, 8px)",
  background: "var(--theme-elevation-0)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

export const HINT_STYLE: CSSProperties = {
  margin: 0,
  color: "var(--theme-elevation-600)",
  fontSize: 13,
  lineHeight: 1.45,
};

export const ROW_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

export const FIELD_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

export const INPUT_STYLE: CSSProperties = {
  height: 40,
  padding: "0 12px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-s, 4px)",
  background: "var(--theme-input-bg, var(--theme-elevation-0))",
  color: "var(--theme-text)",
  font: "inherit",
};

export function Panel({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section aria-label={title} data-testid={testId} style={PANEL_STYLE}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {children}
    </section>
  );
}
