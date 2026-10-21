# Task 37: Импорт портфолио и каталога душевых с inex.su + исправленная карта редиректов

## Status

pending

## Wave

6

## Description

Сайт Inex Glass должен запуститься с портфолио, а не с пустым разделом «Объекты»: это главный аргумент доверия в B2B (ТЗ §9, п.3: «перенести портфолио целиком»). Задача: (1) собрать с inex.su через Firecrawl страницы объектов стеклянных разделов и ~21 конфигурацию душевых, (2) загрузить их в Payload **черновиками** (`objects`, `shower-configs`, `media`), (3) исправить карту редиректов `12-migration-inex-su.csv`, в которой найдены системные ошибки, и (4) выдать список спорных URL для решения заказчиком. Сами 301-редиректы настраиваются на стороне inex.su — вне рамок проекта; мы поставляем только корректный CSV и отчёт.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-30-objects.md, task-26-constructions.md
**Blocks:** task-38-placeholder-media.md (опосредованно — медиа объектов), task-40-content-audit.md, task-41-prod-deploy.md

**Context from dependencies:**
- task-10 заморозил схему (`src/payload-types.ts` — **источник истины по именам полей**, прочитай типы `Object`, `ShowerConfig`, `Media`, `ObjectType`, `Product`, `City`, `Construction` до написания кода). По плану (task-07) `objects` содержит: `name`, `slug` (kebab-case, `^[a-z0-9-]+$`), `city` (rel `cities`), `objectType` (rel `object-types`), `products` (rel many `products`), `year`, `task` (текст), `spec[]` {product, thickness, kind, triplexFormula, processing}, `chips[]`, `photos[]` {image rel `media`, alt}, `related[]`, `featured`, `sortDate`, `legacyUrls[]`, `status` draft/published; **обязательность полей проверяется только при публикации**, поэтому черновик может быть неполным. `shower-configs`: `name`, `image`, `description`, `legacyUrl`, `order`, `construction` (rel `constructions`). `media`: `alt` обязателен, `isPlaceholder` checkbox, `staticDir` = `MEDIA_DIR`.
- task-30 реализовал страницы `/obekty/`, `/obekty/page/N/`, `/obekty/[slug]/` и фильтры; таксономии `object-types`, `products`, `cities` заполняются здесь «найти или создать» по slug, если ещё не засеяны (проверь `src/seed/slices/objects.ts`).
- task-26 реализовал страницу `/dushevye-peregorodki/` и сетку конфигураций душевых из `shower-configs`; документ `constructions` с slug душевых нужен для relation (найти по slug; если нет — завершить с ошибкой «сначала сид constructions»).
- Seed-инфраструктура task-16: `src/seed/context.ts` (получение `payload` с `context.disableRevalidate`), `src/seed/lexical.ts`. Используй тот же способ инициализации Payload в скриптах (tsx + alias `@payload-config`).
- Исходные данные миграции: `docs/inex/12-migration-inex-su.csv` (разделитель `;`, колонки `old_url;new_url;action;note`, UTF-8 с BOM, 446 строк) и `docs/inex/12-migration-inex-su.md`.

## Files to Create

- `scripts/import-inex/crawl.ts` — сбор страниц через Firecrawl с файловым кэшем.
- `scripts/import-inex/parse-objects.ts` — HTML/markdown страницы объекта → `ParsedObject`.
- `scripts/import-inex/parse-showers.ts` — страница конфигурации душевой → `ParsedShower`.
- `scripts/import-inex/import.ts` — загрузка в Payload (Local API): таксономии, media, objects, shower-configs.
- `scripts/import-inex/fix-csv.ts` — формирует `docs/inex/12-migration-inex-su.fixed.csv` и `docs/reports/migration-disputed.md`.
- `scripts/import-inex/selectors.ts` — CSS-селекторы и эвристики разбора inex.su (правятся после первого пробного прогона).
- `src/lib/migration/rules.ts` — **чистая** логика классификации URL и построения slug (импортируется скриптами; лежит в `src/lib`, чтобы её видел Vitest) + `src/lib/migration/rules.test.ts`.
- `docs/inex/12-migration-inex-su.fixed.csv` — результат.
- `docs/reports/migration-disputed.md` — список спорных URL и решений.
- `docs/reports/import-inex-report.md` — итог запуска импорта (сколько страниц/фото/объектов создано, ошибки, незаполненные поля).

## Files to Modify

- `.gitignore` — добавить `scripts/.cache/` и `scripts/.import-tmp/`.
- `package.json` — **не менять** (скрипты запускаются как `pnpm tsx --env-file=.env scripts/import-inex/<файл>.ts`; `tsx` есть с task-01, `cheerio` и `csv-parse` предустановлены task-10; если чего-то нет — сообщить координатору, `pnpm add` не запускать — в волне 6 `package.json` никто не меняет).

НЕ трогать: схемы Payload (заморожены; если поля для данных не хватает — остановиться и сообщить координатору), `src/payload.config.ts`, шаблоны страниц.

## Technical Details

### Анализ карты редиректов (факты по CSV — исходная ситуация)

Всего 446 строк: `301` — 283, `stay` (остаются на inex.su) — 163. Группы 301: `/portfolio/*` → `/obekty/…` — **243**; `/produkciya/*` — **39** (22 из них душевые → `/dushevye-peregorodki/`); `/materialy/steklo` — 1.

Проблемные категории внутри 243 строк `/portfolio/*` (подсчитано скриптом):

| # | Проблема | Кол-во | Пример | Что делаем |
|---|---|---:|---|---|
| 1 | **Лестницы** (`/portfolio/lestnicy/*`) размечены 301, хотя по ТЗ §9 и `12.md` лестницы остаются на inex.su | **42** (включая 7 строк-категорий и 1 «страницу 2») | `/portfolio/lestnicy/betonnye/kottedzh-32-beton → /obekty/kottedzh-32-beton/` | → `stay`, `new_url` пустой |
| 2 | **Отделка интерьера** (`/portfolio/otdelka-interera/*`) размечена 301; по плану «без лестниц и отделки», `12.md`: «отделка остаётся» | **10** (1 категория + «2» + 8 объектов) | `…/otdelka-interera/vip-studiya` | → `stay`; 8 объектов вынести в спорные (`vitrag-01/02`, `peregorodka-01`, `kvartira-2`, `oblizovka-cteklom`… могут быть стеклянными) |
| 3 | **Страницы категорий** портфолио ошибочно получили «slug объекта» | **20** (после п.1–2), напр. `/portfolio/dushevye/pryamye → /obekty/pryamye/` | `/obekty/pryamye/`, `/obekty/ograzhdeniya/`, `/obekty/zerkala/` — таких страниц не существует | → `/obekty/` |
| 4 | **Старая пагинация** (`…/celnosteklyannye/2`, `/3`, `/4`) получила цель `/obekty/2/`, `/obekty/3/` — не существует (пагинация нового сайта: `/obekty/page/N/`) | **3** (+2 уже в п.1–2) | `/portfolio/peregorodki/celnosteklyannye/2 → /obekty/2/` | → `/obekty/` (содержимое страниц другое: список объектов старой категории) |
| 5 | **Заглавные буквы / кириллица в slug** | 2 строки 301 с заглавными в `new_url`: `/obekty/Steklyannyy-kozyrek/`, `/obekty/Peregorodka-01/` (+2 строки `stay` со старыми URL с заглавными) | а также **кириллическая «о» вместо латинской** в `/portfolio/ograzhdeniya/atriumnye/kolоnna-08` (301) и `/portfolio/kolonny/kolоnna-09` (stay) | `new_url` всегда lowercase и транслитерирован/латинизирован; `old_url` оставляем **как есть** (в точности как на inex.su; для кириллического — добавить percent-encoded вариант в note) |
| 6 | **Дубли целей** | 10 групп / 51 строка: `/obekty/` ×5, `/dushevye-peregorodki/` ×22, `/steklyannye-ograzhdeniya/` ×6, `/osteklenie/verand-terras-besedok/` ×4, `/steklyannye-peregorodki/` ×3, `/zakalennoe-steklo/` ×2, `/obekty/2/` ×3, и коллизии slug объектов `/obekty/kottedzh-1/` ×2, `/obekty/restostar/` ×2, `/obekty/tk-kolco/` ×2 | `…/ograzhdeniya/lestnichnye/restostar` и `…/peregorodki/celnosteklyannye/restostar` → один `/obekty/restostar/` | Многие→один для категорий и `/produkciya/*` — **допустимо** (подтверждается отчётом); для объектов с одинаковым итоговым slug — решение по правилу R5 ниже (тот же объект → один URL с двумя `legacyUrls`; разные → разные slug) |
| 7 | **Двери внутри стеклянных перегородок** (301, но «двери остаются на inex.su») | 3 | `…/celnosteklyannye/dveri-08`, `dveri-mayatnik-01`, `linda-dver` | в спорные; по умолчанию остаются 301 (цельностеклянные маятниковые двери в перегородках — стеклянная конструкция), финальное решение за Inex |
| 8 | Ограждения лестничные (`/portfolio/ograzhdeniya/lestnichnye/*`) — стеклянные перила на лестницах | 31 (категория + 30 объектов) | | остаются 301 (это стеклянные ограждения, товар Inex Glass); в спорных — как группа для подтверждения |

Итог после исправления (ожидаемое): `301` = **231**, `stay` = **215**: 168 объектов + 20 категорий + 3 пагинации + 39 `/produkciya/*` + 1 `/materialy/steklo`. Если после слияния дублей (R5) число уникальных `new_url` объектов меньше 168 — это нормально; зафиксируй числа в отчёте.

Эти цифры проверяются скриптом `fix-csv.ts --check` (assert на суммы); расхождения → исправить правила, а не цифры.

### Правила `src/lib/migration/rules.ts` (чистые функции + тесты)

```ts
export type Row = { old_url: string; new_url: string; action: '301' | 'stay'; note: string }
export type FixedRow = Row & { rule: string; disputed: boolean }

classify(row): 'stairs' | 'interior' | 'category' | 'pagination' | 'object' | 'produkciya' | 'other'
toLatinSlug(s: string): string      // lowercase; кириллические омоглифы (а е о р с у х к м т в н) → латиница; кириллица → транслит (ГОСТ 7.79 Б упрощённый); всё кроме [a-z0-9] → '-'; схлопнуть дефисы; trim
fixRow(row, ctx): FixedRow
```

Порядок правил (первое сработавшее):

- **R0** `action = stay` — без изменений (кроме замечаний п.5 для логов).
- **R1** путь начинается с `/portfolio/lestnicy` → `stay`, `new_url=''`, note `лестницы остаются на inex.su (ТЗ §9)`.
- **R2** путь начинается с `/portfolio/otdelka-interera` → `stay`, `new_url=''`, note `отделка интерьера остаётся на inex.su`; `disputed=true` для объектов-листьев (кроме «2»).
- **R3** категория: глубина 3 (`/portfolio/<cat>`) или глубина 4, где последний сегмент ∈ известных подкатегорий (`pryamye, uglovye, trepecevidnye, celnosteklyannye, v-aluminievom-profile, lestnichnye, atriumnye, interernye, balkonnye, terrasnye, osteklenie-verandy, osteklenie-besedki, osteklenie-terrasy`) → `new_url = '/obekty/'`, note `категория портфолио → листинг объектов`.
- **R4** последний сегмент — число (`^\d+$`) → `new_url='/obekty/'`, note `старая пагинация → листинг`.
- **R5** объект (лист): `new_url = '/obekty/' + slug + '/'`, `slug = toLatinSlug(последний сегмент)`. Коллизия двух разных старых URL с одинаковым `slug`: решается по результату парсинга (`ctx.sameObject(a, b)`): совпадает `name` (без регистра) **и** ≥ 50% имён файлов фото → один объект, оба старых URL → один `new_url`, оба в `legacyUrls`; иначе второму (по порядку CSV) добавляется суффикс `-<категория-портфолио>` (`restostar-peregorodki`). Заглавные/кириллические омоглифы в slug убираются (`Steklyannyy-kozyrek → steklyannyy-kozyrek`). Slug из `new_url` строки CSV и slug из Payload (поле `slug` созданного объекта) обязаны совпадать — `import.ts` пишет `slug` в тот же словарь.
- **R6** `/produkciya/*` и `/materialy/steklo` — без изменений (301 на разделы), но проверить, что цель существует в реестре URL (ниже).
- **R7** объект есть в CSV, но парсинг не удался (404/пусто на inex.su, <1 фото и нет названия) → `new_url='/obekty/'`, `disputed=true`, note `страница не импортирована`.

Колонки результата: `old_url;new_url;action;note` (как в оригинале, `;`, UTF-8 **с BOM**, LF) + пятая колонка `rule` (R1…R7) — для аудита. Порядок строк как в исходнике. Отчёт `docs/reports/migration-disputed.md` (структура: «Итоги (числа)», «Изменения относительно исходного CSV по правилам», «Спорные URL — нужно решение Inex» с таблицами: URL / что решили по умолчанию / вопрос, «Допустимые дубли целей (many→one)», «Технические замечания для администратора inex.su» (регистр, кириллица, percent-encoding, 301 включать только после публикации объектов)).

Валидация (`fix-csv.ts --check`):
1. Каждый `new_url` непустой: начинается с `/`, заканчивается на `/`, только `[a-z0-9/-]`, нет `//`, нет цепочек.
2. Каждый `new_url` не из `/obekty/…` принадлежит реестру URL из `docs/inex/17-meta.md` (колонка URL: распарси первые ячейки таблиц; шаблон `{N}-mm` раскрыть в 4,5,6,8,10,12,15,19; `/obekty/{slug}/` — исключить).
3. Каждый `/obekty/<slug>/` (кроме `/obekty/`) соответствует существующему `objects.slug` в БД (режим `--check-db`) или в словаре импорта (`scripts/.import-tmp/slugs.json`).
4. `action=301` ⇒ `new_url` непустой; `action=stay` ⇒ `new_url` пустой.
5. Числа итога совпадают с ожидаемыми (или расхождение объяснено в отчёте).

### Firecrawl (`crawl.ts`)

- Ключ: `FIRECRAWL_API_KEY` из `.env` (dev-tools; в prod-образ не попадает — скрипты запускаются локально или в `tools`-таргете).
- API v2 (документация: https://docs.firecrawl.dev/api-reference/endpoint/scrape): `POST https://api.firecrawl.dev/v2/scrape`, заголовок `Authorization: Bearer <key>`, тело `{ "url": "https://inex.su/portfolio/...", "formats": ["markdown","html","links"], "onlyMainContent": true, "waitFor": 1000, "timeout": 60000 }`; ответ `{ success, data: { markdown, html, links, metadata: { title, description, sourceURL, url, statusCode } } }`; при 429 — `Request rate limit exceeded`, числовые лимиты в документации не указаны (**неопределённость** — выставь `--concurrency=3` по умолчанию, ретрай 5 раз с экспоненциальной паузой 2→32 с и уважением заголовка `Retry-After`, если есть). Если эндпоинт v2 недоступен у аккаунта — проверь актуальную версию (v1: `/v1/scrape`) через Exa/context7 или `curl`-пробой и адаптируй, зафиксировав в отчёте.
- Кэш: `scripts/.cache/firecrawl/<sha1(url)>.json` (ответ целиком + `fetchedAt`); повторный запуск не тратит кредиты; флаг `--refresh` игнорирует кэш; `--limit=N` и `--only=<подстрока url>` для пробных прогонов; `--sample` берёт по 1 странице каждого типа (объект, душевая, категория) и печатает сырые HTML-фрагменты для настройки `selectors.ts`.
- Входные URL: из исправленной логики — только `classify ∈ {object, shower}` (168 объектов + 21 страница `/produkciya/dushevye/<config>`; листинг `/produkciya/dushevye` парсится ради описания раздела — опционально). Лестницы, отделку, двери и т.д. НЕ краулить (экономия кредитов).
- Базовый домен `https://inex.su` + `old_url`. Для URL с кириллической «о» использовать `encodeURI`.
- Если страница вернула `statusCode` ≠ 200 или пустой контент → запись в `import-report` и правило R7.
- Ожидаемый расход ≈ 190 скрейпов; перед полным прогоном выполнить `--sample` и показать пользователю/координатору оценку расходов.

### Парсинг (`parse-objects.ts`, `parse-showers.ts`, `selectors.ts`)

Разметка inex.su заранее неизвестна — **первый шаг: `--sample`, посмотреть HTML, зафиксировать селекторы**. Используй `cheerio`. Результат:

```ts
type ParsedObject = {
  oldUrl: string; categorySlug: string       // из пути /portfolio/<cat>/...
  name: string                                // H1, без суффикса сайта
  taskText: string                            // описание (plain text, без рекламных блоков и телефонов)
  city?: string; year?: number                // эвристика: город из списка cities (Челябинск, Екатеринбург, Тюмень, Омск, Новосибирск, Сургут, Магнитогорск…) в тексте/названии; год — /\b(19|20)\d{2}\b/
  photos: { src: string; alt?: string }[]     // абсолютные URL, без иконок/логотипов/дублей (по имени файла и размеру ≥ 400px)
  specs?: string[]                            // если на странице есть перечисление изделий — сохранить как есть, в spec[] НЕ раскладывать (заполняет человек)
}
type ParsedShower = { oldUrl: string; name: string; description: string; image: { src: string; alt?: string }; order: number }
```

- Все тексты — plain text, без HTML; убрать контакты inex.su (телефоны, e-mail), фразы про монтаж «под ключ» и двери (контент-правила ТЗ §11 — монтаж не обещаем); пометить такие места в `import-report`, не править смысл молча. Стоп-слова — см. список в `src/lib/domain/stop-words.ts` (task-11): прогнать `checkStopWords(text)` и вывести найденное в отчёт; в `task` текст сохранять как есть (правит редактор), но с пометкой в отчёте.
- Названия фото-alt: если на источнике alt пуст — `"${name} — фото ${n}"` (детерминированно); все такие alt перечислены в отчёте как «требуют проверки редактора».
- `order` для душевых — порядок по списку на странице `/produkciya/dushevye` (или порядок CSV).

### Импорт (`import.ts`)

Запуск: `pnpm tsx --env-file=.env scripts/import-inex/import.ts [--dry-run] [--only=objects|showers] [--limit=N]`.

1. Инициализация Payload как в `src/seed/context.ts`; `context: { disableRevalidate: true }` на всех операциях.
2. Таксономии (найти по slug, иначе создать): `object-types` по категории портфолио — `dushevye→Душевые перегородки`, `fasady→Фасады`, `kozyrki→Козырьки`, `ograzhdeniya→Ограждения`, `osteklenie→Остекление`, `peregorodki→Перегородки`, `zerkala→Зеркала`; `products` — те же (по необходимости); `cities` — найденные по тексту.
3. Media: скачать фото во временную папку `scripts/.import-tmp/` (по 4 параллельно, таймаут 30 с, ретрай 3), проверить signature JPEG/PNG/WebP (первые байты), `payload.create({ collection: 'media', data: { alt, isPlaceholder: false }, filePath })`. Пропускать файлы <10 КБ. Дедуп по sha1 содержимого (повторное фото в двух объектах → одна media). Файлы пишутся в `MEDIA_DIR` (staticDir коллекции) — **для prod запускать в контейнере/таргете `tools` с примонтированным volume `/data/media`** (иначе файлы окажутся на машине запуска, а в БД будут записи без файлов).
4. Объекты: идемпотентный upsert по `legacyUrls` (искать документ, у которого `legacyUrls` содержит `oldUrl`; структуру массива см. в `payload-types.ts`, обычно `{ url: string }[]`); при повторном запуске обновлять только пустые поля, не затирать правки редактора. `status: 'draft'`, `_status: 'draft'`, `slug` по правилу R5 (уникальность проверять по БД), `name`, `task`, `objectType`, `products` (по категории), `city`/`year` если найдены, `photos` (первый — обложка), `legacyUrls`, `sortDate` = дата страницы, если есть, иначе дата импорта, `featured: false`, `spec: []`. **Ни один объект не публикуется.** Поля, обязательные для публикации, но не найденные (город, год, spec, alt), — в `import-report.md` как таблица «объект → чего не хватает», чтобы редактор мог добить.
5. Душевые: `shower-configs` (upsert по `legacyUrl`): `name`, `description`, `image`, `order`, `construction` = документ `constructions` душевых (slug из seed task-26; найти по маркеру/slug `dushevye-peregorodki`).
6. Итоговый словарь `scripts/.import-tmp/slugs.json` `{ oldUrl: slug }` для `fix-csv.ts`.
7. Отчёт `docs/reports/import-inex-report.md`: счётчики (страниц запрошено/успешно/пропущено, фото скачано/загружено/пропущено, объектов создано/обновлено, душевых создано), таблицы ошибок и «чего не хватает», найденные стоп-слова, объекты с дублями, время и расход Firecrawl.
8. `--dry-run`: ничего не пишет в БД и файловую систему медиа, печатает план.

Безопасность скриптов: не логировать ключи; не выполнять импорт, если `DATABASE_URL` содержит хост prod, без флага `--i-know-this-is-prod` (проверка по `SITE_ENV === 'production'` или явному списку хостов в переменной окружения `IMPORT_PROD_GUARD_HOSTS`).

### Тесты (Vitest, `src/lib/migration/rules.test.ts`)

- `toLatinSlug`: `Steklyannyy-kozyrek → steklyannyy-kozyrek`; омоглиф `kolоnna-08` (кириллическая «о») → `kolonna-08`; транслит «Ресторан Стар» → `restoran-star`.
- `classify`/`fixRow` на репрезентативных строках: лестница, отделка, категория, пагинация (`/2`), объект, `/produkciya/dushevye/...`, stay-строка с заглавными.
- Коллизии: два `restostar` — объединение/суффикс по `sameObject`.
- Свойство: после `fixRow` все `new_url` валидны (regex), у `stay` пустой `new_url`.
- Интеграционный тест на реальном CSV (читать `docs/inex/12-migration-inex-su.csv`): ожидаемые суммы 231 / 215 и состав групп.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят; `rules.test.ts` покрывает все правила R0–R7 и итоговые суммы CSV.
- [ ] `scripts/import-inex/fix-csv.ts --check` проходит; `docs/inex/12-migration-inex-su.fixed.csv` содержит 446 строк, `301` = 231, `stay` = 215 (или объяснённые расхождения), нет заглавных/кириллицы в `new_url`, все `new_url` оканчиваются на `/`, лестницы и отделка — `stay`, категории и старая пагинация → `/obekty/`.
- [ ] `docs/reports/migration-disputed.md` содержит итоги, список спорных URL с решением по умолчанию и вопросом к Inex, список допустимых many→one, технические замечания для администратора inex.su (регистр, кириллическая «о», 301 включать только после публикации объектов и индексации).
- [ ] Пробный прогон `--sample` выполнен, селекторы зафиксированы; полный прогон `crawl.ts` отработал с кэшем; повторный запуск не тратит кредиты.
- [ ] `import.ts` на локальной БД создал объекты и конфигурации душевых **только как черновики**; повторный запуск не создаёт дублей и не затирает правки; все фото имеют alt; медиа лежат в `MEDIA_DIR` и открываются в админке.
- [ ] `docs/reports/import-inex-report.md` содержит счётчики, список «чего не хватает для публикации», найденные стоп-слова (ТЗ §11) и расход Firecrawl.
- [ ] Ни один импортированный объект не виден на публичном сайте и не попал в sitemap (проверено: `/obekty/` без ключа админа не показывает черновики).
- [ ] Схема Payload не изменена; ключи (`FIRECRAWL_API_KEY`) не попали в логи и в репозиторий; `scripts/.cache/` в `.gitignore`.

## Notes

- Премиум-модель для скриптов импорта и парсера; отчёты можно доверить mid-tier после готовности данных.
- **Действия человека:** (1) решить спорные URL из `migration-disputed.md` (Inex); (2) для prod — запуск `import.ts` в контейнере `tools` на Dokploy с примонтированным `/data/media` (пошагово описано в `docs/deploy.md`, раздел про tools-образ; задача 41 его актуализирует) либо на staging с последующим переносом; (3) редакторы дозаполняют поля и публикуют объекты в админке; (4) администратор inex.su включает редиректы **только после** публикации новых страниц и их индексации (ТЗ §9, порядок).
- Firecrawl: поведение лимитов и точная версия API зависят от тарифа — перед массовым прогоном проверь актуальную документацию (Exa/context7) и баланс кредитов.
- Редиректы на inex.su делает команда inex.su: в проекте нет middleware-редиректа для старых адресов (в `redirects`-коллекции Inex Glass хранятся только внутренние редиректы нового сайта).
- (Ревью волны 4) Записи, созданные вне админки (сид, импорт, скрипты `payload run`), не сбрасывают кэш Next. Сид (`src/seed/index.ts`) в конце вызывает `POST /api/revalidate/` (HMAC-токен от `PAYLOAD_SECRET`, `src/lib/cms/revalidate-token.ts`); свои скрипты завершать тем же вызовом (переиспользовать хелпер из `src/seed/context.ts`). Блоки получают данные страницы через проп `page` у `RenderBlocks` — в сиде не копировать `seo.h1` в `titleOverride`.
- (Волна 5, task-27) Страница зеркал для салонов предлагает зеркала с LED-подсветкой (дословно по teksty), что расходится с решением в `docs/inex/12-migration-inex-su.md`. При подготовке CSV редиректов учесть и вынести расхождение в отчёт координатору.
