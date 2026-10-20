import type { Crumb } from "@/components/ig/breadcrumbs";

export type { Crumb };

/**
 * Breadcrumbs by URL structure (ТЗ §2.5: every page except the home page, one parent per page).
 * Pure function: the labels of sections come from `SEGMENT_LABELS`, the label of the current
 * page from the document (`breadcrumbLabel` / title) via `lastLabel`.
 */

export const HOME_CRUMB_LABEL = "Главная";

interface SegmentLabel {
  label: string;
  /** `false` — the section has no page of its own: the crumb is plain text. */
  hasPage: boolean;
}

/** Section labels (first-level URL segments). */
export const SEGMENT_LABELS: Readonly<Record<string, SegmentLabel>> = {
  "zakalennoe-steklo": { label: "Закалённое стекло", hasPage: true },
  "obrabotka-stekla": { label: "Обработка стекла", hasPage: true },
  "steklyannye-konstrukcii": { label: "Стеклянные конструкции", hasPage: true },
  osteklenie: { label: "Остекление", hasPage: true },
  zerkala: { label: "Зеркала", hasPage: true },
  "kak-zakazat": { label: "Как заказать", hasPage: true },
  klientam: { label: "Для кого", hasPage: true },
  "o-kompanii": { label: "О компании", hasPage: true },
  obekty: { label: "Объекты", hasPage: true },
  blog: { label: "Блог", hasPage: true },
  instrumenty: { label: "Инструменты", hasPage: false },
  tripleks: { label: "Триплекс", hasPage: true },
  furnitura: { label: "Зажимной профиль и спайдеры", hasPage: true },
  "steklyannye-peregorodki": { label: "Стеклянные перегородки", hasPage: true },
  "dushevye-peregorodki": { label: "Душевые перегородки", hasPage: true },
  "steklyannye-ograzhdeniya": { label: "Ограждения и перила", hasPage: true },
  "steklyannye-kozyrki": { label: "Стеклянные козырьки", hasPage: true },
  "torgovye-vitriny": { label: "Торговые витрины", hasPage: true },
  proektirovanie: { label: "Проектирование", hasPage: true },
  kontakty: { label: "Контакты", hasPage: true },
  "raschet-stoimosti": { label: "Расчёт стоимости", hasPage: true },
};

/** `10-mm` → «10 мм» (thickness cards). */
const THICKNESS_SEGMENT = /^(\d+)-mm$/;
/** Listing pagination suffix `/page/N/`. */
const PAGINATION_SEGMENT = "page";
const PAGE_NUMBER = /^\d+$/;

export interface BuildBreadcrumbsOptions {
  /** Label of the current (last) crumb: `breadcrumbLabel` or the document title. */
  lastLabel?: string | null | undefined;
  /** Extra labels by segment (`'dlya-mebeli'`) or by full path (`'/zakalennoe-steklo/dlya-mebeli/'`). */
  labels?: Record<string, string> | undefined;
}

/** Path segments without the pagination suffix: `/obekty/page/3/` → `['obekty']`. */
function contentSegments(path: string): string[] {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const count = segments.length;
  if (
    count >= 2 &&
    segments[count - 2] === PAGINATION_SEGMENT &&
    PAGE_NUMBER.test(segments[count - 1] ?? "")
  ) {
    return segments.slice(0, -2);
  }
  return segments;
}

/** Readable fallback for an unknown segment: `some-page` → «Some page». */
function humanize(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // keep the raw segment
  }
  const words = decoded.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function segmentLabel(segment: string, href: string, labels?: Record<string, string>): string {
  const custom = labels?.[href] ?? labels?.[segment];
  if (custom) return custom;
  const known = SEGMENT_LABELS[segment];
  if (known) return known.label;
  const thickness = THICKNESS_SEGMENT.exec(segment);
  if (thickness) return `${thickness[1]} мм`;
  return humanize(segment);
}

/**
 * Crumbs for a page path. `/` → `[]` (no crumbs on the home page). The first crumb is «Главная»,
 * then one crumb per segment; the last one has no `href`. Sections without a page
 * (`/instrumenty/`) have no `href` either. `/page/N/` is not a crumb.
 */
export function buildBreadcrumbs(path: string, opts: BuildBreadcrumbsOptions = {}): Crumb[] {
  const segments = contentSegments(path);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: HOME_CRUMB_LABEL, href: "/" }];
  let href = "/";
  segments.forEach((segment, index) => {
    href = `${href}${segment}/`;
    const isLast = index === segments.length - 1;
    const label =
      (isLast ? opts.lastLabel?.trim() : undefined) || segmentLabel(segment, href, opts.labels);
    const hasPage = SEGMENT_LABELS[segment]?.hasPage ?? true;
    crumbs.push(isLast || !hasPage ? { label } : { label, href });
  });
  return crumbs;
}
