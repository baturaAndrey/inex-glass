# Task 17: Приём заявок и загрузка файлов (upload, leads API, антиспам, rate-limit, consent-log, защищённая отдача)

## Status

pending

## Wave

4

## Description

Серверная часть воронки: потоковая загрузка чертежей (до 50 МБ) через route handler с проверкой сигнатур, выдача подписанных токенов загрузки, приём заявок всех форм (квиз, чертёж, звонок, образец, «под нагрузку», контакты, полная форма) с валидацией zod-схемами из доменной библиотеки, антиспам (honeypot, HMAC-метка времени, rate-limit в Postgres), создание записей `leads`, `lead-files`, `consent-log` через Local API, постановка задания уведомления менеджеру и защищённая выдача файлов администратору/менеджеру. Заявки — главный результат сайта: потерять заявку или принять мусор нельзя.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md
**Blocks:** task-20-quiz-core.md, task-21-forms-modals.md, task-32-admin-leads.md, task-33-orders.md

**Context from dependencies:**
- **task-10**: схема заморожена. Нужны коллекции CRM (task-08): `leads` (formType quiz/drawing/callback/sample/load/contacts/full; sourceLabel; entryPage; utm-группа; metrikaClientId; company, inn, name, phone, email, role, city, area, productType, comment; `answers` JSON; `flags` multi-select; `files` rel many → `lead-files`; `status` rel → `lead-statuses`; `refuseReason`; `assignee`; `internalComments`; `isDuplicate`/`duplicateOf` — вычисляются в `beforeChange` по телефону/e-mail; versions включены), `lead-files` (upload, приватная, `staticDir` = `UPLOADS_DIR`, `access.read` только admin/manager), `lead-statuses` (первый по `order` = «Новая»), `consent-log` (lead, ip, userAgent, consentVersion, policyVersion, createdAt), `rate-limits` (key unique, count, windowStart; скрытая). **Точные имена полей — только из `src/payload/collections/crm/*.ts` и `src/payload-types.ts`**; схему не менять. Если нужного поля нет — остановиться и сообщить координатору. Для `consent-log.phoneHash`/`emailHash` (по хэшу на контакт) вызывать хелперы HMAC из `src/payload/utils/normalize.ts` (ключ `FORM_HMAC_SECRET`; точные имена — в коде); файлы проверяются также хуком `upload-hooks.ts` коллекции `lead-files` (расширение + MIME + сигнатура) — переиспользовать `src/payload/collections/crm/upload-policy.ts`, а не дублировать.
- **task-11**: `@/lib/domain` — `leadSubmitSchema` / `LeadSubmit` / `FORM_TYPES` / `normalizePhone` / `normalizeEmail` / `computeQuizFlags` / `QUIZ_FLAG_LABELS` (`lead-schemas.ts`, `quiz-schema.ts`, `quiz-flags.ts`).
- Из task-01: `src/lib/env.ts` (zod; переменные `UPLOADS_DIR` = `/data/lead-files`, `FORM_HMAC_SECRET`, `SITE_URL`), `proxy.ts` исключает `/api` из matcher (иначе тело запроса усекается на 10 МБ). `trailingSlash: true` — клиенты должны вызывать `/api/upload/` и `/api/forms/lead/` **со слешем**.
- Same-wave (task-18): очередь заданий Payload и задача `notify-new-lead` с входом `{ leadId: string }` (slug задания строго `notify-new-lead`); в момент реализации этой задачи типы заданий могут быть ещё не сгенерированы — см. «Постановка задания».
- В `package.json` уже предустановлены `busboy` и `@types/busboy` (task-10). Если нет — сообщить координатору, не запускать `pnpm add` параллельно с другими агентами.

## Files to Create

- `src/app/api/upload/route.ts` — `POST /api/upload/`
- `src/app/api/forms/lead/route.ts` — `POST /api/forms/lead/`
- `src/app/api/form-token/route.ts` — `POST /api/form-token/`
- `src/app/api/lead-files/[id]/download/route.ts` — `GET /api/lead-files/<id>/download/`
- `src/lib/uploads/stream.ts` — потоковый приём multipart (busboy), санитизация имён
- `src/lib/uploads/signature.ts` — проверка сигнатур файлов
- `src/lib/uploads/tokens.ts` — подписанные токены загрузки
- `src/lib/leads/create-lead.ts` — создание заявки и связанных записей
- `src/lib/leads/antispam.ts` — honeypot, токен формы (HMAC-метка времени)
- `src/lib/leads/rate-limit.ts` — rate-limit в Postgres
- `src/lib/leads/client-ip.ts` — определение IP клиента
- `src/lib/leads/consent.ts` — запись consent-log, версии документов
- `src/lib/leads/duplicates.ts` — нормализаторы и поиск дублей (тонкий модуль)
- `src/lib/leads/enqueue.ts` — постановка задания `notify-new-lead`
- Тесты (vitest): `src/lib/uploads/signature.test.ts`, `src/lib/uploads/tokens.test.ts`, `src/lib/uploads/stream.test.ts` (санитизация имён), `src/lib/leads/antispam.test.ts`, `src/lib/leads/client-ip.test.ts`

## Files to Modify

Нет. (Не править схему, `payload.config.ts`, `package.json`.)

## Technical Details

### Общие правила API

- Все обработчики: `export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`; ответы JSON с заголовком `Cache-Control: no-store`.
- Единый формат ошибок: `{ ok: false, code: string, message: string }`. Сообщения для пользователя — только эти (дословно из `res/inex-glass-handoff/teksty/05-kviz.md` «Ошибки формы»):
  - формат файла: «Подойдут DWG, DXF, PDF, JPG или PNG» (для форм без JPG/PNG — «Подойдут DWG, DXF или PDF»);
  - размер: «Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии»;
  - любая серверная ошибка/лимит/антиспам: «Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}» (телефон — из global `contacts` через `getContacts()` task-15 либо безопасный запасной `+7 (351) 247-05-57`);
  - поля формы: ошибки валидации возвращаются как `{ ok:false, code:'validation', message, fields: { <path>: <сообщение zod> } }`.
- Коды: `format`, `size`, `rate`, `token`, `expired`, `too_fast`, `validation`, `bad_request`, `server`.
- Статусы HTTP: 200 ok; 400 validation/format/token/expired/too_fast/bad_request; 413 size; 429 rate; 500 server.
- Содержимое файлов/заявок не логировать целиком; логи — без ПДн (максимум id и коды).

### 1. IP клиента — `client-ip.ts`

`getClientIp(headers: Headers): string` — за Traefik: `X-Forwarded-For` — цепочка IP; берём **самый правый непубличный-исключая-доверенные**: разбить по запятой, обрезать пробелы, идти справа налево, пропуская адреса из доверенных сетей (loopback `127.0.0.0/8`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`, `169.254.0.0/16`) — первый публичный адрес и есть клиент. Если не найден — `X-Real-IP`, затем `'unknown'`. Подмена левой части заголовка клиентом не влияет. Тесты: цепочка `1.2.3.4, 10.0.0.5` → `1.2.3.4`; `fake, 8.8.8.8, 172.18.0.3` → `8.8.8.8`; пустой → `unknown`; IPv6.

### 2. Антиспам — `antispam.ts`

- `issueFormToken(now = Date.now()): string` → `base64url(JSON{ t, n })` + `.` + `HMAC-SHA256(FORM_HMAC_SECRET, payload)` (base64url); `n` — случайный nonce 8 байт.
- `verifyFormToken(token, now): { ok: true } | { ok: false; reason: 'bad' | 'too_fast' | 'expired' }` — подпись сравнивать `timingSafeEqual`; `now - t < 3000` мс → `too_fast`; `> 2 ч` (7 200 000 мс) → `expired`; будущая метка (> now + 60 с) → `bad`.
- `isHoneypotTripped(body)`: поле `company_website` непустое → бот. Обработка: ответить **`200 { ok: true }` без создания записи** (бот не должен узнать о ловушке).
- `POST /api/form-token/` — пустое тело, ответ `{ ok: true, token }`; ограничение 60 запросов / 10 мин / IP через `rateLimit` (ключ `token:ip:<ip>`). Клиентские формы запрашивают токен при монтировании и при ошибке `expired`/`too_fast` (повторить через 3 с).
- Тесты: валидный токен спустя 3,1 с — ok; спустя 2 с — `too_fast`; спустя 2 ч 1 с — `expired`; подмена подписи — `bad`.

### 3. Rate-limit — `rate-limit.ts`

`rateLimit({ key, limit, windowSec }): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }>` — атомарный UPSERT в таблицу `rate_limits` (коллекция `rate-limits`, task-08) через `payload.db.drizzle`:

```ts
import { sql } from '@payloadcms/db-postgres/drizzle';
const res = await payload.db.drizzle.execute(sql`
  INSERT INTO rate_limits (id, key, count, window_start, created_at, updated_at)
  VALUES (gen_random_uuid(), ${key}, 1, now(), now(), now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
    window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END,
    updated_at = now()
  RETURNING count, window_start`);
```
(Имена колонок сверить с фактической схемой в миграции `src/migrations/*`; при другом именовании — подстроить SQL.) `allowed = count <= limit`. Ключи — без ПДн в открытом виде: `lead:ip:<ip>`, `lead:phone:<sha256(digits)>`, `lead:email:<sha256(lowercase)>`, `upload:ip:<ip>`, `token:ip:<ip>`. Лимиты: создание заявки — **5 / 10 мин** на IP, на телефон и на e-mail; загрузка — **20 / 10 мин** на IP. Очистку старых записей делает задание `cleanup-rate-limits` (task-18).

### 4. Сигнатуры файлов — `signature.ts`

```ts
export const ALLOWED_EXTENSIONS = { quiz: ['dwg','dxf','pdf','jpg','jpeg','png'], form: ['dwg','dxf','pdf'] } as const;
validateFile(ext: string, head: Buffer, purpose: 'quiz'|'form'): { ok: true; kind: 'pdf'|'png'|'jpeg'|'dwg'|'dxf' } | { ok: false; reason: 'format' }
```
JPG/PNG допустимы только для `purpose: 'quiz'` (эскиз в квизе). Проверка расширения (по имени, без регистра) **и** сигнатуры первых байт:
- PDF: начинается с `%PDF` (`25 50 44 46`);
- PNG: `89 50 4E 47`;
- JPEG: `FF D8 FF`;
- DWG: первые 4 байта ASCII `AC10` (AC1015, AC1018, AC1021, AC1024, AC1027, AC1032…);
- DXF: текстовый — после необязательных пробелов/BOM идёт `0` + перевод строки + `SECTION` (`/^﻿?\s*0\s*\r?\n\s*SECTION/`), либо первые 1024 байта — ASCII и содержат и `SECTION`, и `HEADER`; двоичный DXF — начинается с `AutoCAD Binary DXF`.
Расширение и сигнатура должны согласоваться (`.pdf` с сигнатурой PNG → отказ). Тесты: по одному валидному и невалидному образцу каждого типа (байтовые буферы в тесте), переименованный файл, JPG при `purpose: 'form'`.

### 5. Приём файла — `POST /api/upload/` (`stream.ts` + route)

- Заголовки/поля: multipart/form-data, одно поле `file`, текстовое поле `purpose` (`quiz` | `form`, по умолчанию `form`); заголовок `X-Form-Token` (валидный по подписи и не старше 2 ч; минимальный возраст 3 с на загрузке **не** проверять).
- Предпроверки: `Content-Length` > 50 МБ + 1 МБ запаса → 413 `size`; rate-limit `upload:ip` → 429 `rate`.
- Стрим: `Readable.fromWeb(req.body as any)` → `busboy({ headers, limits: { files: 1, fileSize: 52428800, fields: 4, parts: 6 } })`; файл пишется во временный `${UPLOADS_DIR}/tmp/<uuid>.part` (создать каталог `mkdir -p`, права 0o700), байты считаются; первые 1024 байта сохраняются для сигнатуры; при превышении `fileSize` (событие `limit`) — оборвать поток, удалить временный файл, ответить 413 `size`.
- После завершения: валидация расширения/сигнатуры (раздел 4) → при ошибке удалить файл, 400 `format`; успех: переименовать в `${UPLOADS_DIR}/tmp/<uuid>.<ext>`, вернуть `{ ok: true, token, name, size, ext }`.
- Имена: `sanitizeFilename(original)`: транслитерация кириллицы (ГОСТ 7.79 системой Б упрощённо), замена всего вне `[A-Za-z0-9._-]` на `-`, схлопывание повторов, обрезка основы так, чтобы вся строка (с расширением) была ≤ 100 символов, расширение в нижнем регистре; пустое имя → `file`. Исходное имя для показа сохраняется отдельно (`originalName`: управляющие символы убраны, длина ≤ 200).
- Токен загрузки (`tokens.ts`): `signUploadToken({ id, ext, name, originalName, size, purpose }, now)` → `base64url(JSON{ ...meta, exp: now + 2ч })` + `.` + HMAC; `verifyUploadToken(token, now) → meta | null` (подпись, срок). При создании заявки сервер дополнительно проверяет, что файл `${UPLOADS_DIR}/tmp/<id>.<ext>` существует.
- Тесты: `sanitizeFilename('Чертёж перегородки №3 (v2).DWG')` → `chertezh-peregorodki-3-v2.dwg` (допускается эквивалентный по правилам вариант; зафиксируйте ожидаемое в тесте); длинное имя усекается до ≤ 100; токены подписаны/просрочены.

### 6. Заявка — `POST /api/forms/lead/` и `create-lead.ts`

Порядок обработки:
1. Лимит тела 200 КБ; JSON parse (ошибка → 400 `bad_request`).
2. Honeypot (`company_website` непустое) → `200 { ok: true }`, ничего не создавать.
3. `leadSubmitSchema.safeParse(body)` (task-11) → при ошибке 400 `validation` с картой `fields`.
4. `verifyFormToken(formToken)` → `too_fast` / `expired` / `bad` → 400 (клиент получит новый токен и повторит).
5. rate-limit по IP (5/10 мин), по телефону и по e-mail (если есть) → при превышении 429 `rate` (сообщение — общее «Не удалось отправить заявку…»).
6. `createLead(data, { ip, userAgent })`:
   - собрать токены файлов (`uploadTokens` и `answers.file.uploadToken`), проверить через `verifyUploadToken`, убедиться в существовании tmp-файла и (повторно) сигнатуре; не более 5 файлов;
   - для каждого файла создать документ `lead-files` через Local API с `filePath` (Payload копирует файл в `staticDir`), `overrideAccess: true`, `context: { disableRevalidate: true }`; затем удалить временный файл;
   - создать `leads`: `formType`, `sourceLabel` (по форме: quiz — «Квиз»; drawing — «Форма: отправить чертёж» (+ `params.label`, если пришёл); callback — «Заказ звонка»; sample — «Заказ образца»; load — «Подбор под нагрузку»; contacts — «Форма на странице контактов»; full — «Полная форма»), `entryPage`, `utm`, `metrikaClientId`, нормализованные колонки (`company`, `inn`, `name`, `phone` в формате `+7XXXXXXXXXX`, `email` в нижнем регистре, `role` (id из `QUIZ_ROLES`, напр. `manufacturer`), `city`, `area`, `productType` — **id** типа изделия (`answers.type` как есть: `tempered`, `shopfronts`, …; select-поле схемы использует те же id, подписи — из `QUIZ_TYPES` при выводе), `comment`), `answers` (весь JSON ответов квиза либо полезная нагрузка формы), `flags` (для квиза — `computeQuizFlags` с текущими данными `getPricesInput`/`getPromoInput`/`getHolidays`; для остальных форм: `no_file` не ставить), `files` (id созданных `lead-files`), `status` — не передавать: его ставит хук `assignDefaultStatus` task-08 (статус с `isDefault`, «Новая», сид task-16);
   - дубли: если `beforeChange` хука task-08 уже вычисляет `isDuplicate`/`duplicateOf` — **ничего не дублировать**; `duplicates.ts` тогда экспортирует только `normalizePhone`, `normalizeEmail` (реэкспорт из домена) и `findDuplicateLeadIds(payload, { phone, email, excludeId })` (read-only helper для уведомлений/админки);
   - создать `consent-log` (`lead`, `ip`, `userAgent` (до 500 символов), `consentVersion`, `policyVersion` — константы в `consent.ts`, например `CONSENT_VERSION = '2026-10-19'`, `POLICY_VERSION = '2026-10-19-draft'`);
   - при любой ошибке после создания части записей — откатить созданное вручную (удалить lead-files/файлы на диске/lead), чтобы не оставлять осиротевшие данные; ответ 500 `server`.
7. Постановка задания (`enqueue.ts`): `enqueueNotifyNewLead(payload, leadId)` вызывает `payload.jobs.queue({ task: 'notify-new-lead', input: { leadId } })`. Если типизация задания ещё недоступна (task-18 не слит) — вызывать через узкий приведённый тип (`payload.jobs.queue as (a: { task: string; input: unknown }) => Promise<unknown>`) с комментарием «убрать приведение после слияния task-18 и регенерации типов». Ошибка постановки **не должна** ломать создание заявки: логируем (без ПДн) и возвращаем успех.
8. Ответ: `{ ok: true, leadId }`.

Клиентские поля, которые заполняет сервер, а не клиент: `ip`, `userAgent`, `status`, `isDuplicate`.

### 7. Защищённая выдача — `GET /api/lead-files/[id]/download/`

- Аутентификация: `const { user } = await payload.auth({ headers })`; нет пользователя → 401; роль не `admin`/`manager` → 403.
- Загрузить `lead-files` по id (Local API, `overrideAccess: true`), вычислить путь **внутри `UPLOADS_DIR`** (`path.resolve` + проверка префикса, защита от traversal), 404 если нет файла.
- Ответ: стрим файла (`fs.createReadStream` → `Readable.toWeb`), заголовки `Content-Type` по расширению (dwg `application/acad`, dxf `application/dxf`, pdf, png, jpeg), `Content-Disposition: attachment; filename="<ascii-имя>"; filename*=UTF-8''<percent-encoded originalName>`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
- Права на каталог тома принадлежат непривилегированному пользователю (task-03) — код не должен предполагать root.

### Environment Variables

- `UPLOADS_DIR` — каталог файлов заявок (`/data/lead-files`; временные файлы — `${UPLOADS_DIR}/tmp`).
- `FORM_HMAC_SECRET` — секрет подписи токенов формы и загрузки (≥ 32 символов).
- `SITE_URL`, `DATABASE_URL`, `PAYLOAD_SECRET` — общие.

### API Endpoints

- `POST /api/form-token/` → `{ ok, token }`.
- `POST /api/upload/` (multipart: `file`, `purpose`; заголовок `X-Form-Token`) → `{ ok, token, name, size, ext }` | ошибка.
- `POST /api/forms/lead/` (JSON по `leadSubmitSchema`) → `{ ok, leadId }` | ошибка.
- `GET /api/lead-files/:id/download/` (сессия admin/manager) → файл.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят (unit: сигнатуры, токены, санитизация имён, IP, антиспам-метка).
- [ ] Ручная проверка через `curl`/скрипт на запущенном dev-сервере с мигрированной БД (приложить команды в отчёт): загрузка валидного PDF → 200 и токен; файл 51 МБ → 413 «Файл больше 50 МБ…»; `.exe`/`.pdf` с чужой сигнатурой → 400 «Подойдут DWG, DXF, PDF, JPG или PNG»; JPG при `purpose=form` → 400; поток 50 МБ не раздувает память (процесс не держит файл целиком в RAM).
- [ ] `POST /api/forms/lead/` с валидным квизом → 200, в БД есть `leads` (+ `lead-files`, `consent-log`, статус «Новая», флаги), файл физически лежит в `UPLOADS_DIR`, tmp-файл удалён.
- [ ] Honeypot → 200 без записи; тело без согласия → 400 `validation` с текстом согласия; токен <3 с → `too_fast`, >2 ч → `expired`; 6-я заявка с одного IP за 10 минут → 429; повторная заявка с тем же телефоном выставляет дубль (через хук task-08), в ответе клиенту это не раскрывается.
- [ ] Задание `notify-new-lead` ставится в очередь (проверка по таблице `payload_jobs` после слияния с task-18; до этого — вызов обёртки не падает); ошибка очереди не мешает созданию заявки.
- [ ] `GET /api/lead-files/:id/download/` без сессии → 401, под ролью без прав → 403, под admin/manager → файл с `Content-Disposition: attachment` и `Cache-Control: private, no-store`; traversal (`../`) невозможен.
- [ ] Обращение к API без завершающего слеша не используется ни в одном клиентском коде этой задачи (документировать для task-20/21).
- [ ] В логах нет ПДн и содержимого файлов.

## Notes

- Модель: премиум (безопасность и надёжность).
- Источники: ТЗ `docs/inex/16-tz-razrabotka.md` §6–6.1; квиз `docs/inex/struktury-stranic/p0-dokumenty-gost-kviz.md` §4; тексты ошибок `res/inex-glass-handoff/teksty/05-kviz.md`; политика `res/inex-glass-handoff/teksty/15-politika-pdn.md` (хранение в РФ, срок согласия).
- Uploads **не через Server Actions** (лимит 1 МБ). Payload-админка использует собственные лимиты `upload.limits.fileSize` ≈ 52 MiB.
- UTM и client ID приходят от клиента (`utm`, `metrikaClientId`; id может быть пустым без согласия на аналитику).
- Файлы заводам передаются без ПДн — на стороне процессов менеджеров; код сайта этого не касается.
