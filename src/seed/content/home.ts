/**
 * Content of the home page `/` (task 22). Every string is copied verbatim from
 * `res/inex-glass-handoff/teksty/01-glavnaya.md`; H1 / Title / Description from
 * `docs/inex/17-meta.md` (row `/`). The few labels that exist only in the prototype
 * `res/inex-glass-handoff/prototypes/Home.dc.html` (comparison topics, the accent tile, the hero
 * photo alt) are listed in `HOME_PROTOTYPE_STRINGS` — `home.test.ts` checks them against it.
 *
 * Placeholders `{…}` stay as they are: they are substituted at render time.
 * Pure data, no Payload imports: the seed slice (`../slices/home.ts`) builds the blocks from it
 * and the unit test reads it directly.
 */

export interface HomeLink {
  title: string;
  text?: string;
  url: string;
}

/** Path of the home page; the document is identified by `isHome`. */
export const HOME_PATH = "/";
export const HOME_SLUG = "home";
export const HOME_TITLE = "Главная";

/** docs/inex/17-meta.md, row `/`. */
export const HOME_SEO = {
  h1: "Закалённое стекло и стеклянные конструкции для ваших проектов",
  title: "Inex Glass — закалённое стекло и конструкции для проектов",
  description:
    "Комплектуем объекты закалённым стеклом 4–19 мм и триплексом: проверка чертежей до запуска, заказы от 50 м², доставка по Уралу и Сибири.",
} as const;

/** «Первый экран». */
export const HOME_HERO = {
  eyebrow: [
    "Комплектация проектов",
    "заводы-партнёры в России и Китае",
    "доставка по Уралу, Сибири и Поволжью",
  ],
  lead: "Подберём завод под задачу и срок, проверим чертёж и согласуем спецификацию до запуска, проконтролируем упаковку и отправим на объект.",
  stats: [
    { value: "21 год", text: "опыт специалистов Inex" },
    { value: "1500+", text: "проектов по всей России" },
    { value: "4–19 мм", text: "толщины закалённого стекла" },
  ],
  quizLabel: "Рассчитать стоимость",
  drawingLabel: "Отправить чертёж",
  imageAlt: "Пирамида с закалённым стеклом на складе",
} as const;

/** «Почему через нас, а не напрямую с завода». Topics are the prototype's row names. */
export const HOME_WHY = {
  heading: "Почему через нас, а не напрямую с завода",
  sub: "Если вы заказываете стекло для объекта, то знаете, где обычно теряются дни и деньги. Мы взяли эти участки на себя.",
  topicTitle: "Этап",
  leftTitle: "Когда заказываете на заводе сами",
  rightTitle: "Когда через Inex Glass",
  rows: [
    {
      topic: "Выбор завода",
      left: "Сравниваете три-четыре завода и ждёте свою очередь",
      right: "Подбираем завод-партнёр под вид стекла, объём и срок",
    },
    {
      topic: "Чертёж",
      left: "«Что согласовали — то и получили»: ошибку в чертеже оплачиваете вы",
      right: "Проверяем чертёж и присылаем спецификацию на согласование до запуска",
    },
    {
      topic: "Отклонения",
      left: "Завод меняет диаметр отверстия и не предупреждает",
      right: "Любое отклонение от чертежа согласуем с вами до производства",
    },
    {
      topic: "Отверстия",
      left: "Отверстие у самой кромки, острые края",
      right:
        "Отверстия по ГОСТ 30698-2014: не ближе двух толщин стекла к кромке, кромки отверстий притуплены",
    },
    {
      topic: "Сроки",
      left: "О переносе срока узнаёте, когда звоните сами",
      right: "Менеджер сообщает о готовности и изменениях звонком и по e-mail",
    },
    {
      topic: "Упаковка",
      left: "Ящики не выдерживают дорогу",
      right: "Обрешётка и фото упаковки при отгрузке; состав упаковки — под ваш маршрут",
    },
    {
      topic: "Цена",
      left: "Цена меняется после предоплаты",
      right: "Цена в договоре фиксируется",
    },
    {
      topic: "Комплектация",
      left: "Стекло у одного поставщика, профиль и фурнитура — у другого",
      right: "Стекло, зажимной профиль и спайдерная фурнитура одним заказом",
    },
  ],
  footLink: { label: "Как мы работаем: 6 шагов", url: "/kak-zakazat/" },
} as const;

/**
 * «Закалённое стекло и триплекс под ваш размер». `priceHint` keeps the teksty wording with the
 * placeholder; the template replaces it with the price of the CMS price list (or hides it).
 * The price footnote under the grid is NOT stored here: teksty's «* Ориентировочная цена на
 * {дата_цен}. Точная стоимость — в КП.» lacks «цена в договоре фиксируется» (ТЗ §11), so the
 * template renders the `prices.caption` global (→ `priceCaption()`), like every other price.
 */
export const HOME_GLASS = {
  heading: "Закалённое стекло и триплекс под ваш размер",
  items: [
    {
      title: "Закалённое стекло",
      text: "4–19 мм",
      priceHint: "от {цена_4мм} ₽/м²*",
      url: "/zakalennoe-steklo/",
    },
    { title: "Триплекс", text: "по ГОСТ 30826-2014", url: "/tripleks/" },
    {
      title: "Виды стекла",
      text: "осветлённое, матовое, тонированное, крашеное по RAL, рифлёное, гнутое",
      url: "/zakalennoe-steklo/#vidy",
    },
    {
      title: "Для производителей мебели",
      text: "фасады и столешницы",
      url: "/zakalennoe-steklo/dlya-mebeli/",
    },
  ],
} as const;

/** «Вся обработка — до закалки»: 7 tiles + the accent calculator tile (prototype). */
export const HOME_PROCESSING = {
  heading: "Вся обработка — до закалки",
  sub: "После закалки стекло нельзя резать и сверлить. Поэтому кромку, отверстия и вырезы делаем до неё, а чертёж проверяем перед запуском.",
  tiles: [
    { title: "Обработка кромки", url: "/obrabotka-stekla/kromka/" },
    { title: "Отверстия и вырезы", url: "/obrabotka-stekla/otverstiya-i-vyrezy/" },
    { title: "Фацет", url: "/obrabotka-stekla/facet/" },
    { title: "Матирование", url: "/obrabotka-stekla/matirovanie/" },
    { title: "Печать на стекле", url: "/obrabotka-stekla/pechat/" },
    { title: "Наклейка плёнки", url: "/obrabotka-stekla/plenki/" },
    { title: "Проектирование и узлы", url: "/proektirovanie/" },
  ],
  accent: {
    title: "Калькулятор отверстий по ГОСТ",
    url: "/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator",
  },
} as const;

/** «Конструкции из стекла для объектов». */
export const HOME_CONSTRUCTIONS = {
  heading: "Конструкции из стекла для объектов",
  sub: "Проектируем, комплектуем и отправляем на объект. Монтаж выполняет ваша бригада — поможем с узлами и чертежами.",
  items: [
    { title: "Стеклянные перегородки", url: "/steklyannye-peregorodki/" },
    { title: "Ограждения и перила", url: "/steklyannye-ograzhdeniya/" },
    { title: "Душевые перегородки для проектов", url: "/dushevye-peregorodki/" },
    { title: "Козырьки", url: "/steklyannye-kozyrki/" },
    { title: "Стеклянные фасады", url: "/osteklenie/fasadov/" },
    { title: "Остекление витрин, лифтовых шахт, веранд", url: "/osteklenie/" },
    { title: "Торговые витрины", url: "/torgovye-vitriny/" },
    { title: "Зеркала для залов", url: "/zerkala/dlya-zalov/" },
    { title: "Зажимной профиль и спайдеры", url: "/furnitura/" },
  ],
} as const;

/** «С кем мы работаем»: icons are Lucide names (rendered by `home-icons.ts`). */
export const HOME_SEGMENTS = {
  heading: "С кем мы работаем",
  items: [
    {
      title: "Подрядчикам и монтажникам",
      text: "Стекло, которое встаёт с первого раза: спецификация на согласование, отверстия по ГОСТ, обрешётка в дорогу.",
      url: "/klientam/podryadchikam/",
      icon: "hammer",
    },
    {
      title: "Производителям мебели и изделий",
      text: "Фасады и столешницы с нужной кромкой и отверстиями под фурнитуру. Клеймо можно не ставить.",
      url: "/klientam/proizvoditelyam-mebeli/",
      icon: "armchair",
    },
    {
      title: "Крупным объектам и генподрядчикам",
      text: "Ограждения, перегородки и душевые для торговых центров и арен. Паспорт качества, сертификат и протоколы испытаний на каждую партию.",
      url: "/klientam/zastrojshchikam/",
      icon: "building-2",
    },
    {
      title: "Дизайнерам и архитекторам",
      text: "Цвета по RAL, матирование, печать, гнутое стекло. Поможем превратить эскиз в рабочие узлы.",
      url: "/klientam/dizajneram-i-arhitektoram/",
      icon: "pen-tool",
    },
  ],
} as const;

/** «Как заказать». */
export const HOME_STEPS = {
  heading: "Как заказать",
  items: [
    {
      title: "Пришлите файл.",
      text: "DWG или DXF; для простых прямоугольных стёкол — PDF или эскиз.",
    },
    {
      title: "Получите спецификацию на согласование.",
      text: "Проверим размеры, отверстия и ограничения; отклонения согласуем до производства.",
    },
    {
      title: "Получите КП",
      text: "с ценой, сроком и доставкой — в среднем за 2–3 рабочих дня.",
    },
    {
      title: "Подпишите договор.",
      text: "Срок изготовления считается от его даты: от 10 рабочих дней, триплекс — от 14.",
    },
    {
      title: "Производство.",
      text: "О готовности и изменениях сообщит менеджер — звонком и по e-mail.",
    },
    {
      title: "Упаковка и отправка.",
      text: "Обрешётка, фото при отгрузке, доставка транспортной компанией или самовывоз в Челябинске.",
    },
  ],
  footnote: "Работаем с заказами от 50 м². Срочного изготовления нет. Монтаж не выполняем.",
  buttonLabel: "Отправить чертёж",
} as const;

/** «Объекты»: the feed of featured objects, the fallback names when none is published. */
export const HOME_OBJECTS = {
  heading: "Объекты",
  sub: "За 21 год специалисты Inex выполнили более 1500 проектов по всей России.",
  allLinkLabel: "Все объекты",
  limit: 8,
  fallback: [
    "ТРК «Родник»",
    "ТРК «Урал»",
    "«Трактор» арена",
    "Концертный зал (Омск)",
    "«Сургутнефтегаз»",
    "Сбербанк (Ишим)",
    "«Аркаим Плаза»",
    "Угорская шахматная академия",
  ],
} as const;

/** «Полезное для инженеров». */
export const HOME_USEFUL = {
  heading: "Полезное для инженеров",
  items: [
    {
      title: "Калькулятор веса стекла",
      text: "вес 1 м² и всей партии для 4–19 мм",
      url: "/instrumenty/kalkulyator-vesa-stekla/",
    },
    {
      title: "Допуски по ГОСТ 30698-2014",
      text: "размеры, плоскостность, расстояния для отверстий",
      url: "/kak-zakazat/dopuski-i-gost/",
    },
    {
      title: "Можно ли резать закалённое стекло",
      text: "и что делать, если размер не подошёл",
      url: "/blog/mozhno-li-rezat-zakalennoe-steklo/",
    },
    {
      title: "Как снять размеры проёма",
      text: "чтобы стекло встало с первого раза",
      url: "/blog/kak-snyat-razmery-dlya-stekla/",
    },
  ],
} as const;

/** Final form «Отправьте чертёж — посчитаем стоимость и срок». */
export const HOME_FORM = {
  heading: "Отправьте чертёж — посчитаем стоимость и срок",
  bullets: ["КП — в среднем за 2–3 рабочих дня.", "Работаем с заказами от 50 м²."],
  submitLabel: "Получить расчёт",
} as const;

/** Strings taken from the prototype `Home.dc.html` (not present in teksty/01). */
export const HOME_PROTOTYPE_STRINGS: readonly string[] = [
  HOME_WHY.topicTitle,
  ...HOME_WHY.rows.map((row) => row.topic),
  HOME_PROCESSING.accent.title,
  HOME_HERO.imageAlt,
];

/** Form sources (lead `source` labels) of the page. */
export const HOME_SOURCES = {
  hero: "home-hero",
  steps: "home-steps",
  form: "home-form",
} as const;
