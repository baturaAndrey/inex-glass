# Task 01: Фундамент — чистка стартера, Next 16.4, Payload 3.91

## Status

complete

## Wave

1

## Description

Превращаем стартовый шаблон (Better Auth, AI-чат, Drizzle, Vercel Blob, next-themes) в основу сайта Inex Glass: Next.js 16.4.x с встроенной Payload CMS 3.91.x на Postgres. Задача создаёт каркас, на который в следующих волнах ложатся схема данных, дизайн-система, тесты и деплой: группы маршрутов `(site)` и `(payload)`, `payload.config.ts`, коллекцию `users` с ролями, реестры-заглушки коллекций/глобалов/блоков, валидацию env, docker-compose для разработки, `proxy.ts`, первую (базовую) миграцию и smoke-тест админки при `trailingSlash: true`. Все остальные задачи зависят от этой, поэтому здесь важны точные версии, структура файлов и контракты (см. ниже).

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-02-testing-ci.md, task-03-docker-deploy-spike.md, task-04-design-docs.md, task-05-design-tokens-shell-primitives.md, task-06-schema-globals.md, task-07-schema-content-catalog.md, task-08-schema-crm.md, task-09-kie-image-generator.md (и далее все остальные)

**Context from dependencies:** Зависимостей нет. Исходное состояние репозитория: стартер `agentic-coding-starter-kit` (Next 16.1.6, React 19.2.4, Tailwind v4, shadcn new-york, pnpm 11, Node 24 локально; `.nvmrc` сейчас `20`). `src/proxy.ts` (не в корне) использует `better-auth/cookies`. В корне лежит `.env` с ключами dev-инструментов (`KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`) — значения не выводить в лог, не коммитить, не удалять. Проектные правила — `AGENTS.md`/`DESIGN.md` (будут переписаны задачей 04; в этой задаче их не трогать).

## Files to Create

- `src/payload.config.ts` — конфиг Payload (см. сниппет).
- `src/payload/collections/users.ts` — коллекция `users` (auth, роли).
- `src/payload/collections/content/index.ts` — `export const contentCollections: CollectionConfig[] = []`.
- `src/payload/collections/catalog/index.ts` — `export const catalogCollections: CollectionConfig[] = []`.
- `src/payload/collections/crm/index.ts` — `export const crmCollections: CollectionConfig[] = []`.
- `src/payload/globals/index.ts` — `export const globals: GlobalConfig[] = []`.
- `src/payload/blocks/index.ts` — `export const pageBlocks: Block[] = []`.
- `src/payload/access/index.ts` — хелперы доступа (контракт ниже).
- `src/payload/slugs.ts` — хелперы `rel()` / `relGlobal()` (контракт ниже).
- `src/payload/editor.ts` — общий Lexical-редактор `richTextEditor` (контракт ниже).
- `src/payload/fields/link.ts` — общее поле-ссылка `linkField()` (контракт ниже).
- `src/lib/env.ts` — переписать (zod-схема env), см. ниже (файл существует — «Modify», но по сути создаётся заново).
- `src/app/(payload)/layout.tsx`, `src/app/(payload)/custom.scss`, `src/app/(payload)/admin/importMap.js`, `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/admin/[[...segments]]/not-found.tsx`, `src/app/(payload)/api/[...slug]/route.ts`, `src/app/(payload)/api/graphql/route.ts`, `src/app/(payload)/api/graphql-playground/route.ts` — по официальному шаблону Payload (см. «Code Snippets»).
- `src/app/(site)/layout.tsx` — временный корневой layout сайта (`<html lang="ru">`).
- `src/app/(site)/page.tsx` — временная главная (минимальный русский текст «Inex Glass — сайт в разработке», один `<h1>`).
- `src/app/(site)/not-found.tsx`, `src/app/(site)/error.tsx` — перенос из старого `src/app/`, упрощённые, на русском.
- `src/app/(site)/robots.ts`, `src/app/(site)/sitemap.ts`, `src/app/(site)/manifest.ts` — перенос; только главная, `SITE_URL` из env; robots: `Disallow: /admin/, /api/`. Временные: задача 36 удалит `robots.ts` (заменит на `src/app/robots.txt/route.ts`) и перепишет `sitemap.ts`.
- `src/seed/index.ts` — заглушка CLI: разбирает аргументы (`--minimal`, `--full`, `--only=`), печатает «seed not implemented yet» и завершается кодом 0 (задача 16 заменит файл).
- `src/migrations/` — создаётся командой `payload migrate:create` (файлы `*_baseline.ts/.json` и `index.ts`).
- `docker/postgres/init/01-create-test-db.sql` — `CREATE DATABASE inex_glass_test;` (для локальных тестов, монтируется в compose).
- `README.md` — заменить стартовый README коротким русским описанием проекта (стек, команды `pnpm dev|migrate|check`, как поднять docker-compose).

## Files to Modify

- `package.json` — версии, зависимости, скрипты (см. ниже), `"packageManager": "pnpm@11.1.3"`, `"engines": {"node": ">=24 <25"}`; убрать поле `pnpm` (pnpm 11 его игнорирует).
- `pnpm-workspace.yaml` — перенести `overrides` для `@types/react`/`@types/react-dom` (из `package.json`), расставить `allowBuilds` (сейчас там заглушки «set this to true or false»): `sharp: true`, `esbuild: true`, `unrs-resolver: true`, `msw: false`.
- `.nvmrc` — `24`.
- `next.config.ts` — переписать (см. ниже).
- `tsconfig.json` — alias `@payload-config`, `target: ES2022` (см. ниже).
- `eslint.config.mjs` — убрать `drizzle/**`, добавить ignores: `src/migrations/**`, `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`, `.data/**`.
- `components.json` — `tailwind.css` → `src/app/(site)/globals.css`.
- `src/proxy.ts` — переписать (см. ниже).
- `src/app/globals.css` → перенести в `src/app/(site)/globals.css` (`git mv`, содержимое не менять; задача 05 его перепишет).
- `src/components/ui/sonner.tsx` — убрать `next-themes` (`useTheme`), тема фиксированная `light`.
- `src/components/ui/button.tsx` и остальные `ui/*` — не трогать, кроме сломанных удалением зависимостей импортов.
- `docker-compose.yml` — переписать (см. ниже).
- `env.example` — переписать (см. ниже).
- `.gitignore` — добавить `/.data`, `/test-results`, `/playwright-report`, `/src/payload-generated-schema.ts`; убедиться, что `.env*` по-прежнему игнорируется и `env.example` не игнорируется.
- Локальный `.env` — дописать новые переменные (`DATABASE_URL`, `PAYLOAD_SECRET` и т. д.), удалить устаревшие (`POSTGRES_URL`, `BETTER_AUTH_*`, `OPENROUTER_*`, `BLOB_*`, `POLAR_*`, `OPENAI_*`, `NEXT_PUBLIC_APP_URL`). Ключи dev-инструментов не трогать.

## Files to Delete

- `src/app/(auth)/**`, `src/app/api/auth/**`, `src/app/api/chat/**`, `src/app/api/diagnostics/**`, `src/app/chat/**`, `src/app/dashboard/**`, `src/app/profile/**`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts` (после переноса в `(site)`); **корневого** `src/app/layout.tsx` быть не должно — у каждой группы свой root layout. `src/app/favicon.ico` оставить на месте.
- `src/components/auth/**`, `src/components/setup-checklist.tsx`, `src/components/starter-prompt-modal.tsx`, `src/components/theme-provider.tsx`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/components/ui/github-stars.tsx`, `src/components/ui/mode-toggle.tsx`, `src/components/ui/avatar.tsx`
- `src/hooks/use-diagnostics.ts`
- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/lib/db.ts`, `src/lib/schema.ts`, `src/lib/storage.ts`
- `drizzle/`, `drizzle.config.ts`, `scripts/setup.ts`
- `docs/business/`, `docs/technical/`, `specs/ui-polish-responsive/`
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

## Technical Details

### Версии (точные, без `^`)

- `next@16.4.2`, `eslint-config-next@16.4.2` (на 20.10.2026 `latest` = 16.4.2; допустим любой 16.4.x), `react`/`react-dom` 19.2.x (оставить как есть, `@types/react` 19.2.x по overrides).
- `payload@3.91.0` и **все** `@payloadcms/*` ровно `3.91.0`: `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/ui`, `@payloadcms/translations`. Ставить с `-E`.
- `sharp`, `graphql` (peer Payload; `graphql@^16.8.1`), `tsx` (уже есть).
- Удалить из зависимостей: `better-auth`, `@better-auth/api-key`, `ai`, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`, `react-markdown`, `@vercel/blob`, `next-themes`, `drizzle-orm`, `drizzle-kit`, `postgres`, `pg`, `@types/pg`, `@radix-ui/react-avatar`. Оставить: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `lucide-react`, `sonner`, `tailwind-merge`, `zod`, `tw-animate-css`. (`pg` для тестовых скриптов добавит задача 02.)

```bash
pnpm remove better-auth @better-auth/api-key ai @ai-sdk/react @openrouter/ai-sdk-provider react-markdown @vercel/blob next-themes drizzle-orm drizzle-kit postgres pg @types/pg @radix-ui/react-avatar
pnpm add -E next@16.4.2 payload@3.91.0 @payloadcms/next@3.91.0 @payloadcms/db-postgres@3.91.0 @payloadcms/richtext-lexical@3.91.0 @payloadcms/ui@3.91.0 @payloadcms/translations@3.91.0
pnpm add sharp graphql
pnpm add -D -E eslint-config-next@16.4.2
```

Если `pnpm install` ругается на peer-диапазон Payload (`next >=16.3.3 <17`) — 16.4.2 подходит.

### package.json scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "check": "pnpm lint && pnpm typecheck",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "payload": "payload",
  "migrate": "payload migrate",
  "migrate:create": "payload migrate:create",
  "migrate:status": "payload migrate:status",
  "generate:types": "payload generate:types",
  "generate:importmap": "payload generate:importmap",
  "seed": "payload run src/seed/index.ts"
}
```

Правила: `build` **не** запускает миграции и не требует БД; `db:*`, `setup`, `env:check`, `build:ci` удалить. Ключи `test`/`test:e2e` добавит задача 02 — не добавлять здесь.

### Структура маршрутов

- `src/app/(site)/…` — публичный сайт со своим root layout (`<html lang="ru"><body>`; шрифты Rubik и стили дизайн-системы подключит задача 05, сейчас системный шрифт и существующий `globals.css`). **Не** подключать Geist через `next/font/google`.
- `src/app/(payload)/…` — админка Payload и REST/GraphQL из официального шаблона. В Payload-группе root layout — `RootLayout` из `@payloadcms/next/layouts`.
- Каталог `src/app/api/` вне групп допустим для route handlers без layout (позже: `api/health`, `api/upload`, `api/forms/lead` (не `api/leads`: этот путь занят REST-API Payload коллекции `leads`), `api/form-token`) — статический сегмент в приоритете над `[...slug]` Payload.
- Т. к. root layout'ов два, обычный `not-found.tsx` не поймает неизвестные URL — это решает задача 15 (`global-not-found` + catch-all). Здесь только временный `(site)/not-found.tsx`.
- Ссылки на `/admin` в UI сайта — `<a>`, не `<Link>`.

### Code Snippets

`src/app/(payload)/layout.tsx`:

```tsx
import config from "@payload-config";
import "@payloadcms/next/css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";
import { importMap } from "./admin/importMap.js";
import "./custom.scss";
import type { ServerFunctionClient } from "payload";

type Args = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);
export default Layout;
```

`admin/[[...segments]]/page.tsx` (аналогично `not-found.tsx` с `NotFoundPage` вместо `RootPage`/`generatePageMetadata`):

```tsx
import config from "@payload-config";
import { generatePageMetadata, RootPage } from "@payloadcms/next/views";
import { importMap } from "../importMap";
import type { Metadata } from "next";

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};
export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });
const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap });
export default Page;
```

`api/[...slug]/route.ts`:

```ts
import config from "@payload-config";
import "@payloadcms/next/css";
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from "@payloadcms/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
```

`api/graphql/route.ts`: `GRAPHQL_POST(config)` и `REST_OPTIONS(config)`; `api/graphql-playground/route.ts`: `GRAPHQL_PLAYGROUND_GET(config)`. `custom.scss` — пустой файл. `admin/importMap.js` — `export const importMap = {}` (его перегенерирует `pnpm generate:importmap`). **Сверить код с актуальным шаблоном** `pnpm dlx create-payload-app@3.91.0` (во временной папке вне репозитория) или context7 `/payloadcms/payload` (v3.85+) — сигнатуры могли измениться.

`src/payload.config.ts` (каркас):

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { ru } from "@payloadcms/translations/languages/ru";
import { buildConfig } from "payload";
import sharp from "sharp";
import { getEnv } from "@/lib/env";
import { migrations } from "./migrations";
import { Users } from "./payload/collections/users";
import { catalogCollections } from "./payload/collections/catalog";
import { contentCollections } from "./payload/collections/content";
import { crmCollections } from "./payload/collections/crm";
import { richTextEditor } from "./payload/editor";
import { globals } from "./payload/globals";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = getEnv();

export default buildConfig({
  admin: { user: Users.slug, importMap: { baseDir: path.resolve(dirname) } },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: "ru" },
  collections: [Users, ...contentCollections, ...catalogCollections, ...crmCollections],
  globals,
  editor: richTextEditor,
  secret: env.PAYLOAD_SECRET,
  sharp,
  db: postgresAdapter({
    idType: "uuid",
    pool: { connectionString: env.DATABASE_URL },
    // push — только по явному флагу и только на личной одноразовой БД разработчика (НИКОГДА на общей)
    push: env.PAYLOAD_DB_PUSH,
    prodMigrations: migrations,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  upload: { limits: { fileSize: 52 * 1024 * 1024 } }, // 52 MiB (приём публичных загрузок — отдельный route handler, лимит 50 MB)
  graphQL: { disablePlaygroundInProduction: true },
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  routes: {}, // оставить дефолтные /admin и /api
});
```

- Проверить в документации Payload 3.91, есть ли опция общего лимита размера тела запроса (`requestSizeLimit`/аналог). Если опции нет — не добавлять (эффективный лимит — `upload.limits.fileSize`); зафиксировать в отчёте.
- `migrations` из `src/migrations/index.ts` (генерируется `migrate:create`); `prodMigrations` применяются при инициализации Payload в production.
- Миграции — только expand/contract (сначала добавляем, в следующем релизе удаляем).

`src/payload/collections/users.ts`:

- `slug: "users"`, `auth: { tokenExpiration: 60 * 60 * 24 * 7, maxLoginAttempts: 5, lockTime: 10 * 60 * 1000, cookies: { sameSite: "Lax", secure: env.SITE_ENV !== "development" } }`.
- Поля: `name` (text, required), `role` (select `admin | manager`, required, `defaultValue: "manager"`, `saveToJWT: true`, `access.update/create` только admin), хук `beforeValidate`: если в коллекции ещё нет пользователей — роль принудительно `admin` (первый пользователь).
- `admin: { useAsTitle: "name", defaultColumns: ["name", "email", "role"] }`.
- Access: `create`, `delete` — `isAdmin`; `read` — `isLoggedIn` (менеджеру нужен список сотрудников для поля «ответственный»; **отклонение от брифа «менеджер видит только себя»** — зафиксировано в отчёте); `update` — `isAdminOrSelf`; `admin` (доступ к панели) — `isAdminOrManager`-логика через `user.role`.
- Дополнительные поля (`phone`, `messengerUrl`, `photo`, `position`) добавляет задача 08 — здесь не создавать.

`src/payload/access/index.ts` — контракт (все экспорты обязательны):

```ts
export type Role = "admin" | "manager";
export const isAdmin: Access;            // user?.role === "admin"
export const isAdminOrManager: Access;   // admin | manager
export const isLoggedIn: Access;         // Boolean(user)
export const isAnyone: Access;           // () => true
export const isAdminOrSelf: Access;      // admin → true; manager → { id: { equals: user.id } }; иначе false
export const publishedOrLoggedIn: Access; // залогинен → true; аноним → { _status: { equals: "published" } }
export const adminFieldAccess: FieldAccess;          // только admin
export const adminOrManagerFieldAccess: FieldAccess; // admin | manager
```

`src/payload/slugs.ts` — контракт (используется задачами 06–08, чтобы `payload-types.ts` не ломал типизацию до заморозки схемы):

```ts
import type { CollectionSlug, GlobalSlug } from "payload";
export const rel = (slug: string) => slug as unknown as CollectionSlug;
export const relGlobal = (slug: string) => slug as unknown as GlobalSlug;
```

`src/payload/editor.ts` — `export const richTextEditor = lexicalEditor({ features: ({ defaultFeatures }) => [...] })`: заголовки только `h2`, `h3`, `h4`; жирный, курсив, подчёркивание выключить; ссылки (внутренние/внешние), маркированные и нумерованные списки, цитата, горизонтальная линия, таблицы (если доступна стабильная фича), `UploadFeature` не включать. Тексты содержат метки `{N}`, `{цена}` и т. п. — это обычный текст, редактор их не трогает.

`src/payload/fields/link.ts` — контракт:

```ts
export function linkField(opts?: { name?: string; label?: string; required?: boolean; withLabel?: boolean }): GroupField;
// group { type: "doc" | "custom"; doc: relationship(polymorphic) на pages, glass-types, thicknesses, processing-services, constructions, articles, objects (rel());
//          url: text (type=custom; допустимо "/путь/" с ведущим и замыкающим слешем, "#якорь", "https://…", "tel:", "mailto:");
//          label: text (если withLabel, по умолчанию true); newTab: checkbox }
```

Разрешение `doc` → URL реализует задача 15 (`resolveLink`); здесь только схема. `url` для внутренних путей валидировать (`^/` и слеш на конце, кроме якорей/абсолютных ссылок).

### Env (zod) — `src/lib/env.ts`

Экспорт `getEnv()` (мемоизированный `safeParse(process.env)`, при ошибке — понятное сообщение со списком переменных). Использовать zod 4.

| Переменная | Тип / default |
|---|---|
| `NODE_ENV` | `development|production|test`, default `development` |
| `DATABASE_URL` | url, обязательна |
| `PAYLOAD_SECRET` | string ≥ 32 символов, обязательна |
| `PAYLOAD_DB_PUSH` | `"true"|"false"` → boolean, default false (push только для личной БД) |
| `SITE_URL` | url, default `http://localhost:3000` (в production обязательна) |
| `NEXT_PUBLIC_SITE_URL` | url, optional (избегать зависимости от неё; предпочитать рантайм `SITE_URL`) |
| `SITE_ENV` | `development|staging|production`, default `development` |
| `STAGING_BASIC_AUTH` | `user:pass`, optional |
| `SMTP_HOST`, `SMTP_PORT`(number), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | optional (dev: mailpit `localhost:1025`) |
| `MAIL_INTERCEPT_TO` | email, optional (staging: вся почта на этот ящик) |
| `UPLOADS_DIR` | default `./.data/lead-files` (prod: `/data/lead-files`) |
| `MEDIA_DIR` | default `./.data/media` (prod: `/data/media`) |
| `FORM_HMAC_SECRET` | string ≥ 32, обязательна в production, в dev — default-заглушка |
| `ORDER_TOKEN_SECRET` | string ≥ 32, обязательна в production, в dev — default-заглушка. Ключ HMAC для токенов страницы заказа (task-18/33); отдельный от `PAYLOAD_SECRET`, чтобы ротация секрета Payload не инвалидировала ссылки клиентов |
| `JOBS_ENABLED` | `"true"|"false"` → boolean, default false |
| `INDEXNOW_KEY` | optional |
| dev-tools: `KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY` | optional, отдельная группа `devTools`; в prod-образ и prod-env не попадают |

`env.example` — те же имена, комментарии на русском, безопасные dev-значения (`DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SITE_URL=http://localhost:3000`, пустые ключи dev-tools).

### docker-compose.yml (dev)

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: inex_glass
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql        # в postgres:18 данные лежат в /var/lib/postgresql/18/docker
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user -d inex_glass"]
      interval: 5s
      timeout: 3s
      retries: 10
  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]   # SMTP / веб-UI
volumes:
  pgdata:
```

Образ именно `postgres:18` (не pgvector). Init-скрипт срабатывает только на пустом томе (`docker compose down -v`).

### next.config.ts

```ts
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  compress: true,
  // standalone включает только Docker-сборка (задача 03): NEXT_OUTPUT=standalone
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/api/media/file/**" },
      { pathname: "/generated/**" },
      { pathname: "/images/**" },
    ],
    // remotePatterns стартера (google/github/vercel-blob) удалить
  },
  async headers() { /* X-Frame-Options: SAMEORIGIN (нужно для live preview Payload), X-Content-Type-Options: nosniff,
     Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=().
     X-XSS-Protection убрать (устарел). HSTS задаётся на Traefik (задача 41).
     Только статические значения: никаких заголовков, зависящих от SITE_ENV/env, — headers() фиксируется при сборке,
     а один образ работает и на staging, и на prod. */ },
};
export default withPayload(nextConfig, { devBundleServerPackages: false });
```

Опции `withPayload` и `images.qualities` сверить с документацией Next 16.4 / Payload 3.91.

### tsconfig.json

- `"target": "ES2022"`, в `paths` добавить `"@payload-config": ["./src/payload.config.ts"]`.
- Флаги `exactOptionalPropertyTypes` и `noUncheckedIndexedAccess` оставить, если `pnpm typecheck` проходит; если `exactOptionalPropertyTypes` конфликтует с типами Payload — отключить только его и записать в отчёт.

### proxy.ts (`src/proxy.ts`)

Делает ровно две вещи: (1) 301 с адреса в верхнем регистре на нижний регистр (сохраняя `search`); (2) basic-auth на staging (`SITE_ENV === "staging"` и задан `STAGING_BASIC_AUTH`) → `401` + `WWW-Authenticate: Basic realm="staging"`, сравнение учётных данных в постоянное время. Больше ничего. Редирект «без слеша → со слешем» делает сам Next (`trailingSlash: true`, статус 308 — зафиксировать в отчёте, что это 308, а не 301).

```ts
export const config = {
  // исключаем /admin, /api, /_next и любые пути с точкой (статические файлы):
  matcher: ["/((?!admin(?:/|$)|api(?:/|$)|_next/|.*\\..*).*)"],
};
```

Причина исключений: proxy буферизует только 10 МБ тела и молча обрезает; админка и API (включая загрузки) не должны проходить через него. Healthcheck `/api/health/` поэтому не закрыт basic-auth.

### Реестры и контракты для следующих задач

- `src/payload/collections/{content,catalog,crm}/index.ts`, `globals/index.ts`, `blocks/index.ts` — заглушки с точными именами экспортов (`contentCollections`, `catalogCollections`, `crmCollections`, `globals`, `pageBlocks`). Задачи 06/07/08 дописывают **только свои** индексы.
- Кто ещё меняет `payload.config.ts`:
  - задача 10 — финальная сборка, подключение `plugins` из реестра `src/payload/plugins/index.ts` и `db.afterSchemaInit` (реестр и no-op заглушки создаёт она же);
  - задача 18 — только ключи `email` и `jobs`;
  - задача 32 — только `admin.components` (вид отчёта по заявкам).

  Задачи 35 и 36 правят только свои файлы плагинов, а не конфиг. Остальные задачи `payload.config.ts` не трогают.

### Миграция и smoke-тест

1. `docker compose up -d` (Docker Desktop должен быть запущен).
2. `pnpm generate:importmap`, `pnpm generate:types`.
3. `pnpm migrate:create baseline` → проверить, что создан `src/migrations/<ts>_baseline.ts` и обновлён `index.ts`; `pnpm migrate`; `pnpm migrate:status`.
4. `pnpm dev`. Проверить:
   - `http://localhost:3000/` → 200, русский `<h1>`;
   - `/admin` → 308 на `/admin/`; `/admin/` открывается, форма создания первого пользователя (UI на русском);
   - создать первого администратора (UI или `POST /api/users/first-register/`), войти;
   - `GET /api/users/me/` с cookie → 200 с пользователем; без cookie → `{ "user": null }`;
   - вход через UI админки работает (клиент Payload ходит на `/api/...` — убедиться, что редирект `trailingSlash` не ломает POST `login/logout`).
5. **Если админка/REST ломаются из-за `trailingSlash: true`** (редиректы 308 на API-запросах): включить `skipTrailingSlashRedirect: true` и перенести редирект «слеш» только для путей сайта в `proxy.ts` (исключения `/admin`, `/api` уже есть), задокументировать решение в отчёте.
6. `curl -i http://localhost:3000/KONTAKTY/` → 301 на `/kontakty/`.
7. `pnpm build` проходит **без доступной БД** (проверить с `DATABASE_URL`, указывающим на недоступный хост): страницы сайта не обращаются к Payload при сборке.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile` чистый; в `package.json` `next` = 16.4.x, все `payload`/`@payloadcms/*` ровно 3.91.0 (без `^`), `.nvmrc` = 24, `engines.node` указан.
- [ ] Удалены все перечисленные части стартера; `grep -ri "better-auth\|drizzle\|openrouter\|next-themes\|@vercel/blob"` по `src/`, `package.json`, `scripts/` ничего не находит.
- [ ] Структура `src/app/(site)` + `src/app/(payload)` создана, корневого `src/app/layout.tsx` нет; `<html lang="ru">` у сайта.
- [ ] `payload.config.ts`: Postgres, `idType: "uuid"`, `prodMigrations`, русская админка, Lexical, `users` с ролями `admin|manager`, реестры подключены (пустые).
- [ ] Контракты созданы и типизированы: `access/index.ts`, `slugs.ts` (`rel`, `relGlobal`), `editor.ts`, `fields/link.ts`.
- [ ] `src/lib/env.ts` на zod, `env.example` обновлён, `docker-compose.yml` поднимает `postgres:18` + `axllent/mailpit`.
- [ ] `trailingSlash: true`, `X-Frame-Options: SAMEORIGIN`, remotePatterns удалены, `images.localPatterns` задан, `output: standalone` включается только через `NEXT_OUTPUT`.
- [ ] `src/proxy.ts`: matcher исключает `/admin`, `/api`, `/_next`, файлы; верхний регистр → 301; staging basic-auth работает (проверено вручную с `SITE_ENV=staging`).
- [ ] Создана и применена базовая миграция `baseline` (таблицы users + служебные таблицы Payload); `pnpm migrate:status` чистый.
- [ ] Smoke: создание первого админа, вход, `/admin/`, `GET /api/users/me/` работают при `trailingSlash: true`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` проходят (сборка без БД).
- [ ] Скрипты `package.json` соответствуют списку; `build` не запускает миграции.

## Notes

- Модель: премиальная (кодинг, интеграция версий). Использовать context7 (`/payloadcms/payload`, `/vercel/next.js`) и Exa для актуальных API Payload 3.91 и Next 16.4; код шаблона `(payload)` сверять с `create-payload-app`.
- AGENTS.md сейчас требует `drizzle generate/migrate` — правило заменит задача 04; на практике в этом проекте работают только миграции Payload. `drizzle push` / Payload `push` на общей БД запрещены.
- Все ID не-BetterAuth колонок — UUID (обеспечивает `idType: "uuid"`).
- Первая миграция `baseline` содержит только `users` и служебные таблицы Payload. Миграцию со всей схемой контента/CRM создаёт задача 10 отдельным файлом (`content_schema`) поверх этой — «единая миграция» из исходного плана невозможна, т. к. baseline уже применена на staging/dev.
- Не создавать README/requirements спека — их ведёт координатор. Корневой `README.md` проекта — отдельная короткая замена, это допустимо.
