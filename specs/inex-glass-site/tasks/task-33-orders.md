# Task 33: Заказы — автосоздание из заявки, админка и публичная страница `/zakaz/<токен>/`

## Status

complete

## Wave

5

## Description

Реализовать функциональность ТЗ §6.2 «Страница заказа по ссылке (без личного кабинета)»: автоматическое создание заказа, когда заявка получает статус «Договор»; уникальная ссылка `/zakaz/<токен>/`, которую можно отозвать или перевыпустить; админ-интерфейс для менеджера (статусы с датами, комментарий клиенту, фото упаковки, ТК, накладная, документы); письмо клиенту на каждую смену статуса; публичная страница с таймлайном из 5 статусов, галереей фото, блоком отгрузки, документами и карточкой менеджера, а также состояния «ссылка больше не действует». Клиент видит статус без звонка менеджеру и без регистрации. Схема не меняется — все поля `orders` уже заморожены.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-17-lead-intake-uploads.md, task-18-email-jobs.md
**Blocks:** None (проверка — task-42)

**Context from dependencies:**
- **task-10 / task-08 (схема CRM, заморожена):** `orders` (имена по task-08): `number` (`ГГГГ-NNNN`, автосчётчик по году — вычисляется на схеме), `lead` → `leads`, `company`, `composition` (текст), `clientEmail` (адрес клиента, **не показывается на странице**), `clientName`/`clientPhone` (внутренние), `notifyClient`, `statusHistory[] {status: spec_agreed|in_production|packed|shipped|received, date, plannedDate, note}`, `currentStatus`, `clientComment {text, updatedAt}`, `packPhotos[] {photo → order-files, caption}`, `shipment {carrier, waybill, trackingUrl}`, `documents[] {title, kind, file → order-files}`, `manager` → `users`, `tokenHash` (уникальный индекс), `tokenCreatedAt`, `revoked`, `expiresAt` (вычисляется: дата статуса «Получено» + срок жизни из `site-settings`, по умолчанию 90 дней). `order-files` — приватная upload-коллекция (`access.read` только admin/manager; `staticDir` из env). `users`: `phone`, `messengerUrl`, `photo`, `position`, роли admin/manager. `leads.status` → `lead-statuses` (флаг `isContract` у статуса «Договор»). Точные имена/типы — `src/payload/collections/crm/*.ts`, `src/payload-types.ts`. **Схему не менять**; если поля не хватает — остановиться и написать координатору.
- **task-08 оставил** `src/payload/hooks/order-from-lead.ts` с экспортом-заглушкой (no-op), **уже подключённой** в `leads.hooks.afterChange`: имя экспорта и тип хука сохранить. `leads.ts` в этой задаче не трогать: в волне 5 его меняет task-32.
- **task-18:** очередь заданий; **`send-order-status` `{ orderId: string, status: 'spec_agreed'|'in_production'|'packed'|'shipped'|'received' }`** (письмо `order-status.tsx`, на `order.clientEmail`; отозванному/просроченному заказу и при `notifyClient === false` не шлёт; нет e-mail → логирует и завершается успешно); задание `expire-order-links` (раз в час помечает просроченные `revoked: true`). **`src/lib/orders/access-token.ts`** (создан task-18, использовать **обязательно**): `deriveOrderToken(orderId, tokenCreatedAt) → string` (base64url(HMAC-SHA256(ORDER_TOKEN_SECRET, `order:${orderId}:${ISO(tokenCreatedAt)}`).subarray(0,16)) = 128 бит, 22 символа; `ORDER_TOKEN_SECRET` — отдельный секрет из `src/lib/env.ts`), `hashOrderToken(token) → hex SHA-256` (значение `tokenHash`), `buildOrderUrl(token) → ${SITE_URL}/zakaz/${token}/`. Токен не хранится — выводится из `id` и `tokenCreatedAt`, поэтому письма на каждую смену статуса могут восстановить ссылку; перевыпуск = новый `tokenCreatedAt`.
- **task-14:** `HeaderShell` по `usePathname()` показывает `OrderHeader` (логотип, `tel:`, «Рассчитать стоимость») на путях `/zakaz/*`. Подвал, cookie-баннер, `StickyCta` и `Metrika` layout рисует для всех путей (см. «Открытые вопросы»).
- **task-13:** `Timeline` (`steps: {key,title,date?,state: 'done'|'current'|'todo'}[]`, `orientation="responsive"` — горизонтальный ≥600, вертикальный ≤599), `Lightbox` (`images`, `index`, счётчик «N из M»), `Callout`, `Card`, `Badge`, `Button`.
- **task-15:** `getContacts()` в `src/lib/cms/globals.ts`, `buildMetadata`-правила noindex, `getPayloadClient()`.
- **task-17:** модель защищённой отдачи файлов (аналог для заказов делается здесь), `src/lib/leads/*`.
- **task-11:** `formatDateRu`, `pluralRu`, `formatNumber`, `COMPANY_TZ` (`Asia/Yekaterinburg`).

## Files to Create

**Хуки и логика заказов**
- `src/payload/hooks/order-lifecycle.ts` — `afterChange` (create): выставляет `tokenCreatedAt`/`tokenHash`, ставит первое письмо; `afterChange` (update): письмо при смене `currentStatus`; `beforeChange`: синхронизация `statusHistory` и `currentStatus` (через `applyStatusChange`)
- `src/lib/orders/status.ts` (+ `status.test.ts`) — статусы, подписи, цвета, `ORDER_STATUSES`, `applyStatusChange(history, {status, date, plannedDate})`, `nextStatus(current)`, индекс статуса
- `src/lib/orders/composition.ts` (+ `composition.test.ts`) — `buildComposition(lead)`
- `src/lib/orders/public-view.ts` (+ `public-view.test.ts`) — `toPublicOrderView(order, now)`: белый список полей для страницы, шаги таймлайна, подписи дат, признак активной ссылки, видимость блоков
- `src/lib/orders/lookup.ts` — `getOrderByToken(token)`: валидация формата, поиск по `tokenHash`, проверка `deriveOrderToken === token` (`timingSafeEqual`), `revoked`/`expiresAt`, чтение через Local API с `overrideAccess: true` и явным `select`/`populate` белого списка
- `src/lib/orders/files.ts` — выбор файла заказа по id с проверкой принадлежности заказу (фото или документ), санитизация имени, список разрешённых MIME

**Публичная часть**
- `src/app/(site)/zakaz/[token]/page.tsx` — страница заказа (`dynamic = 'force-dynamic'`)
- `src/app/(site)/zakaz/[token]/not-found.tsx` — состояние «ссылка больше не действует»
- `src/app/(site)/zakaz/[token]/docs/[id]/route.ts` — `GET` документа/фото заказа по токену
- `src/components/order/order-title.tsx`, `status-card.tsx`, `client-comment.tsx`, `pack-photos.tsx` (клиентский: сетка миниатюр + `Lightbox`), `shipment-card.tsx` (клиентский: кнопка «Скопировать»), `documents-card.tsx`, `manager-card.tsx`, `invalid-link.tsx`

**Админка**
- `src/payload/admin/orders/order-manage-view.tsx` — серверный вид-вкладка «Управление» (ссылка, статус, предупреждения)
- `src/payload/admin/orders/token-panel.tsx` — клиентская панель ссылки (копировать, открыть, перевыпустить, отозвать/вернуть, отправить письмо повторно)
- `src/payload/admin/orders/status-panel.tsx` — клиентская панель смены статуса
- `src/payload/admin/orders/order-warnings.ts` — расчёт предупреждений
- `src/payload/admin/orders/cells/status-cell.tsx`, `link-expiry-cell.tsx` — ячейки списка
- `src/app/api/admin/orders/[id]/token/route.ts` — `GET` (текущая ссылка) и `POST {action}`
- `src/app/api/admin/orders/[id]/status/route.ts` — `POST` смена статуса
- `src/lib/orders/admin-auth.ts` — `requireStaff(request)` (аналог из task-32 — отдельный файл, без импорта между задачами)

**Тесты**
- `e2e/orders.spec.ts`, `e2e/helpers/orders-fixtures.ts`

## Files to Modify

- `src/payload/hooks/order-from-lead.ts` — реализовать (заглушка → хук `leads.afterChange`)
- `src/payload/collections/crm/orders.ts` — **только** `admin` (`components`, `defaultColumns`, `listSearchableFields`, `defaultSort`) и добавление хуков из этой задачи в `hooks`. Поля/access/индексы не трогать (отступление от «без схемы» — хуки нельзя прикрепить иначе)
- `src/jobs/send-order-status.ts` — **не менять**; если при интеграции окажется, что задание не использует `deriveOrderToken`/`buildOrderUrl`, написать координатору (файл принадлежит task-18)

- `src/app/(payload)/admin/importMap.js` — **не коммитить**: владелец генерируемых файлов волны 5 — task-32. Здесь `pnpm generate:importmap` запускать только локально, для проверки своих компонентов. После слияния волны координатор перегенерирует файл.

**Не трогать:** `src/payload/collections/crm/leads.ts` (task-32; хук `orderFromLead` уже подключён task-08), `src/lib/orders/access-token.ts` (task-18), `src/emails/*`, `src/components/layout/*`, `src/lib/domain/*`, `next.config.ts`, `src/proxy.ts`, `package.json`.

## Technical Details

### Принципы безопасности страницы заказа

- Токен в URL — единственный секрет. Формат проверяется регуляркой `^[A-Za-z0-9_-]{22}$` **до** обращения к БД. Поиск по `tokenHash = hashOrderToken(token)`; затем контрольная проверка `timingSafeEqual(deriveOrderToken(order.id, order.tokenCreatedAt), token)`.
- Любая причина недоступности — несуществующий токен, неверный формат, `revoked`, `expiresAt < now` — даёт **одинаковый** результат: `notFound()` → сегментный `not-found.tsx` (HTTP 404, одинаковый текст, чтобы не раскрывать существование заказа).
- Данные страницы собираются из **белого списка** (`toPublicOrderView`): `number`, `company`, `composition`, `currentStatus`, `statusHistory`, `clientComment`, `packPhotos` (только id/alt), `shipment.carrier`, `shipment.waybill`, `shipment.trackingUrl`, `documents` (title, id, тип, размер), менеджер (`name`, `phone`, `email`, `messengerUrl`, `photo`, `position`). **Никогда** не выводить `clientEmail`/`clientName`/`clientPhone`, поля заявки (`lead`), внутренние комментарии. Тест Vitest сериализует view-model и проверяет отсутствие `clientEmail`, `clientPhone` и `lead`.
- Заголовки/метаданные: `export const dynamic = 'force-dynamic'` (Next ставит `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`); `robots: { index: false, follow: false, noarchive: true, nocache: true }`; `referrer: 'no-referrer'` (токен не должен утекать в Referer на сайт ТК); внешние ссылки — `target="_blank" rel="noopener noreferrer"`; в `robots.txt` путь закрывает task-36, в sitemap не попадает. Title: `Заказ № {number} | Inex Glass`. JSON-LD и крошки на странице **не выводятся**.
- `trackingUrl` выводить только при схеме `http(s)`.
- Метка заказа в шапке страницы — «Страница заказа» (а не `inexglass.ru/zakaz/<номер>` из прототипа: настоящая ссылка содержит токен, а не номер).

### §6.2 — покрытие требований по строкам ТЗ

| Функция ТЗ | Реализация |
|---|---|
| **Создание** | Хук `order-from-lead` (см. ниже) создаёт заказ при переходе заявки в статус с `isContract = true`; `order-lifecycle` (create) выставляет `tokenCreatedAt` и `tokenHash`. Ссылка — `buildOrderUrl(deriveOrderToken(id, tokenCreatedAt))` (длинный случайный код, не номер заказа). Заказ можно создать и вручную в админке (без заявки) — те же хуки. |
| **Доступ** | Без логина, по ссылке; `noindex`, запрет в `robots.txt` (task-36); отзыв/перевыпуск — панель «Ссылка» во вкладке «Управление». |
| **Статусы заказа** | Спецификация согласована → В производстве → Упаковано → Отгружено → Получено; у каждого статуса дата; комментарий для клиента (`clientComment`, например перенос срока). Таймлайн и панель смены статуса. |
| **Уведомления** | `order-lifecycle` ставит `send-order-status` при создании (статус `spec_agreed`, если есть `order.clientEmail`) и при каждой смене `currentStatus` (кроме `context.skipStatusEmail`). Задание само не шлёт письмо отозванному/просроченному заказу и заказу без e-mail. |
| **Фото упаковки** | `packPhotos` загружает менеджер в админке (`order-files`); на странице — галерея миниатюр с лайтбоксом «N из M», подпись «Фото при отгрузке, ДД.ММ.ГГГГ»; пустое состояние «Фото появятся при отгрузке». Предупреждение в админке, если статус «Упаковано»/«Отгружено» без фото. |
| **Отгрузка** | Блок «Отгрузка»: дата отгрузки, транспортная компания, номер накладной с кнопкой «Скопировать» → «Скопировано», ссылка «Открыть на сайте ТК» (если `trackingUrl`). |
| **Документы** | Блок «Документы»: файлы `documents[]` (спецификация, паспорт, сертификаты) с кнопкой «Скачать» через `/zakaz/<токен>/docs/<id>/`. |
| **Менеджер** | Карточка: имя, фото (или нейтральный круг), должность (по умолчанию «Менеджер по заказам»), телефон, e-mail, кнопка «Написать в мессенджер» (`messengerUrl`; нет — кнопка скрыта). Менеджер не назначен → блок с общими контактами из `getContacts()`. |
| **Персональные данные** | На странице только номер заказа, компания и состав (+ данные менеджера Inex). Телефона/e-mail заказчика нет. |
| **Срок жизни ссылки** | `expiresAt` = дата статуса «Получено» + `site-settings` (по умолчанию 90 дней; считает схема task-08 в `beforeChange`; проверить e2e). Страница недоступна после `expiresAt` (проверка на каждом запросе + задание `expire-order-links`). Срок настраивает администратор. |

### Хук `order-from-lead.ts` (leads → `afterChange`)

- Срабатывает при `operation === 'update'` (или create, если заявка сразу создана в статусе «Договор»), когда статус изменился на документ `lead-statuses` с `isContract = true` (сравнить `previousDoc.status` и `doc.status` по id; загрузить статус через `req.payload.findByID`, `req` передавать для общей транзакции).
- Идемпотентность: перед созданием `find` в `orders` по `lead = doc.id`; если заказ есть — ничего не делать. Не срабатывает при `req.context.skipOrderFromLead`.
- Создаёт заказ Local API (`overrideAccess: true`, `context: { disableRevalidate: true }`): `lead: doc.id`, `company: doc.company`, `composition: buildComposition(doc)`, `clientEmail: doc.email` (может быть пусто — поле необязательное, task-08), `clientName: doc.name`, `clientPhone: doc.phone`, `manager: doc.assignee` (id, если назначен), `currentStatus: 'spec_agreed'`, `statusHistory: [{ status: 'spec_agreed', date: сегодня }]`. Номер `ГГГГ-NNNN` присваивает схема.
- Ошибка создания заказа логируется (`payload.logger.error`, без ПДн) и **не откатывает** смену статуса заявки. Уведомить менеджера в UI без изменения схемы нельзя — только лог (см. Notes).

### `buildComposition(lead)` (`src/lib/orders/composition.ts`)

Чистая функция; вход — подмножество заявки (`productType`, `area`, `answers`). Результат вида «Закалённое стекло 10 мм, 86 м², 42 позиции»: тип изделия (подпись из `QUIZ_TYPES` по `productType`/`answers.type`), толщина «N мм» (для триплекса «N+M мм»; из `answers`, если разобрать через zod-схему домена `quizAnswersSchema`/`safeParse`; иначе пропустить), площадь `formatNumber(area) + ' м²'`, позиции `pluralRu(n, ['позиция','позиции','позиций'])`. Части объединяются «, »; ничего не нашлось → пустая строка (менеджер заполнит). Не выдумывать данные. Тесты: полный набор, только площадь, триплекс, мусор в `answers`, нулевые значения.

### Жизненный цикл (`order-lifecycle.ts`)

- **`beforeChange`**: если `data.currentStatus` изменён (или заказ создаётся) — `statusHistory = applyStatusChange(statusHistory, { status: currentStatus, date: сегодня, plannedDate: сохранить })`, т. е. гарантировать запись истории для текущего статуса (дата — сегодня, если не задана). Если менеджер добавил строку в `statusHistory` напрямую и не менял `currentStatus` — оставить как есть; если `currentStatus` не задан — взять статус последней записи истории.
- **`afterChange`, create**: если `tokenHash` пуст → `tokenCreatedAt = now`, `tokenHash = hashOrderToken(deriveOrderToken(doc.id, tokenCreatedAt))`; записать `payload.update({ collection:'orders', id, data:{ tokenCreatedAt, tokenHash }, context:{ skipOrderHooks:true, disableRevalidate:true }, req })` (id заказа в БД — `uuid` по умолчанию, поэтому токен выводится только после вставки). Затем, если `doc.clientEmail` — `jobs.queue({ task:'send-order-status', input:{ orderId: doc.id, status: doc.currentStatus } })`.
- **`afterChange`, update**: если `previousDoc.currentStatus !== doc.currentStatus` и не `context.skipStatusEmail`/`skipOrderHooks` → `jobs.queue({ task:'send-order-status', input:{ orderId, status: doc.currentStatus } })`. Ошибки очереди логировать, не бросать.
- Постановка заданий: `req.payload.jobs.queue(...)`; до слияния task-18 допускается узко приведённый тип (комментарий «убрать после регенерации типов»).

### Публичная страница `zakaz/[token]/page.tsx` (прототип `prototypes/Order.dc.html`; требования `zadaniya/08-stranica-zakaza.md`)

Фон страницы `#F4F5F3`, контейнер с `--ig-gutter`, `main` с отступами 48/80 (24/48 на ≤599), вертикальный gap 32 (20). Блоки:

1. **Заголовок:** eyebrow «Страница заказа» (`.ig-label`), H1 «Заказ № {number}» (40/700; 28 на ≤599), строка `{company} · {composition}` (18/muted; пустые части пропускаются, разделитель только между непустыми).
2. **Карточка «Статус»** (`status-card`, белая, радиус 24, padding 28/32; 16/20 на ≤599): H2 «Статус», `Timeline` из 5 шагов: «Спецификация согласована», «В производстве», «Упаковано», «Отгружено», «Получено». Состояния: до текущего — `done` (галочка), текущий — `current` (primary), далее — `todo` (muted). Подпись под шагом: дата из `statusHistory` (`ДД.ММ.ГГГГ`); у будущих — «план ДД.ММ», если задан `plannedDate`, иначе «—»; у пройденных без даты — «—». Последний шаг «Получено» в состоянии `current` считается завершённым. Ниже — `ClientComment`: info-callout «Комментарий менеджера» с текстом `clientComment` (простой текст с переносами строк, без HTML), если не пуст.
3. **Две колонки** (flex-wrap: основная `flex 999 1 640px`, боковая `flex 1 1 320px; max-width 420px`):
   - **«Фото упаковки»**: если есть `packPhotos` — сетка 4 колонки (3 на ≤1365, 2 на ≤599, gap 12/8) кнопок-миниатюр (`aria-label="Открыть фото упаковки N"`, 4:3, `object-fit: cover`, hover — подъём на 2 px и тень) + подпись «Фото при отгрузке, ДД.ММ.ГГГГ» (дата отгрузки, иначе упаковки, иначе без подписи); клик открывает `Lightbox` с позициями, стрелками, Esc и счётчиком «N из M». Нет фото → пустое состояние (пунктирная рамка, иконка `camera`, текст «Фото появятся при отгрузке»). Миниатюры — `<img src="/zakaz/<token>/docs/<id>/?w=480" loading="lazy" decoding="async">` (не `next/image`: файл приватный, оптимизатор Next его не должен кэшировать); в лайтбоксе `?w=1920`.
   - **«Отгрузка»** (показывать, если статус `shipped`/`received` либо заполнены `carrier`/`waybill`): `dl` «Дата отгрузки», «Транспортная компания», «Номер накладной» (tabular-nums + secondary-кнопка «Скопировать» → на 2 с «Скопировано», `aria-live="polite"`; `navigator.clipboard.writeText` с фоллбэком на выделение + `execCommand`), «Отслеживание» (`.ig-link--arrow` «Открыть на сайте ТК»). Пустые строки не выводятся.
   - **«Документы»** (скрывать карточку, если документов нет): список (иконка `file-text` в квадрате `#EAF3F1`, название, под ним тип и размер файла, справа secondary «Скачать» → `<a href="/zakaz/<token>/docs/<id>/" download>`).
   - **Боковая «Ваш менеджер»**: см. таблицу ТЗ выше; телефон `tel:` (цифры без пробелов), `mailto:`, кнопка «Написать в мессенджер» (secondary block, иконка `message-circle`).
4. Подвал страницы: общий подвал сайта (см. «Открытые вопросы»); собственный в этой задаче не рисуется.

**Состояние «ссылка больше не действует»** (`not-found.tsx` сегмента `[token]`): карточка `max-width 720`, `margin 64px auto`, иконка-предупреждение на `#F2D59C/#8A5A00`, H1 «Ссылка больше не действует — свяжитесь с менеджером» (32/700; 24 на ≤599), телефон (22/600, `#16403D`, `tel:`), e-mail, часы работы «Пн–пт, 9:00–18:00» — всё из `getContacts()` (первая точка), не хардкод. Метаданные: `noindex`.

**Отзывчивость:** 1920/1366 — две колонки; ≤1100 — колонки в столбик, боковая `max-width: none`; ≤599 — таймлайн вертикальный (линия 2 px, точки 32 px), `dl` в один столбец, кнопка «Скопировать» под значением; шапка — `OrderHeader` (task-14); нет горизонтального скролла.

### Маршрут документов `zakaz/[token]/docs/[id]/route.ts`

`GET`: проверка токена как на странице (одинаковый 404 на любую ошибку); `id` — uuid; файл должен принадлежать заказу (быть в `packPhotos` или в `documents[].file`), иначе 404. Файл читается с диска: `staticDir` из конфигурации коллекции `order-files` (`payload.collections['order-files'].config.upload.staticDir`), имя — `path.basename(doc.filename)` (защита от обхода каталога). Ответ потоком (`Readable.toWeb(fs.createReadStream)`):
- заголовки: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`, `Content-Length`;
- `Content-Type`: из `mimeType` только если он в списке (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`), иначе `application/octet-stream`;
- документы: `Content-Disposition: attachment; filename*=UTF-8''<percent-encoded название + расширение>`; изображения: `inline`;
- для изображений параметр `?w=` из белого списка `320|480|960|1920` → уменьшение `sharp` (`rotate()`, `resize({ width, withoutEnlargement: true })`, `webp({ quality: 80 })`, `limitInputPixels`), `Content-Type: image/webp`; иной `w` → оригинал.
Пути со слешем на конце (`trailingSlash`). `export const dynamic = 'force-dynamic'`.

### Админка

- **Список `orders`:** `defaultColumns`: `number`, `company`, `currentStatus` (`StatusCell`: бейдж с цветом статуса), `manager`, срок ссылки (`LinkExpiryCell`: «Отозвана» красным; без `expiresAt` — «Действует»; будущая дата — «До ДД.ММ.ГГГГ (N дн.)»; прошедшая — «Истекла ДД.ММ.ГГГГ»), `createdAt`; `defaultSort: '-createdAt'`; `listSearchableFields: ['number','company','composition']`.
- **Вкладка «Управление»** (`admin.components.views.edit.manage = { Component, path: '/manage', tab: { label: 'Управление', href: '/manage' } }`), серверный вид: блок **предупреждений** (`order-warnings.ts`: нет e-mail клиента — письма не уйдут; не назначен менеджер; статус «Упаковано»/«Отгружено» без фото; «Отгружено» без ТК или накладной; ссылка отозвана/истекла), панель **«Ссылка»** и панель **«Статус»**.
- **`TokenPanel`** (клиентская; `GET/POST /api/admin/orders/<id>/token/`): показывает текущий URL (из `buildOrderUrl(deriveOrderToken(...))`, **вычисляется на сервере по запросу**, в списках/логах не пишется), кнопки: «Скопировать ссылку», «Открыть», «Перевыпустить» (диалог подтверждения: старая ссылка перестанет работать; `tokenCreatedAt = now`, `tokenHash = hashOrderToken(newToken)`, `revoked = false`), «Отозвать» / «Вернуть доступ» (переключение `revoked`), «Отправить письмо клиенту ещё раз» (`jobs.queue('send-order-status', {orderId, status: currentStatus})`). Все действия — только admin/manager, `POST`, `Origin` = origin `SITE_URL`, ответ `{ ok, url?, revoked? }`; в лог — id пользователя и действие, без токена.
- **`StatusPanel`** (клиентская; `POST /api/admin/orders/<id>/status/`): выбор статуса (по умолчанию следующий), дата (по умолчанию сегодня, `YYYY-MM-DD`, не позднее чем через год), «Плановая дата следующего этапа» (необязательно), «Комментарий клиенту» (текст, заменяет `clientComment`), чекбокс «Отправить письмо клиенту» (включён). Возврат на более ранний статус требует галочки подтверждения. Сервер применяет `applyStatusChange` и `payload.update` от имени пользователя (`overrideAccess: false`), с `context: { skipStatusEmail: !notify }`. Прямое редактирование полей формы тоже допустимо: `order-lifecycle` в этом случае всегда ставит письмо (это поведение описать подсказкой в панели).
- Загрузка фото/документов — стандартные поля `packPhotos`/`documents` формы Payload (лимиты `upload.limits`/`requestSizeLimit` настроены схемой).
- Хелпер `src/payload/admin/orders/*` подключается через `admin.components` в `orders.ts`; после изменений — **`pnpm generate:importmap`** (генерируемый `importMap.js`: при конфликте слияния с task-32 перегенерировать, не править руками).

### Статусы, цвета, подписи (`status.ts`)

| id | Подпись | Бейдж (фон / текст) |
|---|---|---|
| `spec_agreed` | Спецификация согласована | `#EEF4FA` / `#2C5B86` |
| `in_production` | В производстве | `#FCF6EA` / `#8A5A00` |
| `packed` | Упаковано | `#EAF3F1` / `#16403D` |
| `shipped` | Отгружено | `#E6F4EA` / `#237A35` |
| `received` | Получено | `#ECEEEC` / `#3E464D` |

### Метрика

На страницу заказа цели ТЗ §10 не навешиваются; клики по `tel:`/`mailto:` — глобальный делегированный трекинг (task-19) — допустимы (не содержат токена). **Важно:** URL страницы содержит токен — счётчик Яндекс.Метрики не должен получать этот URL (см. «Открытые вопросы»).

### Тесты

- **Vitest:** `status.test.ts` (индексы, `nextStatus`, `applyStatusChange` — вставка/обновление записи, сохранение `plannedDate`, неизменность истории других статусов), `composition.test.ts`, `public-view.test.ts` (шаги таймлайна для каждого из 5 статусов, подписи дат «план ДД.ММ», видимость блоков отгрузки/фото/документов, **отсутствие `email`/`lead` в сериализованном view-model**, `trackingUrl` с `javascript:` отбрасывается, проверка активности ссылки на границах `expiresAt`), `files.test.ts` (принадлежность файла заказу, санитизация имени, белый список MIME и `w`), `order-warnings.test.ts`.
- **Playwright** (`orders.spec.ts`; фикстуры `orders-fixtures.ts` через REST под админом: логин `POST /api/users/login/`, при пустой БД `POST /api/users/first-register/`; создать менеджера, статусы «Новая»/«Договор» (`isContract`), заявку, файлы заказа — PNG для фото и PDF для документов, загрузка multipart в `/api/order-files/`; заказ; ссылка берётся `GET /api/admin/orders/<id>/token/`; всё удаляется в `afterAll`):
  1. Создание: заявка → `PATCH` статуса на «Договор» → `GET /api/orders?where[lead][equals]=<id>` даёт ровно 1 заказ, `number` по `^\d{4}-\d{4}$`, `currentStatus = spec_agreed`, `tokenHash` задан (64 hex); повторный `PATCH` не создаёт второй; в `payload-jobs` есть `send-order-status` (если у заявки был e-mail); заявка без e-mail — задания нет.
  2. Страница по ссылке для каждого из 5 статусов: H1 «Заказ № …», число шагов 5, правильные состояния `done/current/todo` (по `aria-current`/классам), даты; на 1366 таймлайн горизонтальный, на 375 — вертикальный.
  3. Состояние «в производстве» без фото → «Фото появятся при отгрузке», нет блока «Отгрузка». «Отгружено» с 3 фото, ТК, накладной: 3 миниатюры, лайтбокс открывается, стрелка «→» меняет счётчик «2 из 3», Esc закрывает, фокус возвращается на миниатюру; «Скопировать» (контекст Chromium с правами `clipboard-read/write`) меняет подпись на «Скопировано», в буфере номер накладной; ссылка «Открыть на сайте ТК» с `rel="noopener noreferrer"`.
  4. Документы: «Скачать» отдаёт 200, `Content-Disposition: attachment`, `Content-Type: application/pdf`, `X-Content-Type-Options: nosniff`, `Cache-Control` содержит `no-store`; id документа другого заказа → 404; `?w=320` у фото → `image/webp`.
  5. Недоступность: неверный токен, токен неверной длины, отозванный заказ (`revoked: true`), просроченный (`expiresAt` в прошлом) — одинаково HTTP 404 и текст «Ссылка больше не действует — свяжитесь с менеджером» + `tel:` ссылка; после «Перевыпустить» старая ссылка 404, новая — 200; «Вернуть доступ» после отзыва возвращает 200.
  6. Приватность: в HTML страницы нет e-mail заказа и телефона/e-mail из заявки; `<meta name="robots">` содержит `noindex`; `<meta name="referrer" content="no-referrer">`; ответ страницы содержит `no-store`; в HTML нет JSON-LD и крошек.
  7. Админка: вкладка «Управление» показывает предупреждение «нет e-mail» для заказа без адреса; панель статуса переводит заказ в «Упаковано» (дата, комментарий клиенту) → на странице комментарий виден; с выключенным чекбоксом письма новое задание не создаётся; в статусе «Получено» `expiresAt` = дата + 90 дней (± сутки).
  8. Права: менеджер видит и обновляет заказы, не может удалить (`DELETE /api/orders/<id>` → 403); анонимный `GET /api/orders/` → 401/403; анонимный `GET /api/admin/orders/<id>/token/` → 401/403.
  Не использовать `waitForTimeout`; проекты 375 / 1366 / 1920 для визуальных проверок (1–6), админские — только 1366.

## Acceptance Criteria

- [ ] Каждая строка таблицы §6.2 реализована и проверена (создание, доступ, 5 статусов с датами и комментарием, письма, фото, отгрузка, документы, менеджер, отсутствие ПДн клиента, срок жизни ссылки).
- [ ] Заказ создаётся ровно один раз при переходе заявки в «Договор» и получает номер `ГГГГ-NNNN`; хэш токена в БД, токен нигде не хранится и не логируется.
- [ ] Письмо ставится в очередь при создании заказа и при каждой смене статуса (кроме отключённого вручную); ссылка в письме совпадает со ссылкой в админке.
- [ ] Страница `/zakaz/<токен>/`: 5 состояний статуса, пустое/заполненное состояние фото, отгрузка, документы, менеджер; недействительные ссылки — одинаковый 404; `noindex`, `no-referrer`, `no-store`; в HTML нет ПДн клиента.
- [ ] Визуальная сверка с `Order.dc.html` на 375 / 1366 / 1920 (состояния «в производстве», «отгружено», «ссылка истекла»); демо-панель прототипа **не** перенесена.
- [ ] Менеджер может перевыпустить/отозвать/вернуть ссылку и сменить статус из вкладки «Управление».
- [ ] Схема БД не менялась (`payload migrate:create` не видит diff); изменены только `admin`/`hooks` в `orders.ts` и файл хука `order-from-lead.ts`; `leads.ts` не тронут.
- [ ] `pnpm generate:importmap` выполнен; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/orders.spec.ts` проходят.

## Notes

- **Модель:** premium для кодинга.
- Отклонение от брифа: токен выводится HMAC-ом из `id` и `tokenCreatedAt` (контракт task-18), а не хранится случайным и хэшируется — иначе письма на каждую смену статуса не смогли бы содержать ссылку. Ключ — отдельный `ORDER_TOKEN_SECRET` (не `PAYLOAD_SECRET`): ротация секрета Payload ссылки не ломает. **Смена `ORDER_TOKEN_SECRET` инвалидирует все выданные ссылки** — это записано в `docs/deploy.md` (task-18/41) и `action-required.md`; после вынужденной смены менеджеры перевыпускают ссылки активных заказов (кнопка «Перевыпустить»).
- Размер лимитов и типы загружаемых файлов `order-files` задаёт схема task-08; если PDF-документы не принимаются — сообщить координатору.
- Если создание заказа в хуке упадёт, менеджер об этом узнает только из логов; возможное улучшение — поле/флаг в заявке (schema change) — в отчёт.
- Возможны гонки при одновременном переводе заявки в «Договор» из двух мест; защита — проверка существования + уникальность `number`; при необходимости добавить `pg_advisory_xact_lock` по `lead.id` (в отчёт, если реализовано).
- **Открытые вопросы для координатора (проверить после слияния волны):**
  1. Layout (task-14) всегда рисует полный подвал, cookie-баннер и `StickyCta` — на странице заказа по прототипу нужен только простой подвал; решение (условный рендер по пути) за task-14.
  2. Решено: `Metrika` (task-19) не инициализируется и не шлёт `hit` на `/zakaz/*` (`isTrackablePath`), Вебвизор на этом пути не пишет — проверить после слияния.
  3. Фото в галерее отдаются обычным `<img>` через защищённый маршрут (минуя `next/image`), поэтому аудит изображений (task-39) эти страницы не оптимизирует.
- Для API Payload (`payload.auth`, `jobs.queue`, custom views, hooks) и Next 16.4 при сомнениях — context7.
- (Волна 4, task-19) Блок с данными заказа на `/zakaz/<токен>/` дополнительно пометить `ym-hide-content` (Метрика на `/zakaz/*` и так не стартует — это страховка); ссылки на `/zakaz/` — класс `ym-disable-tracklink`.
- (Ревью волны 4) **404 в типизированных маршрутах:** не вызывать голый `notFound()` / `redirectOrNotFound()` из страницы — иначе SSR отдаёт пустое тело. Паттерн: `await redirectIfExists(path)` (из `@/lib/cms/queries`), затем `return <NotFoundResponse/>` (`src/components/page/not-found-response.tsx`), в `generateMetadata` — 404-title + `robots: noindex, follow`. Маршрут должен быть статическим/ISR (не вызывать `headers()`/`cookies()`), иначе статус 404 не выставится. Корневой layout `(site)` должен оставаться статическим.
