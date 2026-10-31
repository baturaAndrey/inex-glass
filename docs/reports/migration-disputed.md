# Карта редиректов inex.su → Inex Glass: исправления и спорные URL

Сформировано скриптом `scripts/import-inex/fix-csv.ts` (2026-10-21).
Исходник — `docs/inex/12-migration-inex-su.csv`, результат — `docs/inex/12-migration-inex-su.fixed.csv`
(колонки `old_url;new_url;action;note;rule`, порядок строк как в исходнике, UTF-8 с BOM).
Правила — `src/lib/migration/rules.ts` (R0–R7), тесты — `src/lib/migration/rules.test.ts`.

## Итоги (числа)

| Показатель | Исходный CSV | Исправленный CSV |
|---|---:|---:|
| Всего строк | 446 | 446 |
| 301 | 283 | 231 |
| stay | 163 | 215 |
| Объекты портфолио → `/obekty/<slug>/` (R5) | — | 162 |
| Уникальных страниц объектов (после слияния дублей) | — | 162 |
| Объекты, не импортированные с inex.su (R7) | — | 6 |
| Страниц объектов разобрано из кэша Firecrawl | — | 162 из 168 |
| Спорных строк (флаг disputed) | — | 17 |

Ожидание задачи: 301 = 231, stay = 215 (168 объектов + 20 категорий + 3 пагинации + 39 `/produkciya/*` + `/materialy/steklo`). Совпадает.

## Изменения относительно исходного CSV по правилам

| Правило | Что делает | Строк | Из них изменено |
|---|---|---:|---:|
| R0 | stay — без изменений | 163 | 0 |
| R1 | лестницы → stay | 42 | 42 |
| R2 | отделка интерьера → stay | 10 | 10 |
| R3 | категории портфолио → /obekty/ | 20 | 15 |
| R4 | старая пагинация → /obekty/ | 3 | 3 |
| R5 | объекты → /obekty/<slug>/ | 162 | 5 |
| R6 | /produkciya/*, /materialy/steklo — без изменений | 40 | 0 |
| R7 | объект не импортирован → /obekty/ | 6 | 6 |

**R1** — примеры:

- `/portfolio/lestnicy`: `/obekty/lestnicy/` (301) → `—` (stay)
- `/portfolio/lestnicy/betonnye`: `/obekty/betonnye/` (301) → `—` (stay)
- `/portfolio/lestnicy/betonnye/kottedzh-32-beton`: `/obekty/kottedzh-32-beton/` (301) → `—` (stay)
- `/portfolio/lestnicy/betonnye/kottedzh-33-beton-spiral`: `/obekty/kottedzh-33-beton-spiral/` (301) → `—` (stay)
- `/portfolio/lestnicy/betonnye/kottedzh-34-beton-ulica`: `/obekty/kottedzh-34-beton-ulica/` (301) → `—` (stay)

**R2** — примеры:

- `/portfolio/otdelka-interera`: `/obekty/otdelka-interera/` (301) → `—` (stay)
- `/portfolio/otdelka-interera/2`: `/obekty/2/` (301) → `—` (stay)
- `/portfolio/otdelka-interera/energosbyt-chelyabinsk-steklo`: `/obekty/energosbyt-chelyabinsk-steklo/` (301) → `—` (stay)
- `/portfolio/otdelka-interera/kvartira-2`: `/obekty/kvartira-2/` (301) → `—` (stay)
- `/portfolio/otdelka-interera/oblizovka-cteklom`: `/obekty/oblizovka-cteklom/` (301) → `—` (stay)

**R3** — примеры:

- `/portfolio/dushevye`: `/obekty/dushevye/` (301) → `/obekty/` (301)
- `/portfolio/dushevye/pryamye`: `/obekty/pryamye/` (301) → `/obekty/` (301)
- `/portfolio/dushevye/trepecevidnye`: `/obekty/trepecevidnye/` (301) → `/obekty/` (301)
- `/portfolio/dushevye/uglovye`: `/obekty/uglovye/` (301) → `/obekty/` (301)
- `/portfolio/fasady`: `/obekty/fasady/` (301) → `/obekty/` (301)

**R4** — примеры:

- `/portfolio/peregorodki/celnosteklyannye/2`: `/obekty/2/` (301) → `/obekty/` (301)
- `/portfolio/peregorodki/celnosteklyannye/3`: `/obekty/3/` (301) → `/obekty/` (301)
- `/portfolio/peregorodki/celnosteklyannye/4`: `/obekty/4/` (301) → `/obekty/` (301)

**R5** — примеры:

- `/portfolio/kozyrki/Steklyannyy-kozyrek`: `/obekty/Steklyannyy-kozyrek/` (301) → `/obekty/steklyannyy-kozyrek/` (301)
- `/portfolio/ograzhdeniya/atriumnye/kolоnna-08`: `/obekty/kolоnna-08/` (301) → `/obekty/kolonna-08/` (301)
- `/portfolio/peregorodki/celnosteklyannye/restostar`: `/obekty/restostar/` (301) → `/obekty/restostar-peregorodki/` (301)
- `/portfolio/peregorodki/celnosteklyannye/tk-kolco`: `/obekty/tk-kolco/` (301) → `/obekty/tk-kolco-peregorodki/` (301)
- `/portfolio/peregorodki/v-aluminievom-profile/Peregorodka-01`: `/obekty/Peregorodka-01/` (301) → `/obekty/peregorodka-01/` (301)

**R7** — примеры:

- `/portfolio/peregorodki/celnosteklyannye/kottedzh-10-sauna`: `/obekty/kottedzh-10-sauna/` (301) → `/obekty/` (301)
- `/portfolio/peregorodki/celnosteklyannye/stroimehanizaciya`: `/obekty/stroimehanizaciya/` (301) → `/obekty/` (301)
- `/portfolio/zerkala/zerkalo-na-manetah`: `/obekty/zerkalo-na-manetah/` (301) → `/obekty/` (301)
- `/portfolio/zerkala/zerkalo-panno-figurnoe`: `/obekty/zerkalo-panno-figurnoe/` (301) → `/obekty/` (301)
- `/portfolio/zerkala/zerkalo-panno-romby`: `/obekty/zerkalo-panno-romby/` (301) → `/obekty/` (301)

Все изменения `new_url` у объектов (R5): регистр, кириллица, коллизии, slug из импорта:

| old_url | было | стало |
|---|---|---|
| `/portfolio/kozyrki/Steklyannyy-kozyrek` | `/obekty/Steklyannyy-kozyrek/` | `/obekty/steklyannyy-kozyrek/` |
| `/portfolio/ograzhdeniya/atriumnye/kolоnna-08` | `/obekty/kolоnna-08/` | `/obekty/kolonna-08/` |
| `/portfolio/peregorodki/celnosteklyannye/restostar` | `/obekty/restostar/` | `/obekty/restostar-peregorodki/` |
| `/portfolio/peregorodki/celnosteklyannye/tk-kolco` | `/obekty/tk-kolco/` | `/obekty/tk-kolco-peregorodki/` |
| `/portfolio/peregorodki/v-aluminievom-profile/Peregorodka-01` | `/obekty/Peregorodka-01/` | `/obekty/peregorodka-01/` |

## Спорные URL — нужно решение Inex

### 1. Отделка интерьера (8 объектов)

По умолчанию **остаются на inex.su** (`stay`): ТЗ §9 и `12-migration-inex-su.md` — «отделка остаётся». Часть объектов по названию может быть стеклянной.

| URL | Решение по умолчанию | Вопрос |
|---|---|---|
| `/portfolio/otdelka-interera/energosbyt-chelyabinsk-steklo` | stay | Это стеклянная конструкция (energosbyt-chelyabinsk-steklo)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/kvartira-2` | stay | Это стеклянная конструкция (kvartira-2)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/oblizovka-cteklom` | stay | Это стеклянная конструкция (oblizovka-cteklom)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/peregorodka-01` | stay | Это стеклянная конструкция (peregorodka-01)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/truboprovod` | stay | Это стеклянная конструкция (truboprovod)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/vip-studiya` | stay | Это стеклянная конструкция (vip-studiya)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/vitrag-01` | stay | Это стеклянная конструкция (vitrag-01)? Если да — перенести на /obekty/ (нужен импорт страницы). |
| `/portfolio/otdelka-interera/vitrag-02` | stay | Это стеклянная конструкция (vitrag-02)? Если да — перенести на /obekty/ (нужен импорт страницы). |

### 2. Двери внутри цельностеклянных перегородок (3)

Двери остаются на inex.su, но эти объекты лежат в разделе перегородок. По умолчанию **301 на /obekty/** (маятниковые цельностеклянные двери в перегородках — стеклянная конструкция).

| URL | Решение по умолчанию | Вопрос |
|---|---|---|
| `/portfolio/peregorodki/celnosteklyannye/dveri-08` | 301 → `/obekty/dveri-08/` | Переносить на Inex Glass или оставить на inex.su (двери)? |
| `/portfolio/peregorodki/celnosteklyannye/dveri-mayatnik-01` | 301 → `/obekty/dveri-mayatnik-01/` | Переносить на Inex Glass или оставить на inex.su (двери)? |
| `/portfolio/peregorodki/celnosteklyannye/linda-dver` | 301 → `/obekty/linda-dver/` | Переносить на Inex Glass или оставить на inex.su (двери)? |

### 3. Лестничные ограждения (31 URL: категория + объекты) — подтвердить группой

Стеклянные перила на лестницах — товар Inex Glass, по умолчанию **301** (категория → `/obekty/`, объекты → `/obekty/<slug>/`). Сами лестницы остаются на inex.su (R1). Вопрос к Inex: подтвердить перенос всей группы.

### 4. Объекты, похожие на продукцию, которая остаётся на inex.su

| URL | Решение по умолчанию | Вопрос |
|---|---|---|
| `/portfolio/ograzhdeniya/lestnichnye/kolonna-07` | 301 → `/obekty/kolonna-07/` | Колонны остаются на inex.su — это стеклянная конструкция или колонна? |
| `/portfolio/ograzhdeniya/lestnichnye/kottedzh-3-grande-forge` | 301 → `/obekty/kottedzh-3-grande-forge/` | Ограждения Grand Forge остаются на inex.su (решение 30.09) — переносить объект? |
| `/portfolio/peregorodki/celnosteklyannye/dushevaya-pryamaya-01` | 301 → `/obekty/dushevaya-pryamaya-01/` | Душевая в разделе цельностеклянных перегородок — оставить в портфолио? |
| `/portfolio/peregorodki/celnosteklyannye/surgutneftegaz-pozharnye` | 301 → `/obekty/surgutneftegaz-pozharnye/` | Пожарные преграды остаются на inex.su — переносить объект? |
| `/portfolio/peregorodki/v-aluminievom-profile/kolonna-04` | 301 → `/obekty/kolonna-04/` | Колонны остаются на inex.su — это стеклянная конструкция или колонна? |
| `/portfolio/peregorodki/v-aluminievom-profile/sberbank-ishim-pozharnye` | 301 → `/obekty/sberbank-ishim-pozharnye/` | Пожарные преграды остаются на inex.su — переносить объект? |

### 5. Коллизии slug объектов (R5)

Два старых URL с одинаковым последним сегментом. Если название и ≥ 50 % фото совпадают — один объект (оба URL в `legacyUrls`), иначе второму добавлен суффикс категории.

| URL | Решение | Вопрос |
|---|---|---|
| `/portfolio/peregorodki/celnosteklyannye/restostar` | 301 → `/obekty/restostar-peregorodki/` (коллизия slug — добавлен суффикс категории (пара: /portfolio/ograzhdeniya/lestnichnye/restostar)) | Это один и тот же объект или разные? Если разные — устраивает ли имя с суффиксом категории? |
| `/portfolio/peregorodki/celnosteklyannye/tk-kolco` | 301 → `/obekty/tk-kolco-peregorodki/` (коллизия slug — добавлен суффикс категории (пара: /portfolio/ograzhdeniya/lestnichnye/tk-kolco)) | Это один и тот же объект или разные? Если разные — устраивает ли имя с суффиксом категории? |

Коллизий: 2 (первый URL пары сохраняет slug без суффикса).

### 6. Объекты, которые не удалось импортировать (R7): 6

| URL | Решение по умолчанию | Причина |
|---|---|---|
| `/portfolio/peregorodki/celnosteklyannye/kottedzh-10-sauna` | 301 → `/obekty/` | statusCode 404 |
| `/portfolio/peregorodki/celnosteklyannye/stroimehanizaciya` | 301 → `/obekty/` | statusCode 404 |
| `/portfolio/zerkala/zerkalo-na-manetah` | 301 → `/obekty/` | statusCode 404 |
| `/portfolio/zerkala/zerkalo-panno-figurnoe` | 301 → `/obekty/` | statusCode 404 |
| `/portfolio/zerkala/zerkalo-panno-romby` | 301 → `/obekty/` | statusCode 404 |
| `/portfolio/zerkala/zerkalo-panno-romby-bez-fazeta` | 301 → `/obekty/` | statusCode 404 |

### 7. Зеркала с подсветкой — расхождение с сайтом

| URL | Решение по умолчанию | Вопрос |
|---|---|---|
| `/produkciya/zerkala/zerkala-s-podsvetkoi` | stay (решение 30.09: «зеркала с подсветкой остаются на inex.su») | Страница `/zerkala/dlya-salonov/` нового сайта (task 27, тексты teksty дословно) предлагает «зеркала с LED-подсветкой». Либо убрать LED из текста Inex Glass, либо перенести раздел с inex.su (тогда 301 → `/zerkala/dlya-salonov/`). Решение — за Inex. |

## Допустимые дубли целей (many→one)

Несколько старых URL ведут на одну новую страницу — допустимо для разделов, категорий и листинга. Для объектов — только если это один и тот же объект (см. коллизии).

| new_url | Старых URL | Примеры |
|---|---:|---|
| `/obekty/` | 29 | `/portfolio/dushevye`, `/portfolio/dushevye/pryamye`, `/portfolio/dushevye/trepecevidnye`, … |
| `/dushevye-peregorodki/` | 22 | `/produkciya/dushevye`, `/produkciya/dushevye/p-obraznaya-s-raspashnoi-dveryu-dopolnitelnymi-sekciyami-na-shtange`, `/produkciya/dushevye/p-obraznaya-s-raspashnoi-dveryu-na-shtange`, … |
| `/steklyannye-ograzhdeniya/` | 6 | `/produkciya/ograzhdeniya`, `/produkciya/ograzhdeniya/atriumnye`, `/produkciya/ograzhdeniya/balkonnye`, … |
| `/osteklenie/verand-terras-besedok/` | 4 | `/produkciya/osteklenie`, `/produkciya/osteklenie/osteklenie-besedki`, `/produkciya/osteklenie/osteklenie-terrasy`, … |
| `/steklyannye-peregorodki/` | 3 | `/produkciya/peregorodki`, `/produkciya/peregorodki/celnosteklyannye`, `/produkciya/peregorodki/v-aluminievom-profile` |
| `/zakalennoe-steklo/` | 2 | `/materialy/steklo`, `/produkciya/steklo-proizvodstvo` |

## Технические замечания для администратора inex.su

1. **301 включать только после публикации** соответствующих страниц Inex Glass и их индексации (ТЗ §9, порядок переезда). Объекты импортированы **черновиками**: пока объект не опубликован, его `/obekty/<slug>/` отдаёт 404 — редирект на него включать нельзя. Строки с `rule=R5` включать постранично, по мере публикации.
2. **Регистр.** `old_url` в CSV записаны в точности как на inex.su. Строки с заглавными буквами в старом адресе: `/portfolio/kozyrki/Steklyannyy-kozyrek` (301), `/portfolio/peregorodki/santehnicheskie/Peregorodka-02` (stay), `/portfolio/peregorodki/skladnye/peregorodkaSDT150` (stay), `/portfolio/peregorodki/v-aluminievom-profile/Peregorodka-01` (301). Сравнение путей на inex.su должно быть регистрозависимым ровно для этих адресов (или правило писать для обоих вариантов). `new_url` всегда в нижнем регистре.
3. **Кириллическая «о» в адресе.** `/portfolio/kolonny/kolоnna-09` (stay) — в запросе приходит как `/portfolio/kolonny/kol%D0%BEnna-09`; `/portfolio/ograzhdeniya/atriumnye/kolоnna-08` (301) — в запросе приходит как `/portfolio/ograzhdeniya/atriumnye/kol%D0%BEnna-08`. Правило редиректа нужно для percent-encoded варианта (он же указан в колонке `note`).
4. **Слеш на конце.** inex.su отдаёт страницы и со слешем, и без; правило должно ловить оба варианта (`^/path/?$`). Цели Inex Glass — всегда со слешем (`trailingSlash: true`), без цепочек.
5. **Каталог душевых** (конфигураций: 21, `/produkciya/dushevye/*`) ведёт на один раздел `/dushevye-peregorodki/`: карточки конфигураций на новом сайте — внутри раздела, отдельных страниц нет.
6. Домен цели — `https://inexglass.ru` (production). Колонка `rule` служебная — для аудита, в конфигурацию сервера не переносится.

