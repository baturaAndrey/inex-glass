# Task 10: Заморозка схемы данных (единая миграция, типы, importMap)

## Status

pending

## Wave

3

## Description

Задача-«координатор» схемы. Задачи 06 (globals), 07 (каталог и контент, блоки), 08 (CRM) параллельно добавили в реестры Payload свои коллекции, globals и блоки, не запуская миграций. Здесь нужно свести всё в `payload.config.ts`, проверить согласованность схемы, сгенерировать **одну** миграцию, `src/payload-types.ts` и `importMap.js`, прогнать миграцию на чистой БД и убедиться, что админка рендерит все коллекции и globals. После этой задачи схема **заморожена**: задачи следующих волн не меняют поля Payload, а при нехватке поля останавливаются и сообщают координатору.

Дополнительно задача заранее ставит зависимости, которые понадобятся задачам Wave 4–6 (чтобы параллельные агенты не правили `package.json` и `pnpm-lock.yaml` одновременно).

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md, task-06-schema-globals.md, task-07-schema-content-catalog.md, task-08-schema-crm.md
**Blocks:** task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-17-lead-intake-uploads.md, task-18-email-jobs.md (и все последующие; реестр плагинов — для task-35/36)

**Context from dependencies:**

- **task-01** создал: Next.js 16.4.x + Payload 3.91.x (все `payload` / `@payloadcms/*` в `package.json` закреплены одной точной версией, без `^`); группы роутов `src/app/(site)` и `src/app/(payload)`; `src/payload.config.ts` (postgres-адаптер `@payloadcms/db-postgres` с `idType: 'uuid'`, Lexical, `prodMigrations` из `src/migrations/index.ts`, alias `@payload-config`); коллекцию `users` (`src/payload/collections/users.ts`, роли `admin` / `manager`); реестры-заглушки: `src/payload/collections/{content,catalog,crm}/index.ts` (экспортируют `contentCollections`, `catalogCollections`, `crmCollections: CollectionConfig[]`), `src/payload/globals/index.ts` (`globals: GlobalConfig[]`), `src/payload/blocks/index.ts` (`pageBlocks: Block[]`), `src/payload/access/index.ts` (`isAdmin`, `isAdminOrManager`, `isLoggedIn`); `src/lib/env.ts` (zod); `docker-compose.yml` (postgres:18 + mailpit); скрипты `package.json` (`payload`, `migrate`, `migrate:create`, `generate:types`, `generate:importmap`, `seed`, `lint`, `typecheck`, `check`); **первую миграцию** (users + системные таблицы Payload) в `src/migrations/`.
- **task-06** добавил globals в `src/payload/globals/*.ts` и в `globals/index.ts`: `prices`, `promo`, `conditions`, `contacts`, `requisites`, `tech-params`, `site-settings`, `navigation`, `snippets`; хелпер `src/payload/hooks/revalidate.ts` (`revalidateGlobal(slug)`, `revalidateCollection(slug)`).
- **task-07** добавил коллекции каталога/контента (`media`, `pages`, `thicknesses`, `thickness-groups`, `glass-types`, `processing-services`, `constructions`, `shower-configs`, `articles`, `objects`, `object-types`, `products`, `cities`, `team`), общие поля `src/payload/fields/*` (seo, quizPrefill, slug, faq) и библиотеку блоков `src/payload/blocks/*` (+ `pageBlocks`).
- **task-08** добавил CRM: `lead-files`, `lead-statuses`, `leads`, `orders`, `order-files`, `consent-log`, `redirects`, `rate-limits` (скрытая), расширил поля `users` (phone, messengerUrl, photo, position), оставил no-op `src/payload/hooks/order-from-lead.ts`.
- В Wave 2–3 никто из этих задач не запускал `migrate:create` и не правил `src/payload-types.ts`.

## Files to Create

- `src/migrations/<timestamp>_content_schema.ts` и `.json` — сгенерированная Payload миграция (имя файла создаёт CLI)
- `src/payload-types.ts` — сгенерированные типы (перезаписывается генератором)
- `src/app/(payload)/admin/importMap.js` — сгенерированный importMap (путь зависит от шаблона task-01; перегенерировать командой)
- `scripts/verify-schema.ts` — скрипт-проверка: поднимает Payload Local API и сверяет список slug коллекций/globals и ключевые свойства (см. ниже)
- `src/payload/plugins/index.ts` — реестр плагинов и хуков схемы БД (см. «Реестр плагинов»)
- `src/payload/plugins/search.ts` — **no-op заглушка** (`searchPluginEntry`, `searchSchemaHooks`); целиком заменяет task-35
- `src/payload/plugins/indexnow.ts` — **no-op заглушка** (`indexNowPlugin`); целиком заменяет task-36

## Files to Modify

- `src/payload.config.ts` — подключение реестров, если task-06/07/08 этого не сделали; подключение реестра плагинов: `plugins` и `db.afterSchemaInit` (см. «Реестр плагинов»); **не добавлять** `email` и `jobs` (их добавляет task-18)
- `src/payload/editor.ts` — (замечание ревью волны 1) ограничить `LinkFeature({ enabledCollections: [...] })` тем же списком коллекций, что у `linkField()` в `src/payload/fields/link.ts` (сейчас дефолт разрешает ссылки на все коллекции, включая `users`). Изменение затрагивает схему (поле ссылки в rich text) — делать до генерации миграции.
- `src/migrations/index.ts` — обновляется автоматически CLI (проверить, что новая миграция попала в экспорт)
- `package.json`, `pnpm-lock.yaml` — **только** предустановка зависимостей из раздела «Предустановка зависимостей»
- Любые файлы схемы из task-06/07/08 — **только** для исправления конфликтов/ошибок, найденных проверкой (перечислить в отчёте)

## Technical Details

### Implementation Steps

1. **Свести реестры.** Открыть `src/payload.config.ts` и убедиться, что:
   ```ts
   collections: [Users, ...contentCollections, ...catalogCollections, ...crmCollections],
   globals,
   ```
   и что `pages` (task-07) использует `pageBlocks`. Любые дубли slug, повторные импорты и циклические импорты устранить.
2. **Статическая проверка схемы** (исправить найденное в файлах схемы, список правок — в отчёт):
   - все slug коллекций и globals — kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`);
   - `idType: 'uuid'` в адаптере; для коллекций не заданы собственные `id` поля других типов;
   - у `lead-files` и `order-files` `access.read` — только `admin`/`manager`; у `rate-limits` `admin.hidden: true` и доступ только `admin`; у `consent-log` создание запрещено через REST (`access.create: () => false`), создаётся Local API с `overrideAccess`;
   - у `orders` — уникальный индекс по `tokenHash` и по `number`; у `rate-limits` — **уникальный** индекс по `key` (на него опирается `ON CONFLICT` из task-17);
   - `staticDir` у `media`, `lead-files`, `order-files` берётся из `MEDIA_DIR` / `UPLOADS_DIR` (абсолютные пути из `src/lib/env.ts`), а не захардкожен;
   - `upload.limits.fileSize` ≈ 52 MiB, `requestSizeLimit` ≈ 55 MiB (в `payload.config.ts` или коллекциях — как решила task-01/08);
   - `versions`/`drafts` включены на `pages`, `articles`, `objects`, `glass-types`, `constructions`; на `leads` включены versions (история);
   - в `payload.config.ts` нет `db.push: true` (при `NODE_ENV=production` push запрещён; в dev — только на собственной одноразовой БД).
3. **Чистая БД.** `docker compose up -d postgres`. Создать пустую БД `inex_glass_freeze`, экспортировать `DATABASE_URL` на неё (не трогать БД разработчика). Убедиться, что в `src/migrations/` лежит только миграция task-01.
4. **Сгенерировать миграцию:**
   ```bash
   pnpm payload migrate:create content_schema
   ```
   CLI строит diff относительно снимка предыдущей миграции. Открыть сгенерированный SQL и проверить: нет `DROP TABLE`/`DROP COLUMN` существующих таблиц task-01; id — `uuid` с `DEFAULT gen_random_uuid()`; присутствуют таблицы `*_v` (versions), `leads`, `orders`, `rate_limits`, enum-типы; индексы unique на `orders.token_hash`, `rate_limits.key`, slug-и. Если SQL содержит ручные части (например, расширение `pgcrypto`) — убедиться, что они идемпотентны.
5. **Применить:** `pnpm payload migrate` на чистой БД, затем `pnpm payload migrate:status` (все `Ran = Yes`). Проверить повторяемость: `pnpm payload migrate:fresh` (с подтверждением) на той же БД проходит без ошибок.
6. **Типы и importMap:**
   ```bash
   pnpm payload generate:types
   pnpm payload generate:importmap
   ```
   Проверить, что `src/payload-types.ts` содержит интерфейсы всех коллекций и globals (`Page`, `Thickness`, `Lead`, `Order`, `Price`/`Prices`, `Navigation`, … — имена из slug) и что `pnpm typecheck` проходит.
7. **Скрипт `scripts/verify-schema.ts`.** Запускается как `pnpm payload run scripts/verify-schema.ts` (или `pnpm tsx` с загрузкой env — по способу, принятому в task-01 для `seed`). Он:
   - получает `payload = await getPayload({ config })`;
   - сверяет список slug коллекций с ожидаемым (ниже) и выходит с кодом 1 при расхождении;
   - сверяет список globals;
   - для каждого global выполняет `payload.findGlobal({ slug })`, для каждой коллекции `payload.find({ collection, limit: 1 })` (не падает на пустой БД);
   - проверяет `payload.db.drizzle` доступен и таблица `rate_limits` имеет unique-индекс по `key` (запрос к `pg_indexes`);
   - печатает «OK».
8. **Проверка админки.** `pnpm dev`, открыть `/admin/` (со слешем): создать первого администратора, убедиться что в боковом меню отображаются все коллекции (кроме скрытых) и globals, открыть форму создания `pages` (блоки подгружаются, нет ошибок importMap), `leads`, `orders`, global `navigation`. Консоль браузера и сервера без ошибок. `REST /api/users/me/` отвечает.
9. **Предустановка зависимостей** (единственный шаг, где задача меняет `package.json`): версии плагинов Payload — **та же точная**, что у `payload`:
   ```bash
   PV=$(node -p "require('payload/package.json').version")
   pnpm add -E busboy @react-email/components "@payloadcms/email-nodemailer@$PV" "@payloadcms/plugin-search@$PV" exceljs
   pnpm add -D -E @types/busboy "@next/bundle-analyzer@$(node -p "require('next/package.json').version")" cheerio csv-parse
   ```
   Кому нужны: `busboy` — 17; `@react-email/components`, `@payloadcms/email-nodemailer` — 18; `exceljs` — 32; `@payloadcms/plugin-search` — 35; `cheerio`, `csv-parse` — 37 и 40; `@next/bundle-analyzer` — 39. Задачи волн 4–6 `package.json` не меняют; в волне 7 script-алиасы добавляет только task-40. Если исполнителю понадобится ещё пакет, он сообщает координатору.
   Проверить `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (build без миграций и **без БД**: задайте `DATABASE_URL` на недоступный хост — сборка не должна падать из-за схемы).
10. Не коммитить самостоятельно: коммит делает координатор (`checkpoint`). Оставить рабочее дерево с миграцией, типами и importMap.

### Реестр плагинов (точка расширения для task-35/36)

Задачи 35 (поиск) и 36 (IndexNow) работают в одной волне. Чтобы они не правили `payload.config.ts` одновременно, реестр подключается здесь, заранее:

```ts
// src/payload/plugins/search.ts — заглушка, task-35 заменит файл целиком
import type { Plugin } from 'payload';
export const searchPluginEntry: Plugin = (config) => config;
export const searchSchemaHooks: NonNullable<Parameters<typeof postgresAdapter>[0]['afterSchemaInit']> = [];

// src/payload/plugins/indexnow.ts — заглушка, task-36 заменит файл целиком
export const indexNowPlugin: Plugin = (config) => config;

// src/payload/plugins/index.ts
export const plugins: Plugin[] = [searchPluginEntry, indexNowPlugin];
export const dbSchemaHooks = [...searchSchemaHooks];

// src/payload.config.ts
plugins,
db: postgresAdapter({ …, afterSchemaInit: dbSchemaHooks }),
```

Тип `afterSchemaInit` уточнить по `@payloadcms/db-postgres` 3.91. Заглушки не меняют схему: `migrate:create` после их подключения не должен видеть diff.

### Ожидаемые slug

```text
collections: users, media, pages, thicknesses, thickness-groups, glass-types,
  processing-services, constructions, shower-configs, articles, objects, object-types,
  products, cities, team, lead-files, lead-statuses, leads, orders, order-files,
  consent-log, redirects, rate-limits
globals: prices, promo, conditions, contacts, requisites, tech-params,
  site-settings, navigation, snippets
```
(Системные `payload-*` коллекции не считаются. Коллекции `payload-jobs` пока нет — см. «Заметки». Коллекция `search` появится в task-35.)

### Правило заморозки (записать в итоговый отчёт для координатора)

После этой задачи поля коллекций/globals/блоков не меняются. Исключения с собственной миграцией и перегенерацией типов, идущие строго по одному: task-18 (таблицы очереди заданий `payload-jobs`; там же регистрируются **все** slug заданий, включая заглушку `indexnow-submit`, т. к. slug задания входит в enum БД) и task-35 (полнотекстовый поиск). Генерируемые файлы (`payload-types.ts`, `importMap.js`, `migrations/index.ts`) в каждой волне коммитит одна задача-владелец (README): W4 — 18, W5 — 32, W6 — 35. Любой другой запрос на изменение схемы — отдельная схемная задача координатора.

### Environment Variables

- `DATABASE_URL` — только для проверки на одноразовой БД (`postgres://…/inex_glass_freeze`).
- Остальные переменные — как в `env.example` task-01.

## Acceptance Criteria

- [ ] В `src/migrations/` одна новая миграция (поверх миграции task-01), SQL проверен: без деструктивных операций над существующими таблицами; `pnpm payload migrate` на чистой БД и `migrate:fresh` проходят без ошибок; `migrate:status` — всё выполнено.
- [ ] `src/payload-types.ts` сгенерирован из итоговой схемы и содержит типы всех коллекций и globals из списка; `pnpm typecheck` и `pnpm lint` проходят.
- [ ] `importMap.js` перегенерирован; `/admin/` открывается, все коллекции и globals из списка видны, форма создания `pages` с блоками, `leads`, `orders` открываются без ошибок.
- [ ] `pnpm payload run scripts/verify-schema.ts` печатает `OK` (slug-списки совпадают, unique-индексы `orders.token_hash`, `rate_limits.key`, приватные коллекции закрыты).
- [ ] Зависимости из шага 9 установлены с точными версиями (`@payloadcms/*` совпадают с `payload`), `pnpm install --frozen-lockfile` проходит, `pnpm build` проходит без доступной БД.
- [ ] Реестр `src/payload/plugins/{index,search,indexnow}.ts` создан с no-op заглушками и подключён в `payload.config.ts` (`plugins`, `db.afterSchemaInit`); diff схемы от заглушек отсутствует.
- [ ] Отчёт содержит: список исправлений в файлах task-06/07/08, список созданных/изменённых файлов, подтверждение правила заморозки.

## Notes

- Модель: премиум (много кросс-проверок, чтение чужого кода).
- Миграция task-01 уже содержит только `users` и системные таблицы; новая миграция получится «приращением». Если у task-01 первая миграция содержала что-то иное — действовать по факту, но результат должен быть воспроизводим на пустой БД.
- Очередь заданий (`payload-jobs`) появится в схеме только после подключения `jobs` в task-18; поэтому task-18 сама сгенерирует миграцию `add_jobs_queue` (разрешённое исключение). Не добавляйте `jobs` в конфиг здесь.
- `drizzle push` запрещён (AGENTS.md). Правило «drizzle generate/migrate» заменено миграциями Payload (`payload migrate:create`).
- Только expand/contract: удаление/переименование полей — отдельным релизом после того, как код перестал их использовать.
