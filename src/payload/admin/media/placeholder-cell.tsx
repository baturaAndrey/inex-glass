import type { DefaultServerCellComponentProps } from "payload";

/** Badge geometry of the admin list (Payload admin has no Tailwind; inline styles on purpose). */
const BADGE_STYLE = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "20px",
  whiteSpace: "nowrap",
  background: "var(--theme-warning-100)",
  color: "var(--theme-warning-800)",
} as const;

/** `media.isPlaceholder` in the list (task 38): «Временное» badge, empty for real images. */
export function PlaceholderCell({ cellData }: DefaultServerCellComponentProps) {
  if (cellData !== true) return <span aria-hidden="true">—</span>;
  return (
    <span style={BADGE_STYLE} data-placeholder-badge>
      Временное
    </span>
  );
}
