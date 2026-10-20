# Task 03: Docker-спайк и деплой на staging (Dockerfile, healthcheck, GHCR, Dokploy)

## Status

pending

## Wave

2

## Description

Как можно раньше проверяем самый рискованный кусок инфраструктуры: Next.js standalone + Payload + sharp в non-root Docker-образе на Node 24, запуск миграций при старте, healthcheck и раскатку в Dokploy (Docker Swarm). Задача создаёт многоступенчатый `Dockerfile` (цели `runner` и `tools`), маршрут `GET /api/health/`, workflow `docker.yml` (образ собирается один раз, публикуется в GHCR, на `main` выкатывается на staging, по тегу `v*` тот же образ промоутится в prod) и runbook `docs/deploy.md`. Реальная выкатка на staging требует действий человека (Dokploy, DNS, секреты) — агент готовит всё в репозитории и проверяет образ локально.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-41-prod-deploy.md (и косвенно task-42-final-acceptance.md)

**Context from dependencies:** Задача 01 даёт Next 16.4.x + Payload 3.91.0 (`payload.config.ts` с Postgres, `prodMigrations`, `idType: uuid`), Node 24, pnpm 11 (`packageManager` в `package.json`, `pnpm-lock.yaml`). В `next.config.ts` `output: "standalone"` включается переменной сборки `NEXT_OUTPUT=standalone`; `trailingSlash: true`; в `src/proxy.ts` исключены `/admin`, `/api`, `/_next`, файлы. Env описаны в `src/lib/env.ts` (zod; обязательны `DATABASE_URL`, `PAYLOAD_SECRET`, `FORM_HMAC_SECRET` в production; `SITE_URL`, `SITE_ENV`, `JOBS_ENABLED`, `UPLOADS_DIR`, `MEDIA_DIR`, `MAIL_INTERCEPT_TO`, `STAGING_BASIC_AUTH`, `SMTP_*`). `next build` не требует БД, но `payload.config.ts` валидирует env при импорте — в Docker-сборке нужны фиктивные значения `DATABASE_URL`/`PAYLOAD_SECRET`/`FORM_HMAC_SECRET`. Миграции лежат в `src/migrations/` и применяются Payload'ом при инициализации в production (`prodMigrations`) — отдельный шаг миграции не нужен, инициализация запускается лениво первым запросом, поэтому healthcheck обязан вызывать `getPayload()`. Скрипты сида/импорта (`pnpm seed`, `scripts/*`) требуют полного `node_modules` и `tsx` — для них цель `tools`.

## Files to Create

- `Dockerfile` — цели `deps`, `build`, `runner`, `tools`.
- `.dockerignore`.
- `src/app/api/health/route.ts` — healthcheck.
- `.github/workflows/docker.yml` — сборка, публикация в GHCR, деплой staging/prod.
- `docs/deploy.md` — runbook (русский).
- `scripts/docker-entrypoint.sh` — **только если** спайк покажет проблему с правами на bind-mount томах (для named volumes не нужен; если не создаётся — записать вывод в `docs/deploy.md`).

## Files to Modify

Нет. `package.json` не менять: если для образа нужны дополнительные скрипты или поля — перечислить в отчёте для координатора. `next.config.ts` не менять (в нём уже есть `NEXT_OUTPUT`); если для Payload/sharp нужны `outputFileTracingIncludes` или `serverExternalPackages` — перечислить точный патч в отчёте.

## Technical Details

### src/app/api/health/route.ts

```ts
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getPayload({ config }); // запускает init → миграции и cron задач
    await payload.db.drizzle.execute(sql`SELECT 1`);
    return Response.json(
      { status: "ok", release: process.env.RELEASE_SHA ?? "dev" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
```

Не раскрывать детали ошибки. Путь `/api/health/` (со слешем): `trailingSlash: true` — без слеша будет редирект 308. Проверить, что импорт `sql` из `@payloadcms/db-postgres/drizzle` существует в 3.91 (иначе взять `sql` из `drizzle-orm` и записать зависимость в отчёт). Healthcheck не закрыт staging-basic-auth (proxy исключает `/api`).

### Dockerfile (эталон; доработать по результату сборки)

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate   # версию синхронизировать с packageManager
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG RELEASE_SHA=dev
ENV NEXT_OUTPUT=standalone RELEASE_SHA=${RELEASE_SHA} \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    PAYLOAD_SECRET=build-time-placeholder-build-time-placeholder \
    FORM_HMAC_SECRET=build-time-placeholder-build-time-placeholder \
    ORDER_TOKEN_SECRET=build-time-placeholder-build-time-placeholder \
    SITE_URL=https://example.invalid
RUN pnpm build
# Цель tools: полный node_modules + исходники для seed/import (в prod не деплоится)
FROM build AS tools
ENV NODE_ENV=production
RUN mkdir -p /data/media /data/lead-files && chown -R node:node /data /app
USER node
CMD ["sh"]

FROM node:${NODE_VERSION}-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 \
    MEDIA_DIR=/data/media UPLOADS_DIR=/data/lead-files
ARG RELEASE_SHA=dev
ENV RELEASE_SHA=${RELEASE_SHA}
WORKDIR /app
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p /data/media /data/lead-files /app/.next/cache && chown -R node:node /data /app/.next
USER node
EXPOSE 3000
VOLUME ["/data/media", "/data/lead-files"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health/ || exit 1
CMD ["node", "server.js"]
```

Требования к образу:
- Node 24 LTS, pnpm через corepack, `output: standalone`, non-root пользователь `node`, `curl` для healthcheck.
- sharp должен работать внутри standalone: проверить `docker run --rm <image> node -e "require('sharp'); console.log('sharp ok')"`. Если модуль не попал в трейс — добавить `serverExternalPackages: ["sharp"]` и/или `outputFileTracingIncludes` для `node_modules/sharp`, `node_modules/@img` (передать патч координатору).
- Тома `/data/media` и `/data/lead-files` и каталог `.next/cache` принадлежат `node` (chown в образе). Для named volumes Docker наследует владельца из образа; при bind-mount от root нужен entrypoint (`chown` + `gosu`) — реализовать `scripts/docker-entrypoint.sh` только при подтверждённой необходимости.
- Секреты и dev-инструменты не попадают в образ `runner`: не копировать `.env*`; ключи `KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY` в образ не передавать. `.dockerignore`: `.git`, `node_modules`, `.next`, `.env*`, `res/`, `docs/`, `specs/`, `e2e/`, `playwright-report`, `test-results`, `.data`, `.claude`, `.agents`, `*.md` кроме необходимых (если что-то из этого нужно сборке — оставить).
- Размер `runner` зафиксировать в отчёте.
- Миграции применяются Payload'ом при первом `getPayload()` (healthcheck или первый запрос). `--start-period` должен покрывать время миграций (60 с с запасом; в Swarm — см. runbook).

### Локальная проверка (обязательна)

```bash
docker compose up -d                       # postgres:18 + mailpit
docker build -t inex-glass:local --target runner --build-arg RELEASE_SHA=local .
docker build -t inex-glass:tools --target tools .
docker run --rm --network host \
  -e DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass_test \
  -e PAYLOAD_SECRET=... -e FORM_HMAC_SECRET=... -e ORDER_TOKEN_SECRET=... -e SITE_URL=http://localhost:3000 -e SITE_ENV=staging \
  -e JOBS_ENABLED=false inex-glass:local
curl -i http://localhost:3000/api/health/      # 200 {"status":"ok"}; в логах применена baseline-миграция
curl -i http://localhost:3000/admin/           # 200
```

На Windows `--network host` может не работать — использовать `host.docker.internal`. Для БД использовать `inex_glass_test` (не общую). Проверить: контейнер стартует без root, запись в `/data/media` проходит, повторный запуск миграции идемпотентен.

### .github/workflows/docker.yml

Триггеры: `push` на `main`, теги `v*`, `workflow_dispatch`. Права: `contents: read`, `packages: write`.

Jobs:
1. `build` — `docker/setup-buildx-action`, `docker/login-action` (registry `ghcr.io`, `GITHUB_TOKEN`), `docker/metadata-action`, `docker/build-push-action` с кэшем `type=gha`. Образ `ghcr.io/${{ github.repository_owner }}/inex-glass` (в нижнем регистре), теги: `sha-<commit>` (всегда), на теге `v*` — ещё имя тега. Цель `runner`; отдельная сборка цели `tools` с тегом `sha-<commit>-tools`. Build-arg `RELEASE_SHA=${{ github.sha }}`. Выход: digest образа (`outputs.digest`).
2. `deploy-staging` — `needs: build`, только `refs/heads/main`, environment `staging`. Деплой в Dokploy по **digest/тегу `sha-…`** (не по плавающему тегу): либо вызов API Dokploy (`application.saveDockerProvider` с `dockerImage` → `application.deploy`; аутентификация ключом из профиля Dokploy — заголовок и точные имена процедур **сверить с официальной OpenAPI Dokploy**, пути/поля в этом описании ориентировочные), либо webhook приложения. Секреты: `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_STAGING_APP_ID` (или `DOKPLOY_STAGING_WEBHOOK`). После деплоя — smoke: `curl --retry 10 --retry-delay 10 -fsS https://<staging>/api/health/` (с basic-auth не нужен — `/api` открыт).
3. `deploy-prod` — `needs: build`, только по тегу `v*`, environment `production` (с ручным подтверждением в GitHub). **Тот же образ** (тот же digest), что уже прошёл staging: не пересобирать, а перетегировать (`docker buildx imagetools create -t …:vX.Y.Z …@sha256:<digest>`) и обновить prod-приложение в Dokploy. Секреты: `DOKPLOY_PROD_APP_ID`. Pre-deploy `pg_dump` и бэкапы — задача 41 (в workflow оставить закомментированный placeholder-шаг).
Если секретов Dokploy нет (первый запуск) — jobs деплоя пропускаются условием `if: ${{ secrets.DOKPLOY_API_KEY != '' }}` через env-обёртку (секреты нельзя использовать в `if` напрямую — вынести в job-level `env`).

### docs/deploy.md (русский runbook; структура)

1. Архитектура: образ собирается один раз → staging → тот же digest в prod. Схема: GitHub Actions → GHCR → Dokploy (Swarm) + Traefik.
2. Приложения Dokploy: `inex-glass-staging`, `inex-glass-prod` (source: Docker image, registry GHCR; pull-секрет — GitHub PAT `read:packages`). Сервисы Postgres (staging и prod — **отдельные БД**, не общая).
3. Переменные окружения (таблица: имя, пример, staging, prod). Staging: `SITE_ENV=staging`, `SITE_URL=https://dev.inexglass.ru` (пример), `STAGING_BASIC_AUTH=user:pass`, `MAIL_INTERCEPT_TO`, `JOBS_ENABLED=true`. Prod: `SITE_ENV=production`, `SITE_URL=https://inexglass.ru`. **`JOBS_ENABLED=true` только на одном контейнере/реплике** (одна реплика). Общие: `DATABASE_URL`, `PAYLOAD_SECRET`, `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET` (не ротировать: смена инвалидирует ссылки `/zakaz/…`), `SMTP_*`, `UPLOADS_DIR=/data/lead-files`, `MEDIA_DIR=/data/media`, `INDEXNOW_KEY`. Ключи dev-инструментов в prod-env не задаются.
4. Тома: `/data/media`, `/data/lead-files`, `/app/.next/cache` (named volumes; права `node`).
5. Домены: staging-поддомен (DNS A-запись на IP VDS), SSL Let's Encrypt через Dokploy/Traefik; prod — задача 41 (apex, www→apex 301, HSTS).
6. Swarm: одна реплика; `update_config` со стратегией stop-first (`Order: stop-first`, `FailureAction: rollback`, `Parallelism: 1`, `Delay`), `rollback_config`; healthcheck в Dokploy: `curl -f http://localhost:3000/api/health/`, `interval 15s`, `timeout 5s`, `retries 5`, `start_period` ≥ 60s (покрывает миграции). Привести готовые JSON-фрагменты Swarm-настроек Dokploy (Update Config / Rollback Config / Health Check). Поскольку миграции идут при старте контейнера, а stop-first гарантирует, что два контейнера не мигрируют одновременно, дополнительно (опционально, но рекомендовано) обернуть запуск миграций в `pg_advisory_lock` — отдельная доработка, не в этой задаче; зафиксировать в runbook как требование.
7. Правило миграций: только expand/contract (добавляем колонку/таблицу в релизе N, удаляем в N+1), потому что откат образа не откатывает схему. Миграции не запускаются на `next build`.
8. Откат: Dokploy → Deployments → Rollback на предыдущий образ `sha-…`; когда откат безопасен (схема совместима), когда нет.
9. Запуск `tools`-образа для сида/импорта: `docker run --rm --env-file … ghcr.io/…/inex-glass:sha-…-tools pnpm seed --full` (в сети Postgres; либо через SSH-туннель с локальной машины).
10. Секреты GitHub Actions (список), чек-лист первого запуска staging (шаги для человека — продублировать в `action-required.md` координатор).
11. Бэкапы (заглушка → задача 41): БД ежедневно в S3 РФ + pre-deploy `pg_dump`, бэкап томов.

## Acceptance Criteria

- [ ] `docker build --target runner` и `--target tools` собираются локально без ошибок; сборка не требует доступной БД.
- [ ] Контейнер `runner` запускается от пользователя `node`, `GET /api/health/` отдаёт 200 `{"status":"ok"}` при доступной БД и 503 при недоступной; при первом запуске применяются миграции Payload.
- [ ] `require('sharp')` внутри образа работает; загрузка изображения в админку (media) и ресайз не падают (проверить вручную после создания админа в контейнере).
- [ ] Тома `/data/media`, `/data/lead-files`, каталог `.next/cache` доступны на запись пользователю `node`.
- [ ] В образ `runner` не попали `.env*`, ключи dev-инструментов, `res/`, `docs/`; размер образа указан в отчёте.
- [ ] `.github/workflows/docker.yml` валиден: сборка один раз, теги `sha-<commit>`, push в GHCR, deploy-staging на `main`, deploy-prod по тегу `v*` тем же digest'ом; шаги деплоя пропускаются без секретов.
- [ ] `docs/deploy.md` содержит все 11 разделов, готовые JSON-фрагменты Swarm и таблицу env.
- [ ] `pnpm lint` и `pnpm typecheck` проходят (маршрут health типизирован).
- [ ] Список действий для человека передан координатору: создать проект/приложения/Postgres в Dokploy, GHCR-registry, DNS staging, секреты GitHub, env staging.

## Notes

- Модель: премиальная (инфраструктура/Docker). Использовать Exa и официальные доки Dokploy (docs.dokploy.com, OpenAPI) для актуальных API; не выдумывать имена процедур.
- Реальный деплой на staging выполняет человек после подготовки; агент проверяет образ локально и готовит workflow.
- Payload init ленивый: без вызова `getPayload()` не стартуют миграции и cron задач — поэтому healthcheck обязателен и должен быть «тёплым» (он же запускает Jobs Queue при `JOBS_ENABLED=true`).
- `package.json` не менять. Если нужен скрипт (например, `start:standalone`) — описать в отчёте.
