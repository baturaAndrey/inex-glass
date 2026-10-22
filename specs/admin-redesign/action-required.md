# Action Required: редизайн админки и уведомления MAX

Ручные шаги, которые агенты выполнить не могут.

## Before Implementation

- [x] **Получить токен бота MAX** (локально в `.env`: `MAX_BOT_TOKEN`) — партнёрская платформа MAX → Чат-боты → Настройки. Нужен для `MAX_BOT_TOKEN` (staging и prod — желательно разные боты или хотя бы разные чаты).
- [ ] **Узнать имя бота** (ник для ссылки `https://max.ru/<botName>?start=…`) — для `MAX_BOT_NAME`.
- [x] **Создать тестовый групповой чат MAX** (локально в `.env`: `MAX_INTERCEPT_CHAT_ID`) для стейджинга — туда уходят все уведомления не-production (`MAX_INTERCEPT_CHAT_ID`, заполняется после привязки, см. ниже).

## During Implementation

- [ ] **Скачать корневой сертификат Минцифры** (`russian_trusted_root_ca.pem`, https://www.gosuslugi.ru/crt) — если `fetch` к `platform-api2.max.ru` падает с ошибкой TLS; задача 13 подключает его через `NODE_EXTRA_CA_CERTS` в Docker.

## After Implementation

- [ ] **Задать переменные окружения в Dokploy** (staging и prod): `MAX_ENABLED=true`, `MAX_BOT_TOKEN`, `MAX_BOT_NAME`, `MAX_WEBHOOK_SECRET` (случайная строка 32–256 символов из `A-Za-z0-9_-`), на staging — `MAX_INTERCEPT_CHAT_ID`.
- [ ] **Подписать webhook** (внимание: бот GRATEC общий с другим сайтом: если у него уже есть webhook, наша подписка его заменит — сначала проверить `GET /subscriptions`; для prod Inex лучше отдельный бот) — один раз на окружение: `pnpm payload run scripts/max-subscribe.ts` (скрипт задачи 06) или `POST https://platform-api2.max.ru/subscriptions` с `{ url: "https://<домен>/api/max/webhook/", update_types: ["bot_started","bot_added","bot_removed","bot_stopped","message_created"], secret: "<MAX_WEBHOOK_SECRET>" }`.
- [ ] **Привязать групповой чат** — добавить бота в группу менеджеров и сделать его администратором с правом читать все сообщения (иначе он не увидит код); в админке «Настройки сайта → Уведомления» нажать «Привязать чат» и отправить показанный код в группу.
- [ ] **Каждому менеджеру** — в своём профиле нажать «Подключить MAX» и нажать «Начать» в боте.
- [ ] **Показать заказчику** новую админку на staging и собрать замечания.
