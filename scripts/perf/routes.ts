/**
 * Representative routes of the performance audit (task 39), shared by
 * `scripts/perf/js-budget.ts`, `scripts/perf/lighthouse.ts` and `e2e/perf-budget.spec.ts`.
 *
 * One route per page template plus the heaviest client-side pages (quiz, calculators, search).
 * Two routes depend on data that the seed does not publish:
 * - an object card: `PERF_OBJECT_SLUG`, otherwise discovered from the first card link on
 *   `/obekty/` (see `resolveRoutes`); skipped when the list is empty;
 * - an order page: `PERF_ORDER_TOKEN` (a token of a test order, e.g. created by the orders e2e
 *   fixtures); skipped when unset.
 */

/** JS budget of ТЗ §2 п.3: gzip bytes of same-origin scripts per route, Next/React runtime included. */
export const JS_BUDGET_GZIP_BYTES = 150 * 1024;

/**
 * Temporary ceiling while the 150 KB target is not met (see `docs/reports/performance.md`,
 * «JS-бюджет»): the Next 16 + React 19 runtime alone is ~129 KB gzip, so the target leaves
 * ~21 KB for the whole site UI. The e2e guard (`e2e/perf-budget.spec.ts`) enforces this ceiling
 * against regressions; `js-budget.ts` keeps reporting against the 150 KB target. Agree any
 * change with the coordinator; `null` — enforce the target itself.
 */
export const JS_CEILING_GZIP_BYTES: number | null = 245 * 1024;

export interface PerfRoute {
  /** Short stable id: file names of the Lighthouse reports, table rows. */
  id: string;
  /** Path with the trailing slash (`trailingSlash: true`); query allowed. */
  path: string;
  /** Page template, as named in the report. */
  template: string;
  /** Lighthouse acceptance (LCP/CLS/TBT targets) applies to this template. */
  cwvGate: boolean;
  /** Expected HTTP status of the document. */
  status?: number;
}

/** Placeholder of a route resolved at run time (see `resolveRoutes`). */
const OBJECT_ROUTE_ID = "object";
const ORDER_ROUTE_ID = "order";

export const PERF_ROUTES: readonly PerfRoute[] = [
  { id: "home", path: "/", template: "Главная", cwvGate: true },
  { id: "zak-hub", path: "/zakalennoe-steklo/", template: "Хаб закалённого стекла", cwvGate: true },
  {
    id: "thickness-10",
    path: "/zakalennoe-steklo/10-mm/",
    template: "Карточка толщины",
    cwvGate: true,
  },
  {
    id: "glass-matovoe",
    path: "/zakalennoe-steklo/matovoe/",
    template: "Вид стекла",
    cwvGate: true,
  },
  { id: "tripleks", path: "/tripleks/", template: "Триплекс", cwvGate: false },
  {
    id: "holes",
    path: "/obrabotka-stekla/otverstiya-i-vyrezy/",
    template: "Обработка (калькулятор отверстий)",
    cwvGate: true,
  },
  {
    id: "partitions",
    path: "/steklyannye-peregorodki/",
    template: "Конструкция",
    cwvGate: true,
  },
  { id: "shower", path: "/dushevye-peregorodki/", template: "Конструкция", cwvGate: false },
  { id: "facades", path: "/osteklenie/fasadov/", template: "Остекление", cwvGate: false },
  { id: "how-to-order", path: "/kak-zakazat/", template: "Как заказать", cwvGate: false },
  {
    id: "tolerances",
    path: "/kak-zakazat/dopuski-i-gost/",
    template: "Справочная страница",
    cwvGate: false,
  },
  {
    id: "contractors",
    path: "/klientam/podryadchikam/",
    template: "Клиентам",
    cwvGate: false,
  },
  { id: "objects", path: "/obekty/", template: "Объекты", cwvGate: true },
  { id: OBJECT_ROUTE_ID, path: "", template: "Карточка объекта", cwvGate: false },
  { id: "blog", path: "/blog/", template: "Блог", cwvGate: false },
  {
    id: "article",
    path: "/blog/kak-vybrat-tolshchinu-stekla/",
    template: "Статья",
    cwvGate: true,
  },
  {
    id: "weight-calc",
    path: "/instrumenty/kalkulyator-vesa-stekla/",
    template: "Калькулятор веса",
    cwvGate: true,
  },
  { id: "quiz", path: "/raschet-stoimosti/", template: "Квиз", cwvGate: true },
  { id: "contacts", path: "/kontakty/", template: "Контакты", cwvGate: false },
  { id: "company", path: "/o-kompanii/", template: "О компании", cwvGate: false },
  {
    id: "search",
    path: `/poisk/?q=${encodeURIComponent("стекло")}`,
    template: "Поиск",
    cwvGate: false,
  },
  { id: "not-found", path: "/net-takoj-stranicy/", template: "404", cwvGate: false, status: 404 },
  { id: ORDER_ROUTE_ID, path: "", template: "Страница заказа", cwvGate: false },
];

/** `href` of the first object card on the objects index page (`/obekty/<slug>/`). */
const OBJECT_LINK_PATTERN = /href="(\/obekty\/(?!page\/)[a-z0-9-]+\/)"/;

async function discoverObjectPath(baseUrl: string): Promise<string | null> {
  const response = await fetch(new URL("/obekty/", baseUrl));
  if (!response.ok) return null;
  const match = OBJECT_LINK_PATTERN.exec(await response.text());
  return match?.[1] ?? null;
}

export interface ResolvedRoutes {
  routes: PerfRoute[];
  /** Routes left out, with the reason (printed by the scripts, listed in the report). */
  skipped: Array<{ id: string; reason: string }>;
}

/**
 * Fills the data-dependent routes. `only` (comma-separated ids, `PERF_ONLY`) narrows the list.
 */
export async function resolveRoutes(
  baseUrl: string,
  only: string | undefined = process.env.PERF_ONLY
): Promise<ResolvedRoutes> {
  const wanted = only ? new Set(only.split(",").map((id) => id.trim())) : null;
  const routes: PerfRoute[] = [];
  const skipped: ResolvedRoutes["skipped"] = [];

  for (const route of PERF_ROUTES) {
    if (wanted && !wanted.has(route.id)) continue;

    if (route.id === OBJECT_ROUTE_ID) {
      const slug = process.env.PERF_OBJECT_SLUG;
      const path = slug ? `/obekty/${slug}/` : await discoverObjectPath(baseUrl);
      if (path) routes.push({ ...route, path });
      else skipped.push({ id: route.id, reason: "нет опубликованных объектов (PERF_OBJECT_SLUG)" });
    } else if (route.id === ORDER_ROUTE_ID) {
      const token = process.env.PERF_ORDER_TOKEN;
      if (token) routes.push({ ...route, path: `/zakaz/${token}/` });
      else skipped.push({ id: route.id, reason: "не задан PERF_ORDER_TOKEN" });
    } else {
      routes.push(route);
    }
  }
  return { routes, skipped };
}

/** Base URL of the measured server: `PERF_BASE_URL`, default a local `next start`. */
export function perfBaseUrl(): string {
  return process.env.PERF_BASE_URL ?? "http://localhost:3000";
}

/** Bytes the e2e guard allows for the route (the agreed ceiling, else the target). */
export function jsLimitFor(_route: PerfRoute): number {
  return JS_CEILING_GZIP_BYTES ?? JS_BUDGET_GZIP_BYTES;
}

export function formatKb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}
