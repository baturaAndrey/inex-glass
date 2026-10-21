# Task 34: Роутинг квиза — модальное окно (intercepting route) и страница `/raschet-stoimosti/`

## Status

complete

## Wave

6

## Description

Квиз «Расчёт стоимости» — главная конверсия сайта. Компонент `<Quiz/>` (7 шагов, логика, отправка) уже создан задачей 20. Эта задача подключает его к маршрутизации Next.js: кнопки «Рассчитать стоимость» на любой странице открывают квиз **поверх текущей страницы** (модальное окно через parallel + intercepting routes), а прямой заход / открытие в новой вкладке / обновление страницы показывают **отдельную полноценную страницу** `/raschet-stoimosti/` (индексируемую, P0). Также задача разбирает параметры предзаполнения из URL и реализует возврат к черновику («Мой расчёт»).

## Dependencies

**Depends on:** task-20-quiz-core.md
**Blocks:** task-39-perf-images.md, task-40-content-audit.md, task-42-final-acceptance.md

**Context from dependencies:**
- task-20 создал `src/components/quiz/*`: корневой клиентский компонент `<Quiz prefill={QuizPrefill} entryPage={string} variant="page" | "modal" />`, 7 шагов, reducer, персистенция черновика в `localStorage` (ключ `inex-quiz-draft-v1`), оценку цены, отправку в `POST /api/forms/lead/`, цели Метрики (`quiz_start` с entry page, `quiz_step_1…7`, `quiz_submit`, `file_upload`). Тип `QuizPrefill` и zod-схемы лежат в `src/lib/domain/quiz-schema.ts` (создана задачей 11) — **прочитай их до начала работы**, допустимые значения `type`/`vid` берутся оттуда.
- task-15 создал `src/components/page/quiz-cta.tsx` — построитель ссылок вида `/raschet-stoimosti/?type=&thick=&vid=&src=`. Значения параметров, которые он генерирует, должен понимать парсер из этой задачи (прочитай файл и сверь словари).
- task-14 создал `src/app/(site)/layout.tsx`, который уже принимает слот `modal` (`{modal}` рендерится после `<main>`), `<StickyCta/>`, `<FormDialogProvider>`; кнопки «Рассчитать стоимость» в шапке — это `<Link href="/raschet-stoimosti/">` (soft navigation, не `<a>`), ссылка «Мой расчёт» ведёт на `/raschet-stoimosti/?resume=1`.
- task-15 создал `src/lib/seo/metadata.ts` (`buildMetadata`) и JSON-LD/breadcrumbs-хелперы; task-13 — `Drawer/Dialog`-примитивы (`src/components/ig/drawer.tsx`, Radix Dialog), `src/components/ig/breadcrumbs.tsx`.
- task-19 создал `reachGoal` (`src/components/analytics/reach-goal.ts`).

## Files to Create

- `src/app/(site)/raschet-stoimosti/page.tsx` — полная страница квиза (Server Component, `generateMetadata`, рендерит `<Quiz variant="page">`).
- `src/app/(site)/@modal/default.tsx` — `export default function Default() { return null }`.
- `src/app/(site)/@modal/[...catchAll]/page.tsx` — `return null` (чтобы слот не падал на 404 при жёсткой навигации на другие страницы).
- `src/app/(site)/@modal/(.)raschet-stoimosti/page.tsx` — перехваченный маршрут: рендерит `<QuizModal>` с `<Quiz variant="modal">`.
- `src/components/quiz/quiz-modal.tsx` — клиентская оболочка модального окна (Radix Dialog), закрытие через `router.back()`.
- `src/lib/quiz/prefill.ts` — `parseQuizSearchParams(searchParams)` → `{ prefill: QuizPrefill; entryPage: string; resume: boolean; weightCalc?: {...} }` + `src/lib/quiz/prefill.test.ts` (Vitest).
- `src/components/quiz/path-tracker.tsx` — запоминает предыдущий путь в `sessionStorage['inex:last-path']` для `entryPage`.
- `e2e/quiz-routing.spec.ts` — Playwright: оба режима (модалка и страница).

## Files to Modify

- `src/app/(site)/layout.tsx` — подключить слот `modal`, если ещё не подключён (`SiteLayout({ children, modal })`), и смонтировать `<Suspense><PathTracker/></Suspense>`. Остальную композицию не менять (владелец task-14).
- `src/components/quiz/quiz.tsx` — **только** минимальные правки layout-классов корня при `variant="modal"`, если закреплённый (sticky) футер кнопок «Назад / Далее» не работает внутри оболочки (см. ниже). Логику квиза не трогать (владелец task-20); о каждой правке сообщить в отчёте.

НЕ трогать: `payload.config.ts`, схемы Payload (заморожены), `src/lib/seo/metadata.ts`, `src/components/layout/*`.

## Technical Details

### Структура маршрутов (Next.js 16.4, App Router)

```
src/app/(site)/
  layout.tsx                         # принимает { children, modal }
  @modal/
    default.tsx                      # null
    [...catchAll]/page.tsx           # null
    (.)raschet-stoimosti/page.tsx    # перехват soft-навигации
  raschet-stoimosti/page.tsx         # полная страница (прямой заход / reload / новая вкладка)
```

- Слот `@modal` лежит на уровне `(site)`, поэтому `(.)raschet-stoimosti` перехватывает `/raschet-stoimosti/` при клиентской навигации с **любой** страницы группы `(site)`. Прямой заход, F5, открытие в новой вкладке (Ctrl+клик) и переход из поиска/сторонних сайтов отдают полную страницу — это штатное поведение intercepting routes.
- `searchParams` в Next 16 — `Promise`: `export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })`.
- При `trailingSlash: true` ссылки должны вести ровно на `/raschet-stoimosti/` (со слешем) — проверить, что перехват срабатывает именно для адреса со слешем и query-строкой.
- Модалка ставит `document.body` в scroll-lock (Radix Dialog делает сам), возврат фокуса на кнопку-триггер, `Esc` и клик по оверлею закрывают.
- Страница под модалкой не перерисовывается и не теряет скролл (так работает `router.back()` для intercepting route).

### `QuizModal` (`src/components/quiz/quiz-modal.tsx`, `'use client'`)

- Radix `Dialog.Root open onOpenChange={(o) => !o && router.back()}`; контент: `max-w-[880px]` (десктоп), высота `max-h-[calc(100dvh-48px)]`, внутри flex-колонка: шапка (заголовок «Рассчитаем стоимость вашего заказа», кнопка закрытия `X`, `aria-label="Закрыть"`), прокручиваемое тело, футер.
- **≤599 px (`max-sm:`)** — окно на весь экран: `inset-0`, `h-dvh`, без скруглений и тени; **футер с кнопками «Назад / Далее» закреплён внизу** (`sticky bottom-0`, фон `bg-surface`, верхняя граница `border-line`, безопасная зона `pb-[env(safe-area-inset-bottom)]`). На десктопе футер тоже внизу окна, тело скроллится независимо.
- Оверлей: `bg-black/50`, анимация `fade-in` 200 мс (токены motion 120/200/320 мс, без бесконечных анимаций).
- `aria-labelledby` на заголовок, `aria-describedby` на строку «7 вопросов · около 3 минут · КП в среднем за 2–3 рабочих дня» (дословно из `res/inex-glass-handoff/teksty/05-kviz.md`, секция «Шапка квиза»).
- Закрытие модалки НЕ очищает черновик: он остаётся в `localStorage` (ключ `inex-quiz-draft-v1`) и доступен по «Мой расчёт». После успешной отправки заявки `<Quiz>` сам очищает черновик (логика task-20); кнопка закрытия на экране успеха тоже `router.back()`.
- Если истории нет (например, на `/` открыли модалку, а потом пользователь вставил URL) — `router.back()` безопасен, т.к. модалка существует только после soft-навигации. На всякий случай: `if (window.history.length <= 1) router.push('/') else router.back()`.
- Футер/кнопки рендерит `<Quiz variant="modal">`; оболочка отвечает только за контейнер, высоту и скролл. Прочитай `src/components/quiz/quiz.tsx`: если для `variant="modal"` футер не `sticky`, внеси минимальную правку (классы корня: `flex min-h-0 flex-1 flex-col`, тело `overflow-y-auto`, футер `sticky bottom-0`) и укажи это в отчёте.
- Страница-родитель в фоне не должна показывать собственный `StickyCta` поверх модалки (z-index модалки выше sticky-кнопки; проверить в 375 px).

### Полная страница `/raschet-stoimosti/`

- Контейнер по DESIGN.md: `container`-обёртка `px-(--ig-gutter)`, секция `py-12 max-sm:py-8` на фоне `--ig-bg`; ширина содержимого квиза до `max-w-[880px]` по центру.
- Крошки: «Главная → Расчёт стоимости» (`<Breadcrumbs>` из task-13, BreadcrumbList JSON-LD из task-15).
- H1 — «Рассчитаем стоимость вашего заказа» (дословно из 17-meta). Под H1 строка «7 вопросов · около 3 минут · КП в среднем за 2–3 рабочих дня». Один H1 на странице. Внутри `<Quiz variant="page">` тот же заголовок второй раз не выводить (проверь, что в режиме page компонент не рисует свой `h1`; при необходимости передай пропс/используй `h2`).
- На странице нет кнопки «Рассчитать стоимость» в первом экране шапки как отдельного действия — шапка её всё равно содержит (ссылка на эту же страницу); это допустимо. Sticky-CTA на мобильной версии на этой странице скрыть (иначе кнопка ведёт «на себя»): проверь, поддерживает ли `StickyCta` скрытие по pathname; если нет — сообщить в отчёте (правка в `src/components/ig/sticky-cta.tsx` минимальная: `usePathname()` и `return null` для `/raschet-stoimosti/`).
- Метаданные через `buildMetadata` (task-15) или напрямую `Metadata`:
  - title: `Расчёт стоимости закалённого стекла по чертежу | Inex Glass`
  - description: `Ответьте на 7 вопросов и прикрепите чертёж — пришлём КП с ценой, сроком и доставкой в среднем за 2–3 рабочих дня.`
  - (источник: `docs/inex/17-meta.md`, таблица «Сервис «Как заказать»», строка `/raschet-stoimosti/`; дублируется в `teksty/05-kviz.md`).
  - `alternates.canonical = '/raschet-stoimosti/'` **всегда без query-параметров** (страница с `?type=…` — тот же документ). Robots: `index, follow` (P0 index по ТЗ §3.1), на staging — noindex (логика уже в `buildMetadata`).
  - Open Graph — стандартный из `buildMetadata`.
- Если `generateMetadata` страницы не может зависеть от searchParams (иначе страница становится динамической) — не использовать их в метаданных. Сама страница читает `searchParams`, поэтому она динамическая (это нормально для квиза; кэширование не требуется).
- Сторонние скрипты и Метрика грузятся по общим правилам task-19 (после согласия).

### Парсер предзаполнения `src/lib/quiz/prefill.ts`

Функция чистая, без React, покрыта Vitest. Параметры URL:

| Параметр | Значение | Правило |
|---|---|---|
| `type` | id типа изделия из `QUIZ_TYPES` (`quiz-schema.ts`): `tempered`, `triplex`, `partitions`, `railings`, `shower`, `canopies`, `facade`, `shopfronts`, `verandas`, `mirrors`, `other` | если нет в словаре — игнорировать. Это тот же словарь, что у `buildQuizHref` (task-15) и select-полей схемы `quizPrefill.type` — без маппинга |
| `thick` | 4, 5, 6, 8, 10, 12, 15, 19 | целое из списка, иначе игнор. При `type=triplex` параметр `thick` игнорируется — используются `t1`, `t2`, `film` |
| `vid` | id вида стекла из `QUIZ_KINDS`: `clear`, `low-iron`, `matte`, `tinted`, `painted`, `ribbed`, `bent` | → `QuizPrefill.kind` (чипы шага 2 «Прозрачное», «Осветлённое», «Матовое», «Тонированное», «Крашеное по RAL», «Рифлёное», «Гнутое»); неизвестное — игнор |
| `src` | путь страницы входа | валидировать: начинается с `/`, не `//`, не содержит `:` и `\`, длина ≤ 200, query/hash срезать. Если невалиден — считается отсутствующим (см. ниже). Используется для `quiz_start` и поля `entryPage` в заявке |
| `w`, `h` | размеры стекла, мм | число, принимается запятая; 0 < значение ≤ 100000, иначе игнор; подставляются в шаг 3 (макс. размер W × H) |
| `q` | количество, шт | целое ≥ 1 (округлить `Math.round`), ≤ 100000 |
| `t1`, `t2` | толщины двух стёкол триплекса, мм | из списка толщин |
| `film` | плёнка 0.38 / 0.76 / 1.14 / 1.52 | допускать запятую («0,38»); иначе игнор |
| `resume` | `1` | флаг «восстановить черновик» |

- Параметры могут прийти массивом (`?type=a&type=b`) — брать первый.
- Приоритет источников: **сохранённый черновик** > параметры URL, если `resume=1`; без `resume` параметры URL перекрывают только те поля, которые пришли (остальные — из черновика, если он есть). Реализация приоритета — в клиентском `QuizModal`/`Quiz`: если `<Quiz>` уже принимает `resume`, передать; если нет — вызвать публичную функцию загрузки черновика из `src/components/quiz/persistence.ts` (прочитай API task-20). Если для этого нужно изменить публичные пропсы `<Quiz>`, сделай минимальную правку и укажи в отчёте.
- Результат содержит `entryPage`: это `src`, если он валиден. Если `src` нет (например, кнопка шапки), клиентский `QuizModal` берёт путь предыдущей страницы из `sessionStorage['inex:last-path']`; его обновляет крошечный клиентский компонент `src/components/quiz/path-tracker.tsx` (`usePathname()` + `useEffect`, пропускает путь `/raschet-stoimosti/`), смонтированный в `src/app/(site)/layout.tsx` внутри `<Suspense>` (единственная разрешённая правка layout кроме слота `modal`). Если и этого нет — `entryPage = '/'`. Страничный режим без `src`: `document.referrer` (только same-origin, путь без query), иначе `/raschet-stoimosti/`.

### «Мой расчёт»

- `/raschet-stoimosti/?resume=1`: если в `localStorage` есть валидный черновик — открыть на том шаге, где пользователь остановился, с сохранёнными ответами и подписью «Продолжаем с шага N из 7» (текст в teksty/05 — найти секцию про черновик; если нет — нейтральная строка «Продолжаем ваш расчёт»). Если черновика нет — открыть пустой квиз (без ошибки).
- Ссылка «Мой расчёт» в шапке (task-14) — `Link` на этот адрес → открывается модалкой.
- Версия ключа черновика `v1` не менять.

### e2e (`e2e/quiz-routing.spec.ts`, Playwright, проекты 375/1366/1920)

1. Модалка: открыть `/zakalennoe-steklo/` → клик по «Рассчитать стоимость» в шапке → URL стал `/raschet-stoimosti/`, виден `[role=dialog]` с заголовком, фон не перезагрузился (на странице под модалкой сохранилась позиция скролла) → `Esc` → URL вернулся, диалог закрыт.
2. Страница: `page.goto('/raschet-stoimosti/')` → нет `[role=dialog]`, один `h1`, виден квиз, `<link rel="canonical" href="…/raschet-stoimosti/">`, нет `noindex`.
3. Перезагрузка (`page.reload()`) на открытой модалке → показывается полная страница.
4. Предзаполнение: `/raschet-stoimosti/?type=tempered&thick=10&src=/zakalennoe-steklo/10-mm/` → на шаге 1 выбран «Закалённое стекло», на шаге 2 — толщина 10; canonical без query.
5. Невалидные параметры (`thick=7`, `src=//evil.com`) игнорируются; `src` откатывается к безопасному значению.
6. Черновик: пройти до шага 3, закрыть модалку, открыть `/raschet-stoimosti/?resume=1` → продолжение с сохранёнными ответами.
7. 375 px: модалка на весь экран, футер «Назад / Далее» виден без прокрутки (`toBeInViewport`).
8. Скриншоты 375/1366/1920 (модалка + страница) для визуальной сверки с прототипами `res/inex-glass-handoff/prototypes/Kviz.dc.html` и `Quiz.dc.html` (демо-панели прототипов НЕ переносить).

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest, в т.ч. `prefill.test.ts`), `pnpm build` проходят без ошибок.
- [ ] Клик «Рассчитать стоимость» (шапка, sticky CTA, `quiz-cta`) на любой странице `(site)` открывает модалку без перезагрузки; закрытие возвращает на исходную страницу и позицию скролла.
- [ ] Прямой заход, reload, Ctrl+клик на `/raschet-stoimosti/` отдают полную страницу (HTTP 200, один H1, крошки, title/description дословно из 17-meta, canonical без query, индексируется).
- [ ] На ≤599 px модалка во весь экран, кнопки «Назад / Далее» закреплены внизу и не перекрываются home-indicator; на 1366/1920 — центрированное окно ≤ 880 px.
- [ ] Фокус-трап, `Esc`, возврат фокуса, `aria-labelledby/describedby`, скролл-лок работают (проверено e2e/axe-проверкой вручную).
- [ ] Параметры `type`, `thick`, `vid`, `src`, `w`, `h`, `q`, `t1`, `t2`, `film`, `resume` разбираются по таблице; невалидные игнорируются; unit-тесты покрывают минимум 15 кейсов (запятая в числе, массивы, «//» в src, неизвестный type, 15/19 мм, film с запятой).
- [ ] «Мой расчёт» (`?resume=1`) восстанавливает черновик; без черновика открывается пустой квиз без ошибок в консоли.
- [ ] Цели Метрики `quiz_start` получают корректную страницу входа (`src` или предыдущий путь) и в модальном, и в страничном режиме.
- [ ] `e2e/quiz-routing.spec.ts` проходит на проектах 375/1366/1920; визуальная сверка с прототипом выполнена.
- [ ] Схема Payload не менялась; файлы вне списка не затронуты.

## Notes

- Сложная задача по маршрутизации: используй премиум-модель. Перед кодом свериться с актуальными доками Next 16.4 (Parallel Routes → Intercepting Routes, `default.tsx`) через context7/Exa — в особенности поведение `(.)`‑перехвата с `trailingSlash: true` и со слотом на уровне route group.
- Типичный сбой: без `@modal/default.tsx` и `[...catchAll]` при жёсткой навигации на другие страницы получите 404 от слота. Оба файла обязательны.
- Если `trailingSlash` мешает перехвату (перехватывается только `/raschet-stoimosti` без слеша) — зафиксировать в отчёте и решить через `href` с точным слешем; не отключать `trailingSlash`.
- Тексты шагов и ошибок — в task-20, здесь их не дублируем.
- (Ревью волны 4) `src/components/ig/sticky-cta.tsx:59` собирает ссылку квиза с сырым путём — перевести на `quizHref()`/`quizSrc()` из `src/components/layout/calc-link.tsx` (маскирует `/zakaz/<токен>/` → `/zakaz/`). Правка разрешена этой задаче.
