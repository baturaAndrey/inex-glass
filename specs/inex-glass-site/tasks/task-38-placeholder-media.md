# Task 38: Временные изображения — загрузка сгенерированных картинок в Payload и привязка к страницам

## Status

pending

## Wave

6

## Description

К этому моменту все шаблоны и сид-контент готовы, но у hero-блоков и карточек каталога (виды стекла, конструкции, обработка, хабы) нет изображений. Задача 09 уже сгенерировала через kie.ai набор фонов и **временных** иллюстраций карточек в `public/generated/` (+ `manifest.json`). Здесь они загружаются в коллекцию `media` с флагом `isPlaceholder: true` и привязываются к нужным документам, а в админке появляется быстрый фильтр «временные изображения», чтобы редакторы могли заменять их настоящими фото. Фото объектов, людей, упаковки и документов НЕ генерируются — там остаются заглушки `.ig-ph` из дизайн-системы.

## Dependencies

**Depends on:** task-09-kie-image-generator.md, task-16-blocks-render-miniseed.md (и все срезы волны 5: задачи 22–31 — сид-документы должны существовать)
**Blocks:** task-39-perf-images.md (оптимизация использует эти изображения), task-40-content-audit.md, task-42-final-acceptance.md

**Context from dependencies:**
- task-09 создал `scripts/gen-images.ts`, `scripts/image-prompts/*.json` и `public/generated/` с готовыми файлами AVIF/WebP (если генерацию ещё не запускали с ключом `KIE_AI_API_KEY` — запусти `pnpm tsx --env-file=.env scripts/gen-images.ts` ровно один раз, это платный внешний API; если файлов нет и ключ недоступен — остановись и сообщи координатору). Манифест `public/generated/manifest.json`: массив записей `{ id, file, alt (рус.), kind: 'background' | 'card-illustration', target (slug/идентификатор целевой страницы) }` — **прочитай реальный формат** перед работой и подстрой разбор. Записи с `needsRedo: true` (картинки, ожидающие перегенерации) загружать можно, но выводить их список в отчёте; после перегенерации повторный запуск должен заменить файл в `media` (сравнение по хэшу/размеру).
- task-16 создал сид-фреймворк (`src/seed/index.ts`, `src/seed/context.ts` — Payload с `context.disableRevalidate`) и заглушечные срезы, которые задачи 22–31 заполнили: документы `pages`, `thicknesses`, `glass-types`, `processing-services`, `constructions` с реальными slug. Имена полей изображений (hero, карточка) определены схемой (task-07, заморожена task-10) — **источник истины `src/payload-types.ts`**; ожидаемые поля (task-07): у `glass-types` — `heroImage`, `heroPhotos[].image`, `card.image`; у остальных коммерческих коллекций — hero/cover и/или card image (названия уточни по типам); у `pages` — поля блоков `hero`, `cards` (изображение карточки).
- Коллекция `media` (task-07): публичная, `alt` обязателен, `isPlaceholder` checkbox, sharp-размеры, `staticDir` = `MEDIA_DIR`. Админ-конфиг коллекции — единственное место, где эта задача может менять `media.ts`.

## Files to Create

- `scripts/attach-generated-media.ts` — основной скрипт (CLI: `--dry-run`, `--only=<collection>`, `--force-replace-placeholders`).
- `scripts/attach-map.ts` — таблица соответствия `target` манифеста → документ и поле (см. ниже), экспортируется как константа с тестируемой функцией `resolveTarget(entry)`.
- `scripts/report-placeholders.ts` — отчёт «где используются временные изображения» (коллекция/документ/поле/URL админки) → stdout и `docs/reports/placeholder-media.md`.
- `src/payload/admin/media/placeholder-filter-link.tsx` — серверный компонент админки (ссылка-кнопка быстрого фильтра).
- `src/payload/admin/media/placeholder-cell.tsx` — ячейка списка (бейдж «Временное»).
- `src/lib/media/attach-map.test.ts` — Vitest на `resolveTarget` и логику «не перезаписывать».

## Files to Modify

- `src/payload/collections/content/media.ts` (task-07 кладёт `media` в группу «контент») — **только ключ `admin`**: `defaultColumns` (добавить `isPlaceholder`), `components.beforeListTable` (ссылка-фильтр), `listSearchableFields` без изменений. Поля и access не менять.
- `src/app/(payload)/admin/importMap.js` — **не коммитить**: владелец генерируемых файлов волны 6 — task-35 (README). Здесь `pnpm generate:importmap` запускать только локально, для проверки; после слияния волны координатор перегенерирует файл.

НЕ трогать: поля коллекций (схема заморожена — если для изображения нет подходящего поля, остановиться и описать нехватку в отчёте), шаблоны страниц, `public/generated/*`.

## Technical Details

### Алгоритм `attach-generated-media.ts`

1. Инициализация Payload через `src/seed/context.ts` (`disableRevalidate: true`). Перед привязкой убедиться, что `MEDIA_DIR` существует и доступен на запись.
2. Прочитать `public/generated/manifest.json`. Для каждой записи выбрать файл **WebP** как исходник загрузки (если в манифесте только AVIF — загрузить AVIF; Next.js/sharp сгенерируют остальные форматы на лету, `next/image` отдаёт avif/webp по заголовку Accept).
3. Загрузка в `media` (идемпотентно): имя файла в Payload — `gen-<id>.webp`; перед созданием искать `where: { filename: { equals } }`; найдено — переиспользовать. Создание: `payload.create({ collection: 'media', data: { alt: entry.alt, isPlaceholder: true }, filePath: absolutePath, context: { disableRevalidate: true } })`. `alt` берётся из манифеста (русский, описательный, без слов «картинка/изображение», ≤ 125 символов); пустой alt — ошибка записи, пропустить и вывести в отчёт.
4. Привязка: `resolveTarget(entry)` → `{ collection, slug, field, mode: 'set' | 'append' }`. Правила:
   - **Только пустые поля.** Если поле уже содержит media с `isPlaceholder: false` (настоящее фото) — НЕ трогать никогда. Если содержит старый placeholder — заменять только с флагом `--force-replace-placeholders`.
   - Для `kind: 'background'` (hero страниц, фоны секций, тёмные акценты) — hero-поле документа; для `kind: 'card-illustration'` — изображение карточки в хабах (карточки видов стекла, конструкций, обработки, хабов каталога).
   - Для карточек на хабах, которые строятся из блока `cards` документа `pages` (а не из коллекции), нужно найти элемент блока по ссылке (`href`/slug дочерней страницы) и положить изображение в его поле image; для карточек из коллекций (glass-types и т.д.) — в поле карточки соответствующего документа.
   - Привязка делается `payload.update({ collection, id, data: { [field]: mediaId }, context: { disableRevalidate: true }, draft: false })`; для коллекций с versions — обновлять **опубликованную** версию без создания лишних черновиков (`overrideAccess: true`, `draft: false`), при необходимости `depth: 0`.
5. После привязки — инвалидация кэша: скрипт запускается вне Next-процесса, поэтому ISR-страницы не обновятся сами. Печатай в конце напоминание «выполнить revalidate» и реализуй необязательный флаг `--revalidate`, который вызывает защищённый `POST /api/revalidate/` (если такой маршрут уже создан задачей 15; если нет — не создавай, достаточно перезапуска контейнера или ожидания ISR; зафиксируй в отчёте).
6. Вывод: таблица «entry.id → media id → документ/поле → результат (attached / skipped: already has real image / skipped: no target / error)». Код выхода ≠ 0, если есть записи без цели (`no target`) или ошибки.

Минимальный набор целей (сверь с реальным манифестом, ниже — ожидание из задачи 09):

| Группа | Target | Что привязывать |
|---|---|---|
| Hero по шаблонам | главная `/`, хаб `/zakalennoe-steklo/`, карточка толщины (общий фон), вид стекла, обработка, конструкция, сервисная, статья, объекты | `background` → hero-поле документа/шаблона; для общих шаблонных фонов (например, «все толщины») — каждому документу коллекции с пустым hero |
| Карточки видов стекла (8) | `glass-types`: matovoe, okrashennoe, osvetlennoe, tonirovannoe, dlya-mebeli, riflenoe, mollirovannoe, tripleks | `card-illustration` → поле карточки/первый элемент `heroImages` |
| Карточки конструкций (7 + 5 остекление + 3 зеркала) | `constructions` | `card-illustration` |
| Карточки обработки (6) | `processing-services`: kromka, otverstiya-i-vyrezy, facet, matirovanie, plenki, pechat | `card-illustration` |
| Карточки хабов | `pages`: хабы каталога/услуг/конструкций | элементы блока `cards` |
| Фоны секций и акцентные тёмные блоки | блоки `cta`/`hero`/`stats` в `pages` | `background` → поле фона блока, если оно есть |

Соответствие `target` манифеста → (collection, slug, field) вынеси в `scripts/attach-map.ts` в виде явной таблицы, а не шаблонных догадок. Если для `target` поле в схеме не нашлось — `no target`, и это попадает в отчёт для координатора (возможна отдельная задача на изменение схемы).

### Админка: быстрый фильтр «временные изображения»

- В `media` уже есть чекбокс `isPlaceholder` — стандартный фильтр Payload по нему работает. Добавь удобство: компонент `placeholder-filter-link.tsx` в `admin.components.beforeListTable` рендерит блок над списком: кнопка-ссылка «Временные изображения» → `/admin/collections/media?where[isPlaceholder][equals]=true` (обычный `<a>`, не `<Link>`; сверить синтаксис query-параметров `where` текущей версии Payload 3.91 и trailingSlash: `/admin/collections/media/?where[...]`), и «Все изображения» → без фильтра; счётчик временных (`payload.count({ collection:'media', where:{ isPlaceholder:{ equals:true } } })`).
- `placeholder-cell.tsx` (колонка `isPlaceholder`): бейдж «Временное» (стили админки Payload, не дизайн-система сайта).
- `defaultColumns`: `['filename', 'alt', 'isPlaceholder', 'updatedAt']`.
- Подсказка в `admin.description` у media не менять (не схема), но в отчёте дать редакторам инструкцию замены: открыть документ → заменить изображение в поле → старое временное изображение останется в библиотеке с меткой; после замены удалить его из медиатеки.
- Команда `pnpm generate:importmap` после добавления компонентов; закоммитить обновлённый `importMap.js`.

### Отчёт использования (`report-placeholders.ts`)

Обходит все коллекции/глобалы со ссылками на media (определи по `payload-types.ts`: поля `type: upload`), собирает, где используется media с `isPlaceholder: true`; формирует `docs/reports/placeholder-media.md` — таблица: коллекция | документ (ссылка `/admin/collections/<c>/<id>/`) | поле | media filename. Используется редакторами и на этапе приёмки (в релиз-ноутсах: сколько временных изображений осталось).

### Правила и ограничения

- Не генерировать и не загружать фото объектов портфолио, сотрудников, упаковки, документов.
- Изображения-плейсхолдеры не должны попадать в `og:image` у страниц объектов/статей (там изображение берётся из реальных полей); для остальных страниц допускается — это временная мера.
- Лицензионная/AI-пометка: в `alt` не упоминать «сгенерировано»; признак — только `isPlaceholder`.
- Размер: каждая загрузка ≤ 2 МБ (сжатый WebP из task-09); при превышении — пересжать через sharp (quality 80) перед загрузкой.
- Скрипт запускается и на dev/staging, и в `tools`-контейнере на prod (volume `/data/media` должен быть примонтирован — иначе файлы окажутся не там, где их ожидает приложение).

### Тесты

- Vitest: `resolveTarget` (известный target → корректное поле; неизвестный → `no target`), логика «не перезаписывать настоящее изображение» (функция `canAttach(existing, force)`).
- Ручной прогон `--dry-run` на сидовых данных: список привязок без записи; затем реальный прогон; повторный прогон даёт 0 новых загрузок и 0 изменений (идемпотентность).
- Playwright (в `e2e/`, добавить кейс в существующий smoke или `e2e/placeholder-media.spec.ts`): на `/zakalennoe-steklo/` и `/zakalennoe-steklo/matovoe/` hero и карточки показывают изображения (`img[src*="/_next/image"]` с `naturalWidth > 0`), у всех `img` непустой `alt`.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` проходят.
- [ ] Все файлы из `manifest.json` загружены в `media` (`isPlaceholder = true`, русский `alt`), повторный запуск ничего не дублирует.
- [ ] Каждый `target` манифеста привязан к документу и полю либо явно перечислен как `no target` в отчёте (должно быть 0 для hero и карточек каталога из таблицы выше).
- [ ] Настоящие изображения (`isPlaceholder = false`) никогда не перезаписываются; без `--force-replace-placeholders` существующие плейсхолдеры тоже не заменяются.
- [ ] На страницах хабов, видов стекла, конструкций, обработки и главной hero и карточки отображаются (проверено на 375/1366/1920), нет битых `img`, у всех `alt`.
- [ ] В админке `/admin/collections/media/` есть кнопка «Временные изображения» с рабочим фильтром и счётчиком, колонка/бейдж «Временное»; `importMap.js` обновлён.
- [ ] `docs/reports/placeholder-media.md` сформирован скриптом `report-placeholders.ts`.
- [ ] Схема Payload не изменена (изменён только ключ `admin` коллекции `media`); миграции не создавались.

## Notes

- Mid-tier или премиум-модель; логика несложная, но много сопоставлений — важна дисциплина «не перезаписывать».
- Генерация изображений платная (kie.ai): не запускай `gen-images.ts` повторно без необходимости; если манифеста нет — сначала сообщи.
- Редакторы должны знать: временные картинки — часть релиза, их замена — отдельная контент-работа (в финальном отчёте приёмки вывести количество оставшихся).
