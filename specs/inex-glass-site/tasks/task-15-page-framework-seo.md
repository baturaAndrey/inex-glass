# Task 15: Каркас страниц и SEO (загрузчики CMS, метаданные, JSON-LD, крошки, catch-all, 404, error, shell, формы-заглушки)

## Status

pending

## Wave

4

## Description

Инфраструктурный слой, на котором строятся все страницы: кэшируемые загрузчики данных Payload (Local API + `unstable_cache` с тегами), сборка `generateMetadata` из SEO-группы документа и меток CMS, JSON-LD-хелперы, хлебные крошки по URL, универсальный резолвер `pages` (catch-all `[...slug]`), страницы 404 и ошибки, оболочка страницы (`PageShell`: крошки + контент + автоматический блок условий + CTA квиза) и провайдер модальных форм с реестром-заглушкой. Контракты этой задачи используют header/footer (task-14), блоки (task-16) и все шаблоны Wave 5.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-13-ui-content-primitives.md
**Blocks:** task-14 (контракт загрузчиков и форм), task-16, 20, 21 и все страницы Wave 5, task-35, 36

**Context from dependencies:**
- **task-10**: схема заморожена; `src/payload-types.ts` содержит типы коллекций/globals; `payload.config.ts` собран; реестры подключены. В `pages` есть: `template` (select `home|hub|service|segment|company|contacts|legal|listing|tool|generic`), родитель/путь (полный путь страницы), `slug` (kebab-case), `layout` (блоки), SEO-группа (H1, title, description, noindex, canonical), `quizPrefill`, `breadcrumbLabel`. Точные имена полей — в `src/payload/collections/content/pages.ts` и `src/payload/fields/{seo,quiz-prefill}.ts` (читать, **не менять**). Коллекция `redirects` (`from`, `to`, `code` 301/308).
- **task-11**: чистая доменная библиотека `@/lib/domain` (`priceState`, `resolvePrice`, `PricesInput`, `PromoInput`, `PlaceholderContext`, `replacePlaceholders`, `formatDateRu`, `DEFAULT_TECH_LIMITS`, `QUIZ_TYPES` и др.).
- **task-13**: `Breadcrumbs`, `Terms`, `Faq`, `Button`-совместимые компоненты, `StickyCta`; `src/lib/consent.ts`.
- **Контракты в рамках Wave 4** (создаёт другая задача; импортируйте по этим именам): task-14 — `SiteHeader`, `SiteFooter` в `@/components/layout/{site-header,site-footer}` (без пропсов); task-16 — `RenderBlocks` в `@/components/blocks/render-blocks` с сигнатурой `RenderBlocks({ blocks, ctx? }: { blocks: Page['layout']; ctx?: PlaceholderContext })`; task-19 — `reachGoal` в `@/components/analytics/reach-goal`.
- Правила проекта: `trailingSlash: true`; `cacheComponents` выключен; данные — через Local API в `unstable_cache` с тегами `global:<slug>`, `collection:<slug>`, `doc:<slug>:<id>`; ревалидация тегов — в хуках task-06/07 (`revalidateTag(tag, { expire: 0 })` для prices/promo/contacts, `revalidateTag(tag, 'max')` для остального). Контентные страницы — `generateStaticParams` → `[]` (сборка без БД), ISR по запросу.

## Files to Create

CMS-слой:
- `src/lib/cms/payload.ts` — `getPayloadClient()`
- `src/lib/cms/cache.ts` — `cached()` (обёртка над `unstable_cache`) и защита сборки без БД
- `src/lib/cms/globals.ts` — загрузчики globals и адаптеры в доменные типы
- `src/lib/cms/queries.ts` — запросы к коллекциям

SEO:
- `src/lib/seo/metadata.ts` — `buildMetadata`
- `src/lib/seo/jsonld.tsx` — `JsonLd` и билдеры
- `src/lib/seo/breadcrumbs.ts` — `buildBreadcrumbs`
- `src/lib/seo/metadata.test.ts`, `src/lib/seo/breadcrumbs.test.ts` — vitest

Роутинг и страницы:
- `src/app/(site)/[...slug]/page.tsx` — резолвер документов `pages` и редиректов (единственный потребитель коллекции `redirects` из task-08)
- `src/app/global-not-found.tsx` — глобальная 404
- `src/app/(site)/not-found.tsx` — 404 внутри сайта
- `src/app/(site)/error.tsx` — страница ошибки (client)
- `src/components/page/not-found-content.tsx` — общее содержимое 404

Компоненты страницы и формы:
- `src/components/page/page-shell.tsx`
- `src/components/page/quiz-cta.tsx`
- `src/components/page/quiz-cta.test.ts` — vitest для `buildQuizHref`
- `src/components/forms/form-dialog-provider.tsx` — `'use client'`
- `src/components/forms/form-trigger.tsx` — `'use client'`
- `src/components/forms/registry.tsx` — реестр formKey → компонент (заглушки; полноценные формы подставит task-21)

## Files to Modify

- `next.config.ts` — **только** если для Next 16.4 нужен флаг `experimental.globalNotFound: true` (сверить с документацией Next 16.4 через context7 / Exa). Больше ничего в файле не менять.

## Technical Details

### 1. `src/lib/cms/payload.ts` и `cache.ts`

```ts
import { getPayload } from 'payload';
import config from '@payload-config';
export const getPayloadClient = () => getPayload({ config });   // singleton внутри Payload
```

`cached(fn, keyParts: string[], opts: { tags: string[]; revalidate?: number | false })` — тонкая обёртка над `unstable_cache`. Загрузчики вызывают Local API с `overrideAccess: true` (публичное чтение уже обеспечено тем, что выбираются только опубликованные документы), `depth` указывать явно.

**Сборка без БД.** `next build` в Docker выполняется без Postgres. Прегенерируемые страницы, которые обращаются к CMS, упадут. Решение этой задачи: в `cached()` перед обращением к данным вызывать `assertDbAvailableOrBailOut()`: если `process.env.NEXT_PHASE === 'phase-production-build'`, вызвать `await connection()` из `next/server` (маршрут исключается из статической предгенерации и отрисовывается по запросу). Для динамических сегментов (`[slug]`, `[...slug]`) дополнительно `generateStaticParams` возвращает `[]` и `dynamicParams` остаётся `true` → ISR по запросу. Проверьте поведение на Next 16.4 (`next build` без доступной БД не должен падать, страницы работают после старта); если `connection()` внутри кэш-обёртки не подходит, используйте эквивалентный вариант и **задокументируйте решение в комментарии к `cache.ts` и в отчёте** (это общее правило сборки для всех страниц Wave 5 — другие задачи копируют паттерн: «фиксированные URL — загрузчики из `@/lib/cms/*`; динамические — `generateStaticParams → []` + `export const revalidate = 3600`, где цена зависит от даты»).

### 2. `src/lib/cms/globals.ts`

Кэшированные загрузчики (`tags: ['global:<slug>']`, `revalidate: false` — сбрасываются хуками):

```ts
getPrices(), getPromo(), getConditions(), getContacts(), getRequisites(),
getTechParams(), getSiteSettings(), getNavigation(), getSnippets()
```
Возвращают объекты типов из `@/payload-types` (или `null`, если global пуст). Адаптеры в доменные типы:

```ts
getPricesInput(): Promise<PricesInput>         // global prices → { items: [{thickness, price|null}…], priceDate, staleAfterDays }
getPromoInput(): Promise<PromoInput | null>
getTechLimits(): Promise<TechLimits>           // global tech-params → TechLimits; при пустом global — DEFAULT_TECH_LIMITS
getHolidays(): Promise<string[]>               // site-settings.holidays → ISO-даты
getPlaceholderContext(opts?: { thickness?: number; now?: Date }): Promise<PlaceholderContext>
// собирает prices, promo, conditions (строка: «Заказы от 50 м² · срок от 10 рабочих дней с даты договора · КП в среднем за 2–3 рабочих дня» из global conditions), contacts (строка), requisites (строка), phone (основной телефон), thickness, now
```
Названия полей globals брать из `src/payload/globals/*.ts` и `payload-types.ts`. `getPromo`/`getPrices`/`getContacts` инвалидируются хуками «сразу» (`expire: 0`) — загрузчики не должны ставить собственный `revalidate`.

### 3. `src/lib/cms/queries.ts`

```ts
getPageByPath(path: string): Promise<Page | null>              // по полному пути '/o-kompanii/'; только опубликованные; tags: ['collection:pages', `doc:pages:${id}`]
getDocBySlug<C extends CollectionSlug>(collection: C, slug: string, opts?: { depth?: number }): Promise<TypeWithID | null>
listPublished<C>(collection: C, opts: { limit?: number; page?: number; sort?: string; where?: Where; depth?: number }): Promise<PaginatedDocs>
getRedirect(path: string): Promise<{ to: string; code: 301 | 308 } | null>   // из коллекции redirects (active), tags: ['collection:redirects']  // path сравнивать в нормализованном виде как `redirects.from` (task-08): percent-decode, нижний регистр, слеш на конце, без origin/query
redirectOrNotFound(path: string): Promise<never>                // getRedirect → permanentRedirect(to), иначе notFound()
getThicknessByN(n: number), getThicknessGroups()                // для task-23
```
Правила: только `_status: published` (где включены drafts), тег коллекции + тег документа; `depth` явный; результат нормализуется (никаких приватных полей).

### 4. `src/lib/seo/metadata.ts`

```ts
interface SeoFields { h1?: string | null; title?: string | null; description?: string | null; noindex?: boolean | null; canonical?: string | null }
interface BuildMetadataInput {
  seo: SeoFields | null | undefined;
  path: string;                       // '/zakalennoe-steklo/10-mm/'
  fallbackTitle: string; fallbackDescription?: string;
  placeholders?: PlaceholderContext;  // метки {…} подставляются в title/description/h1
  image?: { url: string; alt?: string } | null;
  type?: 'website' | 'article';
  pagination?: { page: number };      // страницы 2+: «— страница N»
  forceNoindex?: boolean;             // служебные, фильтры, поиск
  canonicalOverride?: string;         // /obekty/ для фильтров
}
buildMetadata(input): Promise<Metadata>
```
Правила:
- `title: { absolute: <title> }` (бренд «| Inex Glass» уже в строках `docs/inex/17-meta.md`); если `seo.title` пусто — `fallbackTitle`. Метки подставляются через `replacePlaceholders`.
- пагинация: перед « | Inex Glass» вставить « — страница N» (для N ≥ 2); canonical — сама страница (с `/page/N/`), `robots: index, follow`.
- `alternates.canonical`: абсолютный URL `${SITE_URL}${path}` (слеш в конце обязателен), приоритет: `canonicalOverride` → `seo.canonical` → сам path.
- `robots`: `noindex, follow` если `seo.noindex` или `forceNoindex`; иначе `index, follow`. **Если `SITE_ENV === 'staging'` (или не `production`/не задан в dev)** — `noindex, nofollow` для всех страниц.
- `openGraph`: `type`, `locale: 'ru_RU'`, `siteName: 'Inex Glass'`, `url`, `title`, `description`, `images` (если есть; иначе общий `/og-default.jpg` — положить заглушку в `public/og-default.jpg` 1200×630 нейтрального вида); `twitter: { card: 'summary_large_image' }`.
- В `verification` ничего не добавлять (задача 36).
- `SITE_URL` брать из `@/lib/env`.

Тесты `metadata.test.ts` (vitest): staging → `noindex, nofollow`; пагинация вставляет «— страница 2» перед « | Inex Glass»; canonical со слешем; noindex-флаг; метки подставляются (`{цена}` в title для 10 мм → «1 400»).

### 5. `src/lib/seo/jsonld.tsx`

`<JsonLd data={object | object[]} />` — серверный компонент, `<script type="application/ld+json">` с экранированием `<` → `<`. Билдеры (чистые функции, возвращают объекты):

| Функция | Содержимое |
|---|---|
| `organizationLd(contacts)` | `Organization`: name «Inex Glass», url, logo (`/brand/inex-glass-logo-dark.svg` абсолютным URL), `sameAs` при наличии, `contactPoint` (телефон, `areaServed: RU`, `availableLanguage: ru`) |
| `localBusinessLd(location)` | `LocalBusiness` для **офисов Челябинска и Екатеринбурга** (не для склада): адрес (`PostalAddress`: streetAddress, addressLocality, addressCountry RU), `telephone`, `email`, `openingHoursSpecification` (пн–пт 09:00–18:00), `parentOrganization` |
| `breadcrumbListLd(items)` | `BreadcrumbList` с `ListItem` (position с 1, абсолютные `item` URL; последний без `item` допустим) — **на всех страницах кроме главной** |
| `productLd({ name, url, description, image, lowPrice, priceDate })` | `Product` + `AggregateOffer { lowPrice, priceCurrency: 'RUB', offerCount: 1 }`; вызывать **только если `priceState === 'price'`**, иначе не выводить Offer (и не выводить Product с ценой) |
| `faqLd(items)` | `FAQPage` (`Question` / `acceptedAnswer.text` — plain text, без HTML) |
| `articleLd({ headline, url, datePublished, dateModified, author, image })` | `Article` |

Организация + LocalBusiness выводятся на главной, `/o-kompanii/`, `/kontakty/` (компонент `<OrgJsonLd />`). Тесты не обязательны, но функции должны быть чистыми и типизированными.

### 6. `src/lib/seo/breadcrumbs.ts`

```ts
interface Crumb { label: string; href?: string }
buildBreadcrumbs(path: string, opts?: { lastLabel?: string; labels?: Record<string, string> }): Crumb[]
```
Правила: первая крошка «Главная» (`/`); для главной страницы крошек нет (функция возвращает `[]` для `/`). Далее по сегментам пути (один родитель у каждой страницы). Последняя крошка — без `href`, подпись из `opts.lastLabel` (поле `breadcrumbLabel`/название документа), иначе из таблицы. Сегменты вида `page/N` (пагинация) в крошки не попадают. Сегмент `\d+-mm` → «N мм». Таблица подписей `SEGMENT_LABELS` (обязательно):

| Сегмент | Подпись | Есть страница |
|---|---|---|
| `zakalennoe-steklo` | Закалённое стекло | да |
| `obrabotka-stekla` | Обработка стекла | да |
| `steklyannye-konstrukcii` | Стеклянные конструкции | да |
| `osteklenie` | Остекление | да |
| `zerkala` | Зеркала | да |
| `kak-zakazat` | Как заказать | да |
| `klientam` | Для кого | да |
| `o-kompanii` | О компании | да |
| `obekty` | Объекты | да |
| `blog` | Блог | да |
| `instrumenty` | Инструменты | **нет** (крошка без ссылки) |
| корневые URL (`tripleks`, `furnitura`, `steklyannye-peregorodki`, `dushevye-peregorodki`, `steklyannye-ograzhdeniya`, `steklyannye-kozyrki`, `torgovye-vitriny`, `proektirovanie`, `kontakty`, `raschet-stoimosti`) | соответствующее короткое название (Триплекс, Зажимной профиль и спайдеры, Стеклянные перегородки, Душевые перегородки, Ограждения и перила, Стеклянные козырьки, Торговые витрины, Проектирование, Контакты, Расчёт стоимости) | да |

Для всех прочих листьев (виды стекла, услуги обработки, статьи, объекты…) подпись листа передаётся через `lastLabel`. Тест `breadcrumbs.test.ts`: `/`, `/tripleks/`, `/zakalennoe-steklo/10-mm/` (Главная › Закалённое стекло › 10 мм), `/instrumenty/kalkulyator-vesa-stekla/` (Главная › Инструменты [без ссылки] › lastLabel), `/obekty/page/3/` (без «page»).

### 7. Catch-all `src/app/(site)/[...slug]/page.tsx`

Резолвит **только** `pages`. Алгоритм:
1. `path = '/' + slug.join('/') + '/'` (нижний регистр гарантирует proxy).
2. `getPageByPath(path)`; если найден: `<PageShell …><RenderBlocks blocks={page.layout} ctx={…} /></PageShell>`; `generateMetadata` → `buildMetadata` (fallback title = `page.title`/`seo.h1`).
3. Не найден: `getRedirect(path)` (коллекция `redirects` task-08, только `active: true`, кэш с тегом `collection:redirects` — сбрасывается хуком `revalidateCollection('redirects')`) → `permanentRedirect(to)` (HTTP 308 для любого `code`; в комментарии указать, что 308 — постоянный редирект для поисковиков, см. requirements); иначе `notFound()`. Экспортировать из `queries.ts` хелпер `redirectOrNotFound(path): Promise<never>` (redirect → иначе `notFound()`), чтобы типизированные маршруты Wave 5 (`[slug]`) могли вызывать его вместо голого `notFound()`.
4. `export async function generateStaticParams() { return []; }`, `export const dynamicParams = true`, `export const revalidate = 3600`.
5. Страницы с `template === 'legal'` и документы с `seo.noindex` получают `noindex, follow` через `buildMetadata`.
Типизированные коллекции с корневыми URL (конструкции, виды стекла, объекты и т. д.) имеют собственные папки маршрутов в задачах Wave 5 и каталогу `pages` не принадлежат. Канонический резолвер «документ → путь» — `docUrl()` из `src/lib/seo/doc-url.ts` (создаёт task-16 той же волны); здесь его не дублировать.

### 8. 404 и ошибка

- `src/app/global-not-found.tsx`: Next.js 16 — глобальная 404 для маршрутов, не совпавших ни с одним корневым layout (в проекте два корневых layout: `(site)` и `(payload)`). Файл рендерит собственные `<html lang="ru">` и `<body>` с подключением шрифта и `globals.css` из `(site)`, оборачивает в `FormDialogProvider`, выводит `SiteHeader`, `NotFoundContent`, `SiteFooter`. Проверить по документации Next 16.4, нужен ли `experimental.globalNotFound` (если да — добавить в `next.config.ts`, это единственное разрешённое изменение).
- `src/app/(site)/not-found.tsx`: `<NotFoundContent />` (внутри layout сайта).
- Для неизвестных URL внутри сайта `[...slug]` вызывает `notFound()` — оба случая должны давать **HTTP 404**.
- `NotFoundContent`: заголовок «Страница не найдена» (H1), пояснение «Возможно, адрес изменился или страница удалена. Воспользуйтесь поиском или перейдите в нужный раздел.», форма поиска (`<form action="/poisk/" method="get">`, `Input name="q"`, кнопка «Найти»), ссылки на 9 разделов (Закалённое стекло, Триплекс, Обработка стекла, Стеклянные перегородки, Ограждения, Козырьки, Остекление зданий, Стекло для мебели, Зеркала — URL как в строке разделов шапки: `/zakalennoe-steklo/`, `/tripleks/`, `/obrabotka-stekla/`, `/steklyannye-peregorodki/`, `/steklyannye-ograzhdeniya/`, `/steklyannye-kozyrki/`, `/osteklenie/`, `/zakalennoe-steklo/dlya-mebeli/`, `/zerkala/`) и кнопка «Рассчитать стоимость». Вёрстка по DESIGN-правилам: `container`, `max-w-md mx-auto text-center`, `py-16`, `noindex`.
- `error.tsx` (`'use client'`, props `error`, `reset`): «Что-то пошло не так», кнопка «Попробовать ещё раз» (`reset()`), ссылка на главную, телефон `tel:` из `getContacts` — клиент не может вызвать серверный загрузчик, поэтому телефон передавайте константой из `nav-defaults`‑подобного места **или** покажите без номера. Логировать `error.digest`.

### 9. `PageShell` и `QuizCta`

```tsx
<PageShell path="/zakalennoe-steklo/" breadcrumbLabel? breadcrumbs? hideBreadcrumbs? showConditions={true} quiz={{ type?, thick?, vid? } | false} lastLabel?>
  {children}
</PageShell>
```
- Рендерит `Breadcrumbs` (task-13; данные `buildBreadcrumbs`), JSON-LD `BreadcrumbList` (кроме главной), затем `children`, затем (если `showConditions`) секцию «Условия» с `Terms` из global `conditions` (пункты: «Заказы от 50 м²», «Срок от 10 рабочих дней с даты договора, триплекс — от 14», «КП в среднем за 2–3 рабочих дня», «Срочного изготовления нет», «Монтаж не выполняем», «Цена в договоре фиксируется» — **значения берутся из global**, а не хардкодятся), затем (если `quiz !== false`) секцию с `QuizCta`.
- Страница-потребитель может отключить блоки (`showConditions={false}`), например квиз и страница заказа.

```ts
buildQuizHref(p: { type?: QuizTypeId; thick?: number; vid?: QuizKindId; src?: string; w?: number; h?: number; q?: number; t1?: number; t2?: number; film?: number; resume?: boolean }): string
// '/raschet-stoimosti/?type=tempered&thick=10&vid=clear&src=%2Fzakalennoe-steklo%2F10-mm%2F' — порядок ключей фиксирован: type, thick, vid, src, w, h, q, t1, t2, film, resume; undefined/null/'' пропускаются; всегда слеш перед '?'
<QuizCta prefill={QuizPrefill} src={path} label?="Рассчитать стоимость" secondary?={true} />
// primary-кнопка «Рассчитать стоимость» (Link → buildQuizHref, иконка Calculator) + необязательная вторичная «Отправить чертёж» (FormTrigger formKey="drawing")
<QuizLink prefill src className children />   // ссылка-кнопка для других компонентов (Button asChild + Link)
```
`QuizPrefill` собирается из группы `quizPrefill` документа (поля `type`, `thickness`, `kind` — точные имена в `src/payload/fields/quiz-prefill.ts`) и пути страницы как `src`. Значения select-полей схемы **совпадают** с id домена (`QuizTypeId`/`QuizKindId` из `quiz-schema.ts`: `tempered`, `shopfronts`, `low-iron`, `painted`, …) — передаются в URL как есть, без маппинга (`kind` → параметр `vid`). Этот же словарь разбирает парсер task-34. Тест на `buildQuizHref` в `quiz-cta.test.ts` (добавить файл).

### 10. Формы: провайдер, триггер, реестр

```ts
export type FormKey = 'drawing' | 'callback' | 'sample' | 'load' | 'contacts' | 'full';
export interface FormParams { label?: string; source?: string; accept?: string[]; title?: string; [key: string]: unknown }
export interface FormComponentProps { params: FormParams; onClose(): void; onSuccess?(): void; variant: 'modal' | 'page' }
```
- `FormDialogProvider` (`'use client'`): контекст + единое модальное окно (Radix Dialog; на ≤599 — на весь экран, иначе по центру `max-w-lg`, `rounded-lg`, тень modal, оверлей `bg-black/50`); `useFormDialog(): { openForm(key: FormKey, params?: FormParams): void; closeForm(): void; openKey: FormKey | null }`. Заголовок по умолчанию: callback — «Заказать звонок», drawing — «Отправить чертёж», sample — «Заказать образец», load — «Подобрать под нагрузку», contacts/full — «Отправить заявку»; `params.title` переопределяет. Закрытие по Esc/оверлею/крестику, возврат фокуса на триггер, блокировка скролла.
- `FormTrigger`: `<FormTrigger formKey="callback" params? asChild className>…</FormTrigger>` — клонирует/оборачивает дочерний элемент (Radix `Slot`) и по клику вызывает `openForm`; без JS — `<button type="button">`.
- `registry.tsx`: `export const FORM_REGISTRY: Record<FormKey, ComponentType<FormComponentProps>>` — **заглушки**, выводящие `<p>Форма «{key}» появится на следующем этапе</p>` и кнопку «Закрыть». Задача 21 заменит содержимое реестра (файл ей передаётся целиком).

### Environment Variables

- `SITE_URL`, `SITE_ENV` (через `@/lib/env`).

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят (после слияния волны с task-14/16/19).
- [ ] `next build` проходит **без доступной БД** (проверить, указав недоступный `DATABASE_URL`); страницы, зависящие от CMS, работают после старта сервера с БД.
- [ ] Загрузчики кэшируются с тегами `global:<slug>`, `collection:<slug>`, `doc:<slug>:<id>`; изменение global `prices` в админке немедленно отражается на странице (проверить вручную).
- [ ] `buildMetadata`: title/description/robots/canonical/OG по правилам; staging → noindex,nofollow; пагинация «— страница N»; тесты зелёные.
- [ ] JSON-LD: Organization + 2 LocalBusiness (Челябинск, Екатеринбург), BreadcrumbList (кроме главной), Product+AggregateOffer только при `priceState==='price'`, FAQPage, Article; валидный JSON (проверить в Schema Markup Validator / вручную).
- [ ] `buildBreadcrumbs`: все 68 URL из `docs/inex/17-meta.md` дают корректные цепочки (проверка выборочно + тесты из раздела 6).
- [ ] Неизвестный URL (`/net-takoj-stranicy/`) → HTTP 404 со страницей «Страница не найдена»: с поиском и 9 ссылками на разделы; документ из `pages` по его пути → 200; запись из `redirects` → 308 на целевой путь.
- [ ] `PageShell` выводит крошки, блок условий из global `conditions` и CTA квиза; `buildQuizHref` стабильно формирует ссылку и покрыт тестом.
- [ ] `FormDialogProvider` + `FormTrigger` открывают модальное окно с заглушечной формой; Esc/оверлей закрывают; фокус возвращается.
- [ ] Ссылки на `/admin` в новом коде — только `<a>`.

## Notes

- Модель: премиум.
- Ссылки на источники: ТЗ `docs/inex/16-tz-razrabotka.md` §2.4–2.5, §8; мета — `docs/inex/17-meta.md` (H1/title/description по URL; при двух description брать первый).
- Контракт загрузчиков (`getNavigation`, `getContacts`, `getPromo`, `getSiteSettings`) используется task-14 в этой же волне — имена не менять.
- `generateStaticParams → []` и ISR: после правки документа хук (`revalidateTag(..., 'max')`) обновит страницу при следующем заходе.
- Canonical для страниц фильтров/поиска задаётся потребителями через `canonicalOverride` / `forceNoindex`.
- (Ревью волны 2) **Время, а не правка, меняет цену и акцию.** Правило 45 дней и окончание акции зависят от текущей даты, а хуки сбрасывают кэш только при правке. Загрузчики `getPrices`/`getPromo` кэшируют сырые данные, а «устарела ли цена» и «активна ли акция» вычисляются при рендере через `now`. Поэтому любая страница, которая выводит цену, акцию или мету с ценой (включая фиксированные URL и шапку/layout), должна иметь временную ревалидацию (`export const revalidate = 3600` или эквивалент) — иначе статическая страница покажет устаревшую цену бессрочно. Зафиксировать правило в комментарии `cache.ts` и проверить в e2e/юнит-тесте с подменой даты.
- (Ревью волны 2) `metadataBase` в `(site)/layout.tsx` (task-05) для статических страниц вычисляется при сборке (`SITE_URL` по умолчанию `localhost`). Canonical, OG и JSON-LD строить абсолютными URL от рантайм-`SITE_URL` (в `buildMetadata`/JSON-LD), не полагаться на `metadataBase` статических страниц; исправить вводящий в заблуждение комментарий в layout.
