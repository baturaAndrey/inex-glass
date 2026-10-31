import type { ReactNode } from "react";

/**
 * Card frame of the «Управление» panels and the class names of their parts. The look lives in
 * the admin theme (`.iga-card`, `.iga-field`, `.iga-input`, `.iga-orders-*` in
 * `src/app/(payload)/styles/`), never in inline styles.
 */

/** Hint under a field or a panel: 13 px secondary text. */
export const HINT_CLASS = "iga-muted iga-orders-hint";

/** Row of controls (buttons, checkbox + label); wraps, stacks on phones. */
export const ROW_CLASS = "iga-orders-row";

/** Label with its control below. */
export const FIELD_CLASS = "iga-field iga-orders-field";

/** Text / date input of a panel (`.iga-select` for selects, `textarea.iga-input` for text). */
export const INPUT_CLASS = "iga-input";

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
    <section aria-label={title} data-testid={testId} className="iga-card iga-orders-panel">
      <h3 className="iga-orders-panel__title">{title}</h3>
      {children}
    </section>
  );
}
