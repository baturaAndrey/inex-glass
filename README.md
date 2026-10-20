# Inex Glass — inexglass.ru

Сайт направления Inex Glass (закалённое стекло, триплекс, стеклянные конструкции) со встроенной CMS: контент, справочники, заявки и заказы ведутся в админке Payload.

## Стек

- Next.js 16.4 (App Router) + React 19.2, TypeScript
- Payload CMS 3.91 (админка `/admin/`, REST `/api/`), Postgres 18, ID — UUID
- Tailwind CSS v4, shadcn/ui, Lucide
- Node 24 LTS, pnpm 11

Структура маршрутов: `src/app/(site)` — публичный сайт, `src/app/(payload)` — админка и API Payload. Конфиг CMS — `src/payload.config.ts`, коллекции и общие поля — `src/payload/`. Переменные окружения валидируются в `src/lib/env.ts`.

## Быстрый старт

```bash
cp env.example .env          # задать PAYLOAD_SECRET (openssl rand -hex 32)
docker compose up -d         # Postgres 18 (+ БД inex_glass_test) и Mailpit
pnpm install
pnpm migrate                 # применить миграции
pnpm dev                     # http://localhost:3000, админка — http://localhost:3000/admin/
```

Mailpit (перехват почты): веб-интерфейс http://localhost:8025, SMTP `localhost:1025`.
Пересоздать БД с нуля (init-скрипт срабатывает только на пустом томе): `docker compose down -v && docker compose up -d`.

## Команды

| Команда | Что делает |
|---|---|
| `pnpm dev` | Dev-сервер |
| `pnpm build` / `pnpm start` | Сборка (без БД, миграции не запускает) и запуск |
| `pnpm check` | `lint` + `typecheck` |
| `pnpm format` | Prettier |
| `pnpm migrate` | Применить миграции Payload |
| `pnpm migrate:create <имя>` | Создать миграцию по изменениям схемы |
| `pnpm migrate:status` | Статус миграций |
| `pnpm generate:types` | Перегенерировать `src/payload-types.ts` |
| `pnpm generate:importmap` | Перегенерировать import map админки |
| `pnpm seed` | Наполнение БД (пока заглушка) |

## Правила работы со схемой

- Схема меняется только через миграции Payload (`pnpm migrate:create`); в production они применяются при старте (`prodMigrations`).
- Миграции — только expand/contract: сначала добавляем, удаляем в следующем релизе.
- `PAYLOAD_DB_PUSH=true` допустим только на личной одноразовой БД. Push на общую, staging или prod БД запрещён.
