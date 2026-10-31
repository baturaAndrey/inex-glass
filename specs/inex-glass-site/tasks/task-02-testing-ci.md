# Task 02: Тестовая инфраструктура и CI (Vitest, Playwright, GitHub Actions)

## Status

complete

## Wave

2

## Description

Настраиваем всё, чем проект проверяет себя: Vitest для чистой доменной логики и компонентов, Playwright для e2e на трёх ширинах (375 / 1366 / 1920) и workflow GitHub Actions `ci.yml` (Postgres 18 как service, миграции, мини-сид, lint, typecheck, тесты, сборка, e2e). Эта задача заранее ставит **все** тестовые зависимости, чтобы в следующих волнах параллельные агенты не конфликтовали из-за `package.json` и `pnpm-lock.yaml`. Тесты, которые она добавляет, — только smoke-уровня; доменные тесты пишет задача 11, e2e страниц — слайсовые задачи.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-11-domain-lib.md, task-20-quiz-core.md и все задачи, где есть e2e/vitest (11, 12, 13, 14–42)

**Context from dependencies:** Задача 01 оставила проект на Next 16.4.x + Payload 3.91.0 (Postgres, `idType: uuid`), Node 24, pnpm 11 (`"packageManager": "pnpm@11.1.3"`). Есть скрипты `dev`, `build` (без миграций и БД), `start`, `lint`, `typecheck`, `check`, `migrate`, `migrate:create`, `generate:types`, `seed` (`payload run src/seed/index.ts`; пока заглушка, которая принимает `--minimal` и выходит с кодом 0). Есть `docker-compose.yml` (`postgres:18` на 5432, БД `inex_glass`, пользователь `dev_user`/`dev_password`, init-скрипт создаёт также `inex_glass_test`; `axllent/mailpit` — SMTP 1025, UI 8025). Есть `src/proxy.ts` (верхний регистр → 301, basic-auth на staging), `trailingSlash: true`, временная главная `/` с `<h1>`, админка `/admin/`, REST `/api/users/me/`. `output: standalone` включается только переменной `NEXT_OUTPUT=standalone` (в CI не нужна). Алиасы: `@/*` → `src/*`, `@payload-config` → `src/payload.config.ts`. Env описаны в `src/lib/env.ts` (см. `env.example`).

## Files to Create

- `vitest.config.ts` — конфиг Vitest (проекты `unit` и `dom`).
- `vitest.setup.dom.ts` — подключение `@testing-library/jest-dom` для проекта `dom`.
- `playwright.config.ts` — конфиг Playwright (3 проекта, webServer).
- `e2e/global-setup.ts` — подготовка тестовой БД: миграции + мини-сид.
- `e2e/smoke.spec.ts` — smoke-тесты.
- `e2e/helpers/` — каталог для общих хелперов (пока `e2e/helpers/viewports.ts` с константами 375 / 1366 / 1920).
- `scripts/test-db.ts` — создать/пересоздать тестовую БД `inex_glass_test` (`reset`, `drop`).
- `src/lib/sanity.test.ts` — единственный unit-тест-заглушка (проверяет, что окружение Vitest работает и алиас `@/` резолвится на `src/lib/utils.ts`: `cn("a", "b")`).
- `.github/workflows/ci.yml` — CI.
- `.env.test.example` — пример env для тестовых запусков.

## Files to Modify

- `package.json` — **только** тестовые зависимости и скрипты (см. ниже). Остальное не менять.
- `.gitignore` — добавить `/test-results`, `/playwright-report`, `/blob-report`, `/coverage` (если задача 01 ещё не добавила).
- `eslint.config.mjs` — добавить в ignores `e2e/.auth/**`, `playwright-report/**`, `test-results/**`, `coverage/**`.

## Technical Details

### Зависимости (точные версии не фиксируем жёстко, но берём актуальные мажоры на 20.10.2026: vitest 5.x, @playwright/test 1.64.x)

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test @axe-core/playwright pg @types/pg
pnpm exec playwright install --with-deps chromium
```

Только Chromium. `pg` + `@types/pg` — для `scripts/test-db.ts` (задача 01 удалила прямой `pg`). Если какой-то пакет не ставится (peer-конфликт) — зафиксировать в отчёте.

### package.json scripts (эта задача владеет ключами `test*`)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:db:reset": "tsx scripts/test-db.ts reset"
}
```

(Исходный бриф требовал только `test` и `test:e2e`; остальные ключи — безопасное расширение, не конфликтующее с задачами других волн.)

### vitest.config.ts

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  "@payload-config": path.resolve(import.meta.dirname, "src/payload.config.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { extends: true, test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "src/**/*.dom.test.ts"],
          setupFiles: ["./vitest.setup.dom.ts"],
        },
      },
    ],
    coverage: { provider: "v8", include: ["src/lib/**", "src/components/**"], exclude: ["**/*.test.*"] },
  },
});
```

Проверить синтаксис `projects` / `extends` для Vitest 5 по документации (context7 `/vitest-dev/vitest`); если API другой — адаптировать, сохранив два проекта (`unit` — node, `dom` — jsdom). Тесты доменной логики (`src/lib/domain/*.test.ts`) идут в `unit`. `passWithNoTests: true` не включать — должен быть хотя бы `sanity.test.ts`. Тесты не должны импортировать `payload`/`@payload-config` (доменные функции чистые) — alias добавлен лишь для редких интеграционных случаев.

### playwright.config.ts

- `testDir: "./e2e"`, `fullyParallel: true`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 1 : 0`, `reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list"`.
- Три проекта (Chromium): `mobile-375` — `viewport 375×812, isMobile: true, hasTouch: true`; `desktop-1366` — `1366×768`; `desktop-1920` — `1920×1080`. Экспортировать константу `VIEWPORTS` (`e2e/helpers/viewports.ts`), чтобы спеки слайсов могли делать скриншоты по ширинам (`await expect(page).toHaveScreenshot(...)` — с `maxDiffPixelRatio` и `animations: "disabled"`).
- `use.baseURL`: `process.env.E2E_BASE_URL ?? "http://localhost:3100"`; `locale: "ru-RU"`, `timezoneId: "Asia/Yekaterinburg"`, `trace: "retain-on-failure"`.
- `webServer` (если `E2E_BASE_URL` не задан): порт 3100;
  - `command`: `process.env.E2E_SKIP_BUILD ? "pnpm exec next start -p 3100" : "pnpm build && pnpm exec next start -p 3100"`;
  - `timeout: 300_000`, `reuseExistingServer: !process.env.CI`;
  - `env`: `DATABASE_URL` тестовой БД (по умолчанию `postgresql://dev_user:dev_password@localhost:5432/inex_glass_test`), `PAYLOAD_SECRET` (тестовая строка ≥ 32 символов), `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET`, `SITE_URL=http://localhost:3100`, `SITE_ENV=development`, `JOBS_ENABLED=false`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `UPLOADS_DIR=./.data/e2e/lead-files`, `MEDIA_DIR=./.data/e2e/media`.
- `globalSetup: "./e2e/global-setup.ts"`.

### e2e/global-setup.ts

1. Пропускается, если задан `E2E_BASE_URL` (тестируем внешний стенд) или `E2E_SKIP_DB=1`.
2. `scripts/test-db.ts reset` НЕ вызывается автоматически в CI (БД чистая из service); локально: если БД `inex_glass_test` отсутствует — создать.
3. Выполнить `pnpm migrate` с `DATABASE_URL` тестовой БД (через `execSync`, `stdio: "inherit"`).
4. Если существует `src/seed/index.ts` — выполнить `pnpm seed --full` с тем же `DATABASE_URL` (идемпотентно; e2e срезов волны 5 рассчитаны на полный сид). Ошибка сида **не** фатальна, пока задача 16 не реализовала CLI (заглушка 01 возвращает код 0; после задачи 16 команда обязана работать; пока срезы — заглушки, `--full` = globals + справочники).
5. Создать каталоги `UPLOADS_DIR`/`MEDIA_DIR` для e2e.

### scripts/test-db.ts

`tsx scripts/test-db.ts reset|drop`: подключается через `pg` к `postgres` (админ-БД) по `DATABASE_ADMIN_URL` (default `postgresql://dev_user:dev_password@localhost:5432/postgres`), `DROP DATABASE IF EXISTS inex_glass_test WITH (FORCE)`, затем `CREATE DATABASE inex_glass_test`. Защита: отказывается работать, если имя БД не оканчивается на `_test` (чтобы нельзя было стереть dev/общую БД).

### e2e/smoke.spec.ts

Тесты (запускаются во всех трёх проектах):

- `/` → 200, `html[lang="ru"]`, ровно один `h1`.
- `/admin/` → 200, видна страница входа/создания первого пользователя Payload (поле e-mail или заголовок формы).
- `GET /api/users/me/` через `request` → 200 и `{ user: null }`.
- Редирект регистра: `request.get("/ZAKALENNOE-STEKLO/", { maxRedirects: 0 })` → статус 301, `location` заканчивается на `/zakalennoe-steklo/`.
- Редирект слеша: `request.get("/some-page", { maxRedirects: 0 })` → статус 308 (так делает Next при `trailingSlash: true`; 308 принят как постоянный редирект, см. requirements) и `location` заканчивается слешем.
- Неизвестный путь → 404 (после задачи 15 — страница 404 сайта).
- (опционально) axe-проверка главной: `new AxeBuilder({ page }).analyze()` без нарушений уровня `critical`.

Тест `/api/health/` **не** писать — его создаёт задача 03 параллельно (добавит свою проверку сама).

### .github/workflows/ci.yml

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:18
        env: { POSTGRES_USER: dev_user, POSTGRES_PASSWORD: dev_password, POSTGRES_DB: inex_glass_test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U dev_user -d inex_glass_test"
          --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      DATABASE_URL: postgresql://dev_user:dev_password@localhost:5432/inex_glass_test
      PAYLOAD_SECRET: ci-secret-ci-secret-ci-secret-ci-secret
      FORM_HMAC_SECRET: ci-hmac-ci-hmac-ci-hmac-ci-hmac-0000
      ORDER_TOKEN_SECRET: ci-order-ci-order-ci-order-ci-order-00
      SITE_URL: http://localhost:3100
      SITE_ENV: development
      JOBS_ENABLED: "false"
      E2E_SKIP_BUILD: "1"
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4        # версия берётся из packageManager
      - uses: actions/setup-node@v5
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm migrate
      - run: pnpm seed --full || echo "seed not available"   # полный сид: e2e срезов волны 5 его ожидают; `||` убрать после задачи 16
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: "playwright-report/", retention-days: 7 }
```

- Версии actions — актуальные мажорные теги на момент реализации (проверить; старше `v4` не брать).
- Кэш Playwright-браузеров (`~/.cache/ms-playwright`) — по желанию.
- Шаг сида: `pnpm seed --full` (не `--minimal`): e2e-спеки срезов волны 5 и `e2e/all-urls.spec.ts` (task-40) рассчитаны на полный контент. Пока срезы — заглушки, `--full` всё равно проходит (globals + справочники). Суффикс `|| echo …` допустим только пока задача 16 не завершена; после неё убрать (координатор).
- Job `docker.yml` (сборка образа) — задача 03, здесь не создавать.

### .env.test.example

Те же переменные, что в `env` job CI, плюс `E2E_BASE_URL` (закомментирован) для прогона против staging.

## Acceptance Criteria

- [ ] `pnpm test` запускает Vitest (проекты `unit` и `dom`), `sanity.test.ts` зелёный, алиас `@/` резолвится.
- [ ] `pnpm test:e2e` локально поднимает сервер (после `docker compose up -d`), применяет миграции в `inex_glass_test`, проходит `e2e/smoke.spec.ts` во всех трёх проектах (375 / 1366 / 1920).
- [ ] `pnpm test:db:reset` пересоздаёт `inex_glass_test` и отказывается работать с БД без суффикса `_test`.
- [ ] `.github/workflows/ci.yml` валиден (проверить `actionlint` или `gh workflow view` после пуша; минимум — YAML корректен): Postgres 18 service, pnpm, Node из `.nvmrc`, шаги lint → typecheck → test → build → migrate → seed (`--full`) → e2e, загрузка отчёта Playwright.
- [ ] `pnpm lint`, `pnpm typecheck` проходят (тестовые файлы типизированы, ESLint не ругается на `e2e/`).
- [ ] В `package.json` изменены только тестовые зависимости и скрипты `test*`; `pnpm-lock.yaml` обновлён.
- [ ] Документировано (в шапке `playwright.config.ts` комментарием): как запускать против staging (`E2E_BASE_URL=https://… pnpm test:e2e`) и как пропустить сборку (`E2E_SKIP_BUILD=1`).

## Notes

- Модель: премиальная (кодинг). Актуальные API Vitest 5 / Playwright 1.64 сверять через context7/Exa.
- Скриншотные эталоны (`toHaveScreenshot`) хранить в репозитории (`e2e/**/*-snapshots`); для CI платформа `linux`, локальные Windows-снимки не коммитить — добавить в `playwright.config.ts` `snapshotPathTemplate` с суффиксом платформы или генерировать эталоны только в CI/Docker. Первую версию политики описать комментарием в конфиге.
- `next start` при `output: standalone` не используется: в CI и локально `NEXT_OUTPUT` не задан.
- Для e2e без Mailpit письма отправлять не нужно; задачи 17/18 при необходимости будут читать почту из Mailpit API (`http://localhost:8025/api/v1/messages`).
