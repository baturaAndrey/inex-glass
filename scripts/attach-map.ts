/**
 * Explicit map «manifest target → where the generated placeholder goes» for
 * `scripts/attach-generated-media.ts` (task 38). Pure module: no Payload, no I/O, unit-tested in
 * `src/lib/media/attach-map.test.ts`.
 *
 * Every target of `public/generated/manifest.json` must be listed in `ATTACH_MAP`, either with
 * its bindings or with an explicit `noTarget` reason (a schema gap reported to the coordinator).
 * A target missing from the map is a bug of the map and fails the run (`resolveTarget` →
 * `{ ok: false, unknown: true }`).
 *
 * Binding kinds (all of them fill ONLY empty slots, see `canAttach`):
 * - `docField`   — one document found by `slug`, field `heroImage` / `card.image`;
 * - `eachDoc`    — every document of a collection (shared template backgrounds);
 * - `heroBlock`  — `image` of the first `hero` block in `layout` of the matching `pages`;
 * - `cardLinks`  — `image` of every `cards` block item (any layout) whose link points at one of
 *                  the listed hrefs: hub cards built by hand in `pages` / hub constructions.
 *                  Hrefs are compared verbatim (trailing slash, `#anchor` included).
 */

export const ATTACH_COLLECTIONS = [
  "pages",
  "glass-types",
  "processing-services",
  "constructions",
  "articles",
] as const;

export type AttachCollection = (typeof ATTACH_COLLECTIONS)[number];

/** Collections whose `layout` may hold `cards` blocks (scanned by `cardLinks`). */
export const LAYOUT_COLLECTIONS = [
  "pages",
  "glass-types",
  "processing-services",
  "constructions",
] as const satisfies readonly AttachCollection[];

/** Document fields a placeholder may fill (dot path into a group). */
export type DocImageField = "heroImage" | "card.image";

export type Binding =
  | { kind: "docField"; collection: AttachCollection; slug: string; field: DocImageField }
  | { kind: "eachDoc"; collection: AttachCollection; field: DocImageField }
  | { kind: "heroBlock"; select: { path: string } | { home: true } | { template: string } }
  | { kind: "cardLinks"; hrefs: readonly string[] };

export type AttachRule =
  { bindings: readonly Binding[]; noTarget?: never } | { bindings?: never; noTarget: string };

/** Minimal shape of a manifest entry the map needs (see `scripts/image-prompts/schema.ts`). */
export interface ManifestTargetLike {
  kind: "template" | "section" | "doc";
  collection?: string | undefined;
  slug?: string | undefined;
  field: string;
}

export interface ManifestEntryLike {
  id: string;
  target: ManifestTargetLike;
}

/** Stable key of a manifest target: `doc:glass-types/matovoe#card.image`, `template:home#heroImage`. */
export function targetKey(target: ManifestTargetLike): string {
  const scope =
    target.kind === "doc" ? `${target.collection ?? "?"}/${target.slug ?? "?"}` : target.slug;
  return `${target.kind}:${scope ?? "?"}#${target.field}`;
}

const SCHEMA_GAP_SECTION =
  "В схеме нет поля фона секции: блоки задают фон токеном `background` (bg/sf/dark/…), " +
  "поля-изображения у секций нет. Нужна отдельная задача на схему.";

const noHubCard = (href: string) =>
  `Ни одна карточка блока \`cards\` не ссылается на хаб ${href}, а hero хаба (вариант p5Top) ` +
  "не выводит изображение — места для иллюстрации нет. Привязать после добавления карточки.";

const card = (collection: AttachCollection, slug: string, path: string): readonly Binding[] => [
  { kind: "docField", collection, slug, field: "card.image" },
  { kind: "cardLinks", hrefs: [path] },
];

/**
 * The table. Paths of the card links are the published paths of the documents (seed, waves 5);
 * extra hrefs give an illustration to hand-made hub cards that match no document exactly.
 */
export const ATTACH_MAP: Readonly<Record<string, AttachRule>> = {
  /* ---- Template backgrounds (kind: background) ------------------------------------------ */
  "template:home#heroImage": { bindings: [{ kind: "heroBlock", select: { home: true } }] },
  "template:zak-hub#heroImage": {
    bindings: [{ kind: "heroBlock", select: { path: "/zakalennoe-steklo/" } }],
  },
  "template:thickness#heroImage": {
    noTarget:
      "У `thicknesses` нет hero-поля (только `card.image`), шаблон карточки толщины выводит " +
      "hero без изображения. Фон для толщин требует поля в схеме.",
  },
  "template:glass-type#heroImage": {
    bindings: [
      { kind: "eachDoc", collection: "glass-types", field: "heroImage" },
      // Home card «Виды стекла» → /zakalennoe-steklo/#vidy: no document of its own.
      { kind: "cardLinks", hrefs: ["/zakalennoe-steklo/#vidy"] },
    ],
  },
  "template:processing#heroImage": {
    bindings: [
      { kind: "eachDoc", collection: "processing-services", field: "heroImage" },
      // Home card «Калькулятор отверстий по ГОСТ».
      { kind: "cardLinks", hrefs: ["/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator"] },
    ],
  },
  "template:construction#heroImage": {
    bindings: [{ kind: "eachDoc", collection: "constructions", field: "heroImage" }],
  },
  "template:service#heroImage": {
    bindings: [
      { kind: "heroBlock", select: { template: "service" } },
      // Home card «Проектирование и узлы» (a service page).
      { kind: "cardLinks", hrefs: ["/proektirovanie/"] },
    ],
  },
  "template:article#heroImage": {
    bindings: [{ kind: "eachDoc", collection: "articles", field: "heroImage" }],
  },
  "template:objects#heroImage": {
    noTarget:
      "У страницы `/obekty/` (pages, template listing) нет hero-блока, а витрина объектов " +
      "показывает только реальные фото объектов — фон не привязывается.",
  },
  "template:not-found#heroImage": {
    noTarget: "Страница 404 собирается в коде (`not-found.tsx`), поля изображения в CMS нет.",
  },

  /* ---- Section backgrounds: no media field in the schema --------------------------------- */
  "section:forms#backgroundKey": { noTarget: SCHEMA_GAP_SECTION },
  "section:dark-teal#backgroundKey": { noTarget: SCHEMA_GAP_SECTION },
  "section:light#backgroundKey": { noTarget: SCHEMA_GAP_SECTION },
  "section:snow-calc#backgroundKey": { noTarget: SCHEMA_GAP_SECTION },

  /* ---- Glass types (8) ------------------------------------------------------------------- */
  "doc:glass-types/matovoe#card.image": {
    bindings: card("glass-types", "matovoe", "/zakalennoe-steklo/matovoe/"),
  },
  "doc:glass-types/okrashennoe#card.image": {
    bindings: card("glass-types", "okrashennoe", "/zakalennoe-steklo/okrashennoe/"),
  },
  "doc:glass-types/osvetlennoe#card.image": {
    bindings: card("glass-types", "osvetlennoe", "/zakalennoe-steklo/osvetlennoe/"),
  },
  "doc:glass-types/tonirovannoe#card.image": {
    bindings: card("glass-types", "tonirovannoe", "/zakalennoe-steklo/tonirovannoe/"),
  },
  "doc:glass-types/dlya-mebeli#card.image": {
    bindings: card("glass-types", "dlya-mebeli", "/zakalennoe-steklo/dlya-mebeli/"),
  },
  "doc:glass-types/riflenoe#card.image": {
    bindings: card("glass-types", "riflenoe", "/zakalennoe-steklo/riflenoe/"),
  },
  "doc:glass-types/mollirovannoe#card.image": {
    bindings: card("glass-types", "mollirovannoe", "/zakalennoe-steklo/mollirovannoe/"),
  },
  "doc:glass-types/tripleks#card.image": {
    bindings: card("glass-types", "tripleks", "/tripleks/"),
  },

  /* ---- Processing services (6) ----------------------------------------------------------- */
  "doc:processing-services/kromka#card.image": {
    bindings: card("processing-services", "kromka", "/obrabotka-stekla/kromka/"),
  },
  "doc:processing-services/otverstiya-i-vyrezy#card.image": {
    bindings: card(
      "processing-services",
      "otverstiya-i-vyrezy",
      "/obrabotka-stekla/otverstiya-i-vyrezy/"
    ),
  },
  "doc:processing-services/facet#card.image": {
    bindings: card("processing-services", "facet", "/obrabotka-stekla/facet/"),
  },
  "doc:processing-services/matirovanie#card.image": {
    bindings: card("processing-services", "matirovanie", "/obrabotka-stekla/matirovanie/"),
  },
  "doc:processing-services/plenki#card.image": {
    bindings: card("processing-services", "plenki", "/obrabotka-stekla/plenki/"),
  },
  "doc:processing-services/pechat#card.image": {
    bindings: card("processing-services", "pechat", "/obrabotka-stekla/pechat/"),
  },

  /* ---- Constructions (7 + glazing 5 + mirrors 3, hubs included) ------------------------- */
  "doc:constructions/steklyannye-peregorodki#card.image": {
    bindings: card("constructions", "steklyannye-peregorodki", "/steklyannye-peregorodki/"),
  },
  "doc:constructions/steklyannye-ograzhdeniya#card.image": {
    bindings: card("constructions", "steklyannye-ograzhdeniya", "/steklyannye-ograzhdeniya/"),
  },
  "doc:constructions/dushevye-peregorodki#card.image": {
    bindings: card("constructions", "dushevye-peregorodki", "/dushevye-peregorodki/"),
  },
  "doc:constructions/steklyannye-kozyrki#card.image": {
    bindings: card("constructions", "steklyannye-kozyrki", "/steklyannye-kozyrki/"),
  },
  "doc:constructions/torgovye-vitriny#card.image": {
    bindings: card("constructions", "torgovye-vitriny", "/torgovye-vitriny/"),
  },
  "doc:constructions/furnitura#card.image": {
    bindings: card("constructions", "furnitura", "/furnitura/"),
  },
  "doc:constructions/osteklenie#card.image": {
    bindings: card("constructions", "osteklenie", "/osteklenie/"),
  },
  "doc:constructions/fasadov#card.image": {
    bindings: card("constructions", "fasadov", "/osteklenie/fasadov/"),
  },
  "doc:constructions/spajdernoe#card.image": {
    bindings: card("constructions", "spajdernoe", "/osteklenie/spajdernoe/"),
  },
  "doc:constructions/vitrin-i-magazinov#card.image": {
    bindings: card("constructions", "vitrin-i-magazinov", "/osteklenie/vitrin-i-magazinov/"),
  },
  "doc:constructions/liftovyh-shaht#card.image": {
    bindings: card("constructions", "liftovyh-shaht", "/osteklenie/liftovyh-shaht/"),
  },
  "doc:constructions/verand-terras-besedok#card.image": {
    bindings: card("constructions", "verand-terras-besedok", "/osteklenie/verand-terras-besedok/"),
  },
  "doc:constructions/zerkala#card.image": {
    bindings: card("constructions", "zerkala", "/zerkala/"),
  },
  "doc:constructions/dlya-zalov#card.image": {
    bindings: card("constructions", "dlya-zalov", "/zerkala/dlya-zalov/"),
  },
  "doc:constructions/dlya-salonov#card.image": {
    bindings: card("constructions", "dlya-salonov", "/zerkala/dlya-salonov/"),
  },

  /* ---- Hubs. The manifest says `pages`, but `pages` has no card field: hub cards are the
   *      `cards` items linking to the hub. «Стеклянные конструкции» is a `constructions` hub. */
  "doc:pages/steklyannye-konstrukcii#card.image": {
    bindings: card("constructions", "steklyannye-konstrukcii", "/steklyannye-konstrukcii/"),
  },
  "doc:pages/zakalennoe-steklo#card.image": {
    bindings: [{ kind: "cardLinks", hrefs: ["/zakalennoe-steklo/"] }],
  },
  // No `cards` item links to these two hubs (the home lists the six processing services one by
  // one; «Как заказать» has no hub card anywhere) and their hero is the `p5Top` variant, which
  // renders no image. A `cardLinks` binding could never match (wave-6 review), so the targets
  // are documented gaps until a hub card is added to the content.
  "doc:pages/obrabotka-stekla#card.image": { noTarget: noHubCard("/obrabotka-stekla/") },
  "doc:pages/kak-zakazat#card.image": { noTarget: noHubCard("/kak-zakazat/") },

  /* ---- Articles (blog cards, home «Полезное») -------------------------------------------- */
  "doc:articles/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo#card.image": {
    bindings: card(
      "articles",
      "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo",
      "/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/"
    ),
  },
  "doc:articles/kak-snyat-razmery-dlya-stekla#card.image": {
    bindings: card(
      "articles",
      "kak-snyat-razmery-dlya-stekla",
      "/blog/kak-snyat-razmery-dlya-stekla/"
    ),
  },
  "doc:articles/kak-vybrat-tolshchinu-stekla#card.image": {
    bindings: card(
      "articles",
      "kak-vybrat-tolshchinu-stekla",
      "/blog/kak-vybrat-tolshchinu-stekla/"
    ),
  },
  "doc:articles/markirovka-zakalennogo-stekla#card.image": {
    bindings: card(
      "articles",
      "markirovka-zakalennogo-stekla",
      "/blog/markirovka-zakalennogo-stekla/"
    ),
  },
  "doc:articles/mozhno-li-rezat-zakalennoe-steklo#card.image": {
    bindings: card(
      "articles",
      "mozhno-li-rezat-zakalennoe-steklo",
      "/blog/mozhno-li-rezat-zakalennoe-steklo/"
    ),
  },
  "doc:articles/tripleks-ili-zakalennoe-dlya-ograzhdenij#card.image": {
    bindings: card(
      "articles",
      "tripleks-ili-zakalennoe-dlya-ograzhdenij",
      "/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/"
    ),
  },
};

export type ResolveResult =
  | { ok: true; key: string; bindings: readonly Binding[] }
  | { ok: false; key: string; unknown: boolean; reason: string };

/**
 * Where a manifest entry goes. `ok: false` is «no target»: `unknown: true` when the target is
 * missing from the map (a bug: fails the run), `false` for a documented schema gap.
 */
export function resolveTarget(entry: ManifestEntryLike): ResolveResult {
  const key = targetKey(entry.target);
  const rule = Object.hasOwn(ATTACH_MAP, key) ? ATTACH_MAP[key] : undefined;
  if (!rule) {
    return {
      ok: false,
      key,
      unknown: true,
      reason: `цель ${key} отсутствует в scripts/attach-map.ts`,
    };
  }
  if (rule.noTarget !== undefined) return { ok: false, key, unknown: false, reason: rule.noTarget };
  return { ok: true, key, bindings: rule.bindings };
}

/** Bindings limited to one collection (CLI `--only=<collection>`); `cardLinks` scan it only. */
export function bindingTouches(binding: Binding, collection: AttachCollection): boolean {
  switch (binding.kind) {
    case "docField":
    case "eachDoc":
      return binding.collection === collection;
    case "heroBlock":
      return collection === "pages";
    case "cardLinks":
      return (LAYOUT_COLLECTIONS as readonly string[]).includes(collection);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Overwrite policy                                                                           */
/* ------------------------------------------------------------------------------------------ */

/** What currently sits in an image slot (`null` = empty or a dangling id). */
export interface ExistingMedia {
  id: string;
  isPlaceholder: boolean;
}

export type AttachDecision =
  | "attach" // empty slot
  | "unchanged" // already this media
  | "replace" // an older placeholder, `--force-replace-placeholders`
  | "skip-real" // a real photo: never touched
  | "skip-placeholder"; // another placeholder, no force flag

/**
 * The «never overwrite» rule. A real image (`isPlaceholder: false`) is never replaced, not even
 * with `force`; another placeholder only with `force` (`--force-replace-placeholders`).
 */
export function canAttach(
  existing: ExistingMedia | null,
  mediaId: string,
  force: boolean
): AttachDecision {
  if (!existing) return "attach";
  if (existing.id === mediaId) return "unchanged";
  if (!existing.isPlaceholder) return "skip-real";
  return force ? "replace" : "skip-placeholder";
}

/** Decisions that write the slot. */
export const isWrite = (decision: AttachDecision): boolean =>
  decision === "attach" || decision === "replace";
