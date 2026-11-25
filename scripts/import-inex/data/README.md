# Данные импорта объектов портфолио

Спека: `specs/portfolio-objects-import/` (контракты данных — в её `README.md`).

## `objects-manifest.json`

Сводный список объектов для импорта (43): страницы inex.su одного реального объекта, объединённые в одну карточку,
плюс объекты только из `res/Объекты`. На каждый объект: `slug`, `batch` (`a`/`b` — пакет для авторов контента),
`name`, `city`, `yearHint`, `legacyUrls`, `categories`, `productHints`, `objectTypeHint`, строка xlsx (`xlsx`),
исходные тексты (`sourceTexts`), фото со стеклом без дублей по sha1 (`photos`, первое — обложка, `coverKey`),
`featuredDefault` и `notes` (что угадано или требует проверки).

Файл генерируется, руками не правится:

```bash
pnpm tsx scripts/import-inex/build-manifest.ts           # записать манифест и контактные листы
pnpm tsx scripts/import-inex/build-manifest.ts --check   # exit 1, если закоммиченный манифест устарел
```

Входы: `specs/portfolio-objects-import/research/*.json`, кэш Firecrawl `scripts/.cache/firecrawl/`, фото
`scripts/.import-tmp/photos/`, папка `res/Объекты` с `Объекты.xlsx`, CSV `docs/inex/12-migration-inex-su.csv`.
Состав задаётся списком `GROUP_KEYS` и `USER_ONLY` в `build-manifest.ts`.

Контактные листы для авторов контента: `scripts/.import-tmp/sheets/<slug>-NN.jpg` (до 12 фото, на каждом короткий
ключ — начало sha1) и `<slug>-NN.json` (массив в порядке листа: `index`, `label` — короткий ключ, полный `key`, файл, размеры, источник). Пересоздаются при
каждой сборке, в git не попадают.

## `content/<slug>.json`

Контент карточки объекта (контракт `ObjectContent`): `slug`, `name`, `city`, `objectType`, `year`, `products`,
`task`, `spec`, `chips`, `photos` (`key` из манифеста + `alt`), `featured`, `related`, `notes`.

Проверка (без Payload и БД):

```bash
pnpm tsx scripts/import-inex/validate-content.ts [--slug=<slug>] [--content=<dir>] [--manifest=<file>]
```

Ошибки — exit 1. Правила текста: ТЗ §11, стоп-слова сайта и строже для карточек — никаких слов о монтаже, установке,
бригаде, замере, «под ключ», «в своём цехе».
