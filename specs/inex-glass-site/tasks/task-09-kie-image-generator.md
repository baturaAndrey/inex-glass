# Task 09: Генератор изображений на kie.ai (фоны и временные иллюстрации карточек)

## Status

complete

## Wave

2

## Description

До появления реальных фотографий сайту нужны фоны hero, фоны секций и временные иллюстрации карточек каталога. Делаем dev-скрипт `scripts/gen-images.ts`, который по JSON-описаниям (`scripts/image-prompts/*.json`) генерирует изображения через API kie.ai (асинхронная задача: создать → опросить → скачать), конвертирует результат в AVIF и WebP с помощью `sharp`, кладёт файлы в `public/generated/` и пишет манифест `public/generated/manifest.json` (id, файлы, alt по-русски, вид, целевая страница/поле). Позже (задача 38) файлы загружаются в медиатеку Payload с флагом `isPlaceholder`. Скрипт используется только при разработке: ключ `KIE_AI_API_KEY` не попадает в prod-образ и prod-env. **Не генерировать** фото объектов портфолио, сотрудников, упаковки, документов.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-38-placeholder-media.md

**Context from dependencies:** Задача 01 оставила в проекте Node 24, pnpm 11, TypeScript strict, `tsx` (devDependency), `sharp` (dependency, используется Payload/Next), корневой `.env` с ключами dev-инструментов (в том числе `KIE_AI_API_KEY`; значения никогда не выводить в логи и не коммитить), `src/lib/env.ts` (группа `devTools` — необязательные ключи). `public/` существует; `next.config.ts` разрешает `next/image` для локальных путей `/generated/**`. ESLint игнорирует `scripts/**`, а `tsc --noEmit` проверяет `**/*.ts` — скрипт должен проходить `pnpm typecheck`. Параллельно задача 02 владеет `package.json` (скрипты `test*`, devDependencies) — **в `package.json` эта задача ничего не меняет**: новых зависимостей не требуется (используются `fetch` Node 24 и `sharp`), скрипт запускается так: `pnpm tsx --env-file=.env scripts/gen-images.ts [опции]` (если `package.json`-скрипт `gen:images` нужен — сообщить координатору в отчёте).

## Files to Create

- `scripts/gen-images.ts` — CLI.
- `scripts/lib/kie.ts` — клиент API kie.ai (создание задачи, опрос, скачивание, повторы).
- `scripts/image-prompts/style.json` — общие правила стиля.
- `scripts/image-prompts/backgrounds.json` — фоны hero и секций.
- `scripts/image-prompts/glass-types.json`, `constructions.json`, `glazing-mirrors.json`, `processing.json`, `hubs-articles.json` — карточки.
- `scripts/.cache/.gitignore` — содержимое `*` и `!.gitignore` (кэш скачанных исходников не коммитится; каталог общий с импортом Firecrawl).
- `public/generated/*.avif`, `public/generated/*.webp`, `public/generated/manifest.json` — результат (коммитятся).
- `scripts/image-prompts/schema.ts` — типы и zod-валидация описаний (`PromptSpec`, `Manifest`).

## Files to Modify

Нет (в `package.json`, `.gitignore`, `eslint.config.mjs` ничего не менять).

## Technical Details

### API kie.ai (проверено по документации на 20.10.2026; перед реализацией сверить с https://docs.kie.ai/ и при расхождениях следовать документации, используя Exa/WebFetch)

- Базовый URL `https://api.kie.ai`, заголовок `Authorization: Bearer ${KIE_AI_API_KEY}`, `Content-Type: application/json`.
- Создание задачи: `POST /api/v1/jobs/createTask`, тело:
  ```json
  { "model": "google/nano-banana",
    "input": { "prompt": "…", "output_format": "png", "aspect_ratio": "16:9" } }
  ```
  `callBackUrl` не используем (опрос). Ответ: `{ "code": 200, "msg": "success", "data": { "taskId": "task_…" } }`. **HTTP-статус всегда 200 — ошибки определяются по полю `code`** (≠ 200: 401 ключ, 402 кредиты, 422 валидация, 429 лимит, 501 сбой генерации, 408 нет результата > 10 мин).
- Опрос: `GET /api/v1/jobs/recordInfo?taskId=…` → `data.state` ∈ `waiting | queuing | generating | success | fail`; при `success` в `data.resultJson` лежит **JSON-строка** `{"resultUrls":["https://…png"]}` (двойной парсинг), при `fail` — `data.failCode`, `data.failMsg`. Файлы результата хранятся ~14 дней — скачивать сразу.
- Допустимые `aspect_ratio` для nano-banana: `1:1, 9:16, 16:9, 3:4, 4:3, 3:2, 2:3, 5:4, 4:5, 21:9, auto`; `output_format`: `png|jpeg`. Модель по умолчанию `google/nano-banana` (дешёвая); опция `--model` позволяет выбрать другую текстово-изобразительную модель из каталога kie.ai (`https://docs.kie.ai/market/…`). Названия моделей других семейств и их параметры брать из документации — не угадывать.
- Баланс кредитов: если в документации есть endpoint проверки баланса, использовать его в `--check-credit`; иначе пропустить опцию.

### CLI `scripts/gen-images.ts`

Опции: `--only <id|группа,…>` (фильтр по id или группе), `--dry-run` (печать промптов и затрат без вызовов API), `--force` (перегенерировать, даже если файлы есть), `--model <name>`, `--concurrency <n>` (по умолчанию 3), `--check-credit`, `--sheet` (собрать `scripts/.cache/kie/contact-sheet.html` — миниатюры + id + alt для ручного просмотра), `--no-convert` (только скачать исходники).

Поведение:
1. Загрузить и провалидировать (zod) все `scripts/image-prompts/*.json`; id уникальны.
2. Для каждого описания: если уже есть `public/generated/<id>.avif` и `.webp` и нет `--force` — пропустить.
3. Собрать промпт: `style.prefix + " " + spec.subject + " " + style.suffix` (правила стиля ниже; «негативы» вписываются в текст, у nano-banana нет negative_prompt).
4. Создать задачу → опрашивать каждые 5 с до `success`/`fail`, общий таймаут 10 мин; ретраи с экспоненциальной паузой на сетевые ошибки, `429` и `5xx`; на `402` (кредиты) остановить весь прогон с понятным сообщением; один повтор задачи при `fail`.
5. Скачать PNG в `scripts/.cache/kie/<id>.png` (кэш; ключ в URL не содержится).
6. Конвертация `sharp`: для `background` — ширина 1920 (дополнительно 1280) и AVIF `quality 50`, WebP `quality 72`; для `card-illustration` — ширина 960 (4:3) / 1280 (16:9) и те же форматы; `withoutEnlargement: true`; выход: `public/generated/<id>.avif`, `<id>.webp` (для фонов — также `<id>-1280.avif/.webp`). Если исходник не 16:9/4:3 — кадрировать `fit: "cover"`.
7. Проверка результата: файл не пустой, ширина ≥ 960, соотношение сторон в допуске ±3%; иначе пометить `failed` в отчёте.
8. Записать/обновить `public/generated/manifest.json` (атомарно, сортировка по id). Запись манифеста идёт после каждого успешного изображения (прерывание не теряет прогресс).
9. Итог в консоль: сколько создано/пропущено/ошибок, суммарные кредиты (если есть `creditsConsumed`).
Секреты не логировать; промпты и id — можно.

### Формат описания (`PromptSpec`, JSON-массивы в `scripts/image-prompts/*.json`)

```ts
{
  id: string;                    // kebab-case, уникальный; имя файла
  group: "backgrounds" | "glass-types" | "constructions" | "glazing-mirrors" | "processing" | "hubs-articles";
  kind: "background" | "card-illustration";
  aspect: "16:9" | "4:3" | "21:9" | "1:1";
  subject: string;               // что изображено (на английском — лучше работает с моделью)
  alt: string;                   // alt по-русски для медиатеки, обязателен
  target: {                      // куда привязать в задаче 38
    kind: "template" | "section" | "doc";
    collection?: string;         // для doc: glass-types | processing-services | constructions | pages | articles
    slug?: string;               // slug документа или имя шаблона (home, zak-hub, thickness, glass-type, processing, construction, service, article, objects)
    field: string;               // heroImage | card.image | backgroundKey
  };
}
```

Манифест `public/generated/manifest.json`: массив `{ id, kind, files: { avif, webp, avif1280?, webp1280? }, alt, target, width, height, model, generatedAt }`.

### Стиль (`style.json`)

- `prefix`: «Photorealistic architectural photograph, cold neutral daylight (about 5500–6500 K), clean minimal composition, tempered glass with subtle greenish teal edge highlights, soft reflections, light grey-white background tones, high detail, shallow depth of field.»
- `suffix` для фонов: «Wide composition with large calm empty area on the left third for text overlay. No people, no hands, no text, no letters, no logos, no brand marks, no watermarks, no signs, no UI.»
- `suffix` для карточек: «Single clear subject centered on a soft light-grey (#F4F5F3) seamless studio background, soft studio lighting, subtle shadow. No people, no hands, no text, no logos, no watermarks.»
- Общие запреты: не изображать людей, монтажников, лого, надписи, упаковку/ящики, документы, заводы и оборудование, двери и лестницы (остаются на inex.su), стеклопакеты, бронированное/смарт/зеркальное-подсветка и прочие «не поставляем» позиции. Палитра — холодные светлые тона с лёгким зелёно-бирюзовым акцентом бренда (#2B8C7E); тёмные фоны — глубокий сине-зелёный (#16403D) и navy (#324B64).

### Список изображений (≈53; ids и `subject` — исходные формулировки, расширить до полных промптов)

**Фоны, группа `backgrounds`, `kind: background`, `aspect: 16:9`:**

| id | Содержание | target |
|---|---|---|
| `hero-home` | Пирамиды закалённого стекла на складе, холодный свет (вместо временного hero) | template `home` |
| `hero-zak-hub` | Стопка стёкол с видимым торцом, ровный свет | template `zak-hub` |
| `hero-thickness` | Крупный план торца толстого стекла, зеленоватый блик | template `thickness` |
| `hero-glass-type` | Абстракция: стеклянные панели разной фактуры | template `glass-type` |
| `hero-processing` | Полированная кромка и отверстие в стекле, макро | template `processing` |
| `hero-construction` | Интерьер атриума со стеклянными ограждениями (без людей) | template `construction` |
| `hero-service` | Чертёжная доска/свет на стекле, абстрактно, без текста | template `service` |
| `hero-article` | Нейтральный светлый фон с отражениями на стекле | template `article` |
| `hero-objects` | Фасад торгового центра, стекло и свет | template `objects` |
| `bg-section-light` | Тонкие световые блики на матовой поверхности (фон секции) | section `light` |
| `bg-section-dark-teal` | Глубокий сине-зелёный (#16403D) абстрактный фон с отражениями стекла (акцентные блоки `primary-dark`) | section `dark-teal` |
| `bg-snow-calc` | Тёмный фон для блока «Расчёт под снег»: стеклянный козырёк в сумерках без людей | section `snow-calc` |
| `bg-forms` | Светлый абстрактный фон секции с формой | section `forms` |
| `bg-404` | Светлая абстракция с разбегающимися линиями стекла | template `not-found` |

**Карточки (`card-illustration`, `aspect: 4:3`, кроме статей 16:9):**

- Виды стекла, группа `glass-types`, target `doc glass-types / <slug> / card.image`: `gt-matovoe` (матовое стекло с лёгким сатином), `gt-okrashennoe` (крашеное стекло, несколько панелей приглушённых цветов), `gt-osvetlennoe` (идеально прозрачный торец осветлённого стекла рядом с зеленоватым обычным), `gt-tonirovannoe` (панели бронза, графит, серое), `gt-dlya-mebeli` (стеклянный фасад шкафа/столешница без людей), `gt-riflenoe` (рифлёное стекло с вертикальными рёбрами), `gt-mollirovannoe` (изогнутая закалённая панель), `gt-tripleks` (торец триплекса с видимыми слоями).
- Конструкции, группа `constructions`: `c-konstrukcii-hub` (page `steklyannye-konstrukcii`), `c-peregorodki` (цельностеклянная перегородка в офисе, без людей), `c-ograzhdeniya` (стеклянное ограждение лестницы с профилем), `c-kozyrki` (стеклянный козырёк над входом), `c-dushevye` (душевая перегородка в гостиничном номере без людей), `c-torgovye-vitriny` (стеклянная витрина магазина без товара-брендов), `c-furnitura` (зажимной профиль и спайдер, макро).
- Остекление и зеркала, группа `glazing-mirrors`: `g-osteklenie-hub`, `g-fasadov` (структурный фасад), `g-spajdernoe` (спайдерное крепление, макро), `g-vitrin-i-magazinov` (витринное остекление), `g-liftovyh-shaht` (прозрачная лифтовая шахта), `g-verand-terras-besedok` (безрамное остекление веранды), `m-zerkala` (зеркало по размеру в интерьере), `m-dlya-zalov` (зеркальная стена зала без людей), `m-dlya-salonov` (зеркало с фацетом в светлом интерьере салона без подсветки и без людей).
- Обработка, группа `processing`: `p-obrabotka-hub`, `p-kromka` (полированная кромка, макро), `p-otverstiya-i-vyrezy` (отверстие с притуплённой кромкой, макро), `p-facet` (фацет на зеркале, макро), `p-matirovanie` (пескоструйный узор — абстрактные полосы, без логотипов и текста), `p-plenki` (матовая плёнка на стекле — полоса приватности), `p-pechat` (керамическая печать — абстрактный точечный растр без текста).
- Хабы и статьи, группа `hubs-articles`: `h-zakalennoe-steklo` (page `zakalennoe-steklo`), `h-kak-zakazat` (page `kak-zakazat`, абстрактная схема света на стекле), статьи (16:9) `a-mozhno-li-rezat`, `a-chem-otlichaetsya`, `a-kak-vybrat-tolshchinu`, `a-kak-snyat-razmery`, `a-tripleks-ili-zakalennoe`, `a-markirovka` (иллюстративные сцены со стеклом, **без текста и маркировки**) — target `doc articles / <slug статьи> / card.image` (slugs статей: `mozhno-li-rezat-zakalennoe-steklo`, `chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo`, `kak-vybrat-tolshchinu-stekla`, `kak-snyat-razmery-dlya-stekla`, `tripleks-ili-zakalennoe-dlya-ograzhdenij`, `markirovka-zakalennogo-stekla`).

`alt` — на русском, описательный, без слова «временное» (например, «Матовое закалённое стекло»). Для декоративных фонов alt краткий («Фон: светлые блики на стекле»).

### Процедура (обязательная)

1. Реализовать скрипт, `--dry-run` и валидацию.
2. Пилот: сгенерировать 3 изображения (`hero-home`, `gt-matovoe`, `p-kromka`), просмотреть их (инструментом чтения изображений), скорректировать `style.json` до визуально согласованного стиля (холодный светлый тон, зеленоватые блики, нет людей/текста/логотипов).
3. Полный прогон (`--concurrency 3`), контактный лист `--sheet`, повторная генерация неудачных кадров.
4. Закоммитить результаты `public/generated/`. Если баланс kie.ai закончился — зафиксировать оставшиеся id в отчёте (человек пополняет баланс; повторный запуск догенерирует только недостающие).

## Acceptance Criteria

- [ ] `pnpm tsx --env-file=.env scripts/gen-images.ts --dry-run` печатает все ≈53 промпта без обращения к API; описания проходят zod-валидацию, id уникальны.
- [ ] Реальный запуск с `--only hero-home` создаёт задачу в kie.ai, опрашивает до `success`, скачивает результат, формирует `hero-home.avif/.webp` (+ `-1280`) и запись в `manifest.json`.
- [ ] Ошибки API обрабатываются по полю `code` (HTTP всегда 200): `402` останавливает прогон, `429/5xx` — повторы с паузой, `fail` — один повтор.
- [ ] Повторный запуск без `--force` пропускает уже готовые id; манифест обновляется после каждого изображения.
- [ ] `public/generated/` содержит файлы по всем id, на которые хватило баланса; `manifest.json` валиден (id, files, alt по-русски, kind, target, размеры); отчёт перечисляет недостающие id.
- [ ] Визуальная проверка: нет людей, текста, логотипов, упаковки, документов; единый холодный светлый стиль; фоны имеют спокойную зону слева.
- [ ] Ключ `KIE_AI_API_KEY` не попадает ни в логи, ни в манифест, ни в git; `.env` не изменён.
- [ ] `pnpm typecheck` проходит (скрипты типизированы), `package.json` не изменён.

## Notes

- Модель: премиальная (кодинг). Документацию kie.ai и актуальные имена моделей смотреть через Exa/WebFetch (docs.kie.ai); при расхождении с описанием выше следовать документации.
- Затраты: ≈53 генерации × кредиты модели; перед полным запуском оценить стоимость по `--dry-run` и пилоту. Пополнение баланса — действие человека (`action-required.md`).
- Сгенерированные картинки временные: в медиатеку они попадут с `isPlaceholder: true` (задача 38); реальные фото объектов, людей, упаковки и документов остаются заглушками `.ig-ph`.
- Тяжёлые бинарники в git допустимы (оценочно 10–20 МБ); если репозиторий должен остаться лёгким — сообщить координатору (альтернатива: хранить в Git LFS или генерировать в CI).
