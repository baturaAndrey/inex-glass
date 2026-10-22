# Task 06: MAX — клиент API, webhook, привязка лички и группового чата

## Status

pending

## Wave

2

## Description

Ядро интеграции с мессенджером MAX: HTTP-клиент Bot API на `fetch` (`src/lib/max/*`), защитный слой «куда слать» для не-production, webhook `POST /api/max/webhook/` (секрет, частотный лимит, быстрый ответ 200) и привязка получателей: менеджер в своём профиле нажимает «Подключить MAX» (одноразовая deep-link-ссылка `https://max.ru/<бот>?start=<токен>`), админ в «Настройках сайта» привязывает групповой чат одноразовым кодом, который отправляют в группу с ботом. Отправку уведомлений по событиям делает task-10 поверх этого ядра; здесь — только клиент, привязка, отвязка и ответы бота на привязку.

Задача единственная правит `src/lib/env.ts` и `env.example` в спеке (все переменные MAX).

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md
**Blocks:** task-10-max-notifications.md, task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема, миграция `admin_redesign`):
  - `users`: `maxUserId` (text, index), `maxLinkedAt` (date), `maxBotStopped` (checkbox) — запись через API запрещена (`systemOnly`), чтение — админ или сам пользователь (`adminOrSelfFieldAccess` в `src/payload/access/index.ts`); `maxLinkTokenHash` (text), `maxLinkTokenExpiresAt` (date) — `neverReadable`. Все пять полей `admin.hidden: true`. ui-поле `maxConnect` (label «MAX») → `src/payload/admin/max/connect-button.tsx`, экспорт **`MaxConnectButton`** (заглушка, `return null`).
  - `site-settings` → вкладка «Уведомления и заказы» → группа `notifications` (чтение — admin/manager) → группа `max`: ui-поле `maxGroupLink` → `src/payload/admin/max/group-link-panel.tsx`, экспорт **`MaxGroupLinkPanel`** (заглушка); переключатели `newLead`, `statusChange`, `assigned`, `orderEvents`, `unassignedReminder`; `groupChatId`, `groupChatTitle`, `groupLinkedAt` (`systemOnly`, readOnly); `groupLinkTokenHash`, `groupLinkTokenExpiresAt` (`neverReadable`, hidden). Пути полей формы: `notifications.max.<поле>`.
  - Имена экспортов и пути заглушек — контракт: заменить тела, не меняя имён и путей (иначе понадобится правка файлов схемы). Компоненты можно сделать клиентскими (`'use client'`) — путь в importMap не меняется.
- **task-02** (каркас): базовые классы `_base.scss` (`.iga-card`, `.iga-btn` `--primary|--secondary|--ghost|--danger`, `--sm`, `.iga-badge` `--new|--work|--kp|--ok|--no`, `.iga-field`, `.iga-input`); партиал задачи `src/app/(payload)/styles/_max.scss` создан пустым. Токены `--ig-*`. Tailwind в админке нет.
- **Существующий код** (переиспользовать, не менять):
  - `src/lib/leads/rate-limit.ts`: `rateLimit({ key, limit, windowSec }, payload?)` → `{ allowed, remaining, retryAfterSec }` (Postgres, атомарный upsert).
  - `src/lib/leads/client-ip.ts`: `getClientIp(headers)`.
  - `src/lib/leads-admin/auth.ts`: `requireStaff(request)`, `requireAdmin(request)` (через `payload.auth({ headers })`, 401/403), `jsonError(status, message)`, `NO_STORE_HEADERS`.
  - `src/lib/leads-admin/erase.ts`: `isSameOrigin(originHeader, siteUrl)` — защита от CSRF для cookie-сессии (образец — `src/app/api/admin/leads/[id]/erase/route.ts`).
  - Сравнение секретов без утечки по времени — как `safeEqual` в `src/proxy.ts` (SHA-256 обеих строк + `timingSafeEqual`).
  - `src/proxy.ts` не обрабатывает `/api/*` (нет basic auth staging на webhook).
  - `next.config.ts`: `trailingSlash: true` — **URL webhook обязан быть со слешем** (`/api/max/webhook/`): без него Next отвечает 308, а MAX не повторяет POST по редиректу.
  - Хук `revalidateGlobal` пропускает ревалидацию при `context.disableRevalidate`.
- **MAX Bot API** (`res/max-api/schema.yaml`, сводка в `specs/admin-redesign/requirements.md`): база `https://platform-api2.max.ru`; заголовок `Authorization: <token>` (без `Bearer`); `POST /messages?chat_id=…|user_id=…` с телом `{ text, format: 'html', notify, attachments: [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'link', text, url }]] } }] }` → `{ message: { body: { mid } } }`; текст ≤ 4000 символов; лимиты 30 rps и 2 сообщения/с в чат (429); `DELETE /messages?message_id=…`; `GET /chats/{chatId}` → `{ title, … }`; `GET|POST|DELETE /subscriptions` (`POST { url, update_types, secret }`, секрет 5–256 символов `[A-Za-z0-9_-]`, приходит заголовком `X-Max-Bot-Api-Secret`; сервер — только HTTPS 443). События (`update_type`, `timestamp`): `bot_started { chat_id, user: { user_id, first_name }, payload ≤ 512 }`, `bot_stopped { chat_id, user }`, `bot_added { chat_id, user, is_channel }`, `bot_removed { chat_id, user, is_channel }`, `message_created { message: { sender, recipient: { chat_id, chat_type: 'dialog'|'chat'|'channel', user_id }, body: { mid, text } } }` (в группах бот получает сообщения, только если он администратор с правом читать все сообщения). ID чатов и пользователей — int64 (храним строкой; ID групп отрицательные). 401/403/404 — перманентные ошибки, 429/5xx — временные.

## Files to Create

- `src/lib/max/client.ts` (+ `client.test.ts`) — HTTP-клиент Bot API
- `src/lib/max/target.ts` (+ `target.test.ts`) — `resolveMaxTarget`
- `src/lib/max/html.ts` (+ `html.test.ts`) — `escapeHtml`, `truncateMaxText`
- `src/lib/max/link-token.ts` (+ `link-token.test.ts`) — токены привязки и коды группы
- `src/lib/max/config.ts` — `isMaxLinkConfigured`, `maxDeepLink`, константы (`MAX_WEBHOOK_PATH`, `MAX_UPDATE_TYPES`)
- `src/lib/max/updates.ts` (+ `updates.test.ts`) — типы и разбор входящих событий
- `src/lib/max/webhook-handler.ts` (+ `webhook-handler.test.ts`) — обработка событий (привязка/отвязка, ответы бота)
- `src/lib/max/link-service.ts` — выпуск токена/кода, отвязка, статус (общие для API-роутов)
- `src/app/api/max/webhook/route.ts` — `POST` webhook
- `src/app/api/max/link-token/route.ts` — `POST` выпуск токена (личка) / кода (группа)
- `src/app/api/max/unlink/route.ts` — `POST` отвязка
- `src/app/api/max/status/route.ts` — `GET` статус привязки
- `src/payload/admin/max/use-max-status.ts` — клиентский хук статуса (опрос)
- `scripts/max-subscribe.ts` — подписка webhook (`payload run`, top-level `await`)
- `e2e/max-webhook.spec.ts` — e2e webhook и привязки

## Files to Modify

- `src/payload/admin/max/connect-button.tsx` — реализовать `MaxConnectButton` (заглушка task-01)
- `src/payload/admin/max/group-link-panel.tsx` — реализовать `MaxGroupLinkPanel` (заглушка task-01)
- `src/lib/env.ts` — переменные MAX (zod) и правило «`MAX_ENABLED=true` требует токен»
- `env.example` — раздел MAX
- `e2e/helpers/env.ts` — **только добавить** в `e2eServerEnv()` тестовые `MAX_WEBHOOK_SECRET`, `MAX_BOT_NAME`, `MAX_ENABLED: "false"` и экспорт констант `E2E_MAX_WEBHOOK_SECRET`, `E2E_MAX_BOT_NAME` (без `MAX_BOT_TOKEN`: в тестах наружу ничего не уходит)
- `src/app/(payload)/styles/_max.scss` — стили панелей

**Не трогать:** `users.ts`, `site-settings.ts` и любые коллекции/глобалы (поля уже созданы task-01), `src/lib/leads/*`, `src/lib/leads-admin/*`, `src/proxy.ts`, `package.json` (скрипт подписки запускается без алиаса, см. ниже), `Dockerfile`/compose (сертификат Минцифры — task-13), `importMap.js` и `payload-types.ts` (генераторы — локально, откатить). `messages.ts` и `notify.ts` в `src/lib/max/` создаёт task-10 — здесь их не создавать.

## Technical Details

### Переменные окружения (`src/lib/env.ts`, `env.example`)

Добавить в `envSchema` (все необязательные; пустая строка = не задано — уже обеспечивает `normalize`):

```ts
// MAX messenger (task 06 admin-redesign)
/** Master switch of outgoing notifications (task 10). Linking works without it. */
MAX_ENABLED: booleanString,
/** Bot token from the MAX partner platform. Never logged. */
MAX_BOT_TOKEN: z.string().min(16).optional(),
/** Bot nickname for deep links: https://max.ru/<name>?start=<token>. */
MAX_BOT_NAME: z.string().regex(/^[A-Za-z0-9_.-]{3,64}$/, "ник бота: латиница, цифры, _ . -").optional(),
/** Secret of the webhook subscription (header X-Max-Bot-Api-Secret). */
MAX_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/, "32–256 символов A-Z a-z 0-9 _ -").optional(),
/** Not production: every notification goes to this chat (or nowhere when unset). */
MAX_INTERCEPT_CHAT_ID: z.string().regex(/^-?\d{1,20}$/, "числовой ID чата MAX").optional(),
```

Правило вне фазы сборки (рядом с `productionIssues`, отдельной функцией `maxIssues(raw)`, ошибки добавляются в общий список): `MAX_ENABLED=true` без `MAX_BOT_TOKEN` → `MAX_BOT_TOKEN: обязательна при MAX_ENABLED=true`. Переменные входят в `core` объекта `Env` (не в `devTools`).

`env.example` — новый раздел после «Фоновые задачи и SEO»:

```dotenv
# ─── Мессенджер MAX (уведомления о заявках и заказах) ───────────────────
# true — отправлять уведомления (на staging — только в MAX_INTERCEPT_CHAT_ID)
MAX_ENABLED=false
# Токен бота: партнёрская платформа MAX → Чат-боты → Настройки. Не логируется
MAX_BOT_TOKEN=
# Ник бота для ссылки https://max.ru/<ник>?start=…
MAX_BOT_NAME=
# Секрет webhook (32–256 символов A-Z a-z 0-9 _ -). Сгенерировать: openssl rand -hex 32
MAX_WEBHOOK_SECRET=
# Не production: ID тестового чата, куда уходят ВСЕ уведомления. Пусто — не слать вообще
MAX_INTERCEPT_CHAT_ID=
```

### Клиент (`client.ts`)

Контракт (README «Контракты между задачами», обязателен для task-10):

```ts
// База берётся из необязательной env MAX_API_BASE_URL (для моков в e2e task-13),
// по умолчанию — боевой адрес. Добавить MAX_API_BASE_URL (z.string().url().optional()) в env.ts и env.example.
export const MAX_API_BASE = process.env.MAX_API_BASE_URL || "https://platform-api2.max.ru";

export class MaxApiError extends Error {
  override name = "MaxApiError";
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
  /** 401/403/404: retrying will not help (bad token, bot blocked, chat/message gone). */
  get permanent(): boolean { return this.status === 401 || this.status === 403 || this.status === 404; }
}

export interface MaxButton { text: string; url: string }

export async function maxSendMessage(input: {
  chatId?: string; userId?: string; text: string; buttons?: MaxButton[][]; notify?: boolean;
}): Promise<{ messageId: string }>;
export async function maxDeleteMessage(messageId: string): Promise<void>;
export async function maxGetChat(chatId: string): Promise<{ title: string | null }>;
export async function maxSubscribe(input: { url: string; secret: string; updateTypes: readonly string[] }): Promise<void>;
export async function maxListSubscriptions(): Promise<{ url: string; updateTypes: string[] }[]>;
export async function maxUnsubscribe(url: string): Promise<void>;
```

- Токен — `getEnv().MAX_BOT_TOKEN`; нет токена → `MaxApiError("MAX_BOT_TOKEN не задан", 401)` (перманентная).
- Ровно один из `chatId` / `userId`, иначе `TypeError`. Query: `chat_id=<id>` или `user_id=<id>`.
- Тело `POST /messages`: `{ text: truncateMaxText(text), format: "html", notify: notify ?? true }` + `attachments` только при непустых `buttons` (`type: "link"` у каждой кнопки; URL — только `https://`, иначе `TypeError`).
- Ответ `POST /messages` → `messageId = body.message.body.mid` (строка); нет — `MaxApiError("unexpected response", 502)`.
- Общий `request(method, path, { query, body })`: `fetch(new URL(path, MAX_API_BASE))`, заголовки `Authorization: <token>`, `Content-Type: application/json`, `signal: AbortSignal.timeout(10_000)`, `cache: "no-store"`. Не-2xx → `MaxApiError(<message из { code, message } тела или statusText>, status, code)`; сетевая ошибка/таймаут → `MaxApiError("network error", 0)` (временная).
- Ни токен, ни текст сообщения, ни ответ целиком не попадают в сообщения ошибок и логи.

### Адресат (`target.ts`)

```ts
export type MaxTarget = { chatId: string } | { userId: string };
/** Pure core for tests. */
export function resolveMaxTargetWith(
  env: Pick<Env, "SITE_ENV" | "MAX_ENABLED" | "MAX_BOT_TOKEN" | "MAX_INTERCEPT_CHAT_ID">,
  input: { chatId?: string | null; userId?: string | null }
): MaxTarget | null;
export function resolveMaxTarget(input: { chatId?: string | null; userId?: string | null }): MaxTarget | null; // = resolveMaxTargetWith(getEnv(), input)
```

1. `MAX_ENABLED` ложно или нет `MAX_BOT_TOKEN` → `null` (не слать).
2. Нет ни `chatId`, ни `userId` → `null`.
3. `SITE_ENV !== 'production'`: задан `MAX_INTERCEPT_CHAT_ID` → `{ chatId: MAX_INTERCEPT_CHAT_ID }` (любой адресат подменяется), иначе `null`.
4. Production: `chatId` → `{ chatId }`, иначе `{ userId }`.

`resolveMaxTarget` используют уведомления (task-10). Ответы бота на привязку (ниже) идут напрямую через `maxSendMessage` — это ответ человеку, который сам написал боту; нужен только токен.

### HTML (`html.ts`)

- `escapeHtml(value)` — `& < > " '` → сущности.
- `truncateMaxText(text, limit = 4000)` — длина ≤ `limit`; при обрезке: отрезать до `limit − 1`, убрать хвост незакрытого тега (`/<[^>]*$/`) и сущности (`/&[#a-z0-9]*$/i`), закрыть оставшиеся открытыми `<b>`, `<i>`, `<u>`, `<a>` (простой стек по порядку открытия) и добавить «…»; итог всё равно ≤ `limit`.

### Токены и коды (`link-token.ts`)

```ts
export const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;
export function generateLinkToken(): string;           // randomBytes(24).toString("base64url") → 32 символа
export function isLinkTokenFormat(value: unknown): value is string; // /^[A-Za-z0-9_-]{32}$/
export function hashToken(value: string): string;      // sha256 hex
export function tokenExpiresAt(now: Date): string;     // ISO, now + TTL
export function isExpired(expiresAt: unknown, now: Date): boolean; // нет даты → true
/** Group code typed/pasted into the group chat: «INEX-» + 8 символов Crockford base32 (без I L O U). */
export function generateGroupLinkCode(): string;
/** «  inex-7f3k 9q2m » → «INEX-7F3K9Q2M» or null when it is not a code. */
export function normalizeGroupLinkCode(text: unknown): string | null;
export function safeEqualHex(a: string, b: string): boolean; // timingSafeEqual равной длины
```

В БД хранится только SHA-256 (`maxLinkTokenHash`, `groupLinkTokenHash`); токен/код показываются один раз и одноразовы (после успешной привязки поля очищаются).

### Конфигурация (`config.ts`)

```ts
export const MAX_WEBHOOK_PATH = "/api/max/webhook/";
export const MAX_UPDATE_TYPES = ["bot_started", "bot_added", "bot_removed", "bot_stopped", "message_created"] as const;
/** Linking needs the webhook and a bot nickname (sending replies additionally needs MAX_BOT_TOKEN). */
export function isMaxLinkConfigured(env = getEnv()): boolean; // MAX_WEBHOOK_SECRET && MAX_BOT_NAME
export function maxDeepLink(token: string, env = getEnv()): string; // `https://max.ru/${MAX_BOT_NAME}?start=${token}`
```

### Входящие события (`updates.ts`)

Узкие типы только нужных событий и `parseMaxUpdate(body: unknown): MaxUpdate | null` (zod или ручная проверка): `bot_started` (`chatId`, `userId`, `payload: string | null`), `bot_stopped` (`userId`), `bot_added` / `bot_removed` (`chatId`, `isChannel`), `message_created` (`chatId`, `chatType`, `senderId`, `text: string | null`). ID приводятся к строке (`String(BigInt(...))` не нужен — JSON-числа int64 могут терять точность: читать как `number | string` и `String(value)`; если MAX пришлёт число больше `Number.MAX_SAFE_INTEGER`, отметить это в Notes отчёта — проверить на реальном боте). Неизвестный `update_type` или неверная форма → `null`.

### Webhook (`src/app/api/max/webhook/route.ts`)

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.MAX_WEBHOOK_SECRET) return new Response(null, { status: 404 });          // интеграция выключена
  const payload = await getPayload({ config });
  const limit = await rateLimit({ key: `max:webhook:ip:${getClientIp(request.headers)}`, limit: 120, windowSec: 60 }, payload);
  if (!limit.allowed) return Response.json({ ok: false }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  if (!safeEqual(request.headers.get("x-max-bot-api-secret") ?? "", env.MAX_WEBHOOK_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  // тело ≤ 64 КБ (Content-Length или длина текста) → иначе 413; невалидный JSON → 400
  const update = parseMaxUpdate(json);
  if (update) after(() => handleMaxUpdate({ payload, update, now: new Date() }).catch(logFailure));
  return Response.json({ ok: true }, { headers: NO_STORE });                       // сразу, неизвестные типы — тоже 200
}
```

- `after` — из `next/server`; перед использованием прочитать `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`.
- Тело запроса и заголовки **не логировать**; в лог — только `{ event: "max-webhook", type, result }` (без имён, текстов, ID пользователей).
- Ответ всегда без тела события; ошибки обработки не влияют на ответ (MAX не должен ретраить).

### Обработка событий (`webhook-handler.ts`)

`handleMaxUpdate({ payload, update, now, reply? })` — `reply` по умолчанию отправляет через `maxSendMessage` и молча пропускает отправку, если нет `MAX_BOT_TOKEN` (ошибки отправки логируются по имени, без текста). Все записи — Local API (`overrideAccess: true` по умолчанию, `depth: 0`, `context: { disableRevalidate: true }`).

| Событие | Действие | Ответ бота |
|---|---|---|
| `bot_started` с `payload` формата токена | `find users where maxLinkTokenHash = hashToken(payload)`, `limit 1`. Найден и не истёк → у **других** пользователей с тем же `maxUserId` обнулить `maxUserId`/`maxLinkedAt`; у найденного `maxUserId = String(userId)`, `maxLinkedAt = now`, `maxBotStopped = false`, `maxLinkTokenHash = null`, `maxLinkTokenExpiresAt = null`. Найден, но истёк → очистить токен. | успех: «MAX подключён. Сюда будут приходить уведомления о заявках, назначенных на вас.»; истёк: «Ссылка устарела. Нажмите «Подключить MAX» в профиле админки ещё раз.»; не найден: «Ссылка недействительна. Нажмите «Подключить MAX» в профиле админки.» (в личку, `userId`) |
| `bot_started` без `payload` | Если есть пользователь с `maxUserId = userId` → `maxBotStopped = false`. | привязан: «Уведомления снова включены.»; иначе: «Чтобы получать уведомления, нажмите «Подключить MAX» в своём профиле в админке Inex Glass.» |
| `bot_stopped` | Пользователи с `maxUserId = userId` → `maxBotStopped = true`. | — |
| `message_created`, `chatType === 'chat'`, `normalizeGroupLinkCode(text)` не `null` | Прочитать `site-settings` (`findGlobal`, depth 0); сравнить `hashToken(code)` с `notifications.max.groupLinkTokenHash` (`safeEqualHex`). Совпал и не истёк → `title = (await maxGetChat(chatId)).title` (ошибка/нет токена → `null`), затем `updateGlobal` (см. ниже): `groupChatId = chatId`, `groupChatTitle = title`, `groupLinkedAt = now`, хеш и срок кода — `null`. Совпал, но истёк → очистить хеш/срок. Не совпал — ничего. | успех: «Чат привязан: сюда будут приходить уведомления о новых заявках Inex Glass.»; истёк: «Код устарел. Получите новый в админке: Настройки сайта → Уведомления и заказы.»; не совпал — без ответа (не спамить чужие чаты) |
| `message_created` прочее (диалоги, каналы, обычный текст) | ничего | — |
| `bot_removed`, `chatId === groupChatId` | очистить `groupChatId`, `groupChatTitle`, `groupLinkedAt` | — |
| `bot_added` и остальное | ничего (только строка в лог) | — |

**Запись в глобал.** Частичный `updateGlobal` с вложенными группами рискует затереть соседние поля, поэтому всегда: прочитать глобал (`findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })`), собрать `notifications = { ...current.notifications, max: { ...current.notifications?.max, ...changes } }` и отправить `payload.updateGlobal({ slug: 'site-settings', data: { notifications }, depth: 0, context: { disableRevalidate: true } })`. Вынести в `updateMaxSettings(payload, changes)` в `link-service.ts`.

### Привязка из админки (`link-service.ts` + роуты)

Все роуты: `export const runtime = "nodejs"; export const dynamic = "force-dynamic";`, ответы с `NO_STORE_HEADERS`, ошибки — `jsonError`. Мутирующие (`POST`) — проверка `isSameOrigin(request.headers.get("origin"), getEnv().SITE_URL)` → 403, `Content-Type: application/json` → иначе 415. Не настроено (`!isMaxLinkConfigured()`) → 409 «MAX не настроен на сервере».

- **`POST /api/max/link-token/`** — тело `{ "target": "user" }` или `{ "target": "group" }`.
  - `user`: `requireStaff`; только **для себя** (`auth.user.id`), никакого `userId` в теле. `rateLimit({ key: 'max:link:<userId>', limit: 10, windowSec: 600 })` → 429. Новый токен, `payload.update({ collection: 'users', id, data: { maxLinkTokenHash, maxLinkTokenExpiresAt } })`. Ответ `{ url: maxDeepLink(token), expiresAt }`.
  - `group`: `requireAdmin`; тот же лимит; новый код → `updateMaxSettings({ groupLinkTokenHash, groupLinkTokenExpiresAt })`. Ответ `{ code, expiresAt, botName }`.
- **`POST /api/max/unlink/`** — `{ "target": "user", "userId"?: string }` или `{ "target": "group" }`.
  - `user`: без `userId` или свой → `requireStaff`; чужой → только админ (менеджер → 403). Обнуляет `maxUserId`, `maxLinkedAt`, `maxLinkTokenHash`, `maxLinkTokenExpiresAt`, `maxBotStopped = false`. Ответ `{ ok: true }`.
  - `group`: `requireAdmin`; обнуляет `groupChatId`, `groupChatTitle`, `groupLinkedAt`, хеш и срок кода.
  - Сообщения в MAX при отвязке не шлются.
- **`GET /api/max/status/?userId=<id>`** — `requireStaff`; без `userId` — свой; чужой — только админ (иначе 403). Ответ:

```ts
type MaxStatus = {
  configured: boolean;            // isMaxLinkConfigured()
  botName: string | null;
  user: { linked: boolean; linkedAt: string | null; botStopped: boolean; pending: boolean }; // pending: токен выпущен и не истёк
  group?: { linked: boolean; title: string | null; chatId: string | null; linkedAt: string | null; pending: boolean }; // только для admin
};
```

Читать Local API c `overrideAccess: true` (нужны neverReadable-поля для `pending`), наружу отдавать только поля выше (без хешей и `maxUserId`).

### UI: профиль (`connect-button.tsx`, `MaxConnectButton`)

`'use client'`. Рисуется в форме пользователя (`/admin/account/` и `/admin/collections/users/<id>/`) на месте ui-поля «MAX».
- `useDocumentInfo().id` — пользователь документа; `useAuth().user` — текущий. Нет `id` (создание) → подсказка «Сохраните пользователя, чтобы подключить MAX».
- Статус — `useMaxStatus(userId)` (`use-max-status.ts`: `fetch('/api/max/status/?userId=…', { credentials: 'same-origin', cache: 'no-store' })`, метод `refresh()`, опрос `poll({ intervalMs, timeoutMs, until })`).
- Разметка `.iga-card.iga-max` (заголовок «MAX», 16/600):
  - подключено → `.iga-badge--ok` «Подключено 22.10.2026» (дата — `maxLinkedAt` в `Asia/Yekaterinburg`); `botStopped` → дополнительно `.iga-badge--work` «Бот остановлен» и текст «Откройте чат с ботом и нажмите «Начать», чтобы снова получать уведомления»;
  - не подключено → `.iga-badge--new` «Не подключено»;
  - не настроено → текст `--ig-text-2` «Подключение MAX недоступно: не настроен бот на сервере» (кнопок нет).
- Только свой профиль: «Подключить MAX» (`.iga-btn--primary`, `type="button"`). По клику — **синхронно** `const tab = window.open("", "_blank")` (чтобы не сработал блокировщик всплывающих окон), затем `POST /api/max/link-token/ { target: 'user' }`; успех → `tab.location.href = url` (если `tab === null` — показать ссылку «Открыть MAX» `<a target="_blank" rel="noopener">`); подсказка «Откройте ссылку и нажмите «Начать» в чате с ботом. Ссылка действует 30 минут.»; опрос статуса раз в 3 с до 2 мин или до `linked` → `toast.success('MAX подключён')`. Ошибка → `tab?.close()`, `toast.error(сообщение сервера)`.
- Подключено (свой профиль или админ в чужом) → «Отключить» (`.iga-btn--ghost`, `type="button"`), `window.confirm('Отключить уведомления MAX?')` → `POST /api/max/unlink/` → `refresh()`.
- Админ в чужом профиле не может подключать (токен выпускается только для себя) — видит статус и «Отключить».

### UI: настройки сайта (`group-link-panel.tsx`, `MaxGroupLinkPanel`)

`'use client'`, внутри группы «Мессенджер MAX» над переключателями.
- Не админ (`getRole(useAuth().user) !== 'admin'`) → статус только для чтения («Подключён чат «…»» / «Групповой чат не привязан») без кнопок.
- Привязан → `.iga-badge--ok` «Подключён» + «Чат «<title>» с 22.10.2026» (нет названия — «Чат ID <chatId>»); «Отвязать» (`.iga-btn--danger` `--sm`, `type="button"`, confirm «Отвязать групповой чат? Уведомления о новых заявках перестанут приходить.») → `POST /api/max/unlink/ { target: 'group' }`.
- Не привязан → «Групповой чат не привязан» + «Привязать чат» (`.iga-btn--secondary`, `type="button"`) → `POST /api/max/link-token/ { target: 'group' }` → блок `.iga-max__code`:
  - код крупно моноширинным шрифтом (`font-variant-numeric: tabular-nums`, 20/600, фон `--ig-bg`, радиус 10) и кнопка «Скопировать» (`navigator.clipboard.writeText`, тост «Код скопирован»);
  - инструкция `<ol>`: «Добавьте бота @<botName> в групповой чат менеджеров и назначьте его администратором (нужно право читать сообщения).» / «Отправьте в этот чат сообщение с кодом.» / «Код действует 30 минут. После привязки статус обновится сам.»;
  - опрос статуса раз в 5 с до 30 мин (или до ухода со страницы); появилось `linked` → тост «Групповой чат привязан», блок кода скрыть.
- Не настроено → «MAX не настроен на сервере: задайте MAX_BOT_NAME и MAX_WEBHOOK_SECRET» (только админу).
- Все кнопки `type="button"` — панель внутри формы глобала, она не должна отправлять форму.

### Стили (`_max.scss`)

Только `.iga-max*`: отступы карточки 16/20, ряд статуса `display:flex; gap:8px; flex-wrap:wrap; align-items:center`, блок кода, список инструкции (`padding-left: 20px; line-height: 1.5`), касания ≥ 44 px на мобильном. Цвета — токены.

### Скрипт подписки (`scripts/max-subscribe.ts`)

Запуск (алиаса в `package.json` нет — файл принадлежит task-02):

```bash
pnpm payload run scripts/max-subscribe.ts              # подписать <SITE_URL>/api/max/webhook/
pnpm payload run scripts/max-subscribe.ts -- --list    # показать подписки
pnpm payload run scripts/max-subscribe.ts -- --unsubscribe
```

- **Top-level `await`** обязателен (иначе `payload run` молча завершится с кодом 0 до окончания работы).
- Берёт `getEnv()`; без `MAX_BOT_TOKEN` или `MAX_WEBHOOK_SECRET` — понятная ошибка и `process.exit(1)`. URL = `new URL(MAX_WEBHOOK_PATH, SITE_URL)` — проверка `https:` (иначе ошибка «MAX принимает только HTTPS на 443»). `update_types` = `MAX_UPDATE_TYPES`.
- Печатает результат без токена и секрета.

### Тесты

**Vitest** (проект `unit`, `fetch` мокается `vi.stubGlobal`, `getEnv` — через `vi.stubEnv` + `vi.resetModules()` или передачу env в чистые функции):
- `client.test.ts`: URL и query (`chat_id`/`user_id`), заголовок `Authorization` без `Bearer`, тело с `format: 'html'` и кнопками `inline_keyboard`, без `attachments` при пустых кнопках; `messageId` из `message.body.mid`; ошибки 401/403/404 → `permanent: true`, 429/500/сеть → `false`; сообщение ошибки не содержит токен и текст; оба/ни одного адресата → `TypeError`; `http://` в кнопке → `TypeError`.
- `target.test.ts`: все ветки `resolveMaxTargetWith` (выключено, нет токена, нет адресата, staging с перехватом и без, production чат/личка).
- `html.test.ts`: экранирование; обрезка ≤ 4000, без обрыва тега/сущности, закрытие `<b>`/`<a>`, «…».
- `link-token.test.ts`: длина/алфавит токена, хеш стабилен, `isExpired`, формат и нормализация кода (`" inex-7f3k 9q2m "` → `INEX-7F3K9Q2M`, мусор → `null`), `safeEqualHex`.
- `updates.test.ts`: разбор каждого события из примеров `schema.yaml`; неизвестный тип и битая форма → `null`; числовые ID → строки.
- `webhook-handler.test.ts` (фейковый `payload` с `vi.fn()` для `find/update/findGlobal/updateGlobal`, фейковый `reply`): успешная привязка лички (поля, очистка токена, отвязка дубля у другого пользователя, ответ), истёкший и неизвестный токен, `bot_stopped`, `bot_started` без payload; привязка группы по коду (слияние `notifications` без потери соседних полей, `title` из `maxGetChat`), истёкший код, чужой код (без ответа), `bot_removed` текущей группы и чужой группы.

**Playwright `e2e/max-webhook.spec.ts`** (`desktop-1366`, `mode: 'serial'`; сервер e2e получает `MAX_WEBHOOK_SECRET`/`MAX_BOT_NAME` из `e2eServerEnv()`; при `E2E_BASE_URL` (внешний стенд) — `test.skip`, если не задан `E2E_MAX_WEBHOOK_SECRET`; запросы к webhook — с уникальным `X-Forwarded-For` через `clientIpHeaders(uniqueTestIp())` из `e2e/helpers/test-ip.ts`; админ — `adminApi`, менеджер — `staffApi`/`deleteStaffApi`; POST-роуты привязки — с заголовком `Origin: <baseURL>`; результаты фоновой обработки (`after`) ждать через `expect.poll` по `GET /api/max/status/`):
1. Webhook без заголовка и с неверным секретом → 401; с верным секретом и неизвестным `update_type` → 200 `{ ok: true }`.
2. Админ: `POST /api/max/link-token/ { target: 'user' }` → `url` вида `https://max.ru/<E2E_MAX_BOT_NAME>?start=<32 символа>`; webhook `bot_started` с этим `payload` и `user.user_id = 900000001` → статус `linked: true`; `GET /api/users/me/` → `maxUserId === "900000001"`.
3. Повторный `bot_started` с тем же токеном и другим `user_id` → `maxUserId` не изменился (одноразовость).
4. `bot_stopped` от `900000001` → `botStopped: true`; `POST /api/max/unlink/ { target: 'user' }` → `linked: false`.
5. Группа: `POST /api/max/link-token/ { target: 'group' }` → `code` формата `INEX-XXXXXXXX`; `message_created` (`chat_type: 'chat'`, `chat_id: -700000001`, текст — код в нижнем регистре с пробелами) → `group.linked: true`, `chatId: "-700000001"`; `bot_removed` из этого чата → `linked: false`.
6. Права: менеджер — `link-token { target: 'group' }` → 403; `status?userId=<id админа>` → 403; `unlink { target: 'user', userId: <id админа> }` → 403; `PATCH /api/users/<свой id>/ { maxUserId: "1" }` → значение не изменилось. Без `Origin` → 403.
7. UI: `/admin/account/` админа — блок «MAX» со статусом «Не подключено» и кнопкой «Подключить MAX»; `/admin/globals/site-settings/` → вкладка «Уведомления и заказы» → «Групповой чат не привязан» и «Привязать чат»; клик показывает код и инструкцию с ником бота (после теста — `unlink { target: 'group' }`).

После прогона — отвязать всё, что привязали (в `afterAll`), чтобы не оставлять состояние для других спек.

### Проверки

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm test:e2e e2e/max-webhook.spec.ts
git checkout src/app/\(payload\)/admin/importMap.js src/payload-types.ts   # если менялись локально
```

## Acceptance Criteria

- [ ] `src/lib/max/{client,target,html,link-token}.ts` соответствуют контракту README (имена, сигнатуры, `MaxApiError.permanent` для 401/403/404) и покрыты unit-тестами с моками `fetch`.
- [ ] `env.ts`/`env.example`: `MAX_ENABLED`, `MAX_BOT_TOKEN`, `MAX_BOT_NAME`, `MAX_WEBHOOK_SECRET`, `MAX_INTERCEPT_CHAT_ID` с валидацией; `MAX_ENABLED=true` без токена — понятная ошибка запуска; сборка без переменных MAX проходит.
- [ ] `resolveMaxTarget`: вне production всё уходит только в `MAX_INTERCEPT_CHAT_ID` или никуда; при выключенном `MAX_ENABLED` — никуда.
- [ ] Webhook `POST /api/max/webhook/`: без верного `X-Max-Bot-Api-Secret` — 401 (сравнение `timingSafeEqual`), частота ограничена `rateLimit`, ответ 200 сразу, обработка в `after()`, неизвестные события игнорируются, тело не логируется; без `MAX_WEBHOOK_SECRET` — 404.
- [ ] Личка: «Подключить MAX» выпускает одноразовый токен (только для себя, хранится SHA-256, 30 мин), `bot_started` с ним привязывает `maxUserId`, повторно токен не работает; `bot_stopped` ставит `maxBotStopped`; «Отключить» отвязывает (сам или админ).
- [ ] Группа: только админ выпускает код, сообщение с кодом в группе привязывает `groupChatId`/`groupChatTitle`/`groupLinkedAt`, код одноразовый; `bot_removed` и «Отвязать» отвязывают; соседние поля `notifications` не теряются.
- [ ] Менеджер не может привязать группу, увидеть или отвязать чужую привязку, записать `maxUserId` через API.
- [ ] `scripts/max-subscribe.ts` подписывает `https://<домен>/api/max/webhook/` (со слешем), использует top-level `await`, не печатает секреты.
- [ ] Стили только в `_max.scss`; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/max-webhook.spec.ts` зелёные.

## Notes

- Модель: премиум (безопасность webhook, токены, Payload Local API).
- В `action-required.md` команда подписки записана как `pnpm max:subscribe` и URL без слеша — фактическая команда `pnpm payload run scripts/max-subscribe.ts`, URL `https://<домен>/api/max/webhook/`; координатору — поправить `action-required.md`.
- Если Node в контейнере не доверяет сертификату `platform-api2.max.ru`, `fetch` упадёт с ошибкой TLS (`MaxApiError` статус 0) — сертификат Минцифры подключает task-13 через `NODE_EXTRA_CA_CERTS`.
- Ответы бота отправляются только при наличии `MAX_BOT_TOKEN`; на staging с отдельным ботом это безопасно (ответ получает тот, кто сам написал боту).
- Точность int64: ID групп MAX — большие отрицательные числа; `JSON.parse` теряет точность после 2^53. Если на реальном боте встретятся такие ID — разбирать тело через `request.text()` и регулярку для полей `chat_id`/`user_id` (сообщить координатору).

## Поправки координатора (приоритет над текстом выше)

- **Бот GRATEC общий с другим сайтом** (тестовый чат `MAX_INTERCEPT_CHAT_ID` — рабочий канал заявок другого сайта, там живые подписчики). Поэтому:
  - `src/lib/max/target.ts` экспортирует `decorateMaxText(text: string): string`: вне production (`SITE_ENV !== 'production'`) добавляет первой строкой `<b>[ТЕСТ] Inex Glass</b>`, в production — `<b>Inex Glass</b>` (чтобы в общем боте было видно источник). `maxSendMessage` сам текст не меняет; вызывать `decorateMaxText` обязаны все отправители (task-10, ответы бота в webhook). Unit-тест на оба режима.
  - `scripts/max-subscribe.ts` сначала делает `GET /subscriptions`; если там есть подписка с другим URL — **не перезаписывает**, печатает её и выходит с кодом 1 (перезапись только с флагом `--force`). Webhook бота может быть занят другим сайтом.
  - Ответы бота в webhook (`MAX подключён` и т. п.) — только в личный диалог пользователя или в привязываемую группу, никогда в `MAX_INTERCEPT_CHAT_ID` без пометки.
  - Ручные проверки и e2e против реального API — только с пометкой «[ТЕСТ]», не чаще необходимого; по умолчанию e2e ходят в мок через `MAX_API_BASE_URL`.
