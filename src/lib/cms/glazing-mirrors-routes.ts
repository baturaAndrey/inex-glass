import type { QuizTypeId } from "@/lib/domain";

/**
 * The single «URL ↔ document ↔ quiz type» table of the «Остекление» and «Зеркала» sections
 * (task 27). Used by the typed routes (`/osteklenie/…`, `/zerkala/…`), the seed slice
 * `glazing-mirrors`, its tests and the sitemap (task 36). Pure data: safe in tests and any bundle.
 *
 * Document convention (agreed with the `constructions` template of task 26): the `slug` of a
 * child document is the LAST URL segment (`fasadov`) and its `parent` is the section hub
 * (`osteklenie`); the collection hook computes `path = parent.path + slug + "/"`. `pathKey` is
 * the path-derived alias (`osteklenie-fasadov`) that the template also resolves.
 */

export type GlazingMirrorsSection = "osteklenie" | "zerkala";

export interface GlazingMirrorsRoute {
  /** Public path with the trailing slash: `/osteklenie/fasadov/`. */
  path: string;
  /** Path without the outer slashes: `osteklenie/fasadov`. */
  segment: string;
  /** `slug` of the `constructions` document (last URL segment). */
  docSlug: string;
  /** Path-derived key of the document: `osteklenie-fasadov` (hubs: same as `docSlug`). */
  pathKey: string;
  /** `slug` of the parent hub document; `null` for the hubs themselves. */
  parentSlug: string | null;
  section: GlazingMirrorsSection;
  kind: "hub" | "construction";
  /** Suggested quiz pre-fill (`quizPrefill.type`); editable in the CMS. */
  quizType: QuizTypeId;
  /** Short label: breadcrumbs, cards, menus. */
  label: string;
}

type RouteSeed = Pick<GlazingMirrorsRoute, "section" | "quizType" | "label"> & {
  /** Last URL segment; `null` for the hub. */
  child: string | null;
};

const ROUTE_SEEDS: readonly RouteSeed[] = [
  { section: "osteklenie", child: null, quizType: "other", label: "Остекление" },
  { section: "osteklenie", child: "fasadov", quizType: "facade", label: "Фасады" },
  {
    section: "osteklenie",
    child: "spajdernoe",
    quizType: "facade",
    label: "Спайдерное остекление",
  },
  {
    section: "osteklenie",
    child: "vitrin-i-magazinov",
    quizType: "shopfronts",
    label: "Витрины и магазины",
  },
  { section: "osteklenie", child: "liftovyh-shaht", quizType: "triplex", label: "Лифтовые шахты" },
  {
    section: "osteklenie",
    child: "verand-terras-besedok",
    quizType: "verandas",
    label: "Веранды и террасы",
  },
  { section: "zerkala", child: null, quizType: "mirrors", label: "Зеркала" },
  { section: "zerkala", child: "dlya-zalov", quizType: "mirrors", label: "Зеркала для залов" },
  { section: "zerkala", child: "dlya-salonov", quizType: "mirrors", label: "Зеркала для салонов" },
];

function toRoute({ section, child, quizType, label }: RouteSeed): GlazingMirrorsRoute {
  const segment = child ? `${section}/${child}` : section;
  return {
    path: `/${segment}/`,
    segment,
    docSlug: child ?? section,
    pathKey: segment.replace(/\//g, "-"),
    parentSlug: child ? section : null,
    section,
    kind: child ? "construction" : "hub",
    quizType,
    label,
  };
}

/** The 9 URLs of the sections, hubs first within each section. */
export const GLAZING_MIRRORS_ROUTES: readonly GlazingMirrorsRoute[] = ROUTE_SEEDS.map(toRoute);

/** Route by its public path (`/zerkala/dlya-zalov/`); `undefined` for any other path. */
export function findGlazingMirrorsRoute(path: string): GlazingMirrorsRoute | undefined {
  return GLAZING_MIRRORS_ROUTES.find((route) => route.path === path);
}

/** Route of a child page (`osteklenie` + `fasadov`); `undefined` for an unknown segment. */
export function findGlazingMirrorsChild(
  section: GlazingMirrorsSection,
  child: string
): GlazingMirrorsRoute | undefined {
  return GLAZING_MIRRORS_ROUTES.find(
    (route) => route.section === section && route.kind === "construction" && route.docSlug === child
  );
}

/** Route of a section hub; always defined (the table is static). */
export function glazingMirrorsHub(section: GlazingMirrorsSection): GlazingMirrorsRoute {
  const hub = GLAZING_MIRRORS_ROUTES.find(
    (route) => route.section === section && route.kind === "hub"
  );
  if (!hub) throw new Error(`glazing-mirrors-routes: нет хаба ${section}`);
  return hub;
}
