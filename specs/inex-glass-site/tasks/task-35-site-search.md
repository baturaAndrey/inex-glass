# Task 35: Поиск по сайту — Postgres FTS, `/poisk/`, поиск в шапке и на 404

## Status

pending

## Wave

6

## Description

Полнотекстовый поиск по контенту сайта на Postgres FTS (русская морфология, нормализация «ё→е», поиск по префиксу) без внешних сервисов. Индекс наполняется через `@payloadcms/plugin-search`. Задача выдаёт страницу результатов `/poisk/` (noindex), подсказки в поле поиска шапки и строку поиска на странице 404 (ТЗ §2 п.4: «собственная страница 404 с поиском и ссылками на разделы»). **Это единственная задача после заморозки схемы, которой разрешено изменить схему БД**: она добавляет коллекцию `search` (плагин), колонку `tsvector` и GIN-индекс — поэтому она сама генерирует миграцию и обновляет `payload-types.ts`.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md
**Blocks:** task-39-perf-images.md, task-40-content-audit.md, task-42-final-acceptance.md

**Context from dependencies:**
- task-10 создал реестр плагинов `src/payload/plugins/index.ts`, уже подключённый в `payload.config.ts` (`plugins`, `db.afterSchemaInit: dbSchemaHooks`), и **no-op заглушку** `src/payload/plugins/search.ts` (экспорты `searchPluginEntry: Plugin`, `searchSchemaHooks`). Эта задача заменяет только файл заглушки; `payload.config.ts` и `plugins/index.ts` не трогает. Параллельно task-36 так же заменяет `src/payload/plugins/indexnow.ts`.
- task-16 создал `src/lib/seo/doc-url.ts` — `docUrl(collection, doc): string | null`, единственный резолвер «документ → канонический путь» (его же использует task-36).
- task-10 заморозил схему: одна начальная миграция в `src/migrations/` (+ `src/migrations/index.ts` для `prodMigrations`), `src/payload-types.ts`, `importMap.js`. Коллекции: `pages`, `thicknesses`, `thickness-groups`, `glass-types`, `processing-services`, `constructions`, `shower-configs`, `articles`, `objects`, `object-types`, `products`, `cities`, `team`, `media`, CRM-коллекции. Все id — UUID. У `pages`, `articles`, `objects`, `glass-types`, `constructions` включены versions/drafts (`_status`); у `objects` дополнительно `status: draft|published`.
- task-15 создал `src/lib/cms/payload.ts` (`getPayloadClient()`), `src/lib/cms/queries.ts`, `src/lib/seo/metadata.ts` (`buildMetadata`), `src/app/(site)/not-found.tsx` + `src/app/global-not-found.tsx` — обе рендерят общий `src/components/page/not-found-content.tsx` (404 со ссылками на разделы и **простой GET-формой поиска**), `src/components/page/page-shell.tsx`.
- task-14 создал `src/components/layout/header-search.tsx` (поле поиска в основной строке шапки; на ≤599 — иконка, раскрывающая поле).
- task-16 создал `src/components/rich-text/*` и `src/seed/lexical.ts`; контентные страницы хранят тело в Lexical (`SerializedEditorState`) и/или в блоках `layout[]`.
- Payload `plugin-search` по умолчанию создаёт коллекцию со slug `search` и публикует REST `/api/search`. Поэтому **наш публичный эндпоинт НЕ может называться `/api/search/`** — используем `/api/site-search/`.

## Files to Create

- `src/lib/search/normalize.ts` (+ `normalize.test.ts`) — `normalizeRu(text)` (lowercase, `ё→е`, схлопывание пробелов, срез HTML/служебных символов).
- `src/lib/search/lexical-to-text.ts` (+ тест) — Lexical state → plain text (обход дерева, тексты узлов, разделитель пробел).
- `src/lib/search/query.ts` (+ тест на сборку запроса) — `searchSite({ q, limit, offset })` на сыром SQL через `payload.db.drizzle`.
- `src/lib/search/types.ts` — `SearchHit { title, url, snippet, kind }`.
- `src/app/api/site-search/route.ts` — `GET /api/site-search/?q=&limit=` → JSON `{ hits: SearchHit[] }`.
- `src/app/(site)/poisk/page.tsx` — страница результатов (noindex).
- `src/components/search/search-form.tsx` — GET-форма (`action="/poisk/"`, поле `q`) для 404 и страницы результатов.
- `src/components/search/search-results.tsx` — список результатов, подсветка найденных слов.
- `src/migrations/<timestamp>_add_search.ts` и `.json` (генерирует `pnpm payload migrate:create add-search`) — не писать вручную; допустима ручная доработка SQL-части для GIN-индекса, если drizzle его не выразил (см. ниже).
- `e2e/search.spec.ts` — e2e.
- `scripts/reindex-search.ts` — первичная (пере)индексация существующего контента (см. «Плагин»).

## Files to Modify

- `src/payload/plugins/search.ts` — заменить no-op заглушку task-10 целиком: `searchPluginEntry` = `searchPlugin(...)` (конфиг ниже), `searchSchemaHooks` = `[tsvector-хук]` (`afterSchemaInit`). Имена экспортов сохранить. `payload.config.ts` и `src/payload/plugins/index.ts` **не трогать**: реестр уже подключён task-10.
- `src/migrations/index.ts` — регистрируется новая миграция (делает `migrate:create`).
- `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js` — регенерация (`pnpm generate:types`, `pnpm generate:importmap`). **Эта задача — владелец генерируемых файлов волны 6** (README): task-38 в той же волне генерирует importMap только локально; после слияния волны координатор перегенерирует.
- `src/components/layout/header-search.tsx` — подключить подсказки (debounce 200 мс → `/api/site-search/?q=&limit=6`), Enter → `/poisk/?q=…`.
- `src/components/page/not-found-content.tsx` — заменить простую форму поиска на `<SearchForm/>` (ссылки на разделы и кнопку оставить). `src/app/(site)/not-found.tsx` и `src/app/global-not-found.tsx` не трогать: они рендерят этот компонент.

НЕ трогать: схемы коллекций/глобалов (кроме новой коллекции `search` от плагина), `payload.config.ts`, `src/payload/plugins/{index,indexnow}.ts`, остальные `src/components/page/*`, `proxy.ts`, robots/sitemap (задача 36), `src/lib/seo/doc-url.ts` (task-16; если не хватает правила — сообщить координатору).

## Technical Details

### Что индексируется

| Коллекция | Условие попадания в индекс | `priority` (вес в выдаче) | URL результата |
|---|---|---|---|
| `glass-types` | `_status = published` | 10 | `/zakalennoe-steklo/{slug}/`; для `tripleks` → `/tripleks/` |
| `thicknesses` | всегда (включая 5/15/19 мм — люди ищут «15 мм») | 10 | `/zakalennoe-steklo/{n}-mm/` |
| `constructions` | published | 10 | корневой URL конструкции (см. маршруты задач 26–27: `/steklyannye-peregorodki/`, `/dushevye-peregorodki/`, `/osteklenie/{slug}/`, `/zerkala/{slug}/`, `/furnitura/` …) |
| `processing-services` | всегда | 8 | `/obrabotka-stekla/{slug}/` |
| `pages` | published, не служебные (исключить политику и согласие ПДн, `/zakaz/`) | 8 | `path` страницы |
| `articles` | published | 5 | `/blog/{slug}/` |
| `objects` | `status = published` | 3 | `/obekty/{slug}/` |

Не индексируем: черновики, `team`, `shower-configs` (они — карточки внутри страницы), CRM-коллекции, `media`.
Единый резолвер «документ → URL» — `docUrl(collection, doc)` из `src/lib/seo/doc-url.ts` (task-16). Не дублировать и не создавать свой.

### Плагин (`src/payload/plugins/search.ts`)

```ts
import { searchPlugin } from '@payloadcms/plugin-search'

export const searchPluginEntry = searchPlugin({
  collections: ['glass-types','thicknesses','constructions','processing-services','pages','articles','objects'],
  defaultPriorities: { 'glass-types': 10, thicknesses: 10, constructions: 10, 'processing-services': 8, pages: 8, articles: 5, objects: 3 },
  syncDrafts: false,          // в индексе только опубликованное
  deleteDrafts: true,         // снятие с публикации убирает из индекса
  beforeSync: ({ originalDoc, searchDoc }) => ({
    ...searchDoc,
    title: originalDoc.h1 ?? originalDoc.title ?? originalDoc.name ?? searchDoc.title,
    url: docUrl(searchDoc.doc.relationTo, originalDoc),   // string
    bodyText: normalizeRu(lexicalToText(...)),            // H1 + intro + текст блоков + FAQ-вопросы/ответы
    titleNorm: normalizeRu(title),
  }),
  searchOverrides: {
    slug: 'search',
    access: { read: () => false },  // REST закрыт; читаем только Local API с overrideAccess
    fields: ({ defaultFields }) => [
      ...defaultFields,
      { name: 'url', type: 'text' },
      { name: 'kind', type: 'text' },
      { name: 'titleNorm', type: 'text' },
      { name: 'bodyText', type: 'textarea' },
    ],
  },
})
```

- Точные названия опций сверь с актуальной документацией `@payloadcms/plugin-search` для Payload 3.91 (context7: «payload plugin-search beforeSync searchOverrides»). Если опции отличаются — адаптируй, суть сохранить.
- Плагин `@payloadcms/plugin-search` той же точной версии, что `payload`, **предустановлен task-10** — `package.json` не трогать; если пакета нет, сообщить координатору.
- `bodyText`: собирай из (a) H1/intro, (b) Lexical-полей документа (рекурсивно по всем полям типа richText: определяй по структуре `{ root: { children } }`), (c) блоков `layout[]` — тексты `richText`, заголовки/подписи карточек, строки таблиц, FAQ (вопрос+ответ). Не включай служебные поля (id, slug, SEO-описание — его включай в `bodyText` последним, описание полезно). Лимит `bodyText` — 50 000 символов (обрезать).
- Метки-плейсхолдеры `{цена}`, `{N}` и т.п. в индекс не подставляются: **вырезай `\{[^}]+\}`** из текста перед индексацией.
- Реиндексация существующего контента: плагин индексирует при изменении документа. Для первичного наполнения добавь скрипт `scripts/reindex-search.ts` (Local API: пройти по коллекциям, `payload.update` с `context: { disableRevalidate: true }` без изменения данных, либо вызвать публичный `reindexCollections`-эндпоинт плагина, если есть) и документируй запуск в отчёте. Вызывается после сида/импорта на любом окружении.

### tsvector + GIN (`afterSchemaInit`)

Адаптер `@payloadcms/db-postgres` поддерживает `afterSchemaInit: [({ schema, extendTable }) => schema]`. Хук экспортируется как `searchSchemaHooks` из `src/payload/plugins/search.ts`; task-10 уже передаёт его в адаптер через `dbSchemaHooks`. Добавь в таблицу `search` generated-колонку, чтобы миграции видели её:

```ts
import { customType, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' })

afterSchemaInit: [
  ({ schema, extendTable }) => {
    return extendTable({
      table: schema.tables.search,
      columns: {
        tsv: tsvector('tsv').generatedAlwaysAs(sql`
          setweight(to_tsvector('russian', coalesce(title_norm,'')), 'A') ||
          setweight(to_tsvector('russian', coalesce(body_text,'')), 'B')
        `),
      },
      extraConfig: (t) => ({ search_tsv_gin: index('search_tsv_gin').using('gin', t.tsv) }),
    })
  },
]
```

- Имена таблицы/колонок в схеме drizzle Payload — snake_case: `search`, `title_norm`, `body_text`. Проверь по сгенерированной схеме; `generatedAlwaysAs` требует IMMUTABLE-выражения: `to_tsvector('russian'::regconfig, text)` с литералом конфигурации — immutable, `coalesce` — тоже. Если версия drizzle не поддерживает `generatedAlwaysAs` для customType — сделай обычную колонку `tsv tsvector` + обновляй её SQL-триггером в миграции (`CREATE TRIGGER … tsvector_update_trigger`/функция), и опиши в отчёте.
- Нормализация `ё→е` выполняется на стороне приложения (`normalizeRu`) перед записью в `title_norm`/`body_text`; запрос нормализуется той же функцией.
- Затем: `pnpm payload migrate:create add-search` на чистой локальной БД (docker compose postgres), проверить SQL миграции (CREATE TABLE search…, ADD COLUMN tsv … GENERATED ALWAYS AS … STORED, CREATE INDEX … USING gin), применить `pnpm payload migrate`, затем `pnpm generate:types`, `pnpm generate:importmap`. Миграция только добавляющая (expand-only) — откат прода безопасен. `drizzle push` запрещён.

### Запрос (`src/lib/search/query.ts`)

```sql
WITH q AS (
  SELECT
    websearch_to_tsquery('russian', $1) AS exact_q,
    to_tsquery('russian', $2)           AS prefix_q      -- 'слово1 & слово2:*' для последнего слова
)
SELECT s.title, s.url, s.kind, s.priority,
       ts_headline('russian', s.body_text, q.exact_q, 'MaxFragments=1,MaxWords=28,MinWords=12,StartSel=<mark>,StopSel=</mark>') AS snippet,
       (ts_rank_cd(s.tsv, q.exact_q) * 2 + ts_rank_cd(s.tsv, q.prefix_q)) * (1 + s.priority / 10.0) AS rank
FROM search s, q
WHERE s.tsv @@ q.exact_q OR s.tsv @@ q.prefix_q
ORDER BY rank DESC, s.title
LIMIT $3 OFFSET $4;
```

- `$1` = `normalizeRu(q)`; `$2` строится в TS: разбить на слова `[\p{L}\p{N}]+` (юникод), оставить слова длиной ≥ 2, экранировать (оставлять только буквы/цифры — защита от инъекции синтаксиса tsquery), последнее слово получает суффикс `:*`, соединить ` & `. Если слов нет — вернуть пустой результат без запроса.
- Параметры передавать через `sql` placeholders drizzle (`payload.db.drizzle.execute(sql\`...${q}...\`)`), **никакой конкатенации строк**.
- Длина `q` ограничена 100 символами (обрезать), `limit` ≤ 20 (по умолчанию 10; для `/poisk/` — 20 с пагинацией через `offset`, страница N → `offset = (N-1)*20`; ссылки пагинации `?q=…&page=N`).
- `snippet`: `ts_headline` возвращает HTML с `<mark>`; на клиент отдаём санитизированный: экранировать всё, кроме `<mark>`/`</mark>` (написать `sanitizeSnippet` и покрыть тестом на `<script>`).
- Если `ts_headline` на `body_text` слишком медленный, ограничить вход `left(s.body_text, 5000)`.
- Опечатки/синонимы — вне рамок (не делать).

### Эндпоинт и страница

- `GET /api/site-search/?q=&limit=`: без аутентификации, `Cache-Control: public, max-age=60` для идентичных запросов, ответ 400 при пустом/слишком коротком `q` (< 2 символов), простой in-memory rate limit не нужен (запрос дешёвый, GIN), но обязательно try/catch и `{hits: []}` при ошибке БД (без утечки текста ошибки).
- `/poisk/` (`src/app/(site)/poisk/page.tsx`): Server Component, читает `searchParams.q` и `page`, вызывает `searchSite` напрямую (не через HTTP). Мета: `robots: { index: false, follow: true }`, title «Поиск по сайту | Inex Glass», canonical не нужен. Структура: крошки «Главная → Поиск»; H1 «Поиск по сайту» (если есть q: «Результаты по запросу «…»» — значение q выводить только как текст, React экранирует); `<SearchForm defaultValue={q}/>`; список: заголовок-ссылка, путь (url), сниппет с `<mark>`, значок типа («Статья», «Объект», «Услуга», «Вид стекла»…); пагинация; пустой результат: «Ничего не найдено по запросу «…»» + 6 ссылок-разделов (как на 404: Закалённое стекло, Обработка стекла, Стеклянные конструкции, Как заказать, Объекты, Контакты) + CTA «Рассчитать стоимость» (`quiz-cta`). Первый экран страницы содержит кнопку «Рассчитать стоимость» (в шапке — глобально). `dynamic = 'force-dynamic'` не нужен: чтение `searchParams` и так делает страницу динамической.
- Страница закрыта в robots.txt (`Disallow: /poisk/`, задача 36) и в sitemap не попадает — этих файлов здесь не трогаем. Обрати внимание: noindex-метка + Disallow — осознанное решение по ТЗ §8.3 и §8.6.
- Шапка: поле поиска показывает до 6 подсказок (заголовок + тип), навигация стрелками, Enter без выбора → `/poisk/?q=…`, Esc закрывает; `role="combobox"`/`listbox`, `aria-live="polite"` для числа найденных. Пустой ввод — без запроса. Поле не отправляет пробельные запросы.
- 404: форма `<SearchForm/>` (GET `/poisk/`), под ней ссылки на 9 разделов; никаких подсказок на 404 не нужно.

### Тесты

- Vitest: `normalizeRu` (ё/Ё, неразрывные пробелы, регистр), `lexicalToText` (вложенные узлы, списки, таблицы), построение `prefix_q` (спецсимволы `& | ! ( ) : '` вырезаются; один символ отбрасывается), `sanitizeSnippet`.
- Интеграционно (против локальной БД, в CI Postgres service): после `pnpm seed --minimal` и `reindex` запрос «закаленное стекло», «закалённое», «ТОЛЩИНА 10», «перегор» (префикс) возвращает ожидаемые страницы. Если мини-сида недостаточно — создай фикстуры в тесте через Local API.
- Playwright `e2e/search.spec.ts`: ввод в шапке → подсказки → Enter → `/poisk/?q=…` с результатами; `meta[name=robots]` содержит `noindex`; запрос без результатов; XSS-строка `<img src=x onerror=alert(1)>` не исполняется и экранирована; на 404 есть поле поиска и работает; скриншоты 375/1366/1920.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` проходят; в CI миграция `add-search` применяется на чистой БД поверх начальной.
- [ ] `pnpm payload migrate:create add-search` сгенерировал одну миграцию; в ней есть колонка `tsv` и GIN-индекс; `payload-types.ts` и `importMap.js` обновлены; `EXPLAIN` запроса использует индекс `search_tsv_gin` на объёме ≥ 1000 записей (проверка на синтетических данных, результат в отчёте).
- [ ] Поиск «закаленное» и «закалённое» даёт одинаковую выдачу; «перегор» находит страницу «Стеклянные перегородки» (префикс); результаты отсортированы с учётом priority.
- [ ] Черновики и служебные страницы (политика, согласие, `/zakaz/`) в выдаче отсутствуют; снятая с публикации страница исчезает из индекса.
- [ ] `/poisk/` отдаёт `noindex, follow`, XSS-безопасна, содержит пагинацию, пустое состояние и CTA; REST `/api/search/` недоступен анонимно (403/404), `/api/site-search/` работает.
- [ ] Поиск в шапке (десктоп и ≤599) показывает подсказки, управляется с клавиатуры; 404 содержит рабочий поиск и ссылки на разделы.
- [ ] Миграция только добавляет объекты (expand-only); `drizzle push` не использовался.
- [ ] Запуск `scripts/reindex-search.ts` документирован и отрабатывает на сидовых данных.
- [ ] Визуальная сверка `/poisk/` и 404 на 375/1366/1920 с токенами дизайн-системы (`ig-*`), без emoji, иконки Lucide stroke 2.

## Notes

- Премиум-модель (SQL/Payload internals). Для актуальных опций `plugin-search` и `afterSchemaInit` используй context7/Exa (Payload 3.91).
- Если Payload в `afterSchemaInit` меняет API (3.9x) — сверься с примером в `payload/packages/db-postgres` tests; при неустранимой проблеме запасной путь — обычная колонка `tsv` + триггер в SQL-миграции (+ запись `// custom` в миграции), но оставить тот же интерфейс `searchSite`.
- Эта задача — исключение из «schema freeze»: об изменении схемы сообщить координатору явно (список добавленных таблиц/колонок/индексов).
- (Ревью волны 3) `scripts/verify-schema.ts` (task-10) сверяет точный список slug коллекций — добавить в него `search`. Контракт реестра плагинов: заменить `src/payload/plugins/search.ts`, сохранив экспорты `searchPluginEntry: Plugin` и `searchSchemaHooks` (массив хуков `afterSchemaInit`); `index.ts` и `payload.config.ts` не трогать.
