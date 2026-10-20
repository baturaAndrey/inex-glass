# Task 19: Яндекс.Метрика и цели (загрузка только после согласия, reachGoal, трекинг кликов, UTM)

## Status

pending

## Wave

4

## Description

Аналитика сайта: Яндекс.Метрика (с Вебвизором) загружается **только** после того, как посетитель нажал «Принять» в cookie-баннере (`consent === 'all'`). Задача даёт безопасную обёртку `reachGoal` (no-op без согласия/счётчика/на сервере), глобальный делегированный трекинг кликов по `tel:` и `mailto:`, получение client ID для заявок и сохранение UTM/страницы входа для сквозной аналитики «заявка → КП → договор». Цели — по ТЗ §10.

## Dependencies

**Depends on:** task-13-ui-content-primitives.md
**Blocks:** task-20-quiz-core.md, task-21-forms-modals.md, task-25, task-31 (используют `reachGoal`, `getClientId`, `getAttribution`), task-33 (на `/zakaz/*` счётчик не получает URL с токеном)

**Context from dependencies:**
- **task-13** создал хранилище согласия: `src/lib/consent.ts` (`getConsent(): 'all' | 'necessary' | null`, `setConsent`, `onConsentChange(cb)`, константа события `CONSENT_EVENT = 'inex:consent'`) и хук `src/lib/use-consent.ts` (`useConsent(): ConsentValue | null | undefined`, `undefined` — до гидратации). `CookieBanner` с кнопками «Принять» / «Только необходимые» пишет согласие и диспатчит событие.
- Корневой layout `src/app/(site)/layout.tsx` (владелец — task-14) рендерит `<Metrika />` без пропсов в конце `<body>`: **контракт** — `export function Metrika()` (серверный async-компонент) из `@/components/analytics/metrika`. Идентификатор счётчика хранится в global `site-settings` (поле ID Метрики, task-06; точное имя — в `src/payload/globals/site-settings.ts` / `payload-types.ts`, ожидается `metrikaId`). Загрузчик `getSiteSettings()` из `@/lib/cms/globals` (task-15, та же волна) отдаёт этот global; если он ещё не доступен при вашей реализации, принимайте `counterId` пропсом `Metrika({ counterId? })` и считывайте global внутри через `getSiteSettings()` по контракту.
- `src/lib/env.ts`: `SITE_ENV` (`development | staging | production`). Метрика подключается **только при `SITE_ENV === 'production'`** (на staging/dev статистика не засоряется).
- Vitest настроен задачей 02 (`src/**/*.test.ts`); jsdom может быть не подключён — тестируйте чистые функции без DOM.

## Files to Create

В `src/components/analytics/`:
- `metrika.tsx` — серверный `Metrika` (читает ID из CMS, проверяет окружение) и рендер клиентских частей
- `metrika-client.tsx` — `'use client'`: загрузка счётчика после согласия, отправка hit при навигации
- `reach-goal.ts` — `GOALS`, тип `GoalName`, `reachGoal(name, params?)`, `isMetrikaReady()`
- `click-tracker.tsx` — `'use client'`: делегированный обработчик кликов
- `goal-for-href.ts` — чистая функция `goalForHref(href): GoalName | null`
- `client-id.ts` — `getClientId(): Promise<string | null>`
- `attribution.ts` — `captureAttribution()`, `getAttribution()`
- `attribution-capture.tsx` — `'use client'`: вызывает `captureAttribution()` при монтировании
- Тесты: `reach-goal.test.ts`, `goal-for-href.test.ts`, `attribution.test.ts`

## Files to Modify

Нет. (Layout уже подключает `<Metrika />`; если вдруг нет — сообщить координатору, правка принадлежит task-14.)

## Technical Details

### Цели (ТЗ §10, `docs/inex/16-tz-razrabotka.md`)

```ts
export const GOALS = [
  'quiz_start',                 // открыт квиз; параметры: { entry: <страница входа> }
  'quiz_step_1','quiz_step_2','quiz_step_3','quiz_step_4','quiz_step_5','quiz_step_6','quiz_step_7', // пройден шаг
  'quiz_submit',                // квиз отправлен; параметры: { type, flags }
  'file_upload',                // загружен файл чертежа
  'form_submit',                // отправлена любая другая форма; параметры: { form: <formKey> }
  'calc_weight', 'calc_holes',  // использованы калькуляторы
  'calc_to_quiz',               // переход из калькулятора в квиз
  'click_phone', 'click_email',
] as const;
export type GoalName = (typeof GOALS)[number];
```

### Загрузка счётчика (`metrika.tsx` + `metrika-client.tsx`)

- Серверный `Metrika` монтируется в `(site)/layout.tsx` (task-14) на **каждой** странице и **всегда** рендерит `<AttributionCapture />` и `<ClickTracker />`. Это единственное глобальное место захвата UTM и страницы входа; квиз и формы его не дублируют. Получить `siteSettings = await getSiteSettings()`; `counterId = Number(siteSettings?.metrikaId)`; если `SITE_ENV !== 'production'` или нет валидного ID → отрисовать только `<AttributionCapture />` и `<ClickTracker />` (они безвредны без счётчика) и **не** подключать скрипт. Иначе → `<MetrikaClient counterId={counterId} />` + те же два компонента.
- `MetrikaClient` (`'use client'`): `const consent = useConsent()`; когда `consent === 'all'` (в первый раз), через `next/script` (`strategy="afterInteractive"`, `id="ym-init"`) вставляет стандартный сниппет с источником `https://mc.yandex.ru/metrika/tag.js`:
  ```js
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
  ym(COUNTER_ID,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,defer:true});
  ```
  Опция `defer:true` — первый hit отправляется вручную (см. ниже), чтобы не дублировать просмотры в SPA-навигации. После инициализации выставить `window.__INEX_YM_ID__ = COUNTER_ID` (флаг «счётчик готов принимать цели») и сразу отправить `ym(COUNTER_ID,'hit', location.href)`.
- При `consent === 'necessary'` или `null` — **ничего не загружать и не создавать `ym`**; никаких сторонних запросов до согласия (нет `preconnect`/`dns-prefetch` на mc.yandex.ru, нет `<noscript>`-пикселя).
- Если посетитель сначала выбрал «Только необходимые», а потом (повторный визит) «Принять» — инициализация произойдёт по событию (хук `useConsent` реагирует на `inex:consent`).
- SPA-навигация: компонент `MetrikaPageview` (внутри `<Suspense fallback={null}>`, использует `usePathname` и `useSearchParams`) при каждом изменении пути/параметров после первого hit вызывает `ym(id,'hit', url, { title: document.title, referrer: <предыдущий url> })`, только если счётчик инициализирован.
- **Страница заказа `/zakaz/<токен>/` (task-33):** URL содержит секретный токен — он не должен попасть в Яндекс. `MetrikaClient` не инициализирует счётчик, если первая страница сессии начинается с `/zakaz/`. Если счётчик уже инициализирован (переход с другой страницы), на путях `/zakaz/*` он не отправляет `hit`. Опция `trackLinks` не должна передавать такие URL: для ссылок на `/zakaz/` ставить `ym-disable-tracklink` или маскировать их. Вебвизор на этих путях отключить: `webvisor` включается только при init вне `/zakaz/*`, а запись страницы останавливается через `ym(id,'params',…)`/перезагрузку — по документации Метрики выбрать надёжный способ, решение в отчёт. Чистая функция `isTrackablePath(pathname): boolean` (false для `/zakaz/` и `/admin`), покрыта тестом.
- Отзыв согласия технически не откатывает загруженный скрипт; при смене на `'necessary'` страница перезагружается пользователем — зафиксировать комментарием и не усложнять.

### `reachGoal` (`reach-goal.ts`)

```ts
export function reachGoal(name: GoalName, params?: Record<string, unknown>): void
```
No-op, если: выполняется на сервере (`typeof window === 'undefined'`), `getConsent() !== 'all'`, не задан `window.__INEX_YM_ID__`, нет `window.ym` или вызов бросает исключение (обернуть в try/catch). Иначе `window.ym(window.__INEX_YM_ID__, 'reachGoal', name, params)`. Допустимо вызывать до окончательной загрузки tag.js — сниппет заранее определяет очередь `ym`. Экспортировать `isMetrikaReady(): boolean`. Типы: `declare global { interface Window { ym?: (...args: unknown[]) => void; __INEX_YM_ID__?: number } }`.

### Делегированный трекинг кликов (`click-tracker.tsx`, `goal-for-href.ts`)

- `goalForHref(href: string | null | undefined): GoalName | null` — `tel:` (регистронезависимо, допускает пробелы в начале) → `'click_phone'`; `mailto:` → `'click_email'`; иначе `null`.
- `ClickTracker` (`'use client'`, возвращает `null`): в `useEffect` вешает один обработчик `document.addEventListener('click', handler, { capture: true })`; обработчик через `event.target.closest('a[href]')` находит ссылку, определяет цель по `goalForHref(a.getAttribute('href'))` и вызывает `reachGoal(goal, { href })` (для `tel:` — `{ place: <data-goal-place|'link'> }`, телефон не передавать в параметры целиком, чтобы не отправлять ПДн). Учитывает клики средней кнопкой и Ctrl/Cmd (они тоже считаются кликами по ссылке). Снимает обработчик при размонтировании. Не мешает навигации (не вызывает `preventDefault`).
- Дополнительно: атрибут `data-goal="<GoalName>"` на любом элементе — тот же обработчик вызывает `reachGoal(data-goal)` (удобно для кнопок «Скачать» и т. п.); допустимы только значения из `GOALS`.

### Client ID (`client-id.ts`)

`getClientId(): Promise<string | null>` — если `isMetrikaReady()` → `ym(id,'getClientID', cb)` с таймаутом 1500 мс (по истечении `null`); без согласия/счётчика сразу `null`. Используется формами и квизом при отправке заявки (поле `metrikaClientId`; может быть пустым).

### Атрибуция (UTM и страница входа) — `attribution.ts`

Необходима для сквозной аналитики (карточка заявки хранит UTM и страницу входа, ТЗ §6.1/§10). Не требует согласия на аналитику (технические данные запроса, храним только в `sessionStorage`).

```ts
export interface Attribution {
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  yclid?: string; gclid?: string;
  landing: string;       // путь первой страницы сессии (pathname + search без utm-параметров)
  referrer?: string;     // document.referrer первой страницы, если внешний
  capturedAt: string;    // ISO
}
captureAttribution(): void         // вызывается на каждой загрузке: если в sessionStorage['inex-attribution-v1'] ещё нет записи — сохранить; если в URL есть utm_* — обновить поля utm (последние метки выигрывают); try/catch на любой доступ к storage
getAttribution(): Attribution | null
```
Тест `attribution.test.ts`: разбор `?utm_source=yandex&utm_medium=cpc&utm_campaign=x&yclid=1` → объект; повторный вызов без utm не затирает; без storage (стаб, бросающий исключение) — не падает.
Квиз (task-20) и формы (task-21) не вызывают `captureAttribution()` сами. Они читают сохранённое через адаптер `getLeadAttribution()` (`src/lib/client/attribution.ts`, task-20): он берёт `getAttribution()` отсюда и `getClientId()` и собирает поля заявки `utm`, `entryPage`, `metrikaClientId`. Ключ хранилища `inex-attribution-v1` принадлежит этой задаче, второго хранилища UTM нет.

### Environment Variables

- Нет новых. Используются `SITE_ENV`; ID счётчика — из global `site-settings` (редактируется в админке).

## Acceptance Criteria

- [ ] До нажатия «Принять» (и при «Только необходимые») в Network нет запросов к `mc.yandex.ru` и нет `window.ym`; после «Принять» — скрипт загружается и отправляется hit (проверка в DevTools на сборке с `SITE_ENV=production` и тестовым ID счётчика).
- [ ] Повторный визит с сохранённым `consent=all` загружает счётчик сразу; с `necessary` — нет.
- [ ] `reachGoal` — безопасный no-op на сервере и без согласия/счётчика (unit-тесты с подменой `window`/`getConsent`), при готовом счётчике вызывает `ym(id,'reachGoal', name, params)` (тест со стабом).
- [ ] Клик по `tel:` → цель `click_phone`, по `mailto:` → `click_email` (делегирование работает для ссылок, добавленных после монтирования, в т. ч. в шапке, подвале, модальных окнах); `goalForHref` покрыта тестами (регистр, пробелы, чужие схемы).
- [ ] SPA-переходы отправляют `hit` (по одному на переход), первый hit не дублируется.
- [ ] `getClientId()` возвращает строку после инициализации и `null` без согласия или по таймауту.
- [ ] `captureAttribution()`/`getAttribution()` работают, не падают при недоступном `sessionStorage`; UTM из первой посадочной сохраняются между страницами сессии.
- [ ] На `SITE_ENV !== 'production'` скрипт Метрики не подключается (но `reachGoal`/трекер не падают).
- [ ] На `/zakaz/<токен>/` нет `hit` и инициализации счётчика с этим URL (проверка Network), `isTrackablePath` покрыта тестом.
- [ ] `<AttributionCapture/>` рендерится на всех страницах сайта при любом согласии (UTM лендинга сохраняются до открытия квиза/формы на другой странице).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят.

## Notes

- Модель: премиум (внимательная работа с согласием и ПДн).
- Источники: ТЗ `docs/inex/16-tz-razrabotka.md` §6 (баннер cookie, «Метрика загружается только после "Принять"») и §10 (список целей); `res/inex-glass-handoff/teksty/15-politika-pdn.md` §7; план «Аналитика, антиспам, поиск».
- Вебвизор записывает действия на странице; поля форм содержат ПДн — на элементах ввода контактов в формах рекомендуется атрибут `ym-disable-keys` (классы Метрики) — добавить это пожелание в отчёт для task-20/21 (не в этой задаче).
- Идентификатор счётчика пока пуст до заполнения Inex; компонент обязан корректно работать с пустым значением.
- (Ревью волны 3) `clearConsent()` из `src/lib/consent.ts` (task-13) шлёт событие `inex:consent` с `{ value: null }` — обработчик Метрики должен трактовать `null` как «согласия нет» (не грузить / не отправлять цели). Читать согласие только через `src/lib/consent.ts` / `useConsent()`.
