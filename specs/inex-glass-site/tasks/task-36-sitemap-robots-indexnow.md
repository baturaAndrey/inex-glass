# Task 36: sitemap.xml, robots.txt, IndexNow, верификации поисковиков

## Status

pending

## Wave

6

## Description

Техническое SEO по ТЗ §8: автоматический `sitemap.xml` только из индексируемых опубликованных страниц с `lastmod`; `robots.txt` с закрытием служебных и параметрических адресов и директивой `Clean-param` для Яндекса; отправка изменённых URL в IndexNow (Яндекс/Bing) при публикации; подтверждение прав в Яндекс.Вебмастере и Google Search Console через поля админки. Без этого новый домен не будет быстро проиндексирован, а редиректы с inex.su (этап миграции) зависят от индексации новых страниц.

## Dependencies

**Depends on:** task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md (`docUrl`), task-18-email-jobs.md (заглушка задания `indexnow-submit`), task-10-schema-freeze.md (реестр плагинов)
**Blocks:** task-39-perf-images.md, task-40-content-audit.md, task-41-prod-deploy.md, task-42-final-acceptance.md

**Context from dependencies:**
- task-15 создал `src/lib/seo/metadata.ts` (`buildMetadata`: SEO-группа документа → Metadata, правила noindex, canonical, staging noindex по `SITE_ENV`), `src/lib/cms/{payload.ts,globals.ts,queries.ts}` (Local API с `unstable_cache` и тегами `global:<slug>`, `collection:<slug>`), `src/lib/seo/jsonld.tsx`. Страницы контента: глобальный catch-all `(site)/[...slug]/page.tsx` (коллекция `pages`), типизированные коллекции с собственными маршрутами (задачи 23–31): толщины `/zakalennoe-steklo/{n}-mm/`, виды стекла `/zakalennoe-steklo/{slug}/` и `/tripleks/`, обработка `/obrabotka-stekla/{slug}/`, конструкции (корневые URL: `/steklyannye-peregorodki/`, `/dushevye-peregorodki/`, `/steklyannye-ograzhdeniya/`, `/steklyannye-kozyrki/`, `/torgovye-vitriny/`, `/furnitura/`, `/steklyannye-konstrukcii/`, `/osteklenie/…`, `/zerkala/…`), статьи `/blog/{slug}/`, объекты `/obekty/{slug}/`, листинги `/obekty/`, `/obekty/page/N/`, `/blog/`, `/blog/page/N/`, инструмент `/instrumenty/kalkulyator-vesa-stekla/`, квиз `/raschet-stoimosti/`.
- Схема (заморожена task-10): у SEO-группы документов есть флаг `noindex` и `canonical`; у `thicknesses` — булево `indexable` (false для 5, 15, 19 мм); у `objects` — `status`; у `pages`/`articles`/`glass-types`/`constructions` — `_status`. Глобал `site-settings` содержит `yandexVerification`, `googleVerification`, `indexNowEnabled` (названия полей сверь с `src/payload-types.ts`). Глобал `prices` — дата цен.
- task-18 создал реестр задач Payload Jobs `src/jobs/index.ts` (+ `JOBS_ENABLED`-логика автозапуска) и **уже зарегистрировал** задание `indexnow-submit` (вход `{ urls: string[] }`, `retries: 3`) с заглушкой-обработчиком в `src/jobs/indexnow.ts`. Slug задания входит в enum таблицы `payload_jobs`, поэтому новое задание потребовало бы миграции, а схема заморожена. task-06 создал `src/payload/hooks/revalidate.ts`.
- task-10 создал реестр плагинов `src/payload/plugins/index.ts`, уже подключённый в `payload.config.ts`, и **no-op заглушку** `src/payload/plugins/indexnow.ts` (экспорт `indexNowPlugin: Plugin`). Параллельно task-35 так же заменяет `src/payload/plugins/search.ts`.
- task-16 создал `src/lib/seo/doc-url.ts` — `docUrl(collection, doc)`, единый резолвер «документ → канонический путь» (его использует и task-35).
- task-01 создал временные `src/app/robots.ts` (в корне `app/`: Next не отдаёт metadata-route robots/manifest из группы маршрутов), `src/app/manifest.ts` и `src/app/(site)/sitemap.ts` (только главная).
- task-30/31 определили размеры страницы листингов (объекты, блог): ищи экспортируемые константы вида `OBJECTS_PAGE_SIZE`, `ARTICLES_PAGE_SIZE` (если не экспортированы — вынеси в `src/lib/cms/constants.ts` и импортируй обратно в этих задачах минимальной правкой, сообщив в отчёте).
- Env (`src/lib/env.ts`): `SITE_URL`, `SITE_ENV` (`development|staging|production`), `INDEXNOW_KEY`, `JOBS_ENABLED`.

## Files to Create

- `src/lib/seo/indexable.ts` — `isIndexable(collection, doc): boolean` (правила ниже), общий для sitemap и IndexNow.
- `src/lib/seo/sitemap-entries.ts` — `collectSitemapEntries(): Promise<{ url: string; lastModified: Date }[]>`.
- `src/app/robots.txt/route.ts` — GET-обработчик, отдающий `text/plain` (см. про trailingSlash ниже).
- `src/lib/seo/robots.ts` (+ `robots.test.ts`) — `buildRobotsTxt({ siteUrl, env })`: чистая функция, покрыта тестами.
- `src/lib/seo/indexnow.ts` (+ тест) — клиент IndexNow (`submitToIndexNow(urls)`), батчинг по 10 000, обработка кодов ответа.
- `src/app/(site)/indexnow-key/[key]/route.ts` — отдаёт текст ключа по адресу `/{key}.txt` (через rewrite).
- `scripts/indexnow-all.ts` — ручная полная отправка (см. «IndexNow»).
- `e2e/seo-files.spec.ts` + `src/lib/seo/sitemap-entries.test.ts` — тесты.

## Files to Modify

- `next.config.ts` — **только** добавить `rewrites()`: `{ source: '/:key([a-f0-9]{32}).txt', destination: '/indexnow-key/:key/' }` (при `trailingSlash: true` destination со слешем; сверить поведение). Остальное не трогать.
- `src/app/(site)/sitemap.ts` — переписать временный файл task-01: Next metadata route (`MetadataRoute.Sitemap`) на `collectSitemapEntries()`.
- `src/app/robots.ts` — **удалить** (временный файл task-01): metadata-route `robots.ts` конфликтует с `src/app/robots.txt/route.ts`.
- `src/payload/plugins/indexnow.ts` — заменить no-op заглушку task-10 целиком: плагин Payload, добавляющий `afterChange`/`afterDelete` хуки на выбранные коллекции и ставящий job в очередь. Имя экспорта `indexNowPlugin` сохранить. Конфигурация (список коллекций) — внутри файла: реестр `src/payload/plugins/index.ts` вызывает его без аргументов.
- `src/jobs/indexnow.ts` — заменить тело заглушки task-18 реальным обработчиком `indexnow-submit` (slug, вход `{ urls: string[] }` и `retries` не менять).
- `src/lib/seo/metadata.ts` — **только** добавить поле `verification` для главной страницы (см. ниже); остальное не менять.

НЕ трогать: схему Payload (заморожена), файлы коллекций (хуки подключаются плагином), `payload.config.ts`, `src/payload/plugins/{index,search}.ts`, `src/jobs/index.ts`, `src/lib/seo/doc-url.ts` (task-16; если не хватает правила — сообщить координатору), `proxy.ts`.

## Technical Details

### Проверка поведения `trailingSlash: true` с файловыми маршрутами

В Next 16.4 при `trailingSlash: true` пути с расширением файла (`/sitemap.xml`, `/robots.txt`, `/<key>.txt`) обычно НЕ получают редирект на слеш. Обязательно проверь это на `pnpm build && pnpm start`: `curl -sI http://localhost:3000/robots.txt`, `/sitemap.xml`, `/<key>.txt` должны возвращать **200 без редиректа**. Если Next редиректит на `/robots.txt/` — запасной вариант (`skipTrailingSlashRedirect` глобально не использовать): rewrite `{ source: '/robots.txt', destination: '/api/robots' }` + `src/app/api/robots/route.ts` (аналогично для sitemap не требуется — metadata route обслуживает `/sitemap.xml` напрямую). Опиши выбранный вариант в отчёте.

Роут `src/app/robots.txt/route.ts` лежит **вне** `(site)` (корневой, без layout) — его не должен затрагивать `proxy.ts` (расширение файла исключено matcher'ом).

### Правила включения в sitemap

Включаем только документы, для которых `isIndexable()` = true **и** опубликованы:

1. `/` — всегда.
2. `pages`: `_status = published`, `seo.noindex != true`; ИСКЛЮЧИТЬ: `/politika-konfidencialnosti/`, `/soglasie-na-obrabotku-personalnyh-dannyh/` (noindex), `/poisk/`, `/zakaz/*`, `/o-kompanii/sotrudniki/` **пока коллекция `team` пуста** (страница noindex и скрыта).
3. `thicknesses`: `indexable = true` → только 4, 6, 8, 10, 12 мм. **5, 15, 19 мм не включать** (noindex по ТЗ §3.1).
4. `glass-types`, `processing-services`, `constructions`, `articles`: `_status = published` (для `processing-services` — без `_status`, всегда) и `!noindex`.
5. `objects`: `status = published` и `_status = published` и `!noindex`. Черновики импорта (task-37) НЕ включать.
6. Листинги: `/obekty/`, `/blog/` — всегда. Страницы пагинации 2+ **включить** (ТЗ §8.4: index, follow, canonical на себя): `/obekty/page/N/` для N = 2..⌈publishedObjects / OBJECTS_PAGE_SIZE⌉, `/blog/page/N/` аналогично. Страница `/obekty/page/1/` не существует (редирект на `/obekty/` — реализован в task-30).
7. `/raschet-stoimosti/`, `/instrumenty/kalkulyator-vesa-stekla/`, `/kontakty/`, `/o-kompanii/` — включить (это либо `pages`, либо отдельные маршруты — добавь недостающие вручную списком `STATIC_PATHS`, если они не представлены документами).
8. НИКОГДА не включать: URL с query-параметрами (`?filtr=…`, `?product=`, `?type=`, `?utm_*`), `/admin/`, `/api/*`, `/ui-kit/`, `/poisk/`, `/zakaz/*`, страницы 404, дубли без слеша.
9. `lastModified`: `updatedAt` документа. Для карточек толщин — `max(thickness.updatedAt, prices.updatedAt)` (цена на странице зависит от глобала). Для листингов — `max(updatedAt)` по опубликованным документам коллекции (запрос `sort: -updatedAt, limit: 1`). Для `/` — `max` по глобалам `prices`, `promo` и updatedAt страницы-главной.
10. Все `url` абсолютные: `${SITE_URL}${path}` где `path` начинается и заканчивается на `/` (кроме корня `/`). Без дублей (Set). Порядок: сначала `/`, далее по приоритету шаблона (стабильная сортировка по url).
11. `SITE_ENV !== 'production'` (staging/dev) → отдавать **пустой** `urlset` (staging закрыт noindex и basic auth).
12. Объём: ≈ 300–500 URL — один файл, `generateSitemaps` не нужен; если URL > 45 000 — разбить через `generateSitemaps` (оставить комментарий-предупреждение, реализацию не делать).

Сборка данных — Local API с `select` только нужных полей (`slug`, `updatedAt`, флаги), `limit: 0`/пагинация по 500, `overrideAccess: true`. Кэш: `export const revalidate = 3600` для `sitemap.ts` и тег-инвалидация `collection:*` (используй `unstable_cache` с теми же тегами, что и остальные загрузчики), чтобы публикация обновляла sitemap без пересборки. Билд без БД: `sitemap.ts` не должен падать при недоступной БД во время `next build` — оберни в try/catch, при ошибке во время сборки верни только `/` (и пометь `dynamic = 'force-dynamic'`, если Next пытается предрендерить; предпочтительно именно `export const dynamic = 'force-dynamic'` + `revalidate`/кэш данных).

### robots.txt (`buildRobotsTxt`)

Production:

```
User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /zakaz/
Disallow: /poisk/
Disallow: /raschet-stoimosti/?
Disallow: /*?filtr
Disallow: /*?product=
Disallow: /*?type=
Disallow: /*?city=
Disallow: /*?sort=
Disallow: /*&product=
Disallow: /*&type=
Disallow: /*&city=
Disallow: /*&sort=

User-agent: Yandex
Disallow: /admin/
Disallow: /api/
Disallow: /zakaz/
Disallow: /poisk/
Disallow: /raschet-stoimosti/?
Disallow: /*?filtr
Disallow: /*?product=
Disallow: /*?type=
Disallow: /*?city=
Disallow: /*?sort=
Disallow: /*&product=
Disallow: /*&type=
Disallow: /*&city=
Disallow: /*&sort=
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&utm_referrer&yclid&gclid&fbclid&ysclid&roistat&_openstat&from /

Sitemap: https://inexglass.ru/sitemap.xml
```

Правила:
- Блок `User-agent: Yandex` ОБЯЗАТЕЛЬНО дублирует все `Disallow` (специфичная группа заменяет `*` для Яндекса). Директива `Clean-param` — только для Яндекса (Google её игнорирует, обходится canonical'ом). Список параметров: `utm_*` (source, medium, campaign, term, content, referrer), `yclid`, `gclid`, `fbclid`, `ysclid`, `roistat`, `_openstat`, `from`. Путь `/` в `Clean-param` означает «ко всему сайту».
- Не закрывать `/_next/static/`, `/_next/image` и медиа (`/media/…`) — Яндексу и Google нужны CSS/JS/изображения для рендеринга и CWV. Пути статики из `/api/media/…`: **если медиа отдаются через `/api/media/file/…`**, `Disallow: /api/` их закроет — в этом случае добавь `Allow: /api/media/file/` в обе группы (проверь реальный URL медиа в задаче 07/38: приоритет у публичного пути `/media/…`).
- Параметры квиза (`?type=&thick=&vid=&src=&resume=`) закрыты строкой `Disallow: /raschet-stoimosti/?` (canonical страницы и так без query).
- Staging/dev (`SITE_ENV !== 'production'`): `User-agent: *\nDisallow: /` и без Sitemap.
- Заголовки ответа: `Content-Type: text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600`.
- В `Sitemap:` — абсолютный URL из `SITE_URL` (apex без www, https).
- Тесты `robots.test.ts`: production содержит все Disallow из списка + Clean-param с полным набором параметров; staging — только `Disallow: /`; `Sitemap` — абсолютный; нет пустых строк внутри группы.

### Верификации Яндекс.Вебмастера и Google Search Console

- Поля `site-settings.yandexVerification`, `site-settings.googleVerification` (значения токенов `content`). В `buildMetadata`, **только для главной страницы** (path `/`), добавить:

```ts
verification: {
  yandex: settings.yandexVerification || undefined,
  google: settings.googleVerification || undefined,
}
```

  Next выведет `<meta name="yandex-verification" content="…">` и `<meta name="google-site-verification" content="…">`. Не добавлять мета, если поле пустое; на staging не добавлять никогда. Загрузка настроек через `getSiteSettings()` из `src/lib/cms/globals.ts` (кэш с тегом; инвалидируется при изменении глобала).
- Яндекс.Вебмастер: регион сайта (Челябинск) задаётся в интерфейсе Вебмастера — это **действие человека** (см. Notes).

### IndexNow

- Ключ: `INDEXNOW_KEY` — 32 hex-символа (`openssl rand -hex 16`). Файл ключа обязан открываться по `https://inexglass.ru/<key>.txt` и содержать ровно ключ (UTF-8, `text/plain`). Реализация: rewrite `/:key([a-f0-9]{32}).txt` → route handler `indexnow-key/[key]`, который возвращает ключ, если `params.key === env.INDEXNOW_KEY`, иначе 404.
- Плагин `indexNowPlugin` (коллекции `['pages','thicknesses','glass-types','processing-services','constructions','articles','objects']` заданы константой в файле плагина): добавляет на коллекции `hooks.afterChange` и `hooks.afterDelete` (без правки файлов коллекций — плагин мапит `config.collections`). Логика `afterChange({ doc, previousDoc, collection, req, operation })`:
  - пропустить если `req.context?.disableRevalidate` (seed, импорт, CLI) или `SITE_ENV !== 'production'` или `site-settings.indexNowEnabled !== true` или нет `INDEXNOW_KEY`;
  - обработать, если документ **стал опубликованным или изменился уже опубликованный** (`_status === 'published'` / `status === 'published'`); при снятии с публикации/удалении — тоже отправить URL (поисковик увидит 404/410 и удалит);
  - `isIndexable()`-false страницы (noindex) не отправлять;
  - вычислить URL через `docUrl()`; для затрагивающих списки изменений добавить связанные листинги (`/obekty/`, `/blog/`, а также `/obekty/page/N/` не требуется);
  - поставить job `indexnow-submit` с `{ urls: string[] }` в очередь (`payload.jobs.queue({ task: 'indexnow-submit', input, waitUntil: now + 60s })`). **Не выполнять HTTP внутри хука.** Дебаунс не требуется: задержка `waitUntil` и ограничение батча достаточны; дубликаты URL внутри одного задания убирать Set'ом.
- Job `indexnow-submit` (`src/jobs/indexnow.ts`): POST `https://yandex.com/indexnow` (JSON, `Content-Type: application/json; charset=utf-8`) с телом `{ "host": "inexglass.ru", "key": INDEXNOW_KEY, "keyLocation": "https://inexglass.ru/<key>.txt", "urlList": [...] }`; затем (опционально, флаг в коде) дублировать на `https://api.indexnow.org/indexnow` (агрегатор, рассылает партнёрам, включая Bing). Ответы: 200/202 — успех; 400/422/403 — ошибка конфигурации (логировать, **не ретраить**, `req.payload.logger.error`); 429 и 5xx — ретрай с экспоненциальной задержкой (максимум 3 попытки). До 10 000 URL за запрос; URL только своего хоста (`host` = hostname из `SITE_URL`).
- Помни: Google IndexNow не поддерживает; для Google роль выполняет sitemap + Search Console.
- Ручная полная отправка: скрипт `scripts/indexnow-all.ts` (`pnpm tsx scripts/indexnow-all.ts`) — берёт `collectSitemapEntries()` и отправляет пачками. Используется после запуска и после включения редиректов inex.su.
- Документация (подтверждена): IndexNow принимает POST с `host`, `key`, `keyLocation`, `urlList` (до 10 000 URL), ответы 200/202/400/403/422/429 — https://www.indexnow.org/documentation. Адрес Яндекса `yandex.com/indexnow` — сверить на странице документации Яндекса перед релизом (в общей документации хост — подстановка `<searchengine>`).

### Тесты

- Vitest: `buildRobotsTxt` (prod/staging); `isIndexable` (5/15/19 мм → false; noindex-страница → false; черновик → false; объект draft → false); `collectSitemapEntries` с замоканным Local API (не включает исключённые пути, абсолютные URL со слешем, пагинация листингов ⌈n/size⌉, нет дублей, пустой `team` исключает `/o-kompanii/sotrudniki/`).
- Playwright `e2e/seo-files.spec.ts` (на production-подобной сборке: `SITE_ENV=production` в env тестового запуска): `/robots.txt` 200 без редиректа, содержит `Clean-param`, `Disallow: /zakaz/`, `Sitemap:`; `/sitemap.xml` 200 `application/xml`, содержит `/zakalennoe-steklo/10-mm/`, не содержит `/5-mm/`, `/15-mm/`, `/19-mm/`, `/poisk/`, `/politika-konfidencialnosti/`, `?`; `/<INDEXNOW_KEY>.txt` отдаёт ключ; произвольный `/00000000000000000000000000000000.txt` — 404; на главной при заданных токенах присутствуют обе verification-мета.
- Мок-тест job: подставить `fetch` и проверить тело запроса и поведение на 200/422/429/500.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` проходят (build не требует БД).
- [ ] `/sitemap.xml` и `/robots.txt` и `/<key>.txt` отвечают 200 **без редиректа** при `trailingSlash: true` (проверено `curl -I` на production-сборке); выбранный вариант (route handler / rewrite) описан в отчёте.
- [ ] Sitemap содержит только опубликованные индексируемые страницы с `lastmod`; исключены 5/15/19 мм, политика/согласие, `/poisk/`, `/zakaz/`, фильтры, черновики объектов, пустая страница сотрудников; пагинация листингов 2+ включена.
- [ ] `robots.txt` на production включает все Disallow, блок Yandex с `Clean-param` (список: utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_referrer, yclid, gclid, fbclid, ysclid, roistat, _openstat, from) и `Sitemap`; на staging — `Disallow: /` без sitemap. `/_next/static/` и медиа не закрыты.
- [ ] Публикация/изменение/снятие с публикации документа в admin на production-конфигурации ставит job `indexnow-submit` (на staging/dev и при `disableRevalidate` — нет); job корректно обрабатывает коды ответов IndexNow, ретраит 429/5xx не более 3 раз.
- [ ] Verification-мета Яндекса и Google выводятся на главной из `site-settings` и отсутствуют на других страницах и на staging.
- [ ] Схема Payload не изменена, миграции не создавались.
- [ ] Тесты из раздела «Тесты» написаны и проходят.

## Notes

- Премиум-модель. Перед кодом уточни через context7/Exa: `MetadataRoute.Sitemap`, route handlers в `app/robots.txt/route.ts` при `trailingSlash`, поведение rewrites с расширением `.txt`.
- **Действия человека (после выката, не для агента):** (1) сгенерировать и положить `INDEXNOW_KEY` в env Dokploy prod; (2) добавить сайт в Яндекс.Вебмастер и Google Search Console, скопировать токены в `site-settings` (админка), нажать «Проверить»; (3) в Вебмастере задать регион сайта «Челябинск»; (4) отправить `sitemap.xml` в оба сервиса; (5) включить `indexNowEnabled` в `site-settings` только после запуска.
- Конфликт Disallow `/poisk/` и noindex-метки на странице поиска принят осознанно (ТЗ §8.3 и §8.6): метка работает, пока кто-то заходит напрямую, а Disallow экономит краулинговый бюджет.
- Yandex-специфика `Clean-param`: директива межсекционная, но размещаем в блоке Yandex ради читаемости; в Вебмастере проверить «Анализ robots.txt» на примере URL `/zakalennoe-steklo/?utm_source=x`.
- (Ревью волны 3) Контракт реестра плагинов (task-10): заменить `src/payload/plugins/indexnow.ts`, сохранив экспорт `indexNowPlugin: Plugin`; `index.ts` и `payload.config.ts` не трогать.
- (Ревью волны 4) 404 отдаёт два robots-тега (`noindex, follow` из `NOT_FOUND_METADATA` в `src/components/page/not-found-response.tsx` + собственный `noindex` Next), JSDoc там неточен (тег Next попадает в `<head>`). Убрать явный `robots` или исправить комментарий; на не-prod окружениях 404 должен использовать `robotsFor` как остальные страницы. Правка разрешена этой задаче (вместе с `metadata.ts`).
