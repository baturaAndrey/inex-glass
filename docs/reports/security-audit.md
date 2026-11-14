# Security-аудит (OWASP Top 10:2025) — задача 42

- **Дата:** 21.10.2026. **Коммит:** 15d6a73 + незакоммиченные исправления волны 8 (см. `docs/reports/fix-list.md`).
- **Стенд:** локальная production-подобная сборка (`next build` без БД → `next start -p 3100`, `NODE_ENV=production`, `SITE_ENV=production`, БД `inex_glass_w8_test` после `seed --full`). Реального staging пока нет (DNS/Dokploy не готовы) — проверки, которым нужен Traefik/TLS/Dokploy, помечены **PENDING (staging)** с командами.
- **Метод:** чтение кода (коллекции и доступы Payload, route handlers `src/app/api/**`, `/zakaz/**`, загрузка файлов, поиск, письма, экспорт, CI/Docker), живые запросы к стенду (curl/Node, анонимно и под ролями), `pnpm audit --prod`, сверка advisory Next.js / Payload / React на 21.10.2026. Автоматизированная часть закреплена в `e2e/acceptance/security.spec.ts` (+ `roles.spec.ts`, `lead-flow.spec.ts`).

## Итог

| Уровень  | Найдено | Исправлено     | Отложено / рекомендация                      |
| -------- | ------- | -------------- | -------------------------------------------- |
| Critical | 0       | —              | —                                            |
| High     | 0       | —              | —                                            |
| Medium   | 2       | 0              | 2 (инфраструктура / решение человека)        |
| Low      | 10      | 2 (S-01, S-08) | 8 (рекомендации; S-15 — принятое отклонение) |
| Info     | 3       | —              | 3                                            |

**Открытых Critical/High нет — релиз по безопасности не блокируется.** Medium S-02 (staging `/api` и `/admin` вне basic auth) закрывается настройкой Traefik при создании staging; S-03 (CSP) — рекомендация задачи, план ниже.

## Находки

| ID   | Находка                                                                                                                                                                       | OWASP 2025 / CWE           | Уровень                           | Воспроизведение (команда → результат)                                                                                                                                | Исправление                                                                                                                                                                                                                           | Статус                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| S-01 | Глобальный `headers()` перебивал `Referrer-Policy: no-referrer`, который ставит маршрут файлов заказа                                                                         | A02 / CWE-200              | Low                               | `curl -sI …/zakaz/<t>/docs/<id>/` → `strict-origin-when-cross-origin`                                                                                                | `next.config.ts`: правило `/zakaz/:path*` → `Referrer-Policy: no-referrer` после общего. Проверено на финальной сборке: `curl -sI http://localhost:3100/zakaz/AAAAAAAAAAAAAAAAAAAAAA/` → `no-referrer`                                | fixed                                        |
| S-02 | На staging `/api/*` и `/admin` не закрыты basic auth (matcher `proxy.ts` их исключает): логин админки, публичный REST/GraphQL предрелизного сайта доступны из интернета       | A01/A02 / CWE-284          | Medium                            | код `src/proxy.ts` (matcher без `admin`, `api`); на staging: `curl -s -o /dev/null -w '%{http_code}' https://<staging>/api/pages/?limit=1` → ожидаемо 200 без пароля | Traefik `basicAuth` middleware на весь хост staging в Dokploy (healthcheck идёт внутри контейнера и не затрагивается) или IP-allowlist                                                                                                | deferred → человек (Dokploy, задача 41)      |
| S-03 | Нет Content-Security-Policy                                                                                                                                                   | A02 / CWE-1021             | Medium (по задаче — рекомендация) | `curl -sI http://localhost:3100/` → нет `Content-Security-Policy`                                                                                                    | Начать со статического `Content-Security-Policy-Report-Only` в `headers()`: `self`, `mc.yandex.ru`/`mc.yandex.com`, Яндекс.Карты, `data:`/`blob:` для изображений. Nonce не использовать — делает страницы динамическими и ломает ISR | deferred (FL-12)                             |
| S-04 | Политика паролей — минимум Payload (3 символа)                                                                                                                                | A07 / CWE-521              | Low                               | админ `POST /api/users/ {password:"12"}` → 400 «minimum length 3»                                                                                                    | `beforeValidate` на `users` (≥ 12 символов); учесть, что `reset-password` хуки коллекции не вызывает. Блокировка 5 попыток/10 мин смягчает                                                                                            | recommendation (FL-14)                       |
| S-05 | Блокировка входа — по учётке, нет лимита по IP на `/api/users/login` и `/forgot-password` (можно заблокировать сотрудника или завалить письмами сброса)                       | A07/A06 / CWE-307, CWE-645 | Low                               | 6 неверных входов → верный пароль 401 «locked»; `forgot-password` всегда 200                                                                                         | Traefik `rateLimit` на эти два пути (prod)                                                                                                                                                                                            | recommendation (человек)                     |
| S-06 | Неудачные входы логируются без пользователя/IP, 429 форм не логируются                                                                                                        | A09 / CWE-778              | Low                               | `AuthenticationError`/`LockedAuth` в логе без контекста; `responses.ts` не пишет 429                                                                                 | хук логина с id + IP клиента; строка лога rate-limit с типом ключа                                                                                                                                                                    | recommendation (FL-15)                       |
| S-07 | GraphQL включён, хотя не используется                                                                                                                                         | A02 / CWE-1188             | Low                               | `POST /api/graphql/ {Leads{…}}` → 403 по полям; интроспекция закрыта; playground 404                                                                                 | `graphQL: { disable: true }` + удалить маршруты `(payload)/api/graphql*` — решение координатора                                                                                                                                       | recommendation (FL-16)                       |
| S-08 | `site-search` и `/poisk/` логировали полный текст ошибки драйвера (SQL + запрос посетителя)                                                                                   | A09 / CWE-532              | Low                               | `src/app/api/site-search/route.ts:38`, `src/app/(site)/poisk/page.tsx:64`                                                                                            | Логируется только `error.name` в обоих местах                                                                                                                                                                                         | fixed                                        |
| S-09 | Нет верхней границы `limit` в публичном REST (`/api/pages/?limit=100000` → 200)                                                                                               | A06 / CWE-770              | Low                               | команда → 200, все документы                                                                                                                                         | Traefik rate limit или ограничение на уровне access                                                                                                                                                                                   | recommendation                               |
| S-10 | Rate-limit доверяет `X-Forwarded-For` (правый публичный IP); без Traefik перед приложением ротация XFF обходит лимит                                                          | A06 / CWE-348              | Info                              | локально: 3× `form-token` с разными XFF → 200,200,200                                                                                                                | Корректно за одним Traefik; подтвердить на staging (команда ниже)                                                                                                                                                                     | accepted, PENDING (staging)                  |
| S-11 | Нет rate-limit на `/zakaz/*`                                                                                                                                                  | A01 / CWE-307              | Info                              | токен 128 бит — перебор невозможен                                                                                                                                   | опционально Traefik rate limit                                                                                                                                                                                                        | recommendation                               |
| S-12 | Транзитивные advisory в `pnpm audit --prod`                                                                                                                                   | A03 / CWE-1395             | Low                               | см. раздел ниже                                                                                                                                                      | `pnpm.overrides`: braces ≥ 3.0.4, dompurify ≥ 3.4.16, uuid ≥ 11.1.1                                                                                                                                                                   | recommendation (FL-17)                       |
| S-13 | GitHub Actions закреплены по major-тегу, не по SHA (сторонние `pnpm/action-setup`, `docker/*` в job'ах с `packages: write` и секретами деплоя); `persist-credentials` включён | A03/A08 / CWE-829          | Low                               | `ci.yml`, `docker.yml`                                                                                                                                               | Закрепить по SHA с комментарием версии + Dependabot; ruleset на теги `v*`                                                                                                                                                             | recommendation (FL-18)                       |
| S-14 | Caret-диапазоны у части runtime-зависимостей (`sharp`, `graphql`, `zod`, `@radix-ui/*`) и `@tailwindcss/postcss: "latest"`                                                    | A03 / CWE-1104             | Info                              | `package.json` (frozen lockfile в CI/Docker ограничивает риск)                                                                                                       | точные версии `sharp`, `graphql`, `@tailwindcss/postcss`                                                                                                                                                                              | recommendation                               |
| S-15 | Менеджер читает список всех сотрудников (`users.read: isLoggedIn`) — сценарий 6 задачи ждёт «только себя»                                                                     | A01 / CWE-639              | Low                               | под менеджером `GET /api/users/` → все пользователи (без `sessions`, хешей); повышение роли и правка чужих учёток заблокированы                                      | Осознанное отклонение (поле «Ответственный» требует список сотрудников); вариант исправления — чтение «только себя» + список для поля через `overrideAccess`                                                                          | accepted deviation (FL-05, решение человека) |

## Вердикты по направлениям задачи

**A01 Broken Access Control — PASS** (S-02 → staging, S-11, S-15)

- Анонимный REST к CRM закрыт: `leads`, `orders`, `lead-files`, `order-files`, `consent-log`, `rate-limits`, `search`, `users`, `lead-statuses`, `payload-jobs`, `payload-preferences`, `payload-locked-documents` → 403; глобал `site-settings` → 403; статические URL файлов заявок/заказов → 403 (`security.spec.ts`, `smoke:prod private-api`).
- Публично только нужное сайту (страницы, статьи, каталог, media, redirects, контентные глобалы); черновики анонимно не видны (`_status=draft` → 0, `/versions` → 403).
- GraphQL: доступ по полям, интроспекция закрыта, playground 404.
- IDOR: `/api/lead-files/<id>/download/` анонимно → 401; `/zakaz/<token>/docs/<id>/` с чужим id → 404, с подделанным токеном → 404, traversal-id → файл не отдаётся.
- Менеджер не повышает роль (`PATCH self {role:admin}` → роль остаётся `manager`), не правит чужие учётки (403), не создаёт пользователей (403); first-register после появления админа → 403.

**A02 Security Misconfiguration — PASS** (S-01 fixed, S-03, S-07)

- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; нет `X-Powered-By`; `.map` → 404, в чанках нет `sourceMappingURL`; `.env`, `.git/*`, `*.php` → 404; ошибки без стека; `/admin` — meta noindex, `robots.txt` закрывает `/admin/`, `/api/`, `/zakaz/`; в `payload.config` нет `debug`; Dockerfile `NODE_ENV=production`, `.dockerignore` исключает `.env*`, `*.pem`, `.git`; CORS не разрешает чужой Origin.
- HSTS — **PENDING (staging/prod)**: `curl -sI https://inexglass.ru/ | grep -i strict-transport`; `pnpm smoke:prod --only=headers`.

**A03 Supply chain — PASS** (S-12, S-13, S-14)

- Lock-файл закоммичен; `next`, `payload`, `@payloadcms/*`, `react` — точные версии; `permissions: contents: read` на верхнем уровне, у job'ов минимальные; нет `pull_request_target` и подстановок `${{ github.event.* }}` в `run`.

**A04 Cryptographic failures — PASS** (2 пункта PENDING)

- Секреты из env, zod проверяет длину ≥ 32; в production `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET` обязательны; реальных значений в коде нет.
- Токен заказа 22 символа (128 бит, HMAC-SHA256); REST не отдаёт `tokenHash`/токен; перевыпуск меняет токен (старая ссылка 404, новая 200); отзыв → 404; сравнение `timingSafeEqual` (`lookup.ts`, `proxy.ts`).
- Cookie админки: `HttpOnly; SameSite=Lax`; `Secure` вне `development`.
- **PENDING:** секреты staging ≠ prod — человек сравнивает `sha256sum` значений `PAYLOAD_SECRET`, `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET` в Dokploy; флаг `Secure` по https: `curl -si -X POST https://inexglass.ru/api/users/login/ -H 'content-type: application/json' -d '{"email":"…","password":"…"}' | grep -i set-cookie`.

**A05 Injection — PASS**

- Поиск: только плейсхолдеры drizzle `sql`; `tsquery` из токенов `\p{L}\p{N}`, `TS_CONFIG` — константа; `');-- &|!:*` → 200 `{hits:[]}`.
- XSS: `<mark>` в сниппетах экранируется и балансируется; `dangerouslySetInnerHTML` только для санитизированного SVG (теперь с префиксацией id, FL-03) и JSON-LD с экранированием `<`; `/poisk/?q=<script>` не отражается сырым.
- Параметр `src` квиза санитизируется (`//`, `:`, `\`, управляющие символы); открытого редиректа нет (`//EVIL.com/` → `/EVIL.com/` того же хоста).
- Имена файлов: транслитерация, хранение под UUID, `basename()`, проверка, что путь внутри каталога.
- Header injection в письмах: имя с `\r\nBcc:` не внедряется (nodemailer вычищает CR/LF).
- CSV/XLSX: в CSV префикс `'`; в XLSX ExcelJS пишет строки строковыми ячейками (`=HYPERLINK` остаётся String).

**A06 Insecure design — PASS** (S-09, S-10)

- Honeypot; поддельная HMAC-метка → `code: token`; отправка быстрее 3 с → `too_fast`; лимиты: заявки 5/10 мин на IP/телефон/e-mail (6-я → 429, `lead-flow.spec.ts`), загрузки 20/10 мин, form-token 60/10 мин; JSON-лимит 200 КБ.
- Загрузка: потоковая, 53 МБ → 413 без остатков `.part`; сигнатура отклоняет MZ-файл с `.pdf` и SVG; временные файлы чистит джоба `cleanup-tmp-uploads`; файлы не исполняются; скачивание `Content-Disposition: attachment`, `nosniff`, `CSP: default-src 'none'; sandbox`.

**A07 Authentication failures — PASS** (S-04, S-05)

- Блокировка 5 попыток / 10 мин; нет перечисления пользователей (одинаковые ответы login/forgot-password); first-register закрыт; logout отзывает сессию; cookie-аутентификация с чужого Origin отклоняется.

**A08 Data integrity — PASS** (S-13)

- HMAC формы не подделать; миграции только из кода (`prodMigrations`); образ собирается в CI, тег `sha-<commit>`, prod получает тот же digest.

**A09 Logging/monitoring — PASS** (S-06, S-08 fixed)

- Маршруты заявок/загрузок/заказов логируют только `error.name`; почтовый слой убирает адреса из ошибок; джобы — только `leadId`; токенов и секретов в логе стенда нет; 403 и неудачные входы логируются.

**A10 SSRF / исключительные ситуации — PASS**

- Нет серверных запросов по пользовательским URL (единственный исходящий — IndexNow на фиксированный endpoint); исключения → общий 500; сбой SMTP не роняет форму (в логе стенда mailpit ответил 451 джобе `notify-new-lead`, заявка создана с 200, джоба повторяет).

**ПДн (152-ФЗ) — PASS** (бэкапы PENDING)

- Согласие обязательно (`consent:false` → 400); `consent-log` на каждую заявку с IP, UA, `consentVersion` 2026-10-19 и `policyVersion` «2026-10-19-draft» (текст юриста ещё не утверждён — пункт человека); IP/UA видит только админ.
- Удаление по запросу: заявка → 404, версии удалены, файл удалён с диска, согласие обезличено (`ip`, `ua`, `lead` = null) — `admin.spec.ts`, ручная проверка.
- Метрика только при согласии «all», в серверном HTML нет `mc.yandex`.
- **PENDING (человек):** бакет бэкапов приватный и в РФ — `aws s3api get-bucket-acl --bucket <bucket> --endpoint-url <ru-endpoint>`, `aws s3api get-bucket-location …`.

## Проверки, требующие staging/prod (PENDING)

| Проверка                                     | Команда                                                                                                                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HSTS                                         | `curl -sI https://inexglass.ru/ \| grep -i strict-transport`; `SMOKE_HSTS_MIN_AGE=31536000 pnpm smoke:prod --only=headers`                                                                                                    |
| Определение IP за Traefik                    | с внешней машины 61× `curl -H 'X-Forwarded-For: 1.2.3.4' -X POST https://<host>/api/form-token/` — 61-й ответ 429; порт контейнера не опубликован: `docker service inspect <svc> --format '{{json .Endpoint.Ports}}'` → пусто |
| S-02 staging basic auth                      | `curl -s -o /dev/null -w '%{http_code}' https://<staging>/api/pages/?limit=1` и `…/admin/login/` → 401 после настройки Traefik                                                                                                |
| Cookie `Secure` по https                     | см. A04                                                                                                                                                                                                                       |
| Секреты staging ≠ prod                       | сравнение хешей значений в Dokploy (человек)                                                                                                                                                                                  |
| Бэкапы в приватном бакете РФ                 | см. ПДн                                                                                                                                                                                                                       |
| Staging noindex / basic auth / `Disallow: /` | `ACCEPTANCE_EXPECT_ENV=staging` в `security.spec.ts` через `scripts/acceptance/run-staging.sh` (локально проверено на стенде `SITE_ENV=staging`, см. `acceptance.md`)                                                         |

## `pnpm audit --prod`

0 critical, 1 high, 2 moderate, 2 low — ни одна не достижима из HTTP-запросов.

| Пакет                       | GHSA                                     | Путь                                      | Оценка                              |
| --------------------------- | ---------------------------------------- | ----------------------------------------- | ----------------------------------- |
| braces ≤ 3.0.3 (high)       | GHSA-vfj7-8cjw-p6xm                      | next / @payloadcms/next → sass → chokidar | Low (только file-watching)          |
| esbuild ≤ 0.24.2 (moderate) | GHSA-67mh-4wv8-2f99                      | db-postgres → drizzle-kit                 | Info (только dev-сервер)            |
| uuid < 11.1.1 (moderate)    | GHSA-w5hq-g745-h8pq                      | exceljs                                   | Info (аргумент `buf` не передаётся) |
| dompurify 3.4.15 (2× low)   | GHSA-p98j-92pf-mc4p, GHSA-6688-9rhm-gjv2 | @payloadcms/ui → monaco-editor            | Low (редактор кода в админке)       |

## Advisory (GitHub advisories + osv.dev, 21.10.2026)

- **next@16.4.2** — текущий `latest`; свежие advisory (14.10.2026) касаются ≤ 16.4.0 и исправлены в 16.4.1: GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r. **Не затронуты.**
- **payload / @payloadcms/\*@3.91.0** — `latest`; все известные advisory исправлены в ≤ 3.90.0 (GHSA-m35c-r5p5-c3w8, GHSA-wvw7-x9pg-w4cc, GHSA-g6p9-6gm4-cj6m, GHSA-8j2x-hjh9-3ff8, GHSA-q6mq-ch85-c8mm, GHSA-2qw6-cm49-277x, GHSA-mg7r-jhr9-m745, GHSA-9g87-32v6-3c2r). **Не затронуты.**
- **react@19.2.4** — advisory по самим react/react-dom нет; RSC-advisory (GHSA-xqc2-xf4c-x3h3, GHSA-h3gv-c5rc-p453) касаются `react-server-dom-*`, который не установлен (Next использует свою пропатченную копию). **Не затронуты.**
