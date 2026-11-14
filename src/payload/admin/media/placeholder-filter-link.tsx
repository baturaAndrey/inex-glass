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
    <nav
      aria-label="Быстрый фильтр медиафайлов"
      className="iga-screens-quick__row iga-screens-media-filter"
    >
      <a
        href={MEDIA_LIST_PATH}
        aria-current={!anyFilter ? "true" : undefined}
        data-quick-filter="all"
        className="iga-chip iga-screens-chip"
      >
        Все изображения
      </a>
      <a
        href={placeholderHref}
        aria-current={filtered ? "true" : undefined}
        data-quick-filter="placeholders"
        className="iga-chip iga-screens-chip"
      >
        Временные изображения
        {count !== undefined ? <b data-placeholder-count>{formatNumber(count)}</b> : null}
      </a>
      <span className="iga-muted">
        Замените временное изображение в документе, затем удалите его из медиатеки.
      </span>
    </nav>
  );
}
