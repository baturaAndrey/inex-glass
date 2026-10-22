import type { CSSProperties, ReactNode } from "react";

/**
 * Tiny presentational pieces of the leads admin. Look comes from the admin theme classes
 * (`.iga-badge`, `.iga-muted`, `.iga-screens-stack|wrap` — `src/app/(payload)/styles/`), never
 * from inline colours. Server-safe: no hooks, usable from server and client components alike.
 */

/** Class of secondary text (12 px, `--ig-text-2`) — `_screens.scss`. */
export const MUTED_CLASS = "iga-muted";

/** Custom properties of `.iga-badge` (the only inline values allowed in the admin theme). */
type BadgeStyle = CSSProperties & { "--iga-badge-color"?: string; "--iga-badge-bg"?: string };

/**
 * Status-like badge. `color` is the text colour (e.g. `lead-statuses.color`, already sanitised by
 * `statusBadgeColors`), `background` the fill; without them the badge is neutral grey.
 */
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
  const style: BadgeStyle = {};
  if (color) style["--iga-badge-color"] = color;
  if (background) style["--iga-badge-bg"] = background;
  return (
    <span
      title={title}
      className="iga-badge iga-screens-badge"
      style={color || background ? style : undefined}
    >
      {children}
    </span>
  );
}

/** Vertical stack; `gap` in px (passed through a custom property, no colours). */
export function Stack({ children, gap = 2 }: { children: ReactNode; gap?: number }) {
  return (
    <span className="iga-screens-stack" style={{ "--iga-gap": `${gap}px` } as CSSProperties}>
      {children}
    </span>
  );
}

/** Wrapping row; `gap` in px (passed through a custom property, no colours). */
export function Wrap({ children, gap = 4 }: { children: ReactNode; gap?: number }) {
  return (
    <span className="iga-screens-wrap" style={{ "--iga-gap": `${gap}px` } as CSSProperties}>
      {children}
    </span>
  );
}

/** Em dash for an empty cell. */
export const EMPTY = "—";
