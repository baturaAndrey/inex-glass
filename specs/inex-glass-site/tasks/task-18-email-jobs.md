# Task 18: Почта и фоновые задания (SMTP-адаптер, React Email, Payload Jobs)

## Status

pending

## Wave

4

## Description

Подключает отправку писем и фоновые задания: SMTP-адаптер Payload (`@payloadcms/email-nodemailer`) с перехватом всей почты на staging (`MAIL_INTERCEPT_TO`), шаблоны писем на React Email (табличная вёрстка 600 px, совместимая с Outlook и Gmail) — «новая заявка», «заявка назначена», «статус заказа», — и очередь заданий Payload Jobs с ретраями: уведомления менеджерам, письма клиентам, очистка временных файлов, истечение ссылок заказов, очистка таблицы rate-limit. Автозапуск заданий включается только на одном контейнере (`JOBS_ENABLED=true`).

## Dependencies

**Depends on:** task-10-schema-freeze.md
**Blocks:** task-32-admin-leads.md, task-33-orders.md (используют имена заданий и `deriveOrderToken`), а также task-17 (ставит `notify-new-lead`, контракт той же волны) и task-36 (заглушка задания `indexnow-submit`)

**Context from dependencies:**
- **task-10** заморозил схему (коллекции `leads`, `lead-files`, `lead-statuses`, `orders`, `rate-limits`, `users`; globals `site-settings`, `contacts`) и предустановил зависимости: `@react-email/components`, `@payloadcms/email-nodemailer` (той же версии, что `payload`). Точные имена полей — только из `src/payload/collections/crm/*.ts`, `src/payload/globals/*.ts` и `src/payload-types.ts` (схему не менять). Концептуально нужны: у `leads` — `formType`, `sourceLabel`, `company`, `name`, `phone`, `email`, `inn`, `city`, `area`, `productType`, `comment`, `answers`, `flags`, `files`, `status`, `assignee`, `isDuplicate`, `entryPage`, `utm`; у `orders` (имена по task-08) — `number`, `company`, `composition`, `clientEmail` (адрес клиента), `notifyClient`, `currentStatus`, `statusHistory[]` ({status: spec_agreed|in_production|packed|shipped|received, date, plannedDate}), `clientComment.text`, `shipment.carrier`, `shipment.waybill`, `shipment.trackingUrl`, `manager`, `tokenHash`, `tokenCreatedAt`, `revoked`, `expiresAt`, `lastNotifiedStatus`/`lastNotifiedAt`; у `site-settings` — список e-mail уведомлений (`notifications.leadNotifyEmails[].email`), срок жизни ссылки заказа (`orderLinkTtlDays`).
- **task-01**: `src/lib/env.ts` (zod) с `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_INTERCEPT_TO`, `JOBS_ENABLED`, `SITE_URL`, `SITE_ENV`; `docker-compose.yml` содержит Mailpit (SMTP `localhost:1025`, UI `http://localhost:8025`); `src/payload.config.ts` собран task-01/10.
- **task-17** (параллельно) ставит задание `notify-new-lead` (вход `{ leadId: string }`); имена и входы заданий из этой задачи — контракт для task-17, 32, 33.
- Прототип письма статуса заказа — `res/inex-glass-handoff/prototypes/Email.dc.html` (разметка внутри `<x-dc>`: белый контейнер 600 px, логотип, заголовок, строки «дата / ТК / накладная», кнопка, подпись менеджера, подвал navy с тремя адресами) и задание `res/inex-glass-handoff/zadaniya/08-stranica-zakaza.md` (раздел «Письмо клиенту при смене статуса»).

## Files to Create

Письма (`src/emails/`):
- `tokens.ts` — цвета, шрифты, размеры для inline-стилей
- `layout.tsx` — общая обёртка `EmailLayout` (логотип, контейнер 600 px, подвал)
- `new-lead.tsx` — письмо менеджеру о новой заявке
- `lead-assigned.tsx` — письмо ответственному о назначении
- `order-status.tsx` — письмо клиенту о смене статуса заказа
- `format-answers.ts` — человекочитаемая сводка заявки (из `answers`, флагов) для писем
- `render.ts` — `renderEmail(component) → { html, text }` (обёртка над `render()` из `@react-email/components`)
- `emails.test.tsx` — vitest-тесты рендера

Задания (`src/jobs/`):
- `index.ts` — реестр `tasks` для `payload.config.ts` (**все** задания проекта, включая заглушку `indexnow-submit`; после этой задачи реестр не меняется)
- `notify-new-lead.ts`, `notify-assigned.ts`, `send-order-status.ts`, `cleanup-tmp-uploads.ts`, `expire-order-links.ts`, `cleanup-rate-limits.ts`
- `indexnow.ts` — **заглушка** задания `indexnow-submit` (вход `{ urls: string[] }`, `retries: 3`; handler логирует «IndexNow ещё не реализован» и возвращает `{ output: { submitted: 0 } }`); тело handler'а целиком заменяет task-36 (волна 6), slug/вход не меняются

Прочее:
- `src/payload/email.ts` — SMTP-адаптер + перехват (`emailAdapter`, `applyIntercept`)
- `src/payload/email.test.ts` — vitest для `applyIntercept`
- `src/lib/orders/access-token.ts` — `deriveOrderToken`, `hashOrderToken`, `buildOrderUrl` (+ `access-token.test.ts`)
- `src/lib/mail/send.ts` — `sendMail(payload, message)` — единая точка отправки (перехват + логирование без тела письма)
- `public/email/logo@2x.png` — логотип для писем (PNG 138×82 px, из `res/inex-glass-handoff/design-system/assets/inex-glass-logo-dark.svg` через `sharp`; отображается шириной 69 px)
- `src/migrations/<timestamp>_add_jobs_queue.ts` + `.json` — миграция таблиц очереди (генерируется CLI, см. ниже)

## Files to Modify

- `src/payload.config.ts` — **разрешено менять только ключи `email` и `jobs`** (добавить `email: emailAdapter`, `jobs: {...}`); остальное не трогать.
- `src/migrations/index.ts` — обновляется CLI автоматически.
- `src/payload-types.ts` — перегенерируется (появятся типы заданий и коллекции `payload-jobs`).
- `src/app/(payload)/admin/importMap.js` — перегенерируется командой `generate:importmap`.

## Technical Details

### 1. SMTP-адаптер и перехват (`src/payload/email.ts`)

```ts
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
export const emailAdapter = ({ payload }) => {
  const base = nodemailerAdapter({
    defaultFromAddress: env.SMTP_FROM,           // напр. noreply@inexglass.ru
    defaultFromName: 'Inex Glass',
    transportOptions: {
      host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      ignoreTLS: env.SMTP_HOST === 'localhost' || env.SMTP_HOST === 'mailpit',   // Mailpit без TLS
    },
  })({ payload });
  return { ...base, sendEmail: (msg) => base.sendEmail(applyIntercept(msg)) };
};
```
- `applyIntercept(message, interceptTo = env.MAIL_INTERCEPT_TO)`: если `MAIL_INTERCEPT_TO` задан — заменить `to` на него, очистить `cc/bcc`, добавить к теме префикс `[STAGING → <исходный получатель>] `, добавить заголовок `X-Original-To`. Если не задан — сообщение без изменений. Чистая функция, покрыта тестом (`to` строкой и массивом, несколько получателей, пустой intercept).
- Dev: SMTP Mailpit (`localhost:1025`) — письма смотреть на `http://localhost:8025`.
- Все письма отправляются с `from` = `SMTP_FROM`; `replyTo` для клиентских писем — e-mail менеджера, если есть.

### 2. Шаблоны писем (React Email)

- Только табличная вёрстка и inline-стили (никаких flex/grid/CSS-переменных), ширина контейнера **600 px**, шрифт Arial/Helvetica, кодировка UTF-8; кнопка — «bulletproof» (`<a>` в `<td>` с `bgcolor`, padding, border-radius 999 px), изображений только логотип (PNG@2x по абсолютному URL `${SITE_URL}/email/logo@2x.png`, `width="69" height="41"`, `alt="Inex Glass"`).
- `tokens.ts` (значения берутся из прототипа Email.dc.html): `text: '#1C1F22'`, `muted: '#5B636B'`, `line: '#E6E8E6'`, `bg: '#ECEEEC'`, `card: '#FFFFFF'`, `button: '#1F6B60'` (контраст ≥ 4,5:1 с белым), `footerBg: '#324B64'`, `footerText: '#C9D3DD'`, `footerMuted: '#9FB0C2'`, шрифты `Arial, 'Helvetica Neue', Helvetica, sans-serif`, размеры: заголовок 26/1.25 bold, текст 15/1.5, мелкий 13/1.55, отступы 40 px.
- `EmailLayout({ preview, eyebrow?, children, signature?, showFooterReason? })`: прехедер (`<Preview>`), белая карточка 600 px на сером фоне, шапка с логотипом и нижней линией, область контента, блок подписи (необязательный), подвал navy: «Inex Glass» + три адреса: «Челябинск — офис: ул. Артиллерийская, 124А · +7 (351) 247-05-57, +7 951 489-04-09», «Челябинск — склад и самовывоз: Свердловский тракт, 7В · пн–пт, 9:00–18:00», «Екатеринбург — офис: ул. Данилы Зверева, 17б · +7 982 329-11-08», строка `sale@inex.su · inexglass.ru`; в письмах клиенту — строка «Вы получили это письмо, потому что оформили заказ в Inex Glass.» (дословно). Контакты брать из global `contacts` с запасом на константы.
- `order-status.tsx` (клиенту) — по `Email.dc.html`:
  - eyebrow «Статус заказа» (капс 13 px), `<h1>` «Статус заказа № {number}: {Статус}» (русские названия: `spec_agreed` — «Спецификация согласована», `in_production` — «В производстве», `packed` — «Упаковано», `shipped` — «Отгружено», `received` — «Получено»);
  - таблица строк «подпись — значение»: для `shipped`: «Дата отгрузки» (ДД.ММ.ГГГГ), «Транспортная компания», «Номер накладной»; для остальных статусов: «Дата» (+ «Плановая дата», если задана); пустые значения вместо данных — не выводятся;
  - комментарий менеджера для клиента (`clientComment.text`), если есть — выделенным блоком (фон `#FCF6EA`, рамка `#F2D59C`);
  - абзац «Фото упаковки, документы на партию и ссылка на отслеживание — на странице заказа.» (для `packed` / `shipped`; для остальных статусов — «Все этапы заказа и документы — на странице заказа.»);
  - кнопка «Открыть страницу заказа» (URL `buildOrderUrl(token)`);
  - подпись: «С уважением,» / имя менеджера / «Менеджер по заказам Inex Glass» / телефон и e-mail (из `users`: phone, email; если поля пустые — контакты компании);
  - в письме **нет** телефона/e-mail заказчика.
- `new-lead.tsx` (менеджеру): тема «Новая заявка: {sourceLabel} — {компания или имя}»; блок «Источник и страница входа»; таблица полей (дата, компания, ИНН, имя, телефон `tel:`, e-mail `mailto:`, город, площадь, тип изделия, роль, комментарий), блок «Флаги» (подписи `QUIZ_FLAG_LABELS` из `@/lib/domain`: «Малый объём», «Нестандартный размер», «Срочно», «Без файла», «Нужны документы») цветными плашками, метка «Повторная заявка» при `isDuplicate`, сводка ответов квиза (`format-answers.ts`: тип, толщина/триплекс-формула, вид, размеры, обработка, срок, доставка — по `answers`), список файлов (имя, размер; ссылка на `${SITE_URL}/api/lead-files/<id>/download/`, доступная после входа в админку), UTM, кнопка «Открыть заявку в админке» → `${SITE_URL}/admin/collections/leads/<id>`.
- `lead-assigned.tsx` (ответственному): тема «Вам назначена заявка: {sourceLabel} — {компания или имя}»; краткая сводка, кнопка «Открыть заявку».
- Все шаблоны возвращают и HTML, и plain-text (`renderEmail`: `render(el)` и `render(el, { plainText: true })`).
- Тесты (`emails.test.tsx`): для каждого письма `renderEmail` не бросает исключений; html содержит `width="600"`, ключевые строки (кнопки, заголовок статуса, «Вы получили это письмо…»), не содержит `display:flex`/`display:grid`; plain-text не пуст; письмо статуса `shipped` содержит ТК и номер накладной, `in_production` — нет строки «Номер накладной».

### 3. Токен страницы заказа — `src/lib/orders/access-token.ts`

Проблема: в БД хранится только SHA-256 токена (`tokenHash`), а письмо на **каждую** смену статуса должно содержать ссылку. Решение (согласовать с task-33): токен **детерминированно выводится** из секрета и данных заказа, в БД остаётся только хэш для поиска.

```ts
deriveOrderToken(orderId: string, tokenCreatedAt: Date | string): string
// base64url(HMAC-SHA256(ORDER_TOKEN_SECRET, `order:${orderId}:${new Date(tokenCreatedAt).toISOString()}`).subarray(0, 16))  → 128 бит, 22 символа
hashOrderToken(token: string): string      // hex SHA-256 → значение поля orders.tokenHash
buildOrderUrl(token: string): string       // `${SITE_URL}/zakaz/${token}/`
```
Ключ — отдельный секрет `ORDER_TOKEN_SECRET` (`src/lib/env.ts`, task-01), **не** `PAYLOAD_SECRET`: ротация секрета Payload не должна ломать ссылки клиентов. Смена `ORDER_TOKEN_SECRET` инвалидирует все выданные ссылки — записать в `docs/deploy.md` («не ротировать без необходимости; после смены перевыпустить ссылки активных заказов»). Перевыпуск ссылки = смена `tokenCreatedAt` (новый токен, новый хэш); отзыв = `revoked: true`. Тесты: детерминированность, разные `tokenCreatedAt` → разные токены, длина, URL со слешем. **Задача 33 обязана использовать эти функции** (иначе письма не смогут восстановить ссылку).

### 4. Задания (`src/jobs/*.ts`, формат Payload Jobs `TaskConfig`)

Проверить API для Payload 3.91 по документации (context7): `TaskConfig` (`slug`, `inputSchema`, `outputSchema`, `handler`, `retries`, `schedule`).

| slug | Вход | Что делает |
|---|---|---|
| `notify-new-lead` | `{ leadId: string }` | загружает заявку (`depth: 1`), получатели: e-mail ответственного (`assignee`), иначе все адреса `site-settings.notifications.leadNotifyEmails`; если получателей нет — бросает ошибку (задание уйдёт в ретраи и останется видимым в админке); рендерит `new-lead.tsx`; `sendMail`; выход `{ sentTo: string[] }` |
| `notify-assigned` | `{ leadId: string, assigneeId: string }` | письмо `lead-assigned.tsx` ответственному; нет e-mail → ошибка |
| `send-order-status` | `{ orderId: string, status: 'spec_agreed'\|'in_production'\|'packed'\|'shipped'\|'received' }` | загружает заказ (`depth: 1`, менеджер), берёт `tokenCreatedAt`, строит токен через `deriveOrderToken` и URL; шлёт `order-status.tsx` на `order.clientEmail` (нет адреса или `notifyClient === false` → логирует и завершает успешно); отозванному/просроченному заказу письма **не** шлёт; после отправки пишет `lastNotifiedStatus`/`lastNotifiedAt` (`context: { skipOrderHooks: true, skipStatusEmail: true, disableRevalidate: true }`) |
| `cleanup-tmp-uploads` | — | расписание `0 * * * *` (ежечасно): удаляет файлы старше 24 ч в `${UPLOADS_DIR}/tmp`; выход `{ deleted: number }`; безопасно при отсутствии каталога |
| `expire-order-links` | — | расписание `15 * * * *`: заказы, у которых `expiresAt < now` и `revoked != true`, → `revoked: true` (Local API, `context: { disableRevalidate: true }`); выход `{ expired: number }` |
| `cleanup-rate-limits` | — | расписание `30 * * * *`: удаляет записи `rate-limits` с `windowStart` старше 1 суток; выход `{ deleted: number }` |
| `indexnow-submit` | `{ urls: string[] }` | **заглушка** для task-36 (см. «Files to Create»): регистрируется сейчас, потому что slug задания попадает в enum таблицы `payload_jobs` — новое задание в волне 6 потребовало бы ещё одной миграции |

- Ретраи для почтовых заданий: до 5 попыток с экспоненциальной задержкой (старт 60 с) — `retries: { attempts: 5, backoff: { type: 'exponential', delay: 60_000 } }` (сверить синтаксис с документацией 3.91).
- Задания чистки — идемпотентны, лимитированы по размеру пачки (≤ 1000 записей/файлов за запуск).
- `src/jobs/index.ts`: `export const jobTasks: TaskConfig[] = [...]` — 7 заданий из таблицы. Другие задачи этот файл не меняют (task-36 меняет только `src/jobs/indexnow.ts`).
- Логи заданий — без ПДн и без тел писем.

### 5. Конфиг `jobs` в `payload.config.ts`

```ts
jobs: {
  tasks: jobTasks,
  autoRun: [{ cron: '* * * * *', limit: 20, queue: 'default' }],     // обработка очереди каждую минуту
  shouldAutoRun: async () => env.JOBS_ENABLED === 'true',            // только на одном контейнере
  deleteJobOnComplete: true,                                           // сверить параметр в 3.91
  jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
    ...defaultJobsCollection,
    admin: { ...defaultJobsCollection.admin, group: 'Система' },
    access: { read: isAdmin, update: isAdmin, delete: isAdmin, create: () => false },
  }),
},
```
Если схема `schedule` в 3.91 требует отдельной очереди (`queue: 'maintenance'`) и второй записи `autoRun` — добавить (`{ cron: '0 * * * *', limit: 10, queue: 'maintenance' }`) и указать queue в `schedule` заданий. Инициализация Payload ленивая: cron запускается при первом `getPayload()` — его вызывает `/api/health/` (task-03), поэтому `healthcheck` стартует задания. **После правки конфига заданий перезапускайте dev-сервер** (HMR ломает cron).

### 6. Миграция очереди (разрешённое исключение из заморозки схемы)

Подключение `jobs` добавляет в схему таблицы очереди (`payload_jobs` и связанные). Это единственное изменение схемы в Wave 4:
```bash
pnpm payload migrate:create add_jobs_queue
pnpm payload migrate
pnpm payload generate:types
pnpm payload generate:importmap
```
Проверить SQL (только `CREATE TABLE/INDEX`, без `DROP`), закоммитить миграцию вместе с обновлёнными `src/migrations/index.ts` и `payload-types.ts`. Другие задачи Wave 4 схему не меняют — конфликтов нет, но координатору следует слить эту задачу после остальных или перегенерировать типы после слияния.

### Environment Variables

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP (Яндекс 360 / Mail.ru в prod; Mailpit `localhost:1025` в dev).
- `MAIL_INTERCEPT_TO` — staging: вся почта уходит на этот адрес с префиксом в теме.
- `JOBS_ENABLED` — `true` только на одном контейнере.
- `ORDER_TOKEN_SECRET` — ключ HMAC токенов страницы заказа (≥ 32 символов, свой для staging и prod).
- `SITE_URL`, `SITE_ENV`, `UPLOADS_DIR`.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят (тесты `applyIntercept`, `access-token`, рендер трёх писем).
- [ ] Миграция `add_jobs_queue` сгенерирована и применяется на чистой БД; типы заданий и `payload-jobs` присутствуют в `payload-types.ts`; `payload.config.ts` изменён только по ключам `email` и `jobs`.
- [ ] Dev: при `JOBS_ENABLED=true` заявка, созданная через `POST /api/forms/lead/` (task-17), порождает задание `notify-new-lead`, и за ≤ 1–2 минуты в Mailpit (`localhost:8025`) появляется письмо «Новая заявка…» с корректными данными, флагами и кнопкой в админку; при пустых `notifyEmails` и без ответственного задание падает с понятной ошибкой и уходит в ретраи.
- [ ] Письмо статуса заказа для `in_production` и `shipped` визуально соответствует `Email.dc.html` в Mailpit (HTML и текстовая версии); ссылка в кнопке ведёт на `${SITE_URL}/zakaz/<токен>/` и совпадает с токеном, выведенным `deriveOrderToken`; тема «Заказ № … : …».
- [ ] При `MAIL_INTERCEPT_TO=qa@example.test` все письма уходят только на этот адрес, тема начинается с `[STAGING → …]`.
- [ ] Письма не содержат `display:flex|grid`, внешних CSS/шрифтов, кроме логотипа; проверка в Outlook/Gmail — вручную по возможности (скриншоты Mailpit в отчёт).
- [ ] Задания очистки идемпотентны: ручной запуск `payload.jobs.run()` не падает при пустом каталоге/таблице; тестовый tmp-файл старше 24 ч удаляется, свежий — остаётся.
- [ ] `shouldAutoRun` возвращает `false` без `JOBS_ENABLED=true` (задания не стартуют на втором контейнере).
- [ ] PNG-логотип `public/email/logo@2x.png` создан и доступен по `/email/logo@2x.png`.

## Notes

- Модель: премиум.
- Контракт имён заданий (используют другие задачи): `notify-new-lead` `{ leadId }`; `notify-assigned` `{ leadId, assigneeId }` (его ставит админка leads, task-32); `send-order-status` `{ orderId, status }` (ставит хук заказов, task-33); `indexnow-submit` `{ urls }` (ставит плагин task-36).
- Источники: ТЗ `docs/inex/16-tz-razrabotka.md` §6.1–6.2; `res/inex-glass-handoff/zadaniya/08-stranica-zakaza.md`; прототип `res/inex-glass-handoff/prototypes/Email.dc.html`; контакты `docs/inex/16-tz-razrabotka.md` §4.4.
- Контраст кнопки письма (#1F6B60) подобран по правилам доступности; цвет `#2B8C7E` для белого текста недостаточен.
- Документация Payload Jobs/Email: проверяйте через context7 / Exa для версии 3.91 (синтаксис `retries`, `schedule`, `autoRun`, `shouldAutoRun` мог меняться).
