import { DEFAULT_DELIVERY_CITIES, QUIZ_TYPES } from "@/lib/domain";
import { transliterate } from "@/payload/fields/transliterate";
import type { CtaBlock, FaqBlock, HeroBlock, Page, RichTextBlock } from "@/payload-types";
import { seedDate, upsertByField, upsertByPath, upsertBySlug } from "./context";
import { markdown, paragraphs } from "./lexical";
import type { SeedContext } from "./context";
import type { LexicalState } from "./lexical";

/*
 * Reference data (always seeded) and the mini-seed: one minimal, valid, published record per
 * template for e2e and development. Texts are verbatim from res/inex-glass-handoff/teksty/*,
 * H1/Title/Description from docs/inex/17-meta.md; where no text exists the body is «[…]».
 * The full page content belongs to the Wave-5 slices (`src/seed/slices/*.ts`).
 */

/* ------------------------------------------------------------------------------------------ */
/* Lead statuses                                                                              */
/* ------------------------------------------------------------------------------------------ */

/**
 * Lead funnel (ТЗ §6.1). The only seed of statuses in the project (task 32 only checks them).
 * `color` stores the badge text colour; task 32 derives the background (12 % alpha).
 */
const LEAD_STATUSES = [
  { order: 10, name: "Новая", slug: "new", isDefault: true, color: "#2C5B86" },
  { order: 20, name: "В работе", slug: "in-progress", color: "#8A5A00" },
  { order: 30, name: "КП отправлено", slug: "kp-sent", color: "#16403D" },
  {
    order: 40,
    name: "Договор",
    slug: "contract",
    isFinal: true,
    isContract: true,
    color: "#237A35",
  },
  {
    order: 50,
    name: "Отказ",
    slug: "refused",
    isFinal: true,
    requiresReason: true,
    color: "#B23B3B",
  },
] as const;

export async function seedLeadStatuses(ctx: SeedContext): Promise<void> {
  for (const status of LEAD_STATUSES) {
    await upsertBySlug(ctx, "lead-statuses", {
      isDefault: false,
      isFinal: false,
      requiresReason: false,
      isContract: false,
      ...status,
    });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Thickness groups and thicknesses                                                           */
/* ------------------------------------------------------------------------------------------ */

type FaqItem = { question: string; answer: LexicalState };

const faq = (pairs: ReadonlyArray<readonly [string, string]>): FaqItem[] =>
  pairs.map(([question, answer]) => ({ question, answer: paragraphs(answer) }));

/** teksty/03-kartochki-tolshchin.md, «{текст_подбора} и {обработка} — по толщинам» and «{faq}». */
const THICKNESS_GROUPS = [
  {
    slug: "4-5-mm",
    label: "4–5 мм",
    order: 10,
    thicknesses: [4, 5],
    podbor:
      "Подходит ли {N} мм, решают размер стекла, способ крепления и нагрузка. Если запаса прочности не хватает — предложим толщину больше или триплекс.",
    obrabotka:
      "Кромка, отверстия от 4 мм (диаметр меньше толщины — по согласованию), фацет, матирование, печать, крашение по RAL, гнутьё с радиусом от 1000 мм.",
    faq: faq([
      [
        "Подойдёт ли {N} мм для дверцы или полки?",
        "Для небольших мебельных деталей — как правило, да; для полки решает пролёт и нагрузка. Пришлите размеры — подберём.",
      ],
      [
        "Можно ли сделать отверстие под петлю?",
        "Да, от 4 мм в диаметре; не ближе {2N} мм к кромке.",
      ],
    ]),
  },
  {
    slug: "6-8-mm",
    label: "6–8 мм",
    order: 20,
    thicknesses: [6, 8],
    podbor:
      "Подходит ли {N} мм, решают размер стекла, способ крепления и нагрузка. Подберём по вашей конструкции — одним стеклом или триплексом.",
    obrabotka:
      "Все виды кромки, отверстия и вырезы, матирование, печать, крашение по RAL; гнутьё — радиус от 1000 мм (6 мм) и от 1500 мм (8 мм).",
    faq: faq([
      [
        "Хватит ли {N} мм для двери или перегородки?",
        "Зависит от высоты, ширины и крепления. Опишите конструкцию — подберём толщину или триплекс.",
      ],
      ["Сколько весит одно стекло 1000 × 2000 мм?", "{вес} × 2 = {вес×2} кг."],
    ]),
  },
  {
    slug: "10-12-mm",
    label: "10–12 мм",
    order: 30,
    thicknesses: [10, 12],
    podbor:
      "Толщину и схему подбираем под нагрузку. Для ограждений и козырьков, где важно удержать осколки, часто нужен триплекс — предложим вариант.",
    obrabotka:
      "Все виды кромки, отверстия и вырезы, матирование, печать, крашение по RAL; гнутьё — радиус от 1500 мм.",
    faq: faq([
      [
        "Нужен ли триплекс для ограждения?",
        "Для ограждений и козырьков триплекс часто обязателен — осколки удерживаются плёнкой. Подберём схему под нагрузку.",
      ],
      [
        "Сколько весит стекло 1000 × 2000 мм?",
        "{вес×2} кг — учитывайте при подъёме и выборе крепежа.",
      ],
    ]),
  },
  {
    slug: "15-19-mm",
    label: "15–19 мм",
    order: 40,
    thicknesses: [15, 19],
    podbor:
      "Стекло для нагруженных конструкций. Закалка — по согласованию, цена — по запросу: пришлите чертёж и описание конструкции.",
    obrabotka:
      "Кромка, отверстия и вырезы; другие виды — по согласованию. Крашение — до 15 мм. Гнутьё — нет.",
    faq: faq([
      [
        "Почему цена по запросу?",
        "Закалка таких толщин согласуется с заводом под конкретный заказ — назовём цену после расчёта.",
      ],
      ["Какой максимальный размер?", "До 3000 × 2000 мм; точнее — после согласования с заводом."],
    ]),
  },
] as const;

/** «Виды» column of the thickness table (teksty/03, «Значения по толщинам»). */
const KINDS_TEXT: Readonly<Record<number, string>> = {
  4: "все, включая крашеное и гнутое",
  5: "все, включая крашеное и гнутое",
  6: "все, включая крашеное и гнутое",
  8: "все, включая крашеное и гнутое",
  10: "все, включая крашеное и гнутое",
  12: "все, включая крашеное и гнутое",
  15: "прозрачное и другие виды по запросу; крашеное — до 15 мм; гнутое — нет",
  19: "по запросу; крашеное и гнутое — нет",
};

/** Thicknesses closed from indexing (SSoT): 5, 15, 19 mm. */
const NOINDEX_THICKNESSES: ReadonlySet<number> = new Set([5, 15, 19]);

async function seedThicknesses(ctx: SeedContext): Promise<void> {
  for (const group of THICKNESS_GROUPS) {
    const { doc } = await upsertBySlug(ctx, "thickness-groups", {
      slug: group.slug,
      label: group.label,
      order: group.order,
      podborText: paragraphs(group.podbor),
      obrabotkaText: paragraphs(group.obrabotka),
      faq: group.faq,
    });
    for (const n of group.thicknesses) {
      // slug, path, weight and the quiz pre-fill are derived from `n` by the collection hook.
      await upsertByField(
        ctx,
        "thicknesses",
        { n: { equals: n } },
        {
          n,
          group: doc.id,
          kindsText: KINDS_TEXT[n] ?? "",
          indexable: !NOINDEX_THICKNESSES.has(n),
        },
        { label: `${n} мм` }
      );
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Object taxonomies                                                                          */
/* ------------------------------------------------------------------------------------------ */

/** Portfolio filter: object types (ТЗ §5, object-types collection). */
const OBJECT_TYPES = [
  "Торговые центры",
  "Банки",
  "Арены",
  "Офисы",
  "Гостиницы",
  "Аэропорты",
] as const;

/** Real delivery cities (the quiz list without «Другой» and «Самовывоз»). */
const OBJECT_CITIES = DEFAULT_DELIVERY_CITIES.filter(
  (name) => name !== "Другой" && !name.startsWith("Самовывоз")
);

/** Product tags = quiz product types except «Другое»; `quizType` links them to the quiz ids. */
const PRODUCTS = QUIZ_TYPES.filter(({ id }) => id !== "other");

async function seedTaxonomies(ctx: SeedContext): Promise<void> {
  for (const [index, name] of OBJECT_TYPES.entries()) {
    await upsertBySlug(ctx, "object-types", {
      name,
      slug: transliterate(name),
      order: (index + 1) * 10,
    });
  }
  for (const [index, { id, label }] of PRODUCTS.entries()) {
    await upsertBySlug(ctx, "products", {
      name: label,
      slug: transliterate(label),
      order: (index + 1) * 10,
      quizType: id,
    });
  }
  for (const [index, name] of OBJECT_CITIES.entries()) {
    await upsertBySlug(ctx, "cities", {
      name,
      slug: transliterate(name),
      order: (index + 1) * 10,
    });
  }
}

/** Reference data needed by every mode: lead statuses, thicknesses, object taxonomies. */
export async function seedReferenceData(ctx: SeedContext): Promise<void> {
  await seedLeadStatuses(ctx);
  await seedThicknesses(ctx);
  await seedTaxonomies(ctx);
}

/* ------------------------------------------------------------------------------------------ */
/* Block builders                                                                             */
/* ------------------------------------------------------------------------------------------ */

type HeroButton = NonNullable<HeroBlock["buttons"]>[number];
type LayoutBlock = NonNullable<Page["layout"]>[number];

const QUIZ_BUTTON: HeroButton = {
  label: "Рассчитать стоимость",
  kind: "quiz",
  variant: "primary",
  icon: "calculator",
};

const drawingButton = (label = "Отправить чертёж"): HeroButton => ({
  label,
  kind: "form",
  formKey: "drawing",
  variant: "secondary",
});

type HeroInput = Partial<Omit<HeroBlock, "blockType" | "buttons">> & { buttons?: HeroButton[] };

const hero = ({
  buttons = [QUIZ_BUTTON, drawingButton()],
  ...rest
}: HeroInput = {}): HeroBlock => ({
  blockType: "hero",
  variant: "ctHero",
  showTerms: true,
  termsMode: "full",
  buttons,
  ...rest,
});

const richText = (content: LexicalState, heading?: string): RichTextBlock => ({
  blockType: "richText",
  heading: heading ?? null,
  content,
  width: "normal",
});

const faqBlock = (items: FaqItem[], heading = "Частые вопросы"): FaqBlock => ({
  blockType: "faq",
  heading,
  mode: "inline",
  items,
});

const cta = (title: string, buttons: HeroButton[] = [QUIZ_BUTTON, drawingButton()]): CtaBlock => ({
  blockType: "cta",
  variant: "buttons",
  tone: "light",
  title,
  buttons,
});

/** Q/A pairs whose answers may contain markdown links. */
async function faqFromMarkdown(
  ctx: SeedContext,
  pairs: ReadonlyArray<readonly [string, string]>
): Promise<FaqItem[]> {
  const items: FaqItem[] = [];
  for (const [question, answer] of pairs) {
    items.push({ question, answer: await markdown(ctx, answer) });
  }
  return items;
}

/* ------------------------------------------------------------------------------------------ */
/* Pages                                                                                      */
/* ------------------------------------------------------------------------------------------ */

type PageSeed = {
  path: string;
  data: Omit<Page, "id" | "createdAt" | "updatedAt" | "layout"> & { layout: LayoutBlock[] };
};

const SEGMENTS = [
  ["Подрядчикам и монтажникам", "/klientam/podryadchikam/"],
  ["Производителям мебели и изделий из стекла", "/klientam/proizvoditelyam-mebeli/"],
  ["Застройщикам и генподрядчикам", "/klientam/zastrojshchikam/"],
  ["Дизайнерам и архитекторам", "/klientam/dizajneram-i-arhitektoram/"],
] as const;

async function buildPages(ctx: SeedContext): Promise<PageSeed[]> {
  const md = (text: string) => markdown(ctx, text);

  return [
    {
      path: "/",
      data: {
        title: "Главная",
        slug: "glavnaya",
        template: "home",
        isHome: true,
        _status: "published",
        seo: {
          h1: "Закалённое стекло и стеклянные конструкции для ваших проектов",
          title: "Inex Glass — закалённое стекло и конструкции для проектов",
          description:
            "Комплектуем объекты закалённым стеклом 4–19 мм и триплексом: проверка чертежей до запуска, заказы от 50 м², доставка по Уралу и Сибири.",
        },
        layout: [
          hero({
            variant: "home",
            eyebrow: [
              { text: "Комплектация проектов" },
              { text: "заводы-партнёры в России и Китае" },
              { text: "доставка по Уралу, Сибири и Поволжью" },
            ],
            lead: paragraphs(
              "Подберём завод под задачу и срок, проверим чертёж и согласуем спецификацию до запуска, проконтролируем упаковку и отправим на объект."
            ),
            stats: [
              { value: "21 год", text: "опыт специалистов Inex" },
              { value: "1500+", text: "проектов по всей России" },
              { value: "4–19 мм", text: "толщины закалённого стекла" },
            ],
          }),
          richText(paragraphs("[…]")),
          cta("Отправьте чертёж — посчитаем стоимость и срок"),
        ],
      },
    },
    {
      path: "/zakalennoe-steklo/",
      data: {
        title: "Закалённое стекло",
        slug: "zakalennoe-steklo",
        template: "hub",
        _status: "published",
        quizPrefill: { type: "tempered" },
        seo: {
          h1: "Закалённое (калёное) стекло на заказ по размерам",
          title: "Закалённое стекло на заказ 4–19 мм по чертежу | Inex Glass",
          description:
            "Проверим чертёж и согласуем спецификацию до закалки, упакуем в обрешётку с фото при отгрузке. Заказы от 50 м².",
        },
        layout: [
          hero({
            facts:
              "По вашему чертежу DWG или DXF · толщина 4–19 мм · заказы от 50 м² · от 10 рабочих дней с даты договора · доставка по Уралу, Сибири и Поволжью",
            strong: "Проверяем чертёж до закалки — после неё стекло уже не изменить.",
            buttons: [QUIZ_BUTTON, drawingButton("Загрузить чертёж DWG / DXF")],
          }),
          {
            ...richText(
              await md(
                [
                  "- 4 мм — {цена_4мм}",
                  "- 5 мм — {цена_5мм}",
                  "- 6 мм — {цена_6мм}",
                  "- 8 мм — {цена_8мм}",
                  "- 10 мм — {цена_10мм}",
                  "- 12 мм — {цена_12мм}",
                  "- 15 мм — по запросу",
                  "- 19 мм — по запросу",
                  "",
                  "Ориентировочные цены на {дата_цен}. Точная стоимость — в КП после расчёта; цена в договоре фиксируется. {акция_текст}",
                ].join("\n")
              ),
              "Цены на закалённое стекло"
            ),
            anchorId: "ceny",
          },
          richText(
            await md(
              [
                "Закалённое стекло нельзя подрезать, досверлить или подогнать на объекте: при любой попытке оно рассыпается. Всё, что нужно стеклу, закладывается в чертёж заранее.",
                "",
                "1. **Размеры с зазорами под монтаж.** Допуск по ГОСТ — ±2 мм для сторон до 2000 мм (толщина до 12 мм). Профиль и фурнитура должны этот допуск компенсировать.",
                "2. **Отверстия и вырезы.** Отверстие — не ближе двух толщин стекла к кромке и к соседнему отверстию, не ближе шести толщин к углу. Для стекла 10 мм это 20, 20 и 60 мм.",
                "3. **Диаметры отверстий** — от 4 до 130 мм. Диаметр меньше толщины стекла — только по согласованию.",
                "4. **Кромка.** Шлифованная, полированная, «трапеция», «еврокромка» — укажите, какая нужна и где торец будет виден.",
                "5. **Обработка отверстий изнутри.** Если отверстие под металлический крепёж, отметьте — кромку отверстия притупим и обработаем.",
                "6. **Клеймо.** Можно оставить стандартное место, указать другое или отказаться — важно для ограждений и видимых стёкол.",
                "7. **Маркировка позиций** — как на объекте, чтобы монтажник не искал, какое стекло куда.",
              ].join("\n")
            ),
            "Что проверить до заказа"
          ),
          faqBlock(
            await faqFromMarkdown(ctx, [
              [
                "Можно ли подрезать или досверлить закалённое стекло на объекте?",
                "Нет. После закалки стекло нельзя резать и сверлить — оно разрушится. Если размер не подошёл, изготавливается новое стекло. Поэтому мы проверяем чертёж до запуска.",
              ],
              [
                "Что будет, если в чертеже ошибка?",
                "Мы присылаем спецификацию на согласование до производства — это последний момент, когда ошибку можно исправить бесплатно. Если ошибся завод, стекло переделывают за его счёт. Если ошибка была в согласованном чертеже, переделка — за счёт заказчика. Доставку повторной партии оплачивает заказчик.",
              ],
              [
                "Какой минимальный заказ?",
                "От 50 м²; для части заказов — от 100 м², уточнит менеджер.",
              ],
              [
                "Почему закалённое стекло иногда лопается само?",
                "Редко, но бывает: причина — микроскопические включения в стекле, которые со временем могут разрушить закалённый лист. Поэтому там, где выпавшее стекло опасно, — над головой, на ограждениях перепадов высот — ставят триплекс: даже при разрушении он остаётся в проёме. → [Триплекс](/tripleks/)",
              ],
              [
                "Какие документы вы даёте?",
                "Паспорт качества, сертификат соответствия и протоколы испытаний. Оригиналы едут вместе с партией.",
              ],
              [
                "Видны ли на закалённом стекле искажения — и брак ли это?",
                "По ГОСТ 30698-2014 не допускаются искажения, заметные в проходящем свете под углом до 30° при проверке на экране «кирпичная стена». Искажения в отражённом свете стандарт не нормирует.",
              ],
              ["Сколько ждать КП?", "В среднем 2–3 рабочих дня, для больших объёмов — дольше."],
            ])
          ),
          cta("Отправьте чертёж — посчитаем стоимость и срок", [
            drawingButton("Получить расчёт"),
            { ...QUIZ_BUTTON, variant: "secondary" },
          ]),
        ],
      },
    },
    {
      path: "/kak-zakazat/",
      data: {
        title: "Как заказать",
        slug: "kak-zakazat",
        template: "service",
        _status: "published",
        seo: {
          h1: "Как заказать закалённое стекло",
          title: "Как заказать закалённое стекло для проекта — 6 шагов | Inex Glass",
          description:
            "От чертежа DWG до отгрузки: проверяем файл и согласуем спецификацию до запуска, срок — от даты договора. Заказы от 50 м².",
        },
        layout: [
          hero({
            lead: paragraphs(
              "Шесть шагов от файла до отгрузки. На каждом понятно, что делаем мы и что нужно от вас."
            ),
          }),
          richText(
            await md(
              [
                "**1. Пришлите файл.** DWG или DXF; для простых прямоугольных стёкол подойдут PDF с размерами или эскиз. → [Требования к чертежам](/kak-zakazat/trebovaniya-k-chertezham/)",
                "",
                "**2. Согласуйте спецификацию.** Проверим размеры, отверстия и технологические ограничения и пришлём спецификацию. Если что-то нельзя сделать по чертежу — предложим вариант до производства. → [Допуски по ГОСТ](/kak-zakazat/dopuski-i-gost/)",
                "",
                "**3. Получите КП.** Цена, срок и доставка — в среднем за 2–3 рабочих дня, для больших объёмов дольше.",
                "",
                "**4. Подпишите договор.** Цена в договоре фиксируется. Срок изготовления считается от даты договора: от 10 рабочих дней, для триплекса — от 14. → [Сроки](/kak-zakazat/sroki/)",
                "",
                "**5. Производство.** Стекло изготавливается на заводе-партнёре по согласованной спецификации. О готовности и изменениях менеджер сообщит звонком и по e-mail.",
                "",
                "**6. Упаковка и отправка.** Обрешётка, фото упаковки при отгрузке, документы на партию. Доставка транспортной компанией или самовывоз в Челябинске. → [Упаковка и доставка](/kak-zakazat/upakovka-i-dostavka/) · [Документы](/kak-zakazat/dokumenty/)",
              ].join("\n")
            )
          ),
          cta("Рассчитать стоимость"),
        ],
      },
    },
    {
      path: "/klientam/",
      data: {
        title: "Клиентам",
        slug: "klientam",
        template: "segment",
        _status: "published",
        seo: {
          h1: "С кем мы работаем",
          title: "Inex Glass для подрядчиков, застройщиков и производителей",
          description:
            "Как мы работаем с подрядчиками, производителями мебели, застройщиками и дизайнерами — и что берём на себя.",
        },
        layout: [
          hero({ lead: paragraphs("[…]") }),
          richText(await md(SEGMENTS.map(([label, url]) => `- [${label}](${url})`).join("\n"))),
          cta("Рассчитать стоимость"),
        ],
      },
    },
    {
      path: "/o-kompanii/",
      data: {
        title: "О компании",
        slug: "o-kompanii",
        template: "company",
        _status: "published",
        seo: {
          h1: "Inex Glass",
          title: "О компании Inex Glass — комплектация проектов стеклом",
          description:
            "Направление инжиниринговой компании Inex: 21 год, 1500+ проектов. Проектируем, проверяем чертежи, контролируем заводы-партнёры и упаковку.",
        },
        layout: [
          hero({
            lead: paragraphs(
              "Inex Glass — направление инжиниринговой компании Inex из Челябинска. Мы комплектуем объекты закалённым стеклом и стеклянными конструкциями: проектируем, проверяем чертежи, размещаем заказ на заводах-партнёрах в России и Китае, контролируем изготовление и упаковку и отправляем стекло на объект."
            ),
          }),
          richText(
            paragraphs("За 21 год специалисты Inex выполнили более 1500 проектов по всей России.")
          ),
          cta("Рассчитать стоимость"),
        ],
      },
    },
    {
      path: "/politika-konfidencialnosti/",
      data: {
        title: "Политика обработки персональных данных",
        slug: "politika-konfidencialnosti",
        template: "legal",
        _status: "published",
        hideConditions: true,
        hideQuizCta: true,
        seo: {
          h1: "Политика обработки персональных данных",
          title: "Политика обработки персональных данных | Inex Glass",
          noindex: true,
        },
        layout: [
          hero({ buttons: [], showTerms: false }),
          richText(
            await md(
              [
                "Редакция от [дата]. Действует с [дата].",
                "",
                "## 1. Общие положения",
                "",
                "1.1. Настоящая Политика определяет порядок обработки и меры защиты персональных данных пользователей сайта **inexglass.ru** (далее — Сайт) и составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — Закон).",
                "",
                "1.2. **Оператор персональных данных** — индивидуальный предприниматель Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871, адрес для корреспонденции: [индекс], г. Челябинск, Свердловский тракт, 7В [адрес для политики подтверждает юрист] (далее — Оператор).",
                "",
                "1.3. Политика применяется ко всем персональным данным, которые Оператор получает через Сайт: формы, квиз «Расчёт стоимости», загрузку файлов, а также при использовании файлов cookie и сервисов веб-аналитики.",
                "",
                "1.4. Политика опубликована в свободном доступе на Сайте по адресу inexglass.ru/politika-konfidencialnosti/.",
                "",
                "[…]",
              ].join("\n")
            )
          ),
        ],
      },
    },
    {
      path: "/soglasie-na-obrabotku-personalnyh-dannyh/",
      data: {
        title: "Согласие на обработку персональных данных",
        slug: "soglasie-na-obrabotku-personalnyh-dannyh",
        template: "legal",
        _status: "published",
        hideConditions: true,
        hideQuizCta: true,
        seo: {
          h1: "Согласие на обработку персональных данных",
          title: "Согласие на обработку персональных данных | Inex Glass",
          noindex: true,
        },
        layout: [
          hero({ buttons: [], showTerms: false }),
          richText(
            await md(
              [
                "Заполняя форму на сайте inexglass.ru и отмечая поле согласия, я свободно, своей волей и в своём интересе даю согласие индивидуальному предпринимателю Копылову Александру Михайловичу, ИНН 744700156319, ОГРНИП 323745600102871, адрес для корреспонденции: г. Челябинск, Свердловский тракт, 7В (далее — Оператор) на обработку моих персональных данных на следующих условиях.",
                "",
                "**1. Цели обработки:** рассмотрение заявки, расчёт стоимости и подготовка коммерческого предложения; связь со мной по заявке и заказу по телефону и электронной почте.",
                "",
                "**2. Перечень данных:** имя, номер телефона, адрес электронной почты, наименование компании, ИНН (если указан), город доставки, комментарий, а также персональные данные, содержащиеся в загруженных мной файлах.",
                "",
                "[…]",
              ].join("\n")
            )
          ),
        ],
      },
    },
  ];
}

async function seedPages(ctx: SeedContext): Promise<void> {
  // The hero takes its H1 from the document (`seo.h1` → title, passed by the catch-all route as
  // `RenderBlocks`' `page`), so the seed leaves `titleOverride` empty.
  for (const { path, data } of await buildPages(ctx)) {
    await upsertByPath(ctx, "pages", path, data);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Catalog and content templates                                                              */
/* ------------------------------------------------------------------------------------------ */

async function seedGlassType(ctx: SeedContext): Promise<void> {
  await upsertBySlug(ctx, "glass-types", {
    title: "Рифлёное",
    slug: "riflenoe",
    breadcrumbLabel: "Рифлёное",
    _status: "published",
    showSamples: true,
    samplesSnippetKey: "samples",
    seo: {
      h1: "Рифлёное закалённое стекло",
      title: "Рифлёное стекло мору, флутс — закалённое по размерам | Inex Glass",
      description:
        "Узорчатое стекло мору, флутс и другие в закалке. Направление рифления укажите в чертеже — проверим до запуска. Заказы от 50 м².",
    },
    // teksty/16-riflenoe.md
    intro: paragraphs(
      "Стекло с рельефом на одной стороне: пропускает свет, но размывает силуэты за собой. Рифлёное стекло вернулось в интерьеры — перегородки, двери, душевые, мебельные фасады. Изготавливаем в закалке по вашим чертежам. {условия}"
    ),
    limits: { allowedThicknesses: [4, 6, 8] },
    quizPrefill: { type: "tempered", kind: "ribbed" },
    faq: faq([
      [
        "Чем мору отличается от флутс?",
        "Оба узора — линейные рёбра. Отличаются шириной и профилем рёбер, причём у разных заводов по-разному. Надёжнее выбирать по образцу, а не по названию.",
      ],
      ["Рифлёное стекло можно закалить?", "Да, в толщинах 4, 6 и 8 мм."],
      [
        "Бывает ли мору в бронзе или графите?",
        "Тонированное рифлёное стекло бывает; конкретный цвет и узор проверим по наличию.",
      ],
    ]),
  });
}

async function seedProcessingService(ctx: SeedContext): Promise<void> {
  await upsertBySlug(ctx, "processing-services", {
    title: "Кромка",
    slug: "kromka",
    seo: {
      h1: "Обработка кромки стекла",
      title: "Обработка кромки стекла — шлифовка, еврокромка | Inex Glass",
      description:
        "Шлифованная, полированная, «трапеция» и «еврокромка». Какую кромку выбрать для профиля, видимого торца и мебели.",
    },
    // teksty/07-obrabotka-stekla.md, «Обработка кромки стекла»
    intro: paragraphs(
      "После резки кромка стекла острая и с микросколами. Обработка делает её безопасной и прочнее при закалке: необработанный край с трещинками — самое слабое место стекла. Вид кромки зависит от того, будет ли торец на виду."
    ),
    quizPrefill: { type: "tempered" },
  });
}

async function seedConstruction(ctx: SeedContext): Promise<void> {
  const partitions = await ctx.payload.find({
    collection: "products",
    where: { quizType: { equals: "partitions" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  await upsertBySlug(ctx, "constructions", {
    title: "Стеклянные перегородки",
    slug: "steklyannye-peregorodki",
    kind: "construction",
    group: "constructions",
    _status: "published",
    productTag: partitions.docs[0]?.id ?? null,
    seo: {
      h1: "Стеклянные перегородки для офисов и коммерческих объектов",
      title: "Стеклянные перегородки для офисов — комплект с узлами | Inex Glass",
      description:
        "Цельностеклянные и в алюминиевом профиле: стекло, профиль и фурнитура одним заказом, проверка узлов до запуска. Объекты от 50 м².",
    },
    // teksty/11-peregorodki-servis.md §1
    intro: paragraphs(
      "Офисы, торговые центры, банки, медицинские центры: стекло, профиль и фурнитура одним комплектом. Проверяем узлы до запуска производства, чтобы перегородка собралась на объекте без доработок. Монтаж выполняет ваша бригада. {условия}"
    ),
    ctaPrimaryLabel: "Рассчитать комплект",
    ctaSecondaryLabel: "Отправить планировку",
    secondaryFormKey: "drawing",
    quizPrefill: { type: "partitions" },
    faq: faq([
      [
        "Какой высоты может быть цельностеклянная перегородка?",
        "Зависит от толщины стекла, триплекса и крепления. Пришлите высоты — подберём стекло расчётом.",
      ],
      [
        "Можно ли встроить дверь?",
        "Да, в любую систему. Модель петель и замка нужна до заказа: отверстия под них делают до закалки.",
      ],
      [
        "От какого объёма работаете?",
        "От 50 м² стекла. При высоте 2,7 м это около 19 погонных метров перегородки.",
      ],
      ["Сколько изготавливается?", "От 10 рабочих дней с даты договора, триплекс — от 14."],
    ]),
  });
}

/** Fixed publication date of the seeded article (the content date of the ТЗ price list). */
const ARTICLE_DATE = "2026-10-15";

async function seedArticle(ctx: SeedContext): Promise<void> {
  // teksty/10-blog-kalkulyator.md §2
  await upsertBySlug(ctx, "articles", {
    title: "Можно ли резать закалённое стекло",
    slug: "mozhno-li-rezat-zakalennoe-steklo",
    _status: "published",
    datePublished: seedDate(ARTICLE_DATE),
    seo: {
      h1: "Можно ли резать закалённое стекло",
      title: "Можно ли резать закалённое стекло — и что делать с размером",
      description:
        "Коротко: нет — после закалки стекло рассыпается при резке и сверлении. Почему так и как не ошибиться с размером заранее.",
    },
    lead: await markdown(
      ctx,
      "**Коротко: нет.** Закалённое стекло нельзя резать, сверлить, шлифовать и подгонять по размеру. При попытке оно рассыпается на мелкие осколки целиком. Все операции — резка, кромка, отверстия, вырезы — делаются до закалки."
    ),
    body: await markdown(
      ctx,
      [
        "## Почему оно рассыпается",
        "",
        "При закалке стекло нагревают почти до размягчения и быстро охлаждают воздухом. Поверхность застывает первой и оказывается сжатой, а середина листа — растянутой. Это равновесие и делает стекло в 5–6 раз прочнее обычного.",
        "",
        "Если повредить поверхность — стеклорезом, сверлом, абразивом, — равновесие нарушается сразу во всём листе. Стекло разрушается полностью, а не по линии реза.",
        "",
        "## Что делать, если размер не подошёл",
        "",
        "[…]",
      ].join("\n")
    ),
    quizPrefill: { type: "tempered" },
  });
}

/**
 * One draft object. Portfolio objects need real data from Inex, so nothing fictional is ever
 * published: the draft only lets the admin and the objects template be checked.
 */
async function seedObjectDraft(ctx: SeedContext): Promise<void> {
  await upsertBySlug(
    ctx,
    "objects",
    { name: "Черновик объекта", slug: "chernovik-obekta", _status: "draft" },
    { draft: true }
  );
}

export interface TemplateSeedOptions {
  /** The draft portfolio object — only for `--minimal` (the `objects` slice owns the real ones). */
  includeObjectDraft: boolean;
}

/**
 * One record per template: pages (home, hub, service, segment, company, two legal), a glass
 * type, a processing service, a construction, an article and a draft object. `team` stays
 * empty. Existing documents (same path / slug) are skipped unless `--force`.
 */
export async function seedTemplateRecords(
  ctx: SeedContext,
  opts: TemplateSeedOptions = { includeObjectDraft: true }
): Promise<void> {
  await seedPages(ctx);
  await seedGlassType(ctx);
  await seedProcessingService(ctx);
  await seedConstruction(ctx);
  await seedArticle(ctx);
  if (opts.includeObjectDraft) await seedObjectDraft(ctx);
}
