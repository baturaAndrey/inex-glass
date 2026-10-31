import type { DefaultServerCellComponentProps } from "payload";

/** `media.isPlaceholder` in the list (task 38): «Временное» badge, empty for real images. */
export function PlaceholderCell({ cellData }: DefaultServerCellComponentProps) {
  if (cellData !== true) return <span aria-hidden="true">—</span>;
  return (
    <span className="iga-badge iga-badge--work" data-placeholder-badge>
      Временное
    </span>
  );
}
