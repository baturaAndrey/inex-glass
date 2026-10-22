# Action Required: редизайн админки и уведомления MAX

Ручные шаги, которые агенты выполнить не могут.

## Before Implementation

- [x] **Получить токен бота MAX** (локально в `.env`: `MAX_BOT_TOKEN`) — партнёрская платформа MAX → Чат-боты → Настройки. Нужен для `MAX_BOT_TOKEN` (staging и prod — желательно разные боты или хотя бы разные чаты).
- [ ] **Узнать имя бота** (ник для ссылки `https://max.ru/<botName>?start=…`; латиница, цифры, `_ . -`, 3–64 символа) — для `MAX_BOT_NAME`. Без него кнопка «Подключить MAX» недоступна.
- [x] **Создать тестовый групповой чат MAX** (локально в `.env`: `MAX_INTERCEPT_CHAT_ID`) для стейджинга — туда уходят все уведомления не-production (`MAX_INTERCEPT_CHAT_ID`, заполняется после привязки, см. ниже).

## During Implementation

- [x] **Корневой сертификат Минцифры** (обязателен для TLS к `platform-api2.max.ru`): публичный `docker/certs/russian_trusted_root_ca.pem` (https://www.gosuslugi.ru/crt, до 27.02.2032) закоммичен; образ копирует его в `/app/certs/` и задаёт `ENV NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_root_ca.pem`. Действие нужно только при замене сертификата: обновить файл под тем же именем и пересобрать образ.

## After Implementation

- [ ] **Задать переменные окружения в Dokploy** (staging и prod): `MAX_ENABLED=true`, `MAX_BOT_TOKEN`, `MAX_BOT_NAME`, `MAX_WEBHOOK_SECRET` (случайная строка 32–256 символов из `A-Za-z0-9_-`), на staging — `MAX_INTERCEPT_CHAT_ID`; `JOBS_ENABLED=true` — уведомления отправляют задания, они работают только в таком контейнере. `NODE_EXTRA_CA_CERTS` задана в образе — в Dokploy не задавать. Подробности — `docs/deploy.md`, раздел «MAX».
- [ ] **Подписать webhook** (внимание: бот GRATEC общий с другим сайтом: если у него уже есть webhook, наша подписка его заменит — сначала проверить: `pnpm payload run scripts/max-subscribe.ts -- --list` или `GET /subscriptions`; для prod Inex лучше отдельный бот; скрипт чужую подписку не трогает даже с `--force`) — один раз на окружение: `pnpm payload run scripts/max-subscribe.ts` (URL `https://<домен>/api/max/webhook/` берётся из `SITE_URL`, только https; `--force` заменяет лишь устаревший URL этого же сайта, `--unsubscribe` удаляет нашу подписку) или `POST https://platform-api2.max.ru/subscriptions` с `{ url: "https://<домен>/api/max/webhook/", update_types: ["bot_started","bot_added","bot_removed","bot_stopped","message_created"], secret: "<MAX_WEBHOOK_SECRET>" }`.
- [ ] **Привязать групповой чат** — добавить бота в группу менеджеров и сделать его администратором с правом читать все сообщения (иначе он не увидит код); в админке «Настройки сайта → Уведомления» нажать «Привязать чат» и отправить показанный код (действует 30 минут) отдельным сообщением в группу. Отвязка — «Отвязать».
- [ ] **Каждому менеджеру** — в своём профиле нажать «Подключить MAX» и нажать «Начать» в открывшемся боте. Отключение — «Отключить».
- [ ] **Проверить уведомления на staging** (`MAX_ENABLED=true`, `MAX_INTERCEPT_CHAT_ID` тестового чата, сообщения должны начинаться с «[ТЕСТ] Inex Glass»): 5 событий — новая заявка, смена статуса, назначение менеджера, событие заказа, напоминание о неназначенной заявке (каждые 15 минут); повтор задания не шлёт дубль; стирание ПДн заявки удаляет и её сообщения в MAX.
- [ ] **Показать заказчику** новую админку на staging и собрать замечания.
