# Task 07: Форма редактирования страницы — SEO-счётчики, превью сниппета, «Кем изменена», тема

## Status

pending

## Wave

2

## Description

Довести экран редактирования документа до макета `res/admin-mockup/PageEdit.dc.html`: живые счётчики длины SEO-полей (Title — 70, Description — 170 знаков, лимиты из кода), превью сниппета «как в поиске», показ «Кем изменена» и перекраска стандартного экрана редактирования Payload (шапка с кнопками, две колонки с карточками, табы, список блоков, панель Lexical) в теме админки. Задача заполняет заглушки, которые task-01 уже подключила в `src/payload/fields/seo.ts`, и пишет стили только в свой партиал — файлы коллекций (`pages.ts` и др.) не меняются. Кнопку «Превью» черновика делает task-11.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md
**Blocks:** task-11-draft-preview.md, task-12-admin-screens-theme.md, task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема):
  - `src/payload/fields/seo.ts` (группа `seo`, используется в `pages`, `articles`, `objects`, `glass-types`, `thicknesses` (с `titleNoPrice`), `processing-services`, `constructions`): у поля `title` — `admin.components.afterInput: ["/payload/admin/seo/seo-title-counter#SeoTitleCounter"]`, у `description` — `afterInput: ["/payload/admin/seo/seo-description-counter#SeoDescriptionCounter"]`; сразу после `description` — ui-поле `seoSnippet` → `"/payload/admin/seo/seo-snippet-preview#SeoSnippetPreview"`. Заглушки — server components, `return null`. **Имена экспортов и пути — контракт** (заменить тела, имена не менять; компонент можно сделать клиентским — путь в importMap тот же).
  - Константы лимитов уже есть в `src/payload/fields/seo.ts`: `SEO_TITLE_SOFT_LIMIT = 70`, `SEO_DESCRIPTION_SOFT_LIMIT = 170` (лимиты мягкие: сохранение длинных значений не блокируется, у полей `admin.description` «Рекомендуется до N знаков»).
  - `pages.updatedBy` — relationship → `users`, label «Кем изменена», `maxDepth: 0`, `access: systemOnly`, `admin: { readOnly: true, position: 'sidebar' }` (после `publishedAt`); заполняет хук `setUpdatedBy` (`req.user?.id ?? null`, `null` = «Система»). То же поле есть у `leads`.
  - `pages.admin.preview` → `buildPreviewUrl` (заглушка возвращает `null`, кнопки превью пока нет — её включит task-11).
- **task-02** (каркас): тема `light`, Rubik, токены `--ig-*` в админке (`src/styles/ig-vars.css`), базовые классы `.iga-*` и переопределения переменных темы Payload в `_base.scss` (общие поля ввода, кнопки, радиусы — если task-02 уже задала их через `--theme-*`/`--style-radius-*`, не дублировать). Партиал задачи `src/app/(payload)/styles/_edit-form.scss` создан пустым и подключён в `custom.scss`. CSS Payload лежит в `@layer payload-default`, незаслойный `custom.scss` его перекрывает.
- **Существующее** (не менять): `src/lib/seo/metadata.ts` — правило заголовка сайта: `SITE_NAME = "Inex Glass"`, `TITLE_BRAND_SUFFIX = " | Inex Glass"`, запасной title документа получает суффикс, если в нём нет «Inex Glass» (`withBrand`). Модуль импортирует `getEnv` и **не годится для клиента** — правило повторяется в чистом `snippet.ts` (см. ниже). Плейсхолдеры `{N}`, `{цена}` и т. п. подставляются только на сайте. Редактор Lexical (`src/payload/editor.ts`) — без жирного/курсива и без фиксированной панели: есть только плавающая панель выделения (`inline-toolbar-popup`); набор возможностей редактора **не меняется** (фиксированная панель «Ж / К / Ч» из макета противоречит правилам контента проекта).

## Files to Create

- `src/payload/admin/seo/snippet.ts` — чистые функции: состояние счётчика, сборка сниппета
- `src/payload/admin/seo/snippet.test.ts` — unit-тесты
- `src/payload/admin/seo/seo-counter.tsx` — общий клиентский счётчик (используют оба `afterInput`)
- `e2e/admin-page-edit.spec.ts` — e2e формы страницы

## Files to Modify

- `src/payload/admin/seo/seo-title-counter.tsx` — `SeoTitleCounter` (лимит 70)
- `src/payload/admin/seo/seo-description-counter.tsx` — `SeoDescriptionCounter` (лимит 170)
- `src/payload/admin/seo/seo-snippet-preview.tsx` — `SeoSnippetPreview`
- `src/app/(payload)/styles/_edit-form.scss` — тема экрана редактирования документа

**Не трогать:** `src/payload/fields/seo.ts`, `src/payload/collections/**` (включая `pages.ts`), `src/payload/editor.ts`, `src/lib/seo/**`, `src/payload.config.ts`, чужие партиалы, `importMap.js`/`payload-types.ts` (генераторы локально, откатить), `package.json`, `src/lib/preview/**` (task-11).

## Technical Details

### Чистые функции (`snippet.ts`)

```ts
export const SNIPPET_SITE_NAME = "Inex Glass";          // = SITE_NAME из src/lib/seo/metadata.ts
export const SNIPPET_BRAND_SUFFIX = " | Inex Glass";

export type CounterState = "empty" | "ok" | "over";
/** Длина — по символам Unicode (`[...value].length`), пробелы по краям не считаются. */
export function counterState(value: unknown, limit: number): { length: number; limit: number; state: CounterState };

export interface SnippetInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  docTitle?: string | null;     // useAsTitle документа
  path?: string | null;         // поле `path` (/zakalennoe-steklo/), если есть
  origin: string;               // https://inexglass.ru (serverURL конфига)
  noindex?: boolean | null;
}
export interface Snippet {
  url: string;                  // «inexglass.ru › zakalennoe-steklo» (сегменты пути через « › »; корень — только хост)
  title: string;                // seo.title или docTitle + суффикс (как withBrand); пусто → «Без заголовка»
  titleIsFallback: boolean;
  description: string | null;   // null → подсказка «Описание не заполнено…»
  hasPlaceholders: boolean;     // в title/description есть {…}
  noindex: boolean;
}
export function buildSnippet(input: SnippetInput): Snippet;
/** Обрезка для показа (как поисковик): title — до 70, description — до 170 символов, по границе слова, «…». */
export function clipForSnippet(text: string, limit: number): string;
```

Лимиты в компонентах брать из `SEO_TITLE_SOFT_LIMIT` / `SEO_DESCRIPTION_SOFT_LIMIT` (`src/payload/fields/seo.ts` — модуль без серверных зависимостей, импорт в клиент безопасен; если typecheck/сборка покажут обратное, вынести числа в `snippet.ts` с комментарием-ссылкой и сообщить координатору).

### Счётчики (`seo-counter.tsx`, `SeoTitleCounter`, `SeoDescriptionCounter`)

- `'use client'`. Значение поля — `useField<string>()` без аргумента: путь берётся из `FieldPathContext` (`afterInput` рендерится внутри поля; хук и контекст экспортирует `@payloadcms/ui`, см. `node_modules/@payloadcms/ui/dist/forms/RenderFields/context.js`). Если в пропсах пришёл `path` — использовать его.
- Разметка: `<span class="iga-seo-counter" data-state="ok|over|empty" aria-live="polite">58 / 70</span>`; при `over` — «78 / 70 · длиннее рекомендованного». Цвета: `ok` — `--ig-success-text`, `over` — `--ig-warning-text`, `empty` — `--ig-text-2`. `tabular-nums`.
- Положение — как в макете (справа в строке подписи поля): CSS в `_edit-form.scss` — поле с счётчиком `position: relative`, счётчик `position: absolute; top: 0; right: 0` над инпутом (подпись поля и счётчик в одной строке); на ≤ 599 px — обычным блоком под полем.
- Счётчик не валидирует и не блокирует сохранение.

### Превью сниппета (`seo-snippet-preview.tsx`, `SeoSnippetPreview`)

- `'use client'`. Путь ui-поля — из пропса `path` или `useFieldPath()` (например `seo.seoSnippet`); родитель = путь без последнего сегмента. Значения: `useFormFields(([fields]) => fields[`${parent}.title`]?.value)`, то же для `description`, `noindex`; `path` документа — `fields.path?.value` (поле есть у страниц, статей, объектов и части каталога; нет — только хост); заголовок документа — `useDocumentTitle().title`; origin — `useConfig().config.serverURL` (в конфиге это `SITE_URL`).
- Разметка по макету (блок внутри «Поиск (SEO)»): `div.iga-snippet` — фон `--ig-bg`, радиус 10, padding 12/14, gap 4:
  - подпись «Так страница выглядит в поиске» (12 px `--ig-text-2`);
  - URL — 12 px `--ig-success-text` («inexglass.ru › zakalennoe-steklo»);
  - заголовок — 16 px, line-height 1.3, `--ig-info-text` (`#2C5B86` в макете), обрезанный `clipForSnippet`; если это запасной заголовок — после него метка «(из названия страницы)» 12 px `--ig-text-2`;
  - описание — 13 px, line-height 1.45, `--ig-ink-2` (`#3E464D`), обрезанное; пусто — «Описание не заполнено — поисковик возьмёт текст со страницы» (`--ig-text-2`, курсив не использовать);
  - `noindex` → `.iga-badge--no` «Закрыта от индексации»;
  - `hasPlaceholders` → примечание «Метки в фигурных скобках ({N}, {цена}) подставляются на сайте».
- Пункт макета «Разметка Schema.org заполнена» не реализуется (в форме нет данных для такой проверки).

### «Изменена / Кем»

- «Изменена» — стандартная строка метаданных `DocumentControls` («Последнее изменение» / дата), стилизуется в шапке.
- «Кем изменена» — нативное поле `updatedBy` в сайдбаре (task-01: relationship только для чтения; Payload сам подгружает имя сотрудника по `useAsTitle`). Задача только оформляет его в стиле карточки «Публикация» (см. стили). Подпись «Система» для `null` без собственного компонента поля недоступна — см. Notes.

### Тема экрана редактирования (`_edit-form.scss`)

Стили относятся к общему экрану редактирования документа Payload (`.collection-edit`, `.global-edit--*`, `.document-fields`, `.doc-controls`, `.doc-header`, `.doc-tabs`, поля, блоки, Lexical) — он одинаков для страниц, статей, объектов, каталога и глобалов. Экраны-исключения (списки, логин, вкладки заказа «Управление», карточка заявки) — не здесь (task-12, task-08). Значения — из макета `PageEdit.dc.html` (`.top`, `.page`, `.col-main`, `.col-side`, `.card`, `.fld`, `.inp`, `.blk`, `.grip`, `.bi`, `.ib`, `.tb`); цвета — только токены `--ig-*`.

1. **Шапка документа** (`.doc-header`, `.doc-controls`): белая полоса (`--ig-surface`, нижняя граница `--ig-hairline`), padding `14px 32px` (≤ 1100: 14/24, ≤ 599: 12/16); заголовок документа 22/700; статус документа (`.status`, «Опубликовано» / «Изменено» / «Черновик») — как `.bdg` макета: `success` (`--ig-success-bg` / `--ig-success-text`), «Изменено» — `warning`; метаданные («Последнее изменение», «Создано») — 12–13 px `--ig-text-2`, значения `tabular-nums`. Кнопки: публикация/сохранение (`.btn--style-primary`) — pill 40 px, `--ig-btn-primary-bg` → hover `--ig-btn-primary-bg-hover`; «Сохранить черновик» (`.btn--style-secondary`, `.save-draft`) — белая с рамкой `--ig-primary` и текстом `--ig-primary-pressed`, hover `--ig-primary-light`; меню «…» и прочие — ghost (`--ig-line`). Ссылка «назад» в хлебных крошках шапки — 13 px `--ig-primary-pressed`.
2. **Вкладки документа** (`.doc-tabs`: «Редактировать», «Версии», «API», у заявок «Сводка»): pill-сегмент как `.seg` макета (фон `--ig-well`, активная — белая с тенью).
3. **Две колонки** (`.document-fields--has-sidebar`): основная колонка — фон `--ig-bg`, padding `24px 32px 56px`; сайдбар (`.document-fields__sidebar-wrap`) — ширина ≥ 320 px (`flex: 1 1 320px` / сетка Payload — согласовать с её разметкой), поля сайдбара (`.document-fields__sidebar-fields`) — внутри белой карточки (`--ig-surface`, рамка `--ig-hairline`, радиус 16, padding 20/22, тень `--ig-shadow-card`) без заголовка (текст заголовка без компонента не добавить); поля `publishedAt` и `updatedBy` идут подряд, как строки карточки «Публикация» макета. ≤ 1100 px — сайдбар под основной колонкой (поведение Payload), карточка на всю ширину.
4. **Табы полей** (`.tabs-field`: «Содержимое», «SEO», «Настройки»): строка табов — pill-сегмент; содержимое вкладки — белая карточка (радиус 16, padding 20/22, gap 14).
5. **Поля**: подписи (`.field-label`) 13 px `--ig-text-2`; инпуты/селекты/textarea — высота 42, рамка `--ig-line`, радиус 10 (`md`), фокус — рамка `--ig-primary` + `--ig-focus-ring`; описания (`.field-description`) 12 px `--ig-text-2`. Если task-02 уже задала это глобально через переменные темы — только недостающее.
6. **Блоки** (`.blocks-field`, строки `.blocks-field__row`, шапки `.collapsible__toggle-wrap`): каждая строка — `.blk` макета: белая, рамка `--ig-hairline`, радиус 12, padding 12/14, hover — рамка `--ig-gray-2`; ручка перетаскивания (`.collapsible__drag` / `.blocks-field__drag`) — `--ig-text-muted`, `cursor: grab`; плашка типа блока (`.blocks-field__block-pill`) — в цветах `.bi` макета (`--ig-primary-light` / `--ig-primary-dark`, радиус 8), но бейджем с текстом, а не квадратом с иконкой (иконок блоков в конфиге нет); номер блока — `--ig-text-2`; кнопки действий (`.collapsible__actions`, ArrayAction) — 32×32, радиус 8, hover `--ig-bg`. Раскрытый блок — рамка `--ig-primary` + `box-shadow: 0 0 0 3px` прозрачный бренд (как в макете: `rgba(43,140,126,.12)` — взять из `--ig-focus-ring`). Кнопка «Добавить блок» (`.blocks-field__drawer-toggler`) — высота 44, `1px dashed` `--ig-gray-2`, радиус 12, прозрачный фон, текст `--ig-primary-pressed` 14/500, ширина 100 %.
7. **Lexical**: контейнер `.rich-text-lexical .editor-container` — рамка `--ig-line`, радиус 10, фон `--ig-surface`, текст 15/1.6; фокус — кольцо. Плавающая панель (`.inline-toolbar-popup`, кнопки `.toolbar-popup__button`, выпадающие `.toolbar-popup__dropdown*`) — белая, тень `--ig-shadow-dropdown`, радиус 10, кнопки 32 px радиус 6, hover `--ig-bg`, активная — `--ig-primary-light` / `--ig-primary-dark`; разделители групп — 1 px `--ig-line`. Фиксированную панель не добавлять.
8. **Мобильный (≤ 599)**: padding 16, кнопки шапки переносятся (`flex-wrap`), касания ≥ 44 px, без горизонтального скролла страницы.
9. Без бесконечных анимаций; `prefers-reduced-motion` убирает переходы.

Перед стилизацией снять реальные классы в браузере (`pnpm dev`, страница `/admin/collections/pages/<id>/`) — в 3.91 они такие (сверено в `node_modules/@payloadcms/ui`): `collection-edit`, `collection-edit--pages`, `document-fields` (`__main`, `__sidebar-wrap`, `__sidebar-fields`, `--has-sidebar`), `doc-controls` (`__wrapper`, `__content`, `__meta`, `__list-item`, `__controls`), `status`, `save-draft`, `doc-tabs`, `tabs-field`, `blocks-field` (`__row`, `__block-pill`, `__drawer-toggler`), `collapsible` (`__toggle-wrap`, `__drag`, `__actions`), `rich-text-lexical`, `editor-container`, `inline-toolbar-popup`, `toolbar-popup__button`. Селекторы писать от `.collection-edit`/`.global-edit` (не трогать модальные окна и списки).

### Тесты

**Vitest `snippet.test.ts`** (проект `unit`):
- `counterState`: пусто/пробелы → `empty`; 70 из 70 → `ok`; 71 → `over`; эмодзи и кириллица считаются по символам; лимит 170 для описания.
- `buildSnippet`: SEO-title есть → как есть; нет → `docTitle + " | Inex Glass"`, а если в названии уже есть «Inex Glass» — без суффикса; URL для `/` (только хост), `/zakalennoe-steklo/10-mm/` → «inexglass.ru › zakalennoe-steklo › 10-mm», без `path` — хост; `hasPlaceholders` для `{N}`; `noindex`.
- `clipForSnippet`: обрезка по границе слова с «…», короткий текст без изменений.

**Playwright `e2e/admin-page-edit.spec.ts`** (`desktop-1366`, `mode: 'serial'`; страница-фикстура создаётся через REST под e2e-админом (`adminApi`) с уникальным `slug` `e2e-page-<ts>` и удаляется в `afterAll`; вход в браузер — `signInBrowser`):
1. `/admin/collections/pages/<id>/` → вкладка «SEO»: ввод Title «Закалённое стекло на заказ» → счётчик `«26 / 70»` (`data-state="ok"`); ввод 75 символов → `data-state="over"` и текст «длиннее рекомендованного»; Description — счётчик «N / 170».
2. Превью сниппета: заголовок равен введённому Title, URL содержит хост `SITE_URL` и сегмент slug; очистка Title → заголовок «<название страницы> | Inex Glass» и метка «(из названия страницы)»; включение noindex → «Закрыта от индексации».
3. Сохранить черновик → в сайдбаре поле «Кем изменена» показывает имя e2e-админа (`E2E Админ`).
4. Сохранение с Title длиннее 70 не блокируется (ответ 200, документ сохранён).
5. Визуальная проверка (без мутаций): скриншот формы страницы 1366 сохраняется артефактом для task-13 (не `toHaveScreenshot`-эталон).

### Проверки

```bash
pnpm generate:importmap          # локально (компоненты те же пути); результат откатить
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm test:e2e e2e/admin-page-edit.spec.ts e2e/acceptance/admin.spec.ts   # публикация статей/объектов не сломана
git checkout src/app/\(payload\)/admin/importMap.js src/payload-types.ts
```

Скриншоты формы страницы (375 / 1366 / 1920) — сравнить с `res/admin-mockup/PageEdit.dc.html`: шапка с кнопками, две колонки, карточки, блоки, сниппет.

## Acceptance Criteria

- [ ] У `seo.title` и `seo.description` во всех коллекциях с SEO-группой — живые счётчики «N / 70» и «N / 170» (лимиты из `SEO_TITLE_SOFT_LIMIT` / `SEO_DESCRIPTION_SOFT_LIMIT`), превышение подсвечено, сохранение не блокируется.
- [ ] Превью сниппета показывает URL (хост › сегменты пути), заголовок (SEO-title или название + « | Inex Glass»), описание или подсказку, отметки noindex и плейсхолдеров; обновляется при вводе.
- [ ] «Кем изменена» видно в сайдбаре страницы и показывает имя сотрудника после сохранения; «Изменена» — в метаданных шапки.
- [ ] Экран редактирования документа в теме по макету: белая шапка с кнопками (primary `#267D70`, secondary с рамкой), две колонки, карточки, табы-сегменты, блоки как `.blk`, кнопка «Добавить блок», плавающая панель Lexical; фокус виден; 375 без горизонтального скролла.
- [ ] Файлы коллекций, `seo.ts` и `editor.ts` не изменены; стили только в `_edit-form.scss`, цвета только из токенов.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/admin-page-edit.spec.ts e2e/acceptance/admin.spec.ts` зелёные.

## Notes

- Модель: премиум для компонентов и тестов; стили — можно mid-tier по готовому описанию.
- Отличия от макета, сознательные: (1) счётчики 70/170 вместо 60/160 макета — решение заказчика; (2) SEO остаётся во вкладке «SEO» основной колонки, а не карточкой сайдбара — перенос потребовал бы изменения `pages.ts`/`seo.ts` (схема заморожена); (3) нет фиксированной панели «Ж / К / Ч» — в редакторе выключены инлайн-форматы; (4) нет карточек «Версии» и «Разметка Schema.org» — версии в стандартной вкладке «Версии»; (5) поле «Адрес страницы» с префиксом домена не делается — `path` вычисляется и только для чтения.
- «Система» для `updatedBy = null` и единая карточка «Публикация» (Статус / Изменена / Кем / «Открыть на сайте») требуют собственного компонента поля в `pages.ts` (`updatedBy.admin.components.Field` или ui-поле в сайдбаре), который в волне 2 зарегистрировать некому — вопрос к координатору (см. отчёт задачи).
- Стили общего экрана редактирования принадлежат этой задаче; task-12 не должна переопределять те же селекторы (`.collection-edit`, `.document-fields`, `.doc-controls`, `.blocks-field`, `.rich-text-lexical`), только экранно-специфичные.

## Поправки координатора (приоритет над текстом выше)

- task-01 создаёт заглушку `src/payload/admin/pages/updated-by-field.tsx` (`UpdatedByField`, подключена как `admin.components.Field` у `pages.updatedBy` в сайдбаре). Эта задача её наполняет: «Изменена ДД.ММ.ГГГГ, ЧЧ:ММ» (`updatedAt` из формы) и «Кем» (имя пользователя по id отдельным запросом к `/api/users/<id>?depth=0`, `null` → «Система»). Файл добавить в «Files to Modify»; `pages.ts` не трогать.
- Общие селекторы edit-view (`.collection-edit`, `.document-fields`, `.doc-controls`, `.doc-tabs`, `.blocks-field`, `.rich-text-lexical`) — только в `_edit-form.scss` этой задачи; task-12 стилизует лишь специфичные экраны.
- Экран редактирования на 375 px сейчас прокручивается по горизонтали (кнопки «Сохранить/Опубликовать» обрезаны; заголовок аккаунта и строка метаданных документа шире экрана). Исправить в `_edit-form.scss` этой задачи: критерий — нет горизонтального скролла на 375.
