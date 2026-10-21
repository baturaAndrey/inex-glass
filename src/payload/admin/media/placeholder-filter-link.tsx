import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/domain/format";
import type { BeforeListTableServerProps } from "payload";

/**
 * `beforeListTable` of `media` (task 38): quick filter «Временные изображения».
 *
 * Generated placeholders carry `isPlaceholder: true`; editors replace them with real photos.
 * The chips are plain links (`<a>`, not `next/link` — admin links, AGENTS.md) to the list with
 * Payload's query format `?where[isPlaceholder][equals]=true`, so they compose with the built-in
 * filter builder, survive a reload and can be bookmarked. The counter respects the viewer's
 * access (`overrideAccess: false`) and never breaks the list when the query fails.
 */

const MEDIA_LIST_PATH = "/admin/collections/media/";
const PLACEHOLDER_PARAM = "where[isPlaceholder][equals]";

const placeholderHref = `${MEDIA_LIST_PATH}?${new URLSearchParams({ [PLACEHOLDER_PARAM]: "true" }).toString()}`;

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
  marginBottom: "16px",
};

const hintStyle: CSSProperties = {
  color: "var(--theme-elevation-500)",
  fontSize: "12px",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 10px",
    borderRadius: "999px",
    border: `1px solid ${active ? "var(--theme-elevation-800)" : "var(--theme-elevation-150)"}`,
    background: active ? "var(--theme-elevation-800)" : "var(--theme-elevation-0)",
    color: active ? "var(--theme-elevation-0)" : "var(--theme-elevation-800)",
    fontSize: "13px",
    lineHeight: "18px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

/** `true` when the list is filtered by exactly `isPlaceholder = true`. */
function isPlaceholderFilter(searchParams: BeforeListTableServerProps["searchParams"]): boolean {
  const whereKeys = Object.keys(searchParams ?? {}).filter((key) => key.startsWith("where["));
  return (
    whereKeys.length === 1 &&
    whereKeys[0] === PLACEHOLDER_PARAM &&
    searchParams?.[PLACEHOLDER_PARAM] === "true"
  );
}

export async function PlaceholderFilterLink({
  payload,
  user,
  searchParams,
}: BeforeListTableServerProps) {
  let count: number | undefined;
  try {
    const result = await payload.count({
      collection: "media",
      where: { isPlaceholder: { equals: true } },
      overrideAccess: false,
      user,
    });
    count = result.totalDocs;
  } catch {
    count = undefined;
  }
  const filtered = isPlaceholderFilter(searchParams);
  const anyFilter = Object.keys(searchParams ?? {}).some((key) => key.startsWith("where["));

  return (
    <nav aria-label="Быстрый фильтр медиафайлов" style={rowStyle}>
      <a
        href={MEDIA_LIST_PATH}
        aria-current={!anyFilter ? "true" : undefined}
        data-quick-filter="all"
        style={chipStyle(!anyFilter)}
      >
        Все изображения
      </a>
      <a
        href={placeholderHref}
        aria-current={filtered ? "true" : undefined}
        data-quick-filter="placeholders"
        style={chipStyle(filtered)}
      >
        Временные изображения
        {count !== undefined ? (
          <span data-placeholder-count style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
            {formatNumber(count)}
          </span>
        ) : null}
      </a>
      <span style={hintStyle}>
        Замените временное изображение в документе, затем удалите его из медиатеки.
      </span>
    </nav>
  );
}
