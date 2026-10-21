import { ARTICLE_TEXTS } from "./blog-texts";

/**
 * Content of the blog slice (task 31): the listing `/blog/`, the six articles and the weight
 * calculator page. H1 / Title / Description from `docs/inex/17-meta.md`; texts verbatim from
 * `res/inex-glass-handoff/teksty/` (article bodies in `./blog-texts.ts`, generated; the listing
 * intro from 17 §4). The calculator texts live with the calculator
 * (`src/components/calculators/weight-copy.ts`).
 *
 * Pure data (no Payload imports): the slice (`../slices/blog.ts`) builds the documents from it
 * and `blog.test.ts` reads it directly.
 */

export const BLOG_PATH = "/blog/";
export const WEIGHT_TOOL_PATH = "/instrumenty/kalkulyator-vesa-stekla/";
const QUIZ_PATH = "/raschet-stoimosti/";

/**
 * Quiz link with the fixed key order of `buildQuizHref` (`type`, then `src`). Kept local so the
 * seed content does not import the React module `@/components/page/quiz-cta`.
 */
export function quizHref(params: { type?: string | null | undefined; src: string }): string {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  search.set("src", params.src);
  return `${QUIZ_PATH}?${search.toString()}`;
}

// ---------------------------------------------------------------------------------------------
// Listing /blog/ (17-meta; teksty/17 §4)
// ---------------------------------------------------------------------------------------------

export const BLOG_LISTING = {
  title: "Статьи",
  slug: "blog",
  seo: {
    h1: "Статьи",
    title: "Статьи о закалённом стекле для инженеров | Inex Glass",
    description:
      "Допуски, толщина, триплекс, маркировка — практические ответы для тех, кто заказывает стекло на объект.",
  },
  intro:
    "Практические ответы для тех, кто заказывает стекло на объект: как выбрать толщину, почему закалённое стекло нельзя резать, как снять размеры проёма и что значат марки стекла. Без рекламы — только то, что помогает заказать стекло без переделок.",
  toolsLabel: "Инструменты",
  tools: [
    { label: "Калькулятор веса стекла", url: WEIGHT_TOOL_PATH },
    {
      label: "Допуски по ГОСТ 30698-2014 и калькулятор отверстий",
      url: "/kak-zakazat/dopuski-i-gost/",
    },
  ],
} as const;

// ---------------------------------------------------------------------------------------------
// Weight calculator page (17-meta; teksty/10 §1)
// ---------------------------------------------------------------------------------------------

export const WEIGHT_TOOL_PAGE = {
  title: "Калькулятор веса стекла",
  slug: "kalkulyator-vesa-stekla",
  pathPrefix: "/instrumenty/",
  seo: {
    h1: "Калькулятор веса стекла",
    title: "Вес стекла — калькулятор для 4–19 мм и триплекса | Inex Glass",
    description:
      "Вес стекла: 2,5 кг на м² на каждый миллиметр толщины. Калькулятор для одинарного стекла и триплекса + таблица 4–19 мм.",
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------------------------

/**
 * `→ [Название]` links of teksty → URLs. «Рассчитать стоимость» is the quiz (per article, see
 * `articleMarkdown`). Pages that are not published yet simply resolve later.
 */
export const ARTICLE_LINKS: Readonly<Record<string, string>> = {
  "Как снять размеры проёма": "/blog/kak-snyat-razmery-dlya-stekla/",
  "Требования к чертежам": "/kak-zakazat/trebovaniya-k-chertezham/",
  "Допуски по ГОСТ": "/kak-zakazat/dopuski-i-gost/",
  "Калькулятор веса": WEIGHT_TOOL_PATH,
  Триплекс: "/tripleks/",
  "Триплекс или закалённое для ограждения": "/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/",
  "Чем закалённое стекло отличается от обычного":
    "/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/",
  // teksty/10 §4 uses the short form of the same title.
  "Чем закалённое отличается от обычного":
    "/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/",
  "Закалённое стекло на заказ": "/zakalennoe-steklo/",
  "Осветлённое стекло": "/zakalennoe-steklo/osvetlennoe/",
  "Тонированное стекло": "/zakalennoe-steklo/tonirovannoe/",
  Проектирование: "/proektirovanie/",
  "Зажимной профиль и спайдеры": "/furnitura/",
  "Стеклянные ограждения": "/steklyannye-ograzhdeniya/",
  Документы: "/kak-zakazat/dokumenty/",
};

export const QUIZ_LINK_LABEL = "Рассчитать стоимость";

/** Form CTA of an article (opens the site-wide form modal). */
export interface ArticleFormCta {
  formKey: "drawing";
  /** Label of the button at the end of the text and title of the aside card. */
  title: string;
  /** Label of the aside card button. */
  buttonLabel: string;
}

export interface ArticleSeed {
  slug: string;
  /** H1 (17-meta). */
  title: string;
  seo: { h1: string; title: string; description: string };
  /** Placeholder publication date `YYYY-MM-DD` (editorial, replace before launch). */
  date: string;
  /** Quiz type of the article's «Рассчитать стоимость» (`QUIZ_TYPES` id) or none. */
  quizType: "tempered" | null;
  /** Form button(s) at the end of the text / in the aside card. */
  form: ArticleFormCta | null;
  /** Link button at the end of the text (`commercialLink`): currently always the quiz. */
  commercialLabel: string | null;
  /** Label of the aside card when it is not a form (falls back to `commercialLabel`). */
  asideTitle: string | null;
  /**
   * «Читать также» — slugs, in order (task-31: mozhno ↔ chem/kak-snyat/vybrat, vybrat ↔
   * chem/tripleks, tripleks ↔ chem/vybrat, markirovka ↔ chem/mozhno; at most 3 per article).
   * Fewer than 3 are topped up with the newest articles at render time.
   */
  related: readonly string[];
}

/** Order = order of 17-meta; the dates make the listing start in this order. */
export const ARTICLES: readonly ArticleSeed[] = [
  {
    slug: "mozhno-li-rezat-zakalennoe-steklo",
    title: "Можно ли резать закалённое стекло",
    seo: {
      h1: "Можно ли резать закалённое стекло",
      title: "Можно ли резать закалённое стекло — и что делать с размером",
      description:
        "Коротко: нет — после закалки стекло рассыпается при резке и сверлении. Почему так и как не ошибиться с размером заранее.",
    },
    date: "2026-10-20",
    quizType: "tempered",
    form: {
      formKey: "drawing",
      title: "Отправить чертёж на проверку",
      // Prototype Article.dc.html, aside card button.
      buttonLabel: "Отправить чертёж",
    },
    commercialLabel: null,
    asideTitle: null,
    related: [
      "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo",
      "kak-snyat-razmery-dlya-stekla",
      "kak-vybrat-tolshchinu-stekla",
    ],
  },
  {
    slug: "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo",
    title: "Чем закалённое стекло отличается от обычного",
    seo: {
      h1: "Чем закалённое стекло отличается от обычного",
      title: "Чем закалённое стекло отличается от обычного",
      description:
        "Закалённое прочнее обычного в 5–6 раз и рассыпается на тупые осколки, но его нельзя обработать после закалки. Как отличить на глаз.",
    },
    date: "2026-10-19",
    quizType: "tempered",
    form: null,
    // The two links of the text end are inside the body; no extra button after it.
    commercialLabel: null,
    asideTitle: QUIZ_LINK_LABEL,
    related: [
      "mozhno-li-rezat-zakalennoe-steklo",
      "kak-vybrat-tolshchinu-stekla",
      "tripleks-ili-zakalennoe-dlya-ograzhdenij",
    ],
  },
  {
    slug: "kak-vybrat-tolshchinu-stekla",
    title: "Как выбрать толщину стекла",
    seo: {
      h1: "Как выбрать толщину стекла",
      title: "Толщина стекла — как выбрать и когда нужен триплекс",
      description:
        "От чего зависит толщина: размер, крепление, нагрузка, безопасность. Почему её подбирают расчётом, а не по таблице.",
    },
    date: "2026-10-18",
    quizType: null,
    form: null,
    commercialLabel: null,
    asideTitle: QUIZ_LINK_LABEL,
    related: [
      "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo",
      "tripleks-ili-zakalennoe-dlya-ograzhdenij",
      "mozhno-li-rezat-zakalennoe-steklo",
    ],
  },
  {
    slug: "kak-snyat-razmery-dlya-stekla",
    title: "Как снять размеры проёма для закалённого стекла",
    seo: {
      h1: "Как снять размеры проёма для закалённого стекла",
      title: "Как снять размеры проёма для закалённого стекла",
      description:
        "Когда мерить, чем мерить, какие зазоры заложить и как отрисовать сложный проём — чтобы стекло встало с первого раза.",
    },
    date: "2026-10-17",
    quizType: "tempered",
    form: { formKey: "drawing", title: "Отправить чертёж", buttonLabel: "Отправить чертёж" },
    commercialLabel: QUIZ_LINK_LABEL,
    asideTitle: null,
    related: ["mozhno-li-rezat-zakalennoe-steklo"],
  },
  {
    slug: "tripleks-ili-zakalennoe-dlya-ograzhdenij",
    title: "Триплекс или закалённое стекло для ограждений",
    seo: {
      h1: "Триплекс или закалённое стекло для ограждений",
      title: "Триплекс или закалённое стекло для ограждения — что выбрать",
      description:
        "Как ведёт себя стекло при разрушении, какие нагрузки задаёт проект и когда однослойного закалённого недостаточно.",
    },
    date: "2026-10-16",
    quizType: null,
    form: {
      formKey: "drawing",
      title: "Отправить проект ограждения",
      buttonLabel: "Отправить проект ограждения",
    },
    commercialLabel: null,
    asideTitle: null,
    related: ["chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo", "kak-vybrat-tolshchinu-stekla"],
  },
  {
    slug: "markirovka-zakalennogo-stekla",
    title: "Марки и маркировка стекла",
    seo: {
      h1: "Марки и маркировка стекла",
      title: "Стекло М1 и маркировка — что значат марки стекла",
      description:
        "Что значит М1 и 4М1 в формуле, марки листового стекла М0–М7 и как найти клеймо закалённого стекла.",
    },
    date: "2026-10-15",
    quizType: "tempered",
    form: null,
    commercialLabel: QUIZ_LINK_LABEL,
    asideTitle: null,
    related: [
      "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo",
      "mozhno-li-rezat-zakalennoe-steklo",
    ],
  },
];

export const articlePath = (slug: string) => `${BLOG_PATH}${slug}/`;

/** `[Название]` not followed by `(` — a link of teksty without a target yet. */
const SOURCE_LINK = /\[([^\]]+)\](?!\()/g;

/**
 * Markdown of the article text with the `[Название]` links resolved: map above, «Рассчитать
 * стоимость» → quiz with the article as `src`. Unknown names throw (a seed bug, not a silent
 * plain-text link).
 */
export function resolveLinks(markdown: string, article: ArticleSeed): string {
  return markdown.replace(SOURCE_LINK, (_, label: string) => {
    const url =
      label === QUIZ_LINK_LABEL
        ? quizHref({ type: article.quizType, src: articlePath(article.slug) })
        : ARTICLE_LINKS[label];
    if (!url) throw new Error(`blog seed: нет адреса для ссылки «${label}» (${article.slug})`);
    return `[${label}](${url})`;
  });
}

export interface ArticleMarkdown {
  lead: string | null;
  body: string;
}

/** Lead and body markdown of an article (verbatim lines of `ARTICLE_TEXTS`, links resolved). */
export function articleMarkdown(article: ArticleSeed): ArticleMarkdown {
  const text = ARTICLE_TEXTS[article.slug];
  if (!text) throw new Error(`blog seed: нет текста статьи ${article.slug}`);
  return {
    lead: text.lead === null ? null : resolveLinks(text.lead, article),
    body: resolveLinks(text.body.join("\n"), article),
  };
}
