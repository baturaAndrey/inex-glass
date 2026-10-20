# Task 13: UI-примитивы контента (таблицы, сравнение, FAQ, карточки, cookie-баннер, sticky CTA, лайтбокс, drawer) + хранилище согласия

## Status

pending

## Wave

3

## Description

Библиотека контентных компонентов дизайн-системы Inex Glass, из которых собираются все шаблоны страниц: бейдж, хлебные крошки, таблица фактов с автоматическим переходом в карточки на телефоне, сравнение «сами / через Inex Glass», полоса условий, callout, шаги, плитки статистики, таймлайн, аккордеон/FAQ, карточки (раздел, толщина), заглушка фото, cookie-баннер, закреплённая кнопка на телефоне, лайтбокс и выезжающая панель (drawer). Также в задаче — клиентское хранилище согласия на cookie (`src/lib/consent.ts`), от которого зависит загрузка Яндекс.Метрики.

## Dependencies

**Depends on:** task-05-design-tokens-shell-primitives.md
**Blocks:** task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-19-metrika-analytics.md и все шаблоны страниц Wave 5

**Context from dependencies:** task-05 создал токены `--ig-*` (`src/styles/ig-tokens.css`), классы `.ig-*` (`src/styles/ig-components.css`, перенесены из `res/inex-glass-handoff/design-system/components.css` в слой `components`), Tailwind v4 `@theme inline` (цвета `bg-surface`, `text-text-2`, `border-line`, `bg-primary-light`…; радиусы sm 6 / md 10 / lg 16 / xl 24; тени card / card-hover / dropdown / modal; длительности 120/200/320 мс; брейкпоинты `sm=600`, `md=1101`, `lg=1366`, `xl=1536`, `2xl=1920`, где `max-sm:` = ≤599 px, `max-md:` = ≤1100 px, `max-lg:` = ≤1365 px), `--ig-gutter`, примитивы `src/components/ig/{container,section,page-hero,button,text-link}.tsx` (`Button`: `variant="primary|secondary|ghost|onDark"`, `size="l|m|s|icon"`, `asChild`), утилиту `cn()` в `@/lib/utils`, dev-страницу `src/app/(site)/ui-kit/page.tsx`. В зависимостях проекта уже есть `lucide-react`, `@radix-ui/react-dialog`, `@radix-ui/react-slot`, `class-variance-authority`. Page-specific CSS прототипов (`p5-`, `ct-`, `th-`, … в `<helmet><style>`) переписывается на Tailwind внутри компонентов; общие `.ig-*` остаются в CSS.

## Files to Create

В `src/components/ig/`:
- `badge.tsx`, `breadcrumbs.tsx`, `data-table.tsx`, `compare.tsx`, `terms.tsx`, `callout.tsx`, `steps.tsx`, `stats-tiles.tsx`, `timeline.tsx`, `accordion.tsx`, `faq.tsx`, `card.tsx`, `thick-card.tsx`, `placeholder.tsx`, `cookie-banner.tsx`, `sticky-cta.tsx`, `lightbox.tsx`, `drawer.tsx`

Хранилище согласия:
- `src/lib/consent.ts` — чистые функции (без React)
- `src/lib/use-consent.ts` — `'use client'` хук `useConsent()` на `useSyncExternalStore`
- `src/lib/consent.test.ts` — unit-тесты (разбор/запись cookie, события)

Демо:
- `src/app/(site)/ui-kit/content/page.tsx` + `content-demo.tsx` (client) — все компоненты во всех состояниях; `notFound()` при `SITE_ENV === 'production'`.

## Files to Modify

Нет (`ig-components.css`, `button.tsx`, `ui-kit/page.tsx` — территория task-05; недостающие стили — Tailwind-классами в компоненте).

## Technical Details

### Общие правила

- Серверные компоненты по умолчанию; `'use client'` — только там, где нужны состояние/эффекты (accordion, timeline-responsive не нужен — адаптив на CSS; cookie-banner, sticky-cta, lightbox, drawer).
- Пропсы типизированы, `className` мержится через `cn()`. Иконки — Lucide (stroke 2, 18–24 px).
- Состояния — через `aria-*`. Анимации 120/200/320 мс (`--ig-ease`), без бесконечных анимаций; учитывать `prefers-reduced-motion` (отключать transform-анимации).
- Никаких эмодзи и бейджей «Хит/Новинка».
- Мобильная адаптация — точка 599 px (`max-sm:`).

### Badge

`<Badge variant="promo|success|info">` — `.ig-badge` + модификаторы. Для плашки акции в шапке допускается проп `plain` (без uppercase, 13 px) — как в `Home.dc.html`.

### Breadcrumbs

```ts
interface Crumb { label: string; href?: string }
<Breadcrumbs items={Crumb[]} className? />
```
`<nav aria-label="Хлебные крошки"><ol class="ig-crumbs">…`; разделитель — иконка `ChevronRight` 14 px (`.ig-crumbs__sep`, `aria-hidden`); последний элемент без ссылки, `aria-current="page"`. Элементы без `href` — просто текст. На телефоне длинная цепочка прокручивается/переносится без горизонтального скролла страницы (допускается `overflow-x-auto` внутри nav). JSON-LD здесь **не** выводится (делает task-15).

### DataTable (автопереход в карточки ≤599 px)

```ts
interface DataTableColumn { key: string; label: string; align?: 'left'|'right'|'center'; numeric?: boolean; width?: string }
interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, ReactNode>[];
  caption?: string;                 // sr-only
  highlightRow?: number;            // индекс строки (текущая толщина)
  highlightColumn?: string;         // ключ колонки (текущая толщина в таблице соседей)
  rowHref?: (row, index) => string | undefined; // строки-ссылки (.is-link)
  mobileTitleKey?: string;          // колонка-заголовок карточки (по умолчанию первая)
  mobile?: 'cards' | 'scroll';      // по умолчанию 'cards'
}
```
≥600 px: `<div class="ig-table-wrap"><table class="ig-table">` (zebra, `.ig-num` для чисел, `scope="col"`). ≤599 px: список `.ig-mcard` (заголовок — значение `mobileTitleKey`, остальные колонки — `<dl>` строки `.ig-mcard__row` «подпись — значение»). Оба представления рендерятся, переключаются CSS (`max-sm:hidden` / `hidden max-sm:flex`), без JS и без CLS.

### Compare (сравнение «сами / через Inex Glass» + пары на телефоне)

```ts
interface CompareRow { topic?: string; self: ReactNode; inex: ReactNode }
<Compare rows={CompareRow[]} selfTitle? inexTitle? />
```
Заголовки по умолчанию: «Когда заказываете на заводе сами» / «Когда через Inex Glass» (так в `Home.dc.html`, блок «Почему через нас»). Без `topic`: двухколоночный `.ig-compare` (колонка «сами» — warning-тон, «Inex» — primary-light; иконки `X` / `Check` в кружках по прототипу Home: `.ic--x`/`.ic--ok`). С `topic`: трёхколоночная сетка `220px / 1fr / 1.12fr` (стили `.row/.c/.hd/.ic` из `<helmet><style>` в `prototypes/Home.dc.html`, блок «Блок 2», переписать на Tailwind). ≤760 px — каждая строка превращается в карточку/пару `.ig-pair` с подписями «Сами»/«Через Inex Glass» (`.ig-pair__lbl`).

### Terms (полоса условий)

```ts
interface TermItem { icon?: ReactNode; text: ReactNode }
<Terms items={TermItem[]} variant="bar" | "plain" />
```
`.ig-terms` (+`--plain`), каждый пункт `.ig-terms__item` с иконкой (по умолчанию `Check` 18 px, цвет primary). Принимает произвольные пункты; сборка пунктов из global `conditions` — задача потребителя (task-15 `PageShell`, task-16).

### Callout

`<Callout variant="warning|info" title? items?: ReactNode[]>{children}</Callout>` — `.ig-callout` (+`--info`); иконка `TriangleAlert` (warning) / `Info` (info) в круге 40 px; заголовок `.ig-callout__title`; `items` рендерятся как список. Роль `note`.

### Steps

```ts
<Steps steps={{ title: string; text?: ReactNode }[]} columns? />
```
`.ig-steps` — 6 колонок на ≥1366; 3 колонки при ≤1365 (линия у 3-го шага скрыта, `row-gap: 28px`); на ≤599 — вертикальный список: номер слева (36 px), заголовок и текст рядом (`flex-wrap`, текст с отступом 50 px), линии скрыты (стили из `Home.dc.html`, секция «Блоки главной 3–10» / медиа-запросы). Номера — `.ig-step__num` («1»…), `<ol>` с корректной семантикой.

### StatsTiles

```ts
<StatsTiles items={{ value: ReactNode; text: ReactNode }[]} glass? />
```
`.ig-stats` (3 колонки) + `--glass` только для hero главной (frosted glass; **больше нигде**). Значение — `.ig-stat` (48 px, tabular-nums, `white-space: nowrap`), подпись `.ig-stat-tile__text`. ≤599 px: одна колонка, плитки в строку (число 28 px слева шириной ~118 px), фон белый без blur, разделители горизонтальные (как `.stats` в `Home.dc.html`).

### Timeline

```ts
type TimelineState = 'done' | 'current' | 'todo';
interface TimelineStep { key: string; title: string; date?: string; state: TimelineState; icon?: ReactNode }
<Timeline steps={TimelineStep[]} orientation="responsive" | "horizontal" | "vertical" />
```
`.ig-tl` (5 колонок) / `.ig-tl--v`; `responsive` = горизонтальный ≥600, вертикальный ≤599 (рендерится один раз, переключение через CSS-классы с брейкпоинтом). Состояния `.is-done` / `.is-current` (кольцо-подсветка), `aria-current="step"` у текущего, даты — `.ig-tl__date`; у `todo` — `text-muted`. Для страницы заказа (task-33) используются пять шагов: «Спецификация согласована», «В производстве», «Упаковано», «Отгружено», «Получено».

### Accordion / Faq

```ts
interface AccordionItem { id: string; title: ReactNode; content: ReactNode }
<Accordion items={AccordionItem[]} type="single" | "multiple" defaultOpen?: string[] />   // 'use client'
interface FaqItem { question: string; answer: ReactNode }
<Faq items={FaqItem[]} />                                                                   // обёртка над Accordion
```
`.ig-acc` / `.ig-acc__item.is-open` / `.ig-acc__btn` (кнопка `aria-expanded`, `aria-controls`, `id`) / `.ig-acc__sign` (иконка `Plus`, поворот на 45° при открытии) / `.ig-acc__panel` (`role="region"`, `aria-labelledby`). Раскрытие плавное (`grid-template-rows: 0fr → 1fr`, 200 мс) без скачков высоты; закрытые панели `hidden`/`inert`, но **остаются в DOM** (содержимое видно поисковикам). Клавиатура: Enter/Space, стрелки ↑/↓ между заголовками, Home/End. JSON-LD FAQPage не выводить (делает task-15).

### Card, ThickCard, Placeholder

- `Card`: `<Card href? image? title sub? footer? arrow className>`; если есть `href` — корень `<Link class="ig-card">`, иначе `<div class="ig-card">`; верх — `image` (ReactNode, обычно `next/image` или `Placeholder`), `.ig-card__body` с `.ig-card__title` (20 px/600) и `.ig-card__sub`, `.ig-card__foot` со стрелкой `.ig-card__arrow` (`ArrowRight`). hover: подъём на 2 px и тень card-hover (CSS уже есть).
- `ThickCard` (шаблон из `Cards.dc.html`): 
  ```ts
  <ThickCard mm={10} href="/zakalennoe-steklo/10-mm/" priceLabel="от 1 400 ₽/м²" note="ориентировочная цена на 15.10.2026" specs={[{label:'Вес', value:'25 кг/м²'},{label:'Размеры', value:'до 3000 × 2000 мм'}]} />
  ```
  Разметка `.ig-card.ig-thick`: `.ig-thick__mm` («10» + `<small>мм</small>`), цена (`.ig-price-m`, `tabular-nums`), `.ig-thick__note`, `<dl class="ig-thick__specs">`. Для «Цена по расчёту» (15, 19 мм или просрочена дата) потребитель передаёт `priceLabel="Цена по расчёту"` и `note="пришлём в КП за 2–3 рабочих дня"`. Компонент не знает про цены (чистый презентационный).
- `Placeholder`: `.ig-ph` (серо-зелёный градиент с бликом); props `ratio?: '4/3' | '16/9' | string`, `label?: string` (по умолчанию «фото объекта»), `className`. `aria-hidden` (декоративный).

### CookieBanner + хранилище согласия

`src/lib/consent.ts`:

```ts
export type ConsentValue = 'all' | 'necessary';
export const CONSENT_STORAGE_KEY = 'inex-consent-v1';
export const CONSENT_COOKIE = 'inex_consent';
export const CONSENT_EVENT = 'inex:consent';
getConsent(): ConsentValue | null            // читает localStorage, при недоступности — cookie; на сервере → null
setConsent(value: ConsentValue): void        // пишет localStorage + cookie (path=/, max-age 1 год, SameSite=Lax, Secure на https) и диспатчит CustomEvent(CONSENT_EVENT, { detail: { value } })
clearConsent(): void
onConsentChange(cb: (value: ConsentValue | null) => void): () => void   // подписка на CONSENT_EVENT и на 'storage' (другие вкладки); возвращает отписку
```
Все обращения к `localStorage`/`document.cookie` — в `try/catch` (приватный режим, блокировка).

`src/lib/use-consent.ts`: `'use client'`; `useConsent(): ConsentValue | null | undefined` через `useSyncExternalStore` (серверный снимок и первый клиентский рендер → `undefined`, чтобы не было hydration mismatch; потом `null`/значение).

`CookieBanner` (`'use client'`, `.ig-cookie`): показывается, только когда `useConsent() === null` (после монтирования). Текст **дословно** (teksty/15-politika-pdn.md §3): «Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в [политике обработки персональных данных].» (ссылка на `/politika-konfidencialnosti/`). Кнопки: «Только необходимые» (`Button variant="secondary" size="s"`) → `setConsent('necessary')`; «Принять» (`variant="primary" size="s"`) → `setConsent('all')`. Позиция: `fixed`, внизу по центру, `max-width` ~ 960 px, отступ от краёв 16 px, `z-index` выше контента, ниже модалок; ≤599 px — колонка (текст сверху, кнопки в ряд на всю ширину), `bottom: calc(var(--ig-sticky-h, 0px) + 8px)` — чтобы не перекрывать закреплённую кнопку. `role="region"` с `aria-label="Уведомление о cookie"`, фокус не перехватывать. Событие `inex:consent` — единственная точка для подписчиков (Метрика — task-19).

### StickyCta

`'use client'`; закреплённая кнопка «Рассчитать стоимость» внизу экрана **только ≤599 px** (`.ig-sticky-cta` + `Button variant="primary" block` с иконкой `Calculator`, `href` на `/raschet-stoimosti/?src=<pathname>`; `usePathname()` для `src`, `encodeURIComponent`). Скрывается на `/raschet-stoimosti/` и на `/zakaz/*`. При монтировании измеряет собственную высоту и ставит `document.documentElement.style.setProperty('--ig-sticky-h', '<N>px')`, при размонтировании/скрытии убирает переменную. Не перекрывает подвал: в подвале уже заложен `padding-bottom` 104 px на телефоне (стили в task-14). Учитывать `env(safe-area-inset-bottom)` (уже в `.ig-sticky-cta`).

### Lightbox

```ts
interface LightboxImage { src: string; alt: string; caption?: string; width?: number; height?: number }
<Lightbox images={LightboxImage[]} open={boolean} index={number} onOpenChange={(open)=>void} onIndexChange={(i)=>void} />
```
Radix Dialog (`@radix-ui/react-dialog`) на весь экран, фон `bg-black/80`; изображение `next/image` (`fill`/`object-contain`, `sizes="100vw"`), подпись и счётчик «N из M»; кнопки закрыть (`X`), назад/вперёд (`ChevronLeft/Right`, отключены на краях или циклично — циклично); клавиатура ←/→/Esc, свайп на тач-экранах (порог 50 px), фокус возвращается на триггер; `DialogTitle` скрыт визуально (`sr-only`) — «Просмотр фото», `DialogDescription` — подпись. Предзагрузка соседних кадров.

### Drawer

`'use client'`, на `@radix-ui/react-dialog`:
```ts
<Drawer open onOpenChange side="right" | "left" | "bottom" title="Фильтры" description? footer? widthClassName?>
  {children}
</Drawer>
```
Анимация выезда 200 мс (`data-[state=open]`), оверлей `bg-black/50`, ширина по умолчанию `w-[420px] max-w-full` (≤599 — на весь экран), прокручиваемое тело, закреплённый футер (кнопки «Применить»/«Сбросить»), кнопка закрытия с `aria-label="Закрыть"`, `DialogTitle` обязателен (виден как заголовок панели). Используется для мобильного меню (task-14, `side="right"`/`"left"`) и фильтров объектов (task-30).

### Демо-страница

`/ui-kit/content/`: каждый компонент в нескольких состояниях (таблица на 375 и 1366, Compare с `topic` и без, Timeline в 3 состояниях, FAQ, ThickCard с ценой и «Цена по расчёту», Lightbox c 3 тестовыми картинками из `public`, Drawer, CookieBanner (кнопка «Сбросить согласие» вызывает `clearConsent()`), StickyCta.

### Environment Variables

Нет (демо использует `SITE_ENV`).

## Acceptance Criteria

- [ ] Все файлы созданы, экспорты и сигнатуры совпадают с описанием (на них опираются task-14, 15, 16, 19 и Wave 5).
- [ ] `DataTable` без JS переключается таблица → карточки на ≤599 px; `Steps`, `StatsTiles`, `Timeline`, `Compare` корректно перестраиваются на 1365 / 1100 / 599 (проверка вручную на 375, 1366, 1920).
- [ ] `Accordion`: клавиатурная навигация (Enter/Space/↑/↓/Home/End), `aria-expanded`/`aria-controls`, панели остаются в DOM.
- [ ] `Lightbox`: Esc, ←/→, свайп, счётчик «N из M», фокус возвращается; `Drawer`: фокус-ловушка Radix, закрытие по Esc/оверлею.
- [ ] `CookieBanner`: показывается только при `consent === null`; текст и подписи кнопок дословно; «Принять» → `localStorage['inex-consent-v1'] === 'all'` и событие `inex:consent`; «Только необходимые» → `'necessary'`; повторный визит баннер не показывает; нет hydration-ошибок в консоли; на ≤599 px не перекрывает `StickyCta`.
- [ ] `src/lib/consent.ts` покрыт unit-тестами (`pnpm test`): запись/чтение, fallback на cookie при недоступном `localStorage`, подписка/отписка, событие.
- [ ] Frosted glass используется только в `StatsTiles glass`; бейджей «Хит/Новинка», эмодзи, корзины нет.
- [ ] Визуальная сверка `/ui-kit/content/` с прототипами `Tables.dc.html`, `Cards.dc.html`, `Patterns.dc.html`, `Foundations.dc.html`, `UIKit.dc.html`, `Home.dc.html` (шаги, сравнение, статистика), `Order.dc.html` (таймлайн, лайтбокс) на 375 / 1366 / 1920.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят; `/ui-kit/content/` в production → 404.

## Notes

- Модель: премиум.
- Источники: `res/inex-glass-handoff/design-system/components.css`, `design-system/README.md` («Компоненты»), прототипы `Tables`, `Cards`, `Patterns`, `Home`, `Order`, `Objects`, `UIKit`; задания `zadaniya/01-dizajn-sistema.md`, `zadaniya/08-stranica-zakaza.md`.
- Открытый вопрос из `res/inex-glass-handoff/CLAUDE.md` №4 (одна кнопка «Понятно» или две) решён: две кнопки «Принять» / «Только необходимые» (ТЗ §6, `docs/inex/16-tz-razrabotka.md`).
- Подпись «21 год» и прочие тексты hero — не в этой задаче.
- (Ревью волны 2) **`cn()` и кастомные утилиты.** `src/lib/utils.ts` использует tailwind-merge без конфига: кастомные размеры текста из `@theme` (`text-lead-l`, `text-lead-m`, `text-lead`, `text-caption`, `text-hero-stat`, `text-small` и др.) он принимает за цвета и выкидывает соседний `text-<color>`. Эта задача владеет правкой `src/lib/utils.ts` в волне 3: `extendTailwindMerge` с группой `font-size` для всех кастомных размеров из `src/app/(site)/globals.css` (+ `px-gutter` в группе padding) и юнит-тест `cn("text-ink-2", "text-lead-l")` сохраняет оба класса. После этого обёртки task-05 (`section.tsx`, `page-hero.tsx`) можно не переписывать.
