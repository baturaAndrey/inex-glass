# Task 22: Главная страница `/`

## Status

pending

## Wave

5

## Description

Вертикальный срез главной страницы Inex Glass: шаблон (10 блоков по `13-homepage.md` и прототипу `Home.dc.html`), seed собственного контента и e2e-тест. Главная не забирает у хаба `/zakalennoe-steklo/` запрос «закалённое стекло на заказ»: она объясняет, почему заказывать через Inex, ведёт в каталог, обработку, конструкции, сегменты, показывает шаги заказа, объекты, полезные материалы и содержит полную форму «Отправьте чертёж». Тексты — дословно из `teksty/01-glavnaya.md`, цены и условия — из справочников CMS.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-21-forms-modals.md (контракт той же волны: `FormSection`)
**Blocks:** task-36-sitemap-robots-indexnow.md, task-38-placeholder-media.md, task-39-perf-images.md, task-40-content-audit.md

**Context from dependencies:**
- **task-10/07** заморозили схему (`src/payload-types.ts`; **не менять** — нет нужного поля: остановиться и написать координатору). Главная — документ коллекции `pages`: `title`, `isHome` (ровно один, путь `/`), `template` (`home` | `hub` | `service` | …), `slug` (для главной `home`), `path` (для главной `/`), `layout` (блоки), `seo` (`h1`, `title`, `description`, `noindex`, `canonical`, `ogImage`), `quizPrefill`, `hideConditions`, `hideQuizCta`. Блоки, нужные главной (поля сверх общих `sectionFields` = `anchorId`, `background` (`auto|bg|sf|dark|primaryDark`), `heading`, `headingLevel`, `sub`): `hero` (`variant: 'home'`, `eyebrow[]`, `lead` richText, `buttons[]` (`label`, `kind` quiz|form|link|download, `formKey`, `formParams`, `link`, `variant`, `icon`), `showTerms`, `termsMode`, `image`, `imageAlt`, `stats[{value,text}]`), `compare` (`topicTitle`, `leftTitle`, `rightTitle`, `rows[{topic,left,right}]`, `footLink`), `cards` (`layout`: `g3|g4|ctCards|p5Cards|seg`, `items[{title,text,link,image,icon,priceHint,tone}]`), `steps` (`items[{title,text,linkLabel,link}]`, `variant`, `footnote`, `buttons`), `objectsFeed` (`mode` featured|byProduct|manual, `limit`, `showAllLink`, `allLinkLabel`), `form` (`formKey`, `variant` card|inline|page, `bullets[]`, `showContacts`, `submitLabel`, `fileLabel`, `sourceLabel`, `params`). Глобалы: `conditions` (`termsBar[{text,icon}]` — 4 пункта полосы условий), `prices` (`rows`, `priceDate`, `staleAfterDays`), `promo`, `contacts`, `site-settings` (`experienceText`).
- **task-11** (`@/lib/domain`): `resolvePrice(4, prices, now)` → `{state, price, label}` (label «от 700 ₽/м²» с NBSP), `priceCaption`, `formatDateRu`, `promoActive`, `replacePlaceholders` (`{условия}`, `{цена_4мм}`, `{дата_цен}`, `{акция_текст}`…), `EXPERIENCE_PHRASE`, `checkStopWords`.
- **task-05/12/13** — `PageHero` (`variant="home"`: полноширинное фото + `hero__fade`, eyebrow, H1 в КАПС, `lead`, слоты `stats` (`StatsTiles glass`) и `terms`, `actions`; `media {src, alt}`), `Section`/`SectionHead`, `Button`, `TextLink`, `Terms`, `StatsTiles`, `Compare`, `Steps`, `Card`, `Placeholder`; временное hero-фото уже лежит в `public/images/hero-glass-temp.jpg` (task-05).
- **task-14** — `src/app/(site)/layout.tsx` (шапка, подвал, cookie-баннер, `StickyCta`, `FormDialogProvider`, Метрика). Шапку, подвал, плашку акции и мобильную закреплённую кнопку **эта задача не рисует**.
- **task-15** — `getPageByPath('/')`, `getPrices()`/`getPricesInput()`, `getConditions()`, `getContacts()`, `getPlaceholderContext()`, `listPublished('objects', …)`, `buildMetadata`, `PageShell` (на главной: `path="/"`, крошек нет, `showConditions={false}`, `quiz={false}`), `OrgJsonLd` (Organization + LocalBusiness Челябинск и Екатеринбург из `contacts`), `QuizLink`/`QuizCta` (`prefill`, `src`), `FormTrigger` (`formKey`, `params {label, source}`).
- **task-16** — `RenderBlocks`, `RichText`, сид-фреймворк (`src/seed/{index,context,lexical}.ts`: `markdownToLexical`, `SeedContext{payload, log, force}`) и **заглушка** `src/seed/slices/home.ts` (`export async function seed(ctx)`), которую здесь нужно реализовать; мини-сид (`--minimal`) создаёт заглушку главной.
- **task-21 (та же волна, контракт):** `FormSection` из `@/components/forms/form-section` (`<FormSection formKey="full" source="home-form" … />`, серверный; берёт контакты из global `contacts`) и реальные формы за `FormTrigger formKey="drawing"`.

## Files to Create

- `src/app/(site)/page.tsx` — страница `/` (серверный компонент, `generateMetadata`, `export const revalidate = 3600`); файл уже есть — временная главная task-01, заменить полностью (см. «Files to Modify»)
- `src/components/home/home-page.tsx` — сборка секций по блокам документа
- `src/components/home/hero.tsx`, `why.tsx`, `glass-cards.tsx`, `processing-tiles.tsx`, `construction-cards.tsx`, `segments.tsx`, `order-steps.tsx`, `objects-strip.tsx`, `useful-cards.tsx` — секции
- `src/components/home/cta-buttons.tsx` — отрисовка массива `buttons` блока (если аналогичный экспортируемый помощник уже есть в `cta-block.tsx` task-16 — использовать его вместо дубля)
- `src/components/home/home-icons.ts` — словарь «имя иконки → Lucide» (сегменты, плитки)
- `src/seed/content/home.ts` — данные главной (строки скопированы из teksty дословно)
- `src/seed/slices/home.test.ts` — Vitest: соответствие teksty, стоп-слова, ссылки
- `e2e/home.spec.ts`

## Files to Modify

- `src/seed/slices/home.ts` — заменить заглушку реальным сидом (идемпотентный upsert документа `isHome`).
- `src/app/(site)/page.tsx` — если остался от task-01 (временная главная) — заменить полностью.

**Не трогать:** `src/app/(site)/layout.tsx` (task-14), `src/components/ig/*`, `src/components/forms/*` (task-21), `src/components/blocks/*` (task-16), `src/payload/**` (схема заморожена), `src/seed/index.ts`, чужие срезы сида, `package.json`.

## Technical Details

### URL, мета, индексация

- `/` — единственный URL. Источник мета — `docs/inex/17-meta.md` (строка `/`), хранится в SEO-группе документа:
  - H1: `Закалённое стекло и стеклянные конструкции для ваших проектов`
  - Title: `Inex Glass — закалённое стекло и конструкции для проектов`
  - Description: `Комплектуем объекты закалённым стеклом 4–19 мм и триплексом: проверка чертежей до запуска, заказы от 50 м², доставка по Уралу и Сибири.`
  - `generateMetadata` → `buildMetadata({ seo: doc.seo, path: '/', fallbackTitle: doc.title, placeholders })`; canonical `${SITE_URL}/`; `index, follow` (на staging — noindex общей логикой).
- JSON-LD: `OrgJsonLd` (Organization + два LocalBusiness: офисы Челябинск — ул. Артиллерийская, 124А; Екатеринбург — ул. Данилы Зверева, 17б). `BreadcrumbList` на главной не нужен.
- Метки `{…}` в данных остаются как есть; подставляют `RichText`/движок меток и `buildMetadata`.
- Нет документа главной → `notFound()`.

### Документ и блоки

`pages`-документ: `isHome: true`, `slug: 'home'`, `template: 'home'`, `_status: 'published'`, SEO-группа, `quizPrefill` (type `tempered`). Блоки `layout` — по порядку; шаблон находит секцию по `blockType` (`hero`, `form`) либо по `anchorId` (остальные); лишние блоки редактора без известного ключа выводятся `RenderBlocks` перед формой.

| # | Ключ | `blockType` | Что хранится |
|---|---|---|---|
| 1 | `hero` | `hero` (`variant: 'home'`) | `eyebrow` (3 фразы), `lead`, `stats` (3 плитки), `showTerms: true`, `buttons` (2), `image`/`imageAlt` (необязательно) |
| 2 | `anchorId: 'why'` | `compare` | `heading`, `sub`, `topicTitle` «Этап», `leftTitle`, `rightTitle`, 8 строк `rows`, `footLink` |
| 3 | `glass` | `cards` (`g4`) | `heading`, 4 карточки |
| 4 | `processing` | `cards` (`g4`) | `heading`, `sub` (абзац), 7 плиток + акцентная (`tone: 'accent'`) |
| 5 | `constructions` | `cards` (`g3`) | `heading`, `sub`, 9 карточек |
| 6 | `segments` | `cards` (`seg`) | `heading`, 4 карточки (`icon`) |
| 7 | `steps` | `steps` | `heading`, 6 шагов, `footnote`, `buttons` (1) |
| 8 | `objects` | `objectsFeed` (`featured`, `limit: 8`, `showAllLink`) | `heading`, `sub`, `allLinkLabel` «Все объекты» |
| 8а | `objects-fallback` | `cards` (`g4`) | 8 названий объектов (запасной вариант) |
| 9 | `useful` | `cards` (`g4`) | `heading`, 4 карточки |
| 10 | `form` | `form` (`formKey: 'full'`) | — |

Поля блоков брать из `src/payload/blocks/*.ts` и `payload-types.ts`; если блок не вмещает нужные данные — не менять схему, остановиться и сообщить координатору. Иконки Lucide и декор — в коде по ключу `icon`; **тексты и ссылки — только из CMS**.

### Блоки страницы (порядок, источники, поведение)

Фоны секций чередуются `--ig-bg`/`--ig-surface` (в сиде у блоков явный `background`), ритм `.blk`: отступы 96 / 72 (≤1100) / 48 (≤599); контент в `Container` с `--ig-gutter`; фон секции — на всю ширину до 1920.

**1. Hero** — `PageHero variant="home"` (CSS и разметку не дублировать — они в task-05; здесь передаются данные): `eyebrow` — «Комплектация проектов • заводы-партнёры в России и Китае • доставка по Уралу, Сибири и Поволжью» (3 фразы, разделитель • цвета primary); `title` — `seo.h1` (`.ig-h1--caps`: КАПС только здесь, ≤3 строк на ≥1366, `text-wrap: balance`; на ≤599 КАПС выключен); `lead` — «Подберём завод под задачу и срок, проверим чертёж и согласуем спецификацию до запуска, проконтролируем упаковку и отправим на объект.»; `stats` — `StatsTiles glass` с тремя плитками «21 год» / «опыт специалистов Inex», «1500+» / «проектов по всей России», «4–19 мм» / «толщины закалённого стекла» (в прототипе у «21 год» подпись «изготавливаем и комплектуем…» — **не использовать**: Inex не изготавливает стекло); `terms` — `Terms` из `conditions.termsBar` (4 пункта: «Заказы от 50 м²», «Срок от 10 рабочих дней с даты договора», «КП в среднем за 2–3 рабочих дня», «Цена в договоре фиксируется»); кнопки (`CtaButtons`): primary `l` «Рассчитать стоимость» (иконка calculator, `QuizLink`, `src="/"`) и secondary `l` «Отправить чертёж» (иконка file-text, `FormTrigger drawing`, `params {label: 'Отправить чертёж', source: 'home-hero'}`). Фото: `media` блока либо `/images/hero-glass-temp.jpg`, alt «Пирамида с закалённым стеклом на складе», `preload` (Next 16; `priority` устарел), `sizes="(max-width: 599px) 100vw, 58vw"`, **без** дубля-размытия фона. Порядок в колонке: eyebrow → H1 → lead → статистика → полоса условий → кнопки (по макету; в teksty/01 условия названы «мелко под кнопками» — приоритет у `Home.dc.html`/`zadaniya/03`). Отступ `margin-left: var(--ig-gutter)` у всего, кроме H1, на ≥1101, 0 на ≤1100. ≤599: фото — статичный блок 240 px **над** контентом, статистика — одна колонка на белом фоне без blur.

**2. «Почему через нас, а не напрямую с завода»** (`anchorId: 'why'`). Секция с «стеклянным» градиентом: `radial-gradient(55% 70% at 62% 38%, rgba(232,242,239,.95) 0%, rgba(232,242,239,0) 70%), radial-gradient(40% 60% at 12% 85%, rgba(210,230,225,.7) 0%, rgba(210,230,225,0) 70%), linear-gradient(135deg, #5A968E 0%, #A9CBC5 42%, #C9DEDA 58%, #6FA39B 100%)`, отступы 96/72/48. `h2` (40/1.15, цвет `#16403D`): «Почему через нас, а не напрямую с завода»; подзаголовок (18 px, `#1F2A2E`): «Если вы заказываете стекло для объекта, то знаете, где обычно теряются дни и деньги. Мы взяли эти участки на себя.» `Compare` с `topic` (8 строк; темы — Выбор завода, Чертёж, Отклонения, Отверстия, Сроки, Упаковка, Цена, Комплектация; ячейки — дословно таблица teksty/01). Подложка таблицы — белая .94, радиус 24, тень `0 12px 40px rgba(22,64,61,.14)`, **без `backdrop-filter`** (frosted glass только в статистике hero); контраст ≥ 4,5:1. Под таблицей `TextLink` со стрелкой «Как мы работаем: 6 шагов» → `/kak-zakazat/`.

**3. «Закалённое стекло и триплекс под ваш размер»** (`glass`). Сетка 4 колонки (≥1366) → 3 (1101–1365) → 2 (600–1100) → 1 (≤599), gap 24. Карточки — `Card` без `href` (корень `div`), заголовок — ссылка с растянутым `::after`, отдельная ссылка «Рассчитать» поверх (`relative z-10`, не вложенные `<a>`):
1. «Закалённое стекло» — «4–19 мм», цена `resolvePrice(4, prices, now)`: при `state === 'price'` — «от 700 ₽/м²*» (`.ig-price-m`, NBSP), при `calc` цена не показывается → `/zakalennoe-steklo/`; «Рассчитать» → `type=tempered`.
2. «Триплекс» — «по ГОСТ 30826-2014» → `/tripleks/`; `type=triplex`.
3. «Виды стекла» — «осветлённое, матовое, тонированное, крашеное по RAL, рифлёное, гнутое» → `/zakalennoe-steklo/#vidy`; `type=tempered`.
4. «Для производителей мебели» — «фасады и столешницы» → `/zakalennoe-steklo/dlya-mebeli/`; `type=tempered`.
Сноска под сеткой (только если цена показана): «* Ориентировочная цена на {дата_цен}. Точная стоимость — в КП.» (`ig-small`, muted). Фото-заглушка `.ig-ph` либо картинка карточки.

**4. «Вся обработка — до закалки»** (`processing`, `--ig-surface`). Две колонки (`minmax(0,440px) 1fr`, gap 48; ≤1365 — одна). Слева `h2` и абзац «После закалки стекло нельзя резать и сверлить. Поэтому кромку, отверстия и вырезы делаем до неё, а чертёж проверяем перед запуском.» Справа плитки (4 колонки → 3 → 2 на ≤599; высота ≥132 / 112, `rounded-lg`, фон `--ig-bg`, hover — `primary-light` + подъём 2 px за 200 мс, иконка `ArrowUpRight`): Обработка кромки `/obrabotka-stekla/kromka/`; Отверстия и вырезы `/obrabotka-stekla/otverstiya-i-vyrezy/`; Фацет `/obrabotka-stekla/facet/`; Матирование `/obrabotka-stekla/matirovanie/`; Печать на стекле `/obrabotka-stekla/pechat/`; Наклейка плёнки `/obrabotka-stekla/plenki/`; Проектирование и узлы `/proektirovanie/`; акцентная (фон `primary-dark`, белый текст) «Калькулятор отверстий по ГОСТ» → `/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator` (якорь создаёт task-25).

**5. «Конструкции из стекла для объектов»** (`constructions`, `--ig-bg`). Подзаголовок «Проектируем, комплектуем и отправляем на объект. Монтаж выполняет ваша бригада — поможем с узлами и чертежами.» Сетка 3 колонки (→ 2 → 1), карточки (фото 16:10 + название + стрелка в строке): Стеклянные перегородки `/steklyannye-peregorodki/`; Ограждения и перила `/steklyannye-ograzhdeniya/`; Душевые перегородки для проектов `/dushevye-peregorodki/`; Козырьки `/steklyannye-kozyrki/`; Стеклянные фасады `/osteklenie/fasadov/`; Остекление витрин, лифтовых шахт, веранд `/osteklenie/`; Торговые витрины `/torgovye-vitriny/`; Зеркала для залов `/zerkala/dlya-zalov/`; Зажимной профиль и спайдеры `/furnitura/`.

**6. «С кем мы работаем»** (`segments`, `--ig-surface`). 4 карточки `seg` (иконка 56 px в круге primary-light, `h3` 20/600, описание 15 px muted, «Подробнее →» скрыто на ≤599; фон `--ig-bg`, hover — белый + `card-hover`): Подрядчикам и монтажникам `/klientam/podryadchikam/` (`Hammer`); Производителям мебели и изделий `/klientam/proizvoditelyam-mebeli/` (`Armchair`); Крупным объектам и генподрядчикам `/klientam/zastrojshchikam/` (`Building2`); Дизайнерам и архитекторам `/klientam/dizajneram-i-arhitektoram/` (`PencilRuler`). Описания — teksty/01 «С кем мы работаем» (предложения после жирных заголовков). Иконки сверить с svg в прототипе.

**7. «Как заказать»** (`steps`, `--ig-bg`). Белая плашка `rounded-xl` (padding 36; ≤599 — 20) с `Steps` (6 шагов: 6 колонок ≥1366 → 3 при ≤1365 → вертикально ≤599): «Пришлите файл.» / «DWG или DXF; для простых прямоугольных стёкол — PDF или эскиз.»; «Получите спецификацию на согласование.» / «Проверим размеры, отверстия и ограничения; отклонения согласуем до производства.»; «Получите КП» / «с ценой, сроком и доставкой — в среднем за 2–3 рабочих дня.»; «Подпишите договор.» / «Срок изготовления считается от его даты: от 10 рабочих дней, триплекс — от 14.»; «Производство.» / «О готовности и изменениях сообщит менеджер — звонком и по e-mail.»; «Упаковка и отправка.» / «Обрешётка, фото при отгрузке, доставка транспортной компанией или самовывоз в Челябинске.». Под лентой (верхняя граница, padding-top 28): `footnote` «Работаем с заказами от 50 м². Срочного изготовления нет. Монтаж не выполняем.» (500) и primary-кнопка «Отправить чертёж» (`FormTrigger drawing`, `source: 'home-steps'`; ≤599 на всю ширину).

**8. «Объекты»** (`objects`, `--ig-surface`). `h2` «Объекты», подзаголовок «За 21 год специалисты Inex выполнили более 1500 проектов по всей России.» (начинается точной `EXPERIENCE_PHRASE`), справа `TextLink` со стрелкой «Все объекты» → `/obekty/`. Сетка 4 колонки → 3 → 2 → 1: если есть опубликованные **избранные** объекты (`featured`, сортировка `sortDate` убыв., ≤ 8) — их карточки (фото, название, город; компонент карточки объекта task-30 если уже есть, иначе простая `Card`); **иначе** — запасной вариант (`objects-fallback`): 8 неактивных карточек с `Placeholder` («фото объекта») и названиями ТРК «Родник» · ТРК «Урал» · «Трактор» арена · Концертный зал (Омск) · «Сургутнефтегаз» · Сбербанк (Ишим) · «Аркаим Плаза» · Угорская шахматная академия (без ссылок на несуществующие страницы). Выбор — на сервере.

**9. «Полезное для инженеров»** (`useful`, `--ig-bg`). 4 карточки с `Placeholder` 16:9 и заголовком 19 px: «Калькулятор веса стекла» — «вес 1 м² и всей партии для 4–19 мм» → `/instrumenty/kalkulyator-vesa-stekla/`; «Допуски по ГОСТ 30698-2014» — «размеры, плоскостность, расстояния для отверстий» → `/kak-zakazat/dopuski-i-gost/`; «Можно ли резать закалённое стекло» — «и что делать, если размер не подошёл» → `/blog/mozhno-li-rezat-zakalennoe-steklo/`; «Как снять размеры проёма» — «чтобы стекло встало с первого раза» → `/blog/kak-snyat-razmery-dlya-stekla/`.

**10. Финальная форма** — `<FormSection formKey="full" source="home-form" />` (task-21): фон `#EAF3F1`, заголовок «Отправьте чертёж — посчитаем стоимость и срок», пункты «КП — в среднем за 2–3 рабочих дня.» и «Работаем с заказами от 50 м².», контакты из global `contacts`, поля «Компания · Имя · Телефон · E-mail · Файл (DWG, DXF, PDF, до 50 МБ) · Город доставки · Площадь, м² · Комментарий», кнопка «Получить расчёт». Здесь — только встраивание.

Подвал и ссылка-мост на inex.su — task-14.

### Данные и кэш

- `getPageByPath('/')` — загрузчик с тегами `doc:pages:<id>`, `collection:pages`; цены/условия/контакты — загрузчики globals с тегами `global:<slug>` (ревалидация хуками Payload). `export const revalidate = 3600` (карточка с ценой зависит от `now`); `now` берётся один раз на запрос. Если дата цен просрочена — цена и сноска не выводятся.
- Анимации: только hover/focus 120–320 мс; без бесконечных; `prefers-reduced-motion` отключает подъём.

### Seed (`src/seed/slices/home.ts`)

- Upsert документа `pages` по `isHome` (ключ — `slug: 'home'`), `ctx` с `disableRevalidate`. Данные — `src/seed/content/home.ts`: строки **скопированы** из `teksty/01-glavnaya.md` скриптом (не перепечатывать); абзацы — `markdownToLexical`; метки `{…}` не раскрывать.
- Правило обновления: по умолчанию сид 16 пропускает существующие документы; срез обновляет главную, если передан `--force` **или** документ ещё не редактировался (|`updatedAt` − `createdAt`| < 2 с — его создал мини-сид); иначе пропуск с записью в лог.
- Сид не создаёт объекты, медиа и глобалы. `pnpm seed --only=home` дважды подряд даёт один и тот же документ.
- Vitest `home.test.ts`: (а) каждая строка контента встречается в teksty/01 (после снятия markdown; `test.skip`, если нет `res/`); (б) `checkStopWords` по всему тексту — пусто; (в) ссылки внутренние, в нижнем регистре, со слешем на конце (кроме якорей `#vidy`, `#kalkulyator`); (г) 8 строк `compare`, 6 шагов, 9 карточек конструкций, 7 + 1 плитка обработки.

### Метрика

Специальных целей нет. Открытие квиза → `quiz_start` (task-20), отправка формы → `form_submit` (task-21), клики `tel:`/`mailto:` — глобально (task-19). Кнопки «Рассчитать» — обычные `Link`.

### e2e (`e2e/home.spec.ts`, проекты 375 / 1366 / 1920)

Предусловие: `pnpm seed --minimal`, затем `pnpm seed --only=home --force`. В `beforeAll` проверить, что на `/` есть секция «Почему через нас…», иначе упасть с подсказкой.
- 200; один `h1` из 17-meta; `<title>` и `meta[name=description]` равны эталону; `link[rel=canonical]` = `${SITE_URL}/`; `html[lang=ru]`.
- На первом экране видна primary-кнопка «Рассчитать стоимость» (на 375 — hero-кнопка и/или sticky); её `href` начинается с `/raschet-stoimosti/` и содержит `src=` (по ссылке не переходить — маршрут появится в task-34).
- Порядок `h2`: «Почему через нас, а не напрямую с завода» → «Закалённое стекло и триплекс под ваш размер» → «Вся обработка — до закалки» → «Конструкции из стекла для объектов» → «С кем мы работаем» → «Как заказать» → «Объекты» → «Полезное для инженеров» → «Отправьте чертёж — посчитаем стоимость и срок».
- «Почему через нас»: 8 строк; на 375 — пары с подписями «Сами»/«Через Inex Glass», на 1366 — таблица.
- Карточка «Закалённое стекло»: при актуальной цене — «от 700 ₽/м²» (NBSP) и сноска «Ориентировочная цена на …»; при просроченной — ни цены, ни сноски (ветвление по наличию сноски).
- 8 плиток + акцентная плитка обработки с корректными `href`; 9 карточек конструкций; 4 сегмента; 6 шагов; 4 полезных ссылки; все внутренние `href` с `/` на конце (кроме `tel:`, `mailto:`, внешних).
- «Объекты»: без опубликованных объектов — 8 карточек запасного варианта; «Все объекты» → `/obekty/`.
- «Отправить чертёж» (hero и шаги) открывает `role=dialog`; внизу форма «Получить расчёт», чекбокс согласия не отмечен.
- JSON-LD: один `Organization` и два `LocalBusiness`, JSON валиден.
- Нет горизонтального скролла на 375; на 1920 контент не шире `1920 − 2 × 70`, фоны секций тянутся на всю ширину; в тексте нет `{`/`}`; `axe` без критических нарушений.
- Скриншоты full-page на 375 / 1366 / 1920 — к отчёту для сверки с `Home.dc.html` (и PNG из `res/inex-glass-handoff/reference/`, если есть).

## Acceptance Criteria

- [ ] `/` отдаёт 200 из документа `isHome`; H1, title, description равны `17-meta.md`; canonical `/`; JSON-LD Organization + 2 × LocalBusiness.
- [ ] Блоки 1–10 присутствуют в нужном порядке; тексты дословно совпадают с teksty/01 (тест); цены и сноска берутся из справочников; при просроченной цене цена и сноска скрыты; «21 год» подписан «опыт специалистов Inex».
- [ ] На первом экране на 375 / 1366 / 1920 есть primary «Рассчитать стоимость» (иконка calculator) и «Отправить чертёж»; frosted glass только в статистике hero.
- [ ] Вёрстка совпадает с `Home.dc.html` на 375 / 1366 / 1920 и в точках 1365 / 1100 / 599 (сетки 4→3→2→1, шаги 6→3→1, плитки 4→3→2, форма в 1 колонку); нет горизонтального скролла.
- [ ] Hero-изображение загружается один раз (`preload` — в Next 16 вместо устаревшего `priority`, без дубля-размытия); остальные изображения ниже первого экрана — lazy.
- [ ] «Объекты» не показывают фиктивных опубликованных объектов: либо избранные из CMS, либо неактивный запасной вариант.
- [ ] `pnpm seed --only=home` идемпотентен; Vitest-тесты сида проходят; стоп-слов нет.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (без БД), `pnpm test:e2e e2e/home.spec.ts` проходят.
- [ ] Схема Payload, layout, `components/ig`, чужие сиды не изменены.

## Notes
- (Ревью волны 2) В `PageHero variant="home"` (task-05) на 1366 px последний пункт полосы условий (`.ig-terms`) заезжает на фото и плохо читается — поправить раскладку при сборке главной (перенос строки/ширина колонки), сверить с `Home.dc.html`.

- **Модель:** премиум для кода и вёрстки; перенос текстов — скриптом.
- Источники: `res/inex-glass-handoff/teksty/01-glavnaya.md`; `docs/inex/13-homepage.md` (структура v3, правки к макету §0); `zadaniya/03-glavnaya.md`; прототип `prototypes/Home.dc.html` (разметка в `<x-dc>`, CSS в `<helmet><style>`, данные в `<script type="text/x-dc">`); `docs/inex/17-meta.md`; ТЗ `docs/inex/16-tz-razrabotka.md` §3.2, §5; дизайн-система `res/inex-glass-handoff/design-system/`.
- В `13-homepage.md` для «Полезного» 4-й пункт — «Триплекс или закалённое для ограждения»; приоритет у teksty/01 («Как снять размеры проёма»). Кнопка «Рассчитать» на карточках каталога (13-homepage) реализована отдельной ссылкой поверх карточки.
- **Открытые вопросы для координатора:** (1) `hero`-блок схемы должен вмещать `stats` и `buttons` (по task-07 так и есть) — при расхождении нужен выпуск схемы; (2) CI должен выполнять `pnpm seed --full` (или `--only=<slice>`) перед Playwright, иначе слайсовые e2e упадут на пустой БД; (3) фото-заглушка hero — `/images/hero-glass-temp.jpg` (task-05), заменяется в task-38.
