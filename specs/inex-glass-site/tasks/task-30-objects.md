# Task 30: Объекты — листинг, пагинация и карточка объекта

## Status

pending

## Wave

5

## Description

Вертикальный срез портфолио: листинг `/obekty/` с фильтрами (изделие, тип объекта, город), сортировкой, чипсами активных фильтров, правым выезжающим дровером и кнопкой «Показать ещё»; серверная пагинация `/obekty/page/N/` для SEO; страница объекта `/obekty/[slug]/` с галереей, лайтбоксом, спецификацией стекла и блоком «Другие объекты». Портфолио — главное B2B-доказательство доверия (около 150 объектов будут импортированы задачей 37 черновиками). Задача включает сид таксономий и **черновиков** объектов (без публикации фиктивных данных) и e2e на фикстурах.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md
**Blocks:** task-36-sitemap-robots-indexnow.md, task-37-inex-import.md, task-40-content-audit.md

**Context from dependencies:**
- **task-10:** схема заморожена. Коллекции: `objects` (name, slug, city rel `cities`, objectType rel `object-types`, products rel many `products`, year, task, `spec[]` {product, thickness, kind, triplexFormula, processing}, `chips[]`, `photos[]` {image, alt (обязателен)}, `related[]`, `featured`, `sortDate`, `legacyUrls[]}`, SEO-группа, drafts/versions, **проверка обязательных полей только при публикации**), таксономии `cities`, `object-types`, `products`, `media`, `pages` (документ листинга `/obekty/`, template `listing`). Точные имена и типы читайте в `src/payload/collections/{catalog,content}/objects.ts` и `src/payload-types.ts`. **Схему не менять.**
- **task-11:** `pluralObjects(n)` («объект/объекта/объектов»), `COMPANY_TZ`, форматтеры.
- **task-12:** `Select`, `Chip`/`ChipGroup`, `Button`. **task-13:** `Drawer` (Radix Dialog, правая шторка), `Lightbox`, `Breadcrumbs`, `DataTable`/`.ig-mcard`, `Card`, `Placeholder`.
- **task-14:** layout (шапка сжимается до 56–64 px при прокрутке — учесть в sticky-позициях).
- **task-15:** `PageShell`, `buildMetadata`, JSON-LD, загрузчики `src/lib/cms/*`, `FormTrigger` (drawing-форма), билдер ссылки квиза, catch-all (для `/obekty/`-документа не используется — роут явный).
- **task-16:** `RichText`, `RenderBlocks`, seed-фреймворк, **заглушка** `src/seed/slices/objects.ts`. Блок `objectsFeed` (лента объектов на других страницах) рисует его компонент из task-16; эта задача экспортирует `ObjectCard` для повторного использования, но блок не переписывает.

## Files to Create

- `src/app/(site)/obekty/page.tsx` — листинг (страница 1, фильтры из `searchParams`)
- `src/app/(site)/obekty/page/[n]/page.tsx` — страницы 2…N
- `src/app/(site)/obekty/[slug]/page.tsx` — карточка объекта
- `src/lib/cms/objects.ts` — `getObjectsIndex()` (кэш `unstable_cache`, тег `collection:objects` + таксономии), `getObjectBySlug(slug)`, `getRelatedObjects(obj)`, `getFilterFacets()`
- `src/lib/objects/filters.ts` — разбор/сборка query-параметров (`zod`), фильтрация, сортировка, пагинация (чистые функции) + `filters.test.ts`
- `src/lib/objects/seo.ts` — фоллбэк-мета объекта и мета листинга/страниц (чистые функции) + `seo.test.ts`
- `src/components/objects/objects-listing.tsx` — клиентский контейнер (тулбар, чипсы, сетка, «Показать ещё», дровер)
- `src/components/objects/objects-toolbar.tsx`, `active-filters.tsx`, `filter-drawer.tsx`, `object-card.tsx`, `objects-pagination.tsx`
- `src/components/objects/object-gallery.tsx` — клиентская галерея + лайтбокс
- `src/components/objects/object-spec-table.tsx`, `object-facts.tsx`, `related-objects.tsx`
- `src/seed/content/objects.ts` — таксономии и черновики; `src/seed/slices/objects.test.ts`
- `e2e/objects.spec.ts` + `e2e/helpers/objects-fixtures.ts` — фикстуры через REST

## Files to Modify

- `src/seed/slices/objects.ts` — реализовать (таксономии, черновики, документ листинга `pages` `/obekty/`)

**Не трогать:** `src/payload/**`, `src/components/blocks/objects-feed-block.tsx` (16), `src/components/ig/*`, `package.json`.

## Technical Details

### Источники и тексты

- Реестр и мета — ТЗ §3.1, §8; `docs/inex/17-meta.md`; тексты — `res/inex-glass-handoff/teksty/17-matirovanie-markirovka-listingi.md` §5 (листинг); поля карточки — ТЗ §5 шаблон «Объект»; структура — `docs/inex/struktury-stranic/p1-konstrukcii-servis-klientam.md` §4; прототипы `prototypes/Objects.dc.html`, `prototypes/ObjectPage.dc.html`; задание `zadaniya/07-servis-obekty-blog.md` §7.3.
- **Листинг `/obekty/`:** H1 «Объекты»; Title «Объекты Inex — перегородки, ограждения, фасады из стекла» (без суффикса бренда — как в 17-meta); Description «1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту.» Вводный абзац (дословно из teksty §5): «За 21 год специалисты Inex выполнили более 1500 проектов по всей России: торговые центры, банки, арены, аэропорт, офисы и производственные здания. По каждому объекту — что поставляли и из какого стекла.» Нижний блок (дословно): «**Среди объектов:** Главное управление «Сургутнефтегаз» · ТРЦ «Алмаз», Челябинск · Аэропорт Челябинск · «РМК-Арена», Челябинск» и «Ищете решение для похожего объекта? Пришлите проект — подберём стекло и узлы.» с кнопкой «Отправить проект» (drawing-форма, `source:'obekty'`). Хранится в документе `pages` `/obekty/` (template `listing`): блок `richText` (вводный) и блок `richText` + `cta` (нижний); роут читает документ и рисует блоки до и после списка.
- **Страница объекта:** мета в 17-meta отсутствует. Приоритет: поля SEO документа; если пусты — фоллбэк (`src/lib/objects/seo.ts`): title = `«<name>» — спецификация стекла | Inex Glass` (обрезать name так, чтобы весь title ≤ 65 знаков, окончание «…»), description = `<Тип объекта>, <Город>: <изделия через запятую>. Спецификация стекла: <первая строка spec: вид, толщина>.` (пропуская отсутствующие части; 120–160 знаков, иначе обрезать по слову). Это решение задачи — в отчёт.

### URL, пагинация, фильтры

- `/obekty/` — страница 1. `/obekty/page/N/` — N ≥ 2. `/obekty/page/1/` → `permanentRedirect('/obekty/')`. N не целое / < 1 / > числа страниц → `notFound()`. Slug объекта `page` зарезервирован: сид и валидация не должны его создавать; статический `page/[n]` приоритетнее динамического `[slug]`.
- Размер страницы `OBJECTS_PAGE_SIZE = 24` (константа в `filters.ts`). Сервер отдаёт в HTML **все 24 карточки страницы**; клиент показывает первые 8, «Показать ещё» добавляет по 8 (остальные карточки в DOM, но скрыты атрибутом `hidden`, `loading="lazy"`). Когда все карточки страницы показаны, кнопка пропадает; внизу всегда есть настоящая пагинация-ссылки (`<a>`), чтобы краулер видел все страницы.
- Фильтры через `searchParams`: `product`, `type`, `city` (списки slug через запятую, например `?type=tc,arena&city=chelyabinsk`), `sort` (`new` | `az` | `city`, по умолчанию `new` и в URL не пишется). Неизвестные slug и значения игнорируются (zod `.catch`). Фильтр «изделие» работает по `products` объекта. Сортировка: `new` — `sortDate` убыв. (фоллбэк `createdAt`), `az` — по названию без кавычек «»" через `Intl.Collator('ru')`, `city` — по названию города, объекты без города — в конец.
- **SEO-правила:** любой запрос с `product|type|city|sort` (даже на `/obekty/page/N/`) → `robots: noindex, follow`, canonical = абсолютный `/obekty/`. Без параметров: страница 1 — `index, follow`, canonical на себя; страницы 2+ — `index, follow`, canonical **на себя**, title = `<title страницы 1> — страница N` (через `generateMetadata`), description как у страницы 1; `metadata.pagination.previous/next` заполнить абсолютными URL. H1 на всех страницах «Объекты». Вводный абзац и нижний блок — только на странице 1.
- В `robots.txt` (task-36) фильтры закрывает отдельная задача: имена параметров в этой задаче `product, type, city, sort` (в ТЗ они названы `?filtr=…`) — **зафиксировать в отчёте для task-36**.
- Данные: `getObjectsIndex()` читает все опубликованные объекты одним запросом Local API (`pagination:false`, `select` только нужных полей: name, slug, city, objectType, products, chips, spec (первые 2), photos[0], sortDate) в `unstable_cache` (теги `collection:objects`, `collection:cities`, `collection:object-types`, `collection:products`). Фильтрация/сортировка/нарезка страницы — в JS на сервере (до ~200 записей это дёшево и даёт русскую сортировку). `/obekty/` из-за `searchParams` динамическая; `/obekty/page/[n]/` и `/obekty/[slug]/` — ISR (`generateStaticParams → []`).
- Фасеты дровера: `getFilterFacets()` отдаёт только таксономии, у которых есть ≥ 1 опубликованный объект, с количеством.

### Компоненты листинга (прототип `Objects.dc.html`)

- Секция заголовка (`blk--sf`, фон surface): крошки `Главная / Объекты`, H1 и вводный абзац (flex-wrap, `gap-16/48`).
- Тулбар: слева счётчик `{n} {pluralObjects(n)}` (600 / 18 px; пример «11 объектов»), справа `Select` «Сортировка» (220 px, на ≤599 — на всю ширину, подпись скрыта) и кнопка secondary «Фильтры» с иконкой `sliders-horizontal`, `aria-expanded`, бейдж количества выбранных значений (круглый 22 px, primary).
- Чипсы активных фильтров (над сеткой): `Chip` с «×», `aria-label="Убрать фильтр <название>"`, фон `#EAF3F1`, рамка `#CFE3DF`, текст `#16403D`; ссылка/кнопка «Сбросить всё».
- Дровер (`Drawer` task-13, справа, ширина 420 px, на ≤599 — на весь экран; оверлей `rgba(28,31,34,.32)`, закрытие Esc/клик по оверлею, фокус-ловушка Radix, возврат фокуса на кнопку): заголовок «Фильтры» + кнопка-иконка закрытия (`aria-label="Закрыть фильтры"`), три `fieldset` с `legend` («Изделие», «Тип объекта», «Город») и чекбоксами (локальный `FilterCheckbox` — `.ig-check`), липкий футер: ghost «Сбросить» + primary «Показать {n} {pluralObjects(n)}» (закрывает дровер). Выбор значения сразу обновляет URL через `router.replace(url, { scroll:false })` внутри `startTransition`; страница сбрасывается на первую.
- Сетка карточек: `grid-cols-4` ≥1366, 3 на 1101–1365, 2 на 600–1100, 1 на ≤599, gap 24 (16 на ≤599).
- `ObjectCard` (ссылка целиком, `.ig-card`): фото 4:3 (`next/image`, `sizes="(min-width:1366px) 25vw, (min-width:600px) 50vw, 100vw"`, alt из `photos[0].alt`; нет фото → `Placeholder` без надписи), название (h2 20/600), подстрока `Город · Тип` (без пустых частей), до 3 статических чипсов: `chips[]`, при пустом — автогенерация из первых двух строк `spec` («<вид> <толщина> мм», «триплекс <формула>»).
- Пустой результат при активных фильтрах: «Нет объектов по выбранным фильтрам» + кнопка secondary s «Сбросить фильтры». Если опубликованных объектов нет совсем — тулбар/сетка не рисуются (в отчёт: на старте все записи — черновики).
- Пагинация (`ObjectsPagination`): `nav aria-label="Страницы"`, ссылки «1 2 3 … N» с `aria-current="page"`, «Назад/Вперёд» (иконки `chevron-left/right`), сохраняет query фильтров; скрыта при одной странице.

### Страница объекта (`ObjectPage.dc.html`)

- Крошки `Главная / Объекты / <name>`; H1 = name; под ним строка `Город · Тип объекта · Год` (muted 18/15 px, пустые части пропускаются).
- Сетка `1fr / 420px`, gap 40, ≤1100 одна колонка. **Галерея** (`ObjectGallery`): главное фото 16:10, радиус 24 (16 на ≤599), `preload` (Next 16; `priority` устарел); миниатюры сеткой 5 колонок (gap 12/6) как `button` с `aria-pressed`, `aria-label="Фото N"`, рамка 2 px primary у активной; миниатюр нет, если фото одно. Клик по главному фото открывает `Lightbox` (task-13) с позицией, стрелками клавиатуры, Esc, счётчиком «N из M» и alt.
- **Боковая панель** (серый фон `#F4F5F3`, радиус 24, `position: sticky; top: 88px` на ≥1101): `dl` с фактами (Город, Тип объекта, Год, Изделия — строки без значения скрываются), блок «Задача и сложность» (если `task` задан), CTA: primary l block «Рассчитать похожий проект» (калькулятор-иконка; ссылка `buildQuizHref` (task-15): `type` из первого изделия объекта по соответствию slug `products` → id `QUIZ_TYPES`: `peregorodki`→`partitions`, `ograzhdeniya`→`railings`, `kozyrki`→`canopies`, `fasady`→`facade`, `dushevye`→`shower`, иное → без `type`; `src=/obekty/<slug>/`) и secondary block «Отправить чертёж» (drawing-форма, `source:'obekty-<slug>'`).
- Секция «Спецификация стекла» (фон bg): `ObjectSpecTable` — столбцы «Изделие | Толщина | Вид | Триплекс | Обработка» из `spec[]`; толщина `N мм` (моноширинные цифры), триплекс — формула или «—»; на ≤599 — `.ig-mcard` с `dl`.
- Секция «Другие объекты» (фон surface): заголовок + ссылка «Все объекты» (`.ig-link--arrow`), 4 карточки: `related[]` документа, иначе авто — опубликованные с общим изделием, затем общим типом, затем новейшие; без самого объекта.
- JSON-LD: `BreadcrumbList`. `ItemList`/`Product` не выводить (ТЗ §8 не предусматривает).
- Публикуются только `_status: 'published'`; черновик по прямой ссылке → 404 (preview через Payload live preview — вне задачи).

### Seed (`src/seed/slices/objects.ts`)

- Таксономии (upsert по slug): `products` — Перегородки `peregorodki`, Ограждения `ograzhdeniya`, Козырьки `kozyrki`, Фасады `fasady`, Душевые `dushevye`; `object-types` — ТЦ `tc`, Банк `bank`, Офис `office`, Арена `arena`, Аэропорт `airport`, Концертный зал `concert-hall`, Коттедж `cottage`; `cities` — Челябинск `chelyabinsk`, Омск `omsk`, Сургут `surgut`, Ишим `ishim`. (Названия — из фильтров прототипа; с task-26 согласовать slug `products`: upsert по slug, существующие записи не затирать.)
- Документ `pages` `/obekty/` (template `listing`) с SEO (H1/title/description выше), блоками вводного и нижнего текста (дословно teksty §5).
- Черновики объектов (только `_status: 'draft'`, без фото/спецификаций/годов — **ничего не выдумывать**): ТРК «Родник»; ТРК «Урал»; «Трактор» арена; Концертный зал (Омск) — город Омск, тип «Концертный зал»; Главное управление «Сургутнефтегаз» — Сургут, тип «Офис»; Сбербанк (Ишим) — Ишим, тип «Банк»; «Аркаим Плаза»; Угорская шахматная академия; ТРЦ «Алмаз» — Челябинск, тип «ТЦ»; Аэропорт Челябинск — Челябинск, «Аэропорт»; «РМК-Арена» — Челябинск, «Арена». Slug — транслит в нижнем регистре (`trk-rodnik`, `trk-ural`, `traktor-arena`, `koncertnyj-zal-omsk`, `glavnoe-upravlenie-surgutneftegaz`, `sberbank-ishim`, `arkaim-plaza`, `ugorskaya-shahmatnaya-akademiya`, `trc-almaz-chelyabinsk`, `aeroport-chelyabinsk`, `rmk-arena`). Сид не публикует ни одной записи; validation публикации не обходить.
- Запуск: `pnpm seed --only=objects`, идемпотентно по slug.
- Vitest `objects.test.ts`: slug-и уникальны и `^[a-z0-9-]+$`, не равны `page`; контент листинга дословно в teksty (skip без `res/`); `checkStopWords` пусто.

### Метрика

Специальных целей ТЗ §10 для объектов нет. Клики по `tel:`/`mailto:` отслеживаются глобально. CTA «Рассчитать похожий проект» ведёт в квиз (цель `quiz_start` с `src` фиксирует квиз). Не добавлять собственных целей.

### Адаптив (сводка)

1920/1366: сетка 4 колонки, дровер 420 px. 1101–1365: 3 колонки, поля 40 px. 600–1100: 2 колонки, галерея и панель в одну колонку, панель не sticky. ≤599: 1 колонка, дровер на весь экран, миниатюры gap 6, спецификация карточками, sticky-CTA страницы (task-14) не перекрывает пагинацию (нижний отступ).

### Тесты

- **Vitest:** `filters.test.ts` — разбор параметров (мусор игнорируется), фильтры по каждой оси и их комбинация (И между группами, ИЛИ внутри), сортировки (`az` игнорирует «», `city` — пустые в конце), пагинация (границы 24/25, `totalPages`), сборка URL (без `sort=new`, без пустых списков); `seo.test.ts` — фоллбэк title ≤ 65, description 120–160, пропуск пустых частей, правила robots/canonical для (страница 1, страница N, фильтры).
- **Playwright** (`objects.spec.ts`, проекты 375/1366/1920). Фикстуры создаёт `e2e/helpers/objects-fixtures.ts` через REST под админом (логин `POST /api/users/login/`; при отсутствии пользователей — `first-register`): загружает одно тестовое изображение в `media` (alt обязателен), создаёт таксономии и 30 опубликованных объектов с префиксом названия «[e2e]» (разные типы/города/изделия, 3 с несколькими фото и полной спецификацией), в `afterAll` удаляет всё созданное. Проверки:
  1. `/obekty/`: H1 «Объекты», счётчик «30 объектов»; 24 карточки в DOM, видимых 8; «Показать ещё» добавляет 8 (до 24), затем кнопка исчезает; пагинация «1 2» → `/obekty/page/2/` содержит 6 карточек, `<title>` оканчивается на «— страница 2», canonical на себя, `robots` без noindex; `/obekty/page/1/` → 301 `/obekty/`; `/obekty/page/9/` → 404.
  2. Фильтры: открыть дровер, отметить тип → URL содержит `type=`, счётчик и чипсы обновились, `<meta robots>` содержит `noindex`, canonical = `/obekty/`; «×» на чипсе снимает фильтр; «Сбросить всё»; сортировка `az` меняет порядок первых карточек; Esc закрывает дровер и возвращает фокус; на 375 дровер на весь экран.
  3. Страница объекта: H1 = название, крошки, 5 колонок миниатюр, клик по миниатюре меняет главное фото, клик по главному открывает лайтбокс («2 из 3» после стрелки →, Esc закрывает), таблица спецификации (на 375 — `.ig-mcard`), блок «Другие объекты» ≤ 4 карточки без текущего, sticky-панель на 1366 (`position: sticky`), CTA «Рассчитать похожий проект» с `src=` в ссылке; черновой объект → 404.
  4. Нет горизонтального скролла на 375; в HTML листинга нет `{`/`}`.

## Acceptance Criteria

- [ ] `/obekty/`, `/obekty/page/N/`, `/obekty/[slug]/` работают; `page/1` редиректит, невалидные N и черновики дают 404.
- [ ] Фильтры (изделие/тип/город), сортировка, чипсы, дровер и «Показать ещё» работают так же, как в прототипе, и доступны с клавиатуры; фильтрованные URL — `noindex, follow`, canonical `/obekty/`.
- [ ] Страницы 2+ индексируемые, canonical на себя, title содержит «— страница N», `rel`-пагинация присутствует.
- [ ] Карточка объекта показывает только заполненные данные (пустые строки/блоки скрыты), галерея и лайтбокс работают, спецификация адаптивна.
- [ ] Сид создаёт таксономии и 11 **черновиков**, ни один объект не опубликован; повторный запуск не создаёт дублей.
- [ ] Vitest и Playwright (на фикстурах) проходят; фикстуры очищаются.
- [ ] Сверка с `Objects` и `ObjectPage` на 375 / 1366 / 1920 (сетка, тулбар, дровер, галерея, панель).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (без БД), `pnpm test:e2e e2e/objects.spec.ts` проходят.

## Notes

- **Модель:** premium для кодинга.
- Брифовый вариант «в ТЗ фильтры `?filtr=…`» заменён на явные параметры `product/type/city/sort` по решению проекта; task-36 должен закрыть их в robots/Clean-param и исключить из sitemap.
- «Показать ещё» + пагинация сделаны как прогрессивное улучшение над серверной пагинацией: краулеры видят все карточки страницы и ссылки на следующие.
- Компонент пагинации в блоге (task-31) сделан отдельным файлом; при желании объединить позже (общий `listing/pagination`).
- Редиректы со старых URL inex.su на объекты хранятся в `legacyUrls[]` и коллекции `redirects` (импорт — task-37); здесь не обрабатываются.
- Sticky-смещение боковой панели (88 px) подогнать под фактическую высоту сжатой шапки task-14.
- Без публикации фиктивных объектов реальный листинг на prod появится только после дозаполнения черновиков (action-required).
- (Ревью волны 3) `src/components/ig/chip.tsx` помечен `'use client'` без хуков — если нужны серверные чипы-ссылки для фильтров, убрать директиву (правка разрешена этой задаче).
