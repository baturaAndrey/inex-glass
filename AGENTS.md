# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check, `pnpm test` and next build to check code quality
- A task agent edits only the files of its own task. Shared registries (`src/payload/**/index.ts`, `payload.config.ts`, `package.json`, `pnpm-lock.yaml`) may be changed only if the task explicitly allows it
- Extension points (registries, stub files) are changed only by their owner, per the table "Владение общими файлами" in `specs/inex-glass-site/README.md`
- Generated files (`src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`, `src/migrations/index.ts`) are committed within a wave only by the owner task from that README; other tasks run the generators locally and do not commit the result
- Quiz variant ids (`QUIZ_TYPES`, `QUIZ_KINDS`, etc. from `src/lib/domain/quiz-schema.ts`) are the single vocabulary for the schema, URLs and leads. Never create mappings between vocabularies

## DATABASE SCHEMA CHANGES

- The schema is defined in Payload (collections, globals, blocks in `src/payload/**`). Database: Postgres with `idType: 'uuid'`
- Schema changes are recorded as **Payload migrations**: `pnpm migrate:create <name>` (in dev). In production migrations are applied on startup via `prodMigrations` (`src/migrations/index.ts`). `pnpm migrate` applies them manually on a local DB
- NEVER use `push` (Payload `push` or any other schema push) on a shared DB (dev/staging/prod). `PAYLOAD_DB_PUSH=true` is allowed only on a personal throwaway local DB
- After any schema change ALWAYS run `pnpm generate:types` and `pnpm generate:importmap`
- Migrations are expand/contract only: add first, remove in the next release (rolling back the image does not roll back the schema)
- All IDs (nothing here is BetterAuth) are UUID, guaranteed by `idType: 'uuid'`. Collection and global slugs are kebab-case
- **Schema freeze:** the schema is defined in Wave 2 (tasks 06-08) and frozen by task 10 (migration `content_schema`, `payload-types.ts`, `importMap.js`). After that, do NOT change collections, globals or blocks. If a field is missing, stop and tell the coordinator, who creates a separate schema task with a migration
- Exceptions, each with its own migration: task 18 (Payload Jobs queue, all job slugs) and task 35 (search)

## TESTING

- Use the project's tools; never assume changes work, always verify:
  - `pnpm test` - Vitest (domain logic in `src/lib/domain`; projects `unit` and `dom`)
  - `pnpm test:e2e` - Playwright (projects 375 / 1366 / 1920)
  - `pnpm lint`, `pnpm typecheck`, `pnpm build`
- For UI work take screenshots at 375 / 1366 / 1920 and compare them with the prototype in `res/inex-glass-handoff/prototypes/`

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md

## PROJECT FACTS

- The site is a B2B supplier of tempered glass, Inex Glass (inexglass.ru). We do NOT claim installation or own production
- UI and content language is Russian. Code, identifiers and paths are English
- Page copy is taken verbatim from `res/inex-glass-handoff/teksty/`; H1/title/description come from `docs/inex/17-meta.md`. Never invent missing copy: use the placeholder `[…]`
- Reference values (prices, promo, terms, contacts) come only from CMS globals; never hardcode them
- Forbidden wording: `docs/inex/16-tz-razrabotka.md` section 11
- Links to `/admin` are a plain `<a>`, not `next/link`
- `cacheComponents` is off; CMS data is read through the Local API + `unstable_cache` with tags
- Scripts run via `payload run <file>` must use top-level `await` — otherwise the command exits silently with code 0 before the script finishes
- Running Payload outside production (dev server, `payload run`, integration tests) regenerates `src/payload-types.ts`; revert it unless your task owns generated files this wave
- E2E specs that need an admin use `loginAdmin` / `adminToken` / `adminApi` from `e2e/helpers/admin.ts` (one default admin via `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`); never call `/api/users/login/` directly or reset passwords — parallel logins of one user wipe each other's Payload sessions (403). Fixture-mutating tests run serially in the `desktop-1366` project only
- `next.config.ts` must keep `serverExternalPackages: ["payload"]`: without it the prod (Turbopack) build bundles a separate `payload` copy per entry and REST validation errors lose `name`/`data` (field errors, Russian messages)
- Postgres needs `max_locks_per_transaction=256` for migration rollbacks (~600 tables in one transaction); set in `docker-compose.yml`
- The admin is Payload with a custom light theme (`DESIGN.md` §14). Never load Tailwind in the admin (its preflight breaks Payload); admin styles are SCSS, one partial per feature in `src/app/(payload)/styles/`, `custom.scss` holds only `@use`
- MAX notifications: `src/lib/max/*`, jobs `max-notify` / `max-unassigned-reminder` (`src/jobs/`). Delivery is idempotent through `notification-log` (one `key` = one message to one recipient). Outside production a message goes only to `MAX_INTERCEPT_CHAT_ID` (or nowhere). The bot is shared with another live site: never subscribe its webhook or send real messages without the user's approval (`docs/deploy.md`, "MAX")
- Page draft preview: `/api/preview/` (Draft Mode, staff only, `safeInternalPath`); the site reads drafts through the `getPageByPath` loader

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
