# SEO-аудит по URL

Генерируется `pnpm audit:seo` (`scripts/audit/seo.ts`, task 40). Только чтение: найденные ошибки — фикс-лист для координатора, тексты и шаблоны скрипт не меняет.

- Запуск: 21.10.2026, 18:03
- Стенд: http://localhost:3100 (SITE_URL для canonical: http://localhost:3100); режим: **production**
- Цены: http://localhost:3100/api/globals/prices (дата цен 2026-10-15)
- sitemap.xml: HTTP 200, URL: 64
- Проверено URL: 72; реестр 17-meta: 69 URL (63 строк таблиц), отвечают 200: 69
- Итого: **error 0**, warn 57, info 1

## Матрица «URL × проверки»

✓ — ок, ✗ — error, ! — warn, — — не применимо / не проверялось.

| URL | HTTP | TTFB, мс | url | h1 | title | description | robots | canonical | breadcrumbs | jsonld | og | images | structure |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| / | 200 | 96 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /blog/ | 200 | 76 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | 200 | 33 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/kak-snyat-razmery-dlya-stekla/ | 200 | 27 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/kak-vybrat-tolshchinu-stekla/ | 200 | 50 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/markirovka-zakalennogo-stekla/ | 200 | 30 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/mozhno-li-rezat-zakalennoe-steklo/ | 200 | 51 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | 200 | 52 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ! | ✓ |
| /dushevye-peregorodki/ | 200 | 81 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /furnitura/ | 200 | 121 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /instrumenty/kalkulyator-vesa-stekla/ | 200 | 24 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/ | 200 | 30 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/dokumenty/ | 200 | 56 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/dopuski-i-gost/ | 200 | 31 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/kontrol-kachestva/ | 200 | 28 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/oplata/ | 200 | 72 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/priemka/ | 200 | 67 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/sroki/ | 200 | 27 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/trebovaniya-k-chertezham/ | 200 | 57 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kak-zakazat/upakovka-i-dostavka/ | 200 | 31 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /klientam/ | 200 | 23 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /klientam/dizajneram-i-arhitektoram/ | 200 | 26 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /klientam/podryadchikam/ | 200 | 24 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /klientam/proizvoditelyam-mebeli/ | 200 | 17 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /klientam/zastrojshchikam/ | 200 | 29 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /kontakty/ | 200 | 30 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /o-kompanii/ | 200 | 100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /o-kompanii/sotrudniki/ | 200 | 75 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obekty/ | 200 | 51 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/ | 200 | 74 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/facet/ | 200 | 85 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/kromka/ | 200 | 48 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/matirovanie/ | 200 | 123 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/otverstiya-i-vyrezy/ | 200 | 37 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/pechat/ | 200 | 34 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /obrabotka-stekla/plenki/ | 200 | 68 | ✓ | ✓ | ! | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/ | 200 | 72 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/fasadov/ | 200 | 48 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/liftovyh-shaht/ | 200 | 80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/spajdernoe/ | 200 | 25 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/verand-terras-besedok/ | 200 | 97 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /osteklenie/vitrin-i-magazinov/ | 200 | 102 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /poisk/?q=стекло | 200 | 56 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /politika-konfidencialnosti/ | 200 | 21 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /proektirovanie/ | 200 | 28 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /raschet-stoimosti/ | 200 | 43 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /soglasie-na-obrabotku-personalnyh-dannyh/ | 200 | 24 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /steklyannye-konstrukcii/ | 200 | 87 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /steklyannye-kozyrki/ | 200 | 54 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /steklyannye-ograzhdeniya/ | 200 | 105 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /steklyannye-peregorodki/ | 200 | 125 | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /torgovye-vitriny/ | 200 | 80 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /tripleks/ | 200 | 99 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/ | 200 | 98 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/10-mm/ | 200 | 66 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/12-mm/ | 200 | 78 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/15-mm/ | 200 | 95 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/19-mm/ | 200 | 40 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/4-mm/ | 200 | 90 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/5-mm/ | 200 | 90 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/6-mm/ | 200 | 61 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/8-mm/ | 200 | 68 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/dlya-mebeli/ | 200 | 33 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/matovoe/ | 200 | 43 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/mollirovannoe/ | 200 | 32 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/okrashennoe/ | 200 | 117 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/osvetlennoe/ | 200 | 46 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/riflenoe/ | 200 | 39 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zakalennoe-steklo/tonirovannoe/ | 200 | 116 | ✓ | ✓ | ! | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zerkala/ | 200 | 50 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zerkala/dlya-salonov/ | 200 | 26 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| /zerkala/dlya-zalov/ | 200 | 25 | ✓ | ✓ | ✓ | ! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Ошибки

_нет_

## Расхождения с 17-meta («ожидалось / фактически»)

_нет_

## Редиректы (выборка)

Next при `trailingSlash: true` отвечает **308** на URL без слеша; Яндекс и Google трактуют 308 как постоянный редирект (аналог 301), поэтому допустимы оба кода. Верхний регистр → 301 (`src/proxy.ts`).

| Запрос | Код | Location | OK |
|---|---|---|---|
| /zakalennoe-steklo | 308 | http://localhost:3100/zakalennoe-steklo/ | ✓ |
| /Zakalennoe-Steklo/ | 301 | http://localhost:3100/zakalennoe-steklo/ | ✓ |
| /zakalennoe-steklo/10-mm | 308 | http://localhost:3100/zakalennoe-steklo/10-mm/ | ✓ |
| /Zakalennoe-Steklo/10-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/10-mm/ | ✓ |
| /zakalennoe-steklo/12-mm | 308 | http://localhost:3100/zakalennoe-steklo/12-mm/ | ✓ |
| /Zakalennoe-Steklo/12-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/12-mm/ | ✓ |
| /zakalennoe-steklo/15-mm | 308 | http://localhost:3100/zakalennoe-steklo/15-mm/ | ✓ |
| /Zakalennoe-Steklo/15-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/15-mm/ | ✓ |
| /zakalennoe-steklo/19-mm | 308 | http://localhost:3100/zakalennoe-steklo/19-mm/ | ✓ |
| /Zakalennoe-Steklo/19-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/19-mm/ | ✓ |
| /zakalennoe-steklo/4-mm | 308 | http://localhost:3100/zakalennoe-steklo/4-mm/ | ✓ |
| /Zakalennoe-Steklo/4-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/4-mm/ | ✓ |
| /zakalennoe-steklo/5-mm | 308 | http://localhost:3100/zakalennoe-steklo/5-mm/ | ✓ |
| /Zakalennoe-Steklo/5-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/5-mm/ | ✓ |
| /zakalennoe-steklo/6-mm | 308 | http://localhost:3100/zakalennoe-steklo/6-mm/ | ✓ |
| /Zakalennoe-Steklo/6-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/6-mm/ | ✓ |
| /zakalennoe-steklo/8-mm | 308 | http://localhost:3100/zakalennoe-steklo/8-mm/ | ✓ |
| /Zakalennoe-Steklo/8-Mm/ | 301 | http://localhost:3100/zakalennoe-steklo/8-mm/ | ✓ |
| /zakalennoe-steklo/matovoe | 308 | http://localhost:3100/zakalennoe-steklo/matovoe/ | ✓ |
| /Zakalennoe-Steklo/Matovoe/ | 301 | http://localhost:3100/zakalennoe-steklo/matovoe/ | ✓ |
| /zakalennoe-steklo/riflenoe | 308 | http://localhost:3100/zakalennoe-steklo/riflenoe/ | ✓ |
| /Zakalennoe-Steklo/Riflenoe/ | 301 | http://localhost:3100/zakalennoe-steklo/riflenoe/ | ✓ |
| /zakalennoe-steklo/tonirovannoe | 308 | http://localhost:3100/zakalennoe-steklo/tonirovannoe/ | ✓ |
| /Zakalennoe-Steklo/Tonirovannoe/ | 301 | http://localhost:3100/zakalennoe-steklo/tonirovannoe/ | ✓ |

## Пагинация, фильтры, 404

| URL | HTTP | robots | Результат |
|---|---|---|---|
| /obekty/page/2/ | 404 | — | страницы 2 нет (мало записей) — не проверялось |
| /blog/page/2/ | 404 | — | страницы 2 нет (мало записей) — не проверялось |

| URL | HTTP | robots | canonical | OK |
|---|---|---|---|---|
| /obekty/?product=x | 200 | noindex, follow | http://localhost:3100/obekty/ | ✓ |

- `/net-takoj-stranicy/` → HTTP 404
- `/o-kompanii/sotrudniki/`: коллекция team пуста → ожидается noindex

## Покрытие sitemap ↔ 17-meta

URL из sitemap, которых нет в 17-meta:

_нет_

Индексируемые URL 17-meta, отсутствующие в sitemap: /obekty/

## Ссылки

Внутренних уникальных путей проверено: 70; битых: 0.

_нет_

## Скорость ответа (TTFB, прокси)

Медиана 52 мс, максимум 125 мс; порог warn — 600 мс (имеет смысл только на `next start`).

## Предупреждения

| Severity | URL / документ | Поле | Правило | Сообщение | Фрагмент |
|---|---|---|---|---|---|
| warn | /blog/ | description | description | description 102 знаков (норма 120–160) | Допуски, толщина, триплекс, маркировка — практические ответы для тех, кто заказывает стекло на объект. |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-snyat-razmery-dlya-stekla/ | description | description | description 116 знаков (норма 120–160) | Когда мерить, чем мерить, какие зазоры заложить и как отрисовать сложный проём — чтобы стекло встало с первого раза. |
| warn | /blog/kak-snyat-razmery-dlya-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-snyat-razmery-dlya-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-snyat-razmery-dlya-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-vybrat-tolshchinu-stekla/ | description | description | description 114 знаков (норма 120–160) | От чего зависит толщина: размер, крепление, нагрузка, безопасность. Почему её подбирают расчётом, а не по таблице. |
| warn | /blog/kak-vybrat-tolshchinu-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-vybrat-tolshchinu-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/kak-vybrat-tolshchinu-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/markirovka-zakalennogo-stekla/ | description | description | description 98 знаков (норма 120–160) | Что значит М1 и 4М1 в формуле, марки листового стекла М0–М7 и как найти клеймо закалённого стекла. |
| warn | /blog/markirovka-zakalennogo-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/markirovka-zakalennogo-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/markirovka-zakalennogo-stekla/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/mozhno-li-rezat-zakalennoe-steklo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/mozhno-li-rezat-zakalennoe-steklo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/mozhno-li-rezat-zakalennoe-steklo/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | description | description | description 113 знаков (норма 120–160) | Как ведёт себя стекло при разрушении, какие нагрузки задаёт проект и когда однослойного закалённого недостаточно. |
| warn | /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | images | images | alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation" |  |
| warn | /dushevye-peregorodki/ | description | description | description 113 знаков (норма 120–160) | Душевые перегородки партиями для гостиниц, фитнес-клубов и арен: одинаковые конфигурации, фурнитура одной партии. |
| warn | /instrumenty/kalkulyator-vesa-stekla/ | description | description | description 118 знаков (норма 120–160) | Вес стекла: 2,5 кг на м² на каждый миллиметр толщины. Калькулятор для одинарного стекла и триплекса + таблица 4–19 мм. |
| warn | /kak-zakazat/dopuski-i-gost/ | description | description | description 117 знаков (норма 120–160) | ±2 мм до 2000 мм, отверстие не ближе двух толщин стекла к кромке и шести — к углу. Таблицы и калькулятор для чертежа. |
| warn | /kak-zakazat/kontrol-kachestva/ | description | description | description 119 знаков (норма 120–160) | Как выбираем заводы, проверяем импортное стекло, согласуем спецификацию и фотографируем стекло при погрузке и отгрузке. |
| warn | /kak-zakazat/priemka/ | description | description | description 111 знаков (норма 120–160) | Что проверить до подписания накладной, как осматривают стекло по ГОСТ и что делать, если нашли скол или ошибку. |
| warn | /klientam/ | description | description | description 106 знаков (норма 120–160) | Как мы работаем с подрядчиками, производителями мебели, застройщиками и дизайнерами — и что берём на себя. |
| warn | /klientam/dizajneram-i-arhitektoram/ | description | description | description 104 знаков (норма 120–160) | Цвета по RAL, матирование, печать, гнутое и осветлённое стекло. Поможем превратить эскиз в рабочие узлы. |
| warn | /klientam/podryadchikam/ | description | description | description 115 знаков (норма 120–160) | Спецификация на согласование, отверстия по ГОСТ, обрешётка в дорогу и срок от даты договора. Монтаж — ваша бригада. |
| warn | /klientam/proizvoditelyam-mebeli/ | description | description | description 105 знаков (норма 120–160) | Фасады и столешницы серией: повторяемый оттенок, кромка и отверстия под фурнитуру, без клейма по запросу. |
| warn | /o-kompanii/sotrudniki/ | description | description | description 102 знаков (норма 120–160) | Кто ведёт ваш заказ: конструкторы, которые проверяют чертежи, и менеджеры, которые сообщают о статусе. |
| warn | /obekty/ | description | description | description 103 знаков (норма 120–160) | 1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту. |
| warn | /obrabotka-stekla/kromka/ | description | description | description 112 знаков (норма 120–160) | Шлифованная, полированная, «трапеция» и «еврокромка». Какую кромку выбрать для профиля, видимого торца и мебели. |
| warn | /obrabotka-stekla/matirovanie/ | description | description | description 111 знаков (норма 120–160) | Пескоструйное матирование до закалки: сплошное, полосы приватности, логотип на перегородке. Долговечнее плёнки. |
| warn | /obrabotka-stekla/pechat/ | description | description | description 109 знаков (норма 120–160) | Шелкография керамической краской вжигается при закалке и не стирается. Цвета по RAL, формат до 1100 × 700 мм. |
| warn | /obrabotka-stekla/plenki/ | description | description | description 114 знаков (норма 120–160) | Матовые, тонирующие и защитные плёнки на стекло вашего заказа. Когда лучше плёнка, а когда — пескоструй или сатин. |
| warn | /obrabotka-stekla/plenki/ | title | title | title 66 знаков (> 65) | Матовая плёнка на стекло для офиса — в составе заказа \| Inex Glass |
| warn | /osteklenie/ | description | description | description 115 знаков (норма 120–160) | Стеклянные фасады, спайдерное остекление, витрины, лифтовые шахты и веранды: стекло, профиль и узлы для подрядчика. |
| warn | /osteklenie/spajdernoe/ | description | description | description 117 знаков (норма 120–160) | Точечное крепление стекла на спайдерах: цилиндрические и конусные отверстия по ГОСТ, спайдеры и стекло одним заказом. |
| warn | /osteklenie/vitrin-i-magazinov/ | description | description | description 98 знаков (норма 120–160) | Закалённое и осветлённое стекло для витрин и входных групп магазинов, торговых центров и шоурумов. |
| warn | /raschet-stoimosti/ | description | description | description 113 знаков (норма 120–160) | Ответьте на 7 вопросов и прикрепите чертёж — пришлём КП с ценой, сроком и доставкой в среднем за 2–3 рабочих дня. |
| warn | /steklyannye-kozyrki/ | description | description | description 116 знаков (норма 120–160) | Козырьки над входом на тягах и спайдерах: подберём триплекс под снеговую нагрузку, стекло и крепления одним заказом. |
| warn | /steklyannye-peregorodki/ | title | title | title 66 знаков (> 65) | Стеклянные перегородки для офисов — комплект с узлами \| Inex Glass |
| warn | /zakalennoe-steklo/ | description | description | description 110 знаков (норма 120–160) | Проверим чертёж и согласуем спецификацию до закалки, упакуем в обрешётку с фото при отгрузке. Заказы от 50 м². |
| warn | /zakalennoe-steklo/tonirovannoe/ | description | description | description 114 знаков (норма 120–160) | Бронза, графит и серое стекло 4–19 мм в закалке. Оттенок зависит от толщины — согласуем образец до запуска партии. |
| warn | /zakalennoe-steklo/tonirovannoe/ | title | title | title 66 знаков (> 65) | Тонированное стекло — бронза, графит, серое в закалке \| Inex Glass |
| warn | /zerkala/ | description | description | description 109 знаков (норма 120–160) | Зеркала для гостиниц, офисов, салонов и залов: по размерам, с фацетом и обработкой кромки, партиями от 50 м². |
| warn | /zerkala/dlya-salonov/ | description | description | description 95 знаков (норма 120–160) | Зеркала для рабочих мест мастеров: размеры, фацет, обработка кромки — партией под сеть салонов. |
| warn | /zerkala/dlya-zalov/ | description | description | description 114 знаков (норма 120–160) | Зеркальные стены для залов: безопасные зеркала, размеры под стену, кромка и крепление. Для фитнес-клубов и студий. |
| info | /obekty/ | http | http | Пустой листинг — исключён из sitemap намеренно |  |

## Противоречия источников и решения

1. **Два description в 17-meta.** Взят первый, второй проигнорирован — подтвердить у заказчика:

| URL | Первый (используется) | Второй (проигнорирован) |
|---|---|---|
| /obrabotka-stekla/facet/ | Фацет — широкая полированная фаска по краю зеркала. Делаем на зеркалах шириной 30 или 50 мм — для залов, салонов и гостиниц. | Фацет — широкая полированная фаска по краю стекла или зеркала. Прямолинейный и фигурный, двойной и тройной, шириной до 30 мм. |
| /kak-zakazat/oplata/ | Работаем по договору с юрлицами и ИП, цены с НДС, предоплата 70%. Цена фиксируется в договоре и не меняется после оплаты. | Работаем по договору; цена в договоре фиксируется. Порядок оплаты и документы — на странице. |
| /proektirovanie/ | Расчёт стекла под нагрузку, в том числе снеговую, узлы крепления и проектная документация для козырьков, ограждений, фасадов и перегородок. | Узлы крепления, раскладка стекла и подбор толщины или схемы триплекса под нагрузку. Результат — чертежи и спецификация. |

2. **68 vs 69 URL.** В таблицах 17-meta 63 строк; шаблон `/zakalennoe-steklo/{N}-mm/` занимает 2 строки (с ценой и «без цены») и раскрывается в 8 толщин: 63 − 2 + 8 = 69 URL. Цифра 68 в плане, по-видимому, посчитана без одной из строк (например, без `/` или с шаблоном как 7 толщин без 5 мм) — в аудите используется 69.
3. **301 vs 308 для URL без слеша** — см. «Редиректы»: допустимы оба, Next отдаёт 308.
4. **Формулировка опыта** в description `/obekty/` и `/o-kompanii/` (17-meta) противоречит ТЗ §11 — см. `docs/reports/content-audit.md`.
5. **«М1» как стоп-слово vs статья о марках стекла** — исключение в `scripts/audit/allowlist.json`.
6. **Крошки калькулятора веса** (`/instrumenty/kalkulyator-vesa-stekla/`): видимых 3, в JSON-LD 2 — «Инструменты» не имеет страницы и не может быть `ListItem` с `item` (task 15). Намеренно; исключение `TEXT_ONLY_CRUMBS` в `scripts/audit/seo.ts`.

## Ручные проверки (человек)

- Прогнать JSON-LD ключевых шаблонов (главная, толщина с ценой, толщина без цены, статья, страница с FAQ, контакты) через https://validator.schema.org/ и валидатор микроразметки Яндекса (https://webmaster.yandex.ru/tools/microtest/), результат занести сюда.
