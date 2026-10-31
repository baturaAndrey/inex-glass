/**
 * Content of the `objects` seed slice (pure data, no Payload imports — unit-tested).
 *
 * Sources: texts — `res/inex-glass-handoff/teksty/17-matirovanie-markirovka-listingi.md` §5
 * (verbatim); meta — `docs/inex/17-meta.md`; taxonomies — filters of `prototypes/Objects.dc.html`;
 * object names — task 30 (from the inex.su portfolio). Nothing is invented: objects are DRAFTS
 * without photos, specs or years; task 37 imports the real portfolio.
 */
import type { QuizTypeId } from "@/lib/domain";

export const OBJECTS_LISTING_PATH = "/obekty/";

export const LISTING_SEO = {
  h1: "Объекты",
  title: "Объекты Inex — перегородки, ограждения, фасады из стекла",
  description:
    "1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту.",
} as const;

/** Intro paragraph next to the H1 (teksty §5, verbatim). */
export const LISTING_INTRO =
  "За 21 год специалисты Inex выполнили более 1500 проектов по всей России: торговые центры, банки, арены, аэропорт, офисы и производственные здания. По каждому объекту — что поставляли и из какого стекла.";

/** Closing block under the list (teksty §5, verbatim; Markdown). */
export const LISTING_AMONG =
  "**Среди объектов:** Главное управление «Сургутнефтегаз» · ТРЦ «Алмаз», Челябинск · Аэропорт Челябинск · «РМК-Арена», Челябинск";
export const LISTING_CTA_TEXT =
  "Ищете решение для похожего объекта? Пришлите проект — подберём стекло и узлы.";
export const LISTING_CTA_BUTTON = "Отправить проект";
/** `source` of the drawing form opened by «Отправить проект». */
export const LISTING_FORM_SOURCE = "obekty";

export interface TaxonomySeed {
  /** Slug of the task-30 spec, used when nothing matching exists yet. */
  slug: string;
  name: string;
  /**
   * Slugs of equivalent records created earlier (reference data of `minimal.ts`, task 26):
   * when one exists it is reused instead of creating a duplicate.
   */
  aliases?: readonly string[];
  quizType?: QuizTypeId;
}

/** Product tags (filter «Изделие»). */
export const PRODUCT_SEEDS: readonly TaxonomySeed[] = [
  { slug: "peregorodki", name: "Перегородки", quizType: "partitions" },
  { slug: "ograzhdeniya", name: "Ограждения", quizType: "railings" },
  { slug: "kozyrki", name: "Козырьки", quizType: "canopies" },
  { slug: "fasady", name: "Фасады", aliases: ["steklyannyj-fasad"], quizType: "facade" },
  { slug: "dushevye", name: "Душевые", aliases: ["dushevye-peregorodki"], quizType: "shower" },
];

/** Object types (filter «Тип объекта»). */
export const OBJECT_TYPE_SEEDS: readonly TaxonomySeed[] = [
  { slug: "tc", name: "ТЦ", aliases: ["torgovye-centry"] },
  { slug: "bank", name: "Банк", aliases: ["banki"] },
  { slug: "office", name: "Офис", aliases: ["ofisy"] },
  { slug: "arena", name: "Арена", aliases: ["areny"] },
  { slug: "airport", name: "Аэропорт", aliases: ["aeroporty"] },
  { slug: "concert-hall", name: "Концертный зал" },
  { slug: "cottage", name: "Коттедж" },
];

/** Cities (filter «Город»). */
export const CITY_SEEDS: readonly TaxonomySeed[] = [
  { slug: "chelyabinsk", name: "Челябинск" },
  { slug: "omsk", name: "Омск" },
  { slug: "surgut", name: "Сургут" },
  { slug: "ishim", name: "Ишим" },
];

export interface ObjectDraftSeed {
  name: string;
  slug: string;
  /** Spec slug of `CITY_SEEDS` (resolved through aliases). */
  city?: string;
  /** Spec slug of `OBJECT_TYPE_SEEDS`. */
  type?: string;
}

/** Portfolio drafts: only what is known; the rest is filled in by the import (task 37). */
export const OBJECT_DRAFTS: readonly ObjectDraftSeed[] = [
  { name: "ТРК «Родник»", slug: "trk-rodnik" },
  { name: "ТРК «Урал»", slug: "trk-ural" },
  { name: "«Трактор» арена", slug: "traktor-arena" },
  {
    name: "Концертный зал (Омск)",
    slug: "koncertnyj-zal-omsk",
    city: "omsk",
    type: "concert-hall",
  },
  {
    name: "Главное управление «Сургутнефтегаз»",
    slug: "glavnoe-upravlenie-surgutneftegaz",
    city: "surgut",
    type: "office",
  },
  { name: "Сбербанк (Ишим)", slug: "sberbank-ishim", city: "ishim", type: "bank" },
  { name: "«Аркаим Плаза»", slug: "arkaim-plaza" },
  { name: "Угорская шахматная академия", slug: "ugorskaya-shahmatnaya-akademiya" },
  { name: "ТРЦ «Алмаз»", slug: "trc-almaz-chelyabinsk", city: "chelyabinsk", type: "tc" },
  {
    name: "Аэропорт Челябинск",
    slug: "aeroport-chelyabinsk",
    city: "chelyabinsk",
    type: "airport",
  },
  { name: "«РМК-Арена»", slug: "rmk-arena", city: "chelyabinsk", type: "arena" },
];
