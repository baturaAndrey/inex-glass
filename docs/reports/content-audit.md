# Аудит контента (ТЗ §11)

Генерируется `pnpm audit:content` (`scripts/audit/content.ts`, task 40). Скрипт только находит нарушения — тексты не правит. Фикс-лист — таблицы `error` ниже.

Правила: стоп-слова `site-settings.stopWords` + встроенные (task-11), HST/Heat Soak/ГОСТ 24866/стеклопакеты, «собственное/наше производство», «закаливаем сами», «монтаж под ключ» (кроме моста на inex.su), спецстёкла, обещания (warn), формулировка опыта, нераскрытые метки, оговорка к цене «₽/м²», суммы вне справочника (warn), эмодзи, монтаж (warn), «Хит»/«Новинка»/кабинет/корзина (warn).

## Режим `--rendered`

- Запуск: 21.10.2026, 17:22
- Источник: http://localhost:3141 — 72 URL (sitemap: 64, реестр 17-meta, служебные)
- Стоп-слова и цены: CMS (site-settings: 10 стоп-слов; prices: 6 цен)
- Итого: **error 0**, warn 3, info 47; проверено: 72

### Нарушения

| Severity | URL / документ | Поле | Правило | Сообщение | Фрагмент |
|---|---|---|---|---|---|
| warn | /kak-zakazat/trebovaniya-k-chertezham/ | main | promise-template | Физические шаблоны не принимаются — проверить формулировку | Физические шаблоны |
| warn | /o-kompanii/ | meta description | experience | Формулировка опыта из 17-meta расходится с ТЗ §11 («За 21 год специалисты Inex выполнили более 1500 проектов») — вопрос заказчику | Направление инжиниринговой компании Inex: 21 год, 1500+ проектов. Проектируем, проверяем чертежи, контрол… |
| warn | /obekty/ | meta description | experience | Формулировка опыта из 17-meta расходится с ТЗ §11 («За 21 год специалисты Inex выполнили более 1500 проектов») — вопрос заказчику | 1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту. |
| info | / | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Работаем с заказами от 50 м². Срочного изготовления нет. Монтаж не выполняем. |
| info | /blog/kak-snyat-razmery-dlya-stekla/ | main | promise-template | Физические шаблоны не принимаются — проверить формулировку; найдено отрицание — вероятно, допустимо | …те контур в DWG или DXF в масштабе 1:1. Физические шаблоны (картон, фанера) мы не принимаем — толь… |
| info | /dushevye-peregorodki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /furnitura/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/ | main | promise-template | Физические шаблоны не принимаются — проверить формулировку; найдено отрицание — вероятно, допустимо | Принимаем файлы, физические шаблоны — нет |
| info | /kak-zakazat/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/dokumenty/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/dopuski-i-gost/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/kontrol-kachestva/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/oplata/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/priemka/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/sroki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет. Стекло изготавливается в очереди з… |
| info | /kak-zakazat/sroki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/trebovaniya-k-chertezham/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /kak-zakazat/upakovka-i-dostavka/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /klientam/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/facet/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/kromka/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/matirovanie/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/otverstiya-i-vyrezy/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/pechat/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /obrabotka-stekla/plenki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/fasadov/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/liftovyh-shaht/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/spajdernoe/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/verand-terras-besedok/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /osteklenie/vitrin-i-magazinov/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /proektirovanie/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /steklyannye-konstrukcii/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /steklyannye-kozyrki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /steklyannye-ograzhdeniya/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /steklyannye-peregorodki/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /torgovye-vitriny/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | …текла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем. |
| info | /zakalennoe-steklo/10-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/12-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/15-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/19-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/4-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/5-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/6-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zakalennoe-steklo/8-mm/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zerkala/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zerkala/dlya-salonov/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | /zerkala/dlya-zalov/ | main | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |

### Сработавшие исключения (allowlist)

_нет_

<details><summary>Проверенные страницы / документы</summary>

| URL / документ | Статус |
|---|---|
| / | 200 |
| /blog/ | 200 |
| /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | 200 |
| /blog/kak-snyat-razmery-dlya-stekla/ | 200 |
| /blog/kak-vybrat-tolshchinu-stekla/ | 200 |
| /blog/markirovka-zakalennogo-stekla/ | 200 |
| /blog/mozhno-li-rezat-zakalennoe-steklo/ | 200 |
| /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | 200 |
| /dushevye-peregorodki/ | 200 |
| /furnitura/ | 200 |
| /instrumenty/kalkulyator-vesa-stekla/ | 200 |
| /kak-zakazat/ | 200 |
| /kak-zakazat/dokumenty/ | 200 |
| /kak-zakazat/dopuski-i-gost/ | 200 |
| /kak-zakazat/kontrol-kachestva/ | 200 |
| /kak-zakazat/oplata/ | 200 |
| /kak-zakazat/priemka/ | 200 |
| /kak-zakazat/sroki/ | 200 |
| /kak-zakazat/trebovaniya-k-chertezham/ | 200 |
| /kak-zakazat/upakovka-i-dostavka/ | 200 |
| /klientam/ | 200 |
| /klientam/dizajneram-i-arhitektoram/ | 200 |
| /klientam/podryadchikam/ | 200 |
| /klientam/proizvoditelyam-mebeli/ | 200 |
| /klientam/zastrojshchikam/ | 200 |
| /kontakty/ | 200 |
| /o-kompanii/ | 200 |
| /o-kompanii/sotrudniki/ | 200 |
| /obekty/ | 200 |
| /obrabotka-stekla/ | 200 |
| /obrabotka-stekla/facet/ | 200 |
| /obrabotka-stekla/kromka/ | 200 |
| /obrabotka-stekla/matirovanie/ | 200 |
| /obrabotka-stekla/otverstiya-i-vyrezy/ | 200 |
| /obrabotka-stekla/pechat/ | 200 |
| /obrabotka-stekla/plenki/ | 200 |
| /osteklenie/ | 200 |
| /osteklenie/fasadov/ | 200 |
| /osteklenie/liftovyh-shaht/ | 200 |
| /osteklenie/spajdernoe/ | 200 |
| /osteklenie/verand-terras-besedok/ | 200 |
| /osteklenie/vitrin-i-magazinov/ | 200 |
| /poisk/?q=стекло | 200 |
| /politika-konfidencialnosti/ | 200 |
| /proektirovanie/ | 200 |
| /raschet-stoimosti/ | 200 |
| /soglasie-na-obrabotku-personalnyh-dannyh/ | 200 |
| /steklyannye-konstrukcii/ | 200 |
| /steklyannye-kozyrki/ | 200 |
| /steklyannye-ograzhdeniya/ | 200 |
| /steklyannye-peregorodki/ | 200 |
| /torgovye-vitriny/ | 200 |
| /tripleks/ | 200 |
| /zakalennoe-steklo/ | 200 |
| /zakalennoe-steklo/10-mm/ | 200 |
| /zakalennoe-steklo/12-mm/ | 200 |
| /zakalennoe-steklo/15-mm/ | 200 |
| /zakalennoe-steklo/19-mm/ | 200 |
| /zakalennoe-steklo/4-mm/ | 200 |
| /zakalennoe-steklo/5-mm/ | 200 |
| /zakalennoe-steklo/6-mm/ | 200 |
| /zakalennoe-steklo/8-mm/ | 200 |
| /zakalennoe-steklo/dlya-mebeli/ | 200 |
| /zakalennoe-steklo/matovoe/ | 200 |
| /zakalennoe-steklo/mollirovannoe/ | 200 |
| /zakalennoe-steklo/okrashennoe/ | 200 |
| /zakalennoe-steklo/osvetlennoe/ | 200 |
| /zakalennoe-steklo/riflenoe/ | 200 |
| /zakalennoe-steklo/tonirovannoe/ | 200 |
| /zerkala/ | 200 |
| /zerkala/dlya-salonov/ | 200 |
| /zerkala/dlya-zalov/ | 200 |

</details>

## Режим `--db`

- Запуск: 21.10.2026, 14:21
- Источник: Local API: pages, glass-types, constructions, processing-services, thicknesses, articles, objects, team, shower-configs, products; глобалы conditions, snippets, navigation, contacts, promo, prices (последние версии, включая черновики)
- Стоп-слова и цены: CMS (site-settings: 10 стоп-слов; prices: 6 цен)
- Итого: **error 0**, warn 2, info 7; проверено: 97

### Нарушения

| Severity | URL / документ | Поле | Правило | Сообщение | Фрагмент |
|---|---|---|---|---|---|
| warn | pages/0f7d808d-947c-4e7c-9c4c-e1cf41f1622c /o-kompanii/ | seo.description | experience | Формулировка опыта из 17-meta расходится с ТЗ §11 («За 21 год специалисты Inex выполнили более 1500 проектов») — вопрос заказчику | Направление инжиниринговой компании Inex: 21 год, 1500+ проектов. Проектируем, проверяем чертежи, контрол… |
| warn | pages/edb0ac64-3f1e-4141-931d-8825b5a87288 /obekty/ | seo.description | experience | Формулировка опыта из 17-meta расходится с ТЗ §11 («За 21 год специалисты Inex выполнили более 1500 проектов») — вопрос заказчику | 1500+ проектов за 21 год: торговые центры, банки, арены, офисы. Спецификация стекла по каждому объекту. |
| info | articles/d864dd05-69d3-41a4-8f7d-9dcf5b2a84b0 /blog/kak-snyat-razmery-dlya-stekla/ | body[10] | promise-template | Физические шаблоны не принимаются — проверить формулировку; найдено отрицание — вероятно, допустимо | …те контур в DWG или DXF в масштабе 1:1. Физические шаблоны (картон, фанера) мы не принимаем — толь… |
| info | global:conditions | noUrgentText | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет |
| info | global:conditions | callout[0] | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | …текла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем. |
| info | pages/14ee5505-29f2-4ca1-95c7-b786f43d057d / | layout[6].footnote | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Работаем с заказами от 50 м². Срочного изготовления нет. Монтаж не выполняем. |
| info | pages/c091866f-5e8a-4313-bd78-abd65be016fa /kak-zakazat/ | layout[2].content[0] | promise-template | Физические шаблоны не принимаются — проверить формулировку; найдено отрицание — вероятно, допустимо | …ет Монтаж не выполняем Принимаем файлы, физические шаблоны — нет |
| info | pages/c091866f-5e8a-4313-bd78-abd65be016fa /kak-zakazat/ | layout[2].content[0] | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Заказы от 50 м² Срочного изготовления нет Монтаж не выполняем Принимаем файлы… |
| info | pages/fb78758d-2598-4ba6-8231-c8750b9e4ecf /kak-zakazat/sroki/ | layout[2].content[1] | promise-urgent | Срочного изготовления нет — проверить формулировку (допустимо отрицание); найдено отрицание — вероятно, допустимо | Срочного изготовления нет. Стекло изготавливается в очереди з… |

### Сработавшие исключения (allowlist)

_нет_

<details><summary>Проверенные страницы / документы</summary>

| URL / документ | Статус |
|---|---|
| pages/80c4f4ae-bf85-4f5c-a898-973b9bb49d00 /soglasie-na-obrabotku-personalnyh-dannyh/ | published |
| pages/605a5903-0124-4a4e-8ec7-6a26e8ec787a /politika-konfidencialnosti/ | published |
| pages/edd4e112-b579-4ecd-b7ff-58b16f557e9d /instrumenty/kalkulyator-vesa-stekla/ | published |
| pages/75f5a184-b681-4b30-9e1d-4b4b4b90c5bc /blog/ | published |
| pages/edb0ac64-3f1e-4141-931d-8825b5a87288 /obekty/ | published |
| pages/53275603-ff1b-4975-9f8e-24257a0328af /kontakty/ | published |
| pages/bef167b2-08d1-4b5e-adf6-340cbb19791e /o-kompanii/sotrudniki/ | published |
| pages/0f7d808d-947c-4e7c-9c4c-e1cf41f1622c /o-kompanii/ | published |
| pages/d64de73b-2010-4a20-acc8-eb1cbba0cbd8 /klientam/dizajneram-i-arhitektoram/ | published |
| pages/ef333d79-ab43-42f9-b465-916763172645 /klientam/zastrojshchikam/ | published |
| pages/d47478fc-0a45-4ecc-9d38-e7ba02c8ab08 /klientam/proizvoditelyam-mebeli/ | published |
| pages/c5813b39-183a-4f5f-8447-3507b93949c2 /klientam/podryadchikam/ | published |
| pages/55e7550b-169f-43fd-85ea-6fcfcb4cfe59 /klientam/ | published |
| pages/38a606a3-622d-4b37-bdbf-8ad7d09e5d37 /proektirovanie/ | published |
| pages/fc32274c-034d-4e47-b018-6493b9234592 /kak-zakazat/kontrol-kachestva/ | published |
| pages/f7475657-b1b5-4734-a530-20e4cee982b5 /kak-zakazat/oplata/ | published |
| pages/a3d365ac-b8ef-4f34-80b7-2574a1ff4a65 /kak-zakazat/priemka/ | published |
| pages/8d9fe5d5-4365-4027-b62d-b48d2a22623e /kak-zakazat/dokumenty/ | published |
| pages/fbf8fe3c-6431-44da-a4dd-3ca174fe1003 /kak-zakazat/upakovka-i-dostavka/ | published |
| pages/fb78758d-2598-4ba6-8231-c8750b9e4ecf /kak-zakazat/sroki/ | published |
| pages/e7f9ee0d-9828-425a-b677-0786d599d6f1 /kak-zakazat/dopuski-i-gost/ | published |
| pages/2e855a4e-0cc0-49e1-b336-21f506d13bb1 /kak-zakazat/trebovaniya-k-chertezham/ | published |
| pages/c091866f-5e8a-4313-bd78-abd65be016fa /kak-zakazat/ | published |
| pages/2456e850-d67a-4ee8-9de4-0173689c37a3 /obrabotka-stekla/ | published |
| pages/7eab06aa-d7bc-41bc-99a7-eda77cef5082 /zakalennoe-steklo/ | published |
| pages/14ee5505-29f2-4ca1-95c7-b786f43d057d / | published |
| glass-types/f828c25a-5bcc-435d-81ac-d1b395c1a038 /zakalennoe-steklo/osvetlennoe/ | published |
| glass-types/085f30ee-ba1a-463b-a2a5-332426a6c7fc /zakalennoe-steklo/matovoe/ | published |
| glass-types/42a05b9b-913b-4688-99d6-06eba0a1041e /zakalennoe-steklo/tonirovannoe/ | published |
| glass-types/3b8a3e49-08d3-4441-baf4-46594343ff4a /zakalennoe-steklo/okrashennoe/ | published |
| glass-types/13c67d41-361f-44d8-83bf-99ee17fcac81 /zakalennoe-steklo/riflenoe/ | published |
| glass-types/09ad8b33-13ff-4a7f-a934-d0fe1543a63e /zakalennoe-steklo/mollirovannoe/ | published |
| glass-types/4e285e93-d754-47a0-bbe3-b55c23cffcd0 /zakalennoe-steklo/dlya-mebeli/ | published |
| glass-types/5b2dd3e4-2467-4dc0-82cc-8463b3e557a3 /tripleks/ | published |
| constructions/3d6d8bd8-65e5-43d2-b6e7-714cb6880e42 /zerkala/ | published |
| constructions/827c4e4b-ec8e-4e08-977e-4b9d4e4239ad /osteklenie/ | published |
| constructions/6aa51a93-13ca-4d81-9e27-55e36c513e6f /steklyannye-konstrukcii/ | published |
| constructions/7f8ed8f4-fe67-44d7-92a5-16e7412a3e5e /zerkala/dlya-zalov/ | published |
| constructions/48d3aafa-3d37-4418-8be9-203808c9594e /osteklenie/fasadov/ | published |
| constructions/22bd0124-87de-414a-9771-2a15559b14e8 /steklyannye-peregorodki/ | published |
| constructions/92ef826b-c09c-4a85-9f83-c8a599950ea3 /zerkala/dlya-salonov/ | published |
| constructions/f8815c4a-91cc-437f-a849-1b8737a1bb0d /osteklenie/spajdernoe/ | published |
| constructions/3dd6b374-37b4-42e5-bda1-434e9ef7a723 /steklyannye-ograzhdeniya/ | published |
| constructions/3aae5ef1-8d1c-44bf-8e5e-5f03c086591f /osteklenie/vitrin-i-magazinov/ | published |
| constructions/4d26ee65-82de-4b3e-b5ff-f2c1fbefc2c2 /steklyannye-kozyrki/ | published |
| constructions/c96b4bc8-68a9-4a1a-8afc-dcda69616202 /osteklenie/liftovyh-shaht/ | published |
| constructions/82fcd34e-d623-4ba9-a5dd-ad60d5e3c333 /dushevye-peregorodki/ | published |
| constructions/3be25857-a9c5-4d03-b46f-790bd1124e18 /osteklenie/verand-terras-besedok/ | published |
| constructions/6fd02b7e-c868-43fb-a727-83a4e5b78573 /torgovye-vitriny/ | published |
| constructions/c8193afb-109b-4dae-bb65-7b9fb58d9e40 /furnitura/ | published |
| processing-services/5510de5e-fa29-4c58-9cc4-5b79cd46d08b /obrabotka-stekla/kromka/ | — |
| processing-services/1f29b8f7-9b1e-4523-b84b-33565282982c /obrabotka-stekla/otverstiya-i-vyrezy/ | — |
| processing-services/f1823430-c408-4bdd-bf31-a16595a10603 /obrabotka-stekla/facet/ | — |
| processing-services/7711504e-0cb4-4d08-a47c-7eb5ba57ddee /obrabotka-stekla/matirovanie/ | — |
| processing-services/7e576a0f-c0b2-4f34-bdfe-705c86131584 /obrabotka-stekla/pechat/ | — |
| processing-services/5c95be38-a18e-4ab5-811e-92236de7118d /obrabotka-stekla/plenki/ | — |
| thicknesses/4be92bc6-b9a8-404c-abbf-8565528e657f /zakalennoe-steklo/4-mm/ | — |
| thicknesses/ad169058-d681-4e29-83ae-375041f7e76a /zakalennoe-steklo/5-mm/ | — |
| thicknesses/1f3a56ac-2ace-4805-921e-a7b1f708c3f8 /zakalennoe-steklo/6-mm/ | — |
| thicknesses/c3c3cb18-11bc-4c28-830b-d49a9fb895c1 /zakalennoe-steklo/8-mm/ | — |
| thicknesses/7abaf7e3-6b1d-4779-a5dd-67ce9d888bfd /zakalennoe-steklo/10-mm/ | — |
| thicknesses/fa34ab62-587e-4b4c-bb3b-471e810b2f5f /zakalennoe-steklo/12-mm/ | — |
| thicknesses/ee776f77-50a8-40a0-b718-561e84d1573e /zakalennoe-steklo/15-mm/ | — |
| thicknesses/62c7ad12-872d-4e34-884d-355fa584de0f /zakalennoe-steklo/19-mm/ | — |
| articles/6a7465aa-b565-4f32-947e-624341c5804d /blog/mozhno-li-rezat-zakalennoe-steklo/ | published |
| articles/d1bc6267-5161-480d-93f6-144a1c9597c1 /blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/ | published |
| articles/4121ce99-e9f8-4654-ab2b-d2f8b97a63a7 /blog/kak-vybrat-tolshchinu-stekla/ | published |
| articles/d864dd05-69d3-41a4-8f7d-9dcf5b2a84b0 /blog/kak-snyat-razmery-dlya-stekla/ | published |
| articles/ef5b54f0-50d5-4dbd-9af4-677e63ca08d9 /blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/ | published |
| articles/6f7c769a-462c-4029-962c-d4a7d05c71c4 /blog/markirovka-zakalennogo-stekla/ | published |
| objects/a28db3e2-a474-4e35-a853-6108323a04b9 /obekty/rmk-arena/ | draft |
| objects/77d19d3e-1786-45fe-8344-14079ef038d1 /obekty/aeroport-chelyabinsk/ | draft |
| objects/e38ca8e0-07b1-4644-b1f2-395e8b5fd41c /obekty/trc-almaz-chelyabinsk/ | draft |
| objects/96198054-554e-494b-8522-8f5b57b0786d /obekty/ugorskaya-shahmatnaya-akademiya/ | draft |
| objects/bc80f58f-b19f-4b40-b3fc-de8baae62747 /obekty/arkaim-plaza/ | draft |
| objects/1fb0c30c-226b-405d-a208-ffafee08ed51 /obekty/sberbank-ishim/ | draft |
| objects/398fb003-cee8-4472-a4cd-2bb3546454be /obekty/glavnoe-upravlenie-surgutneftegaz/ | draft |
| objects/7ff5b556-69bd-4319-87e9-94d76abec78b /obekty/koncertnyj-zal-omsk/ | draft |
| objects/e1d4de27-8d57-4dab-84c6-6e058d32060d /obekty/traktor-arena/ | draft |
| objects/3519ac8d-ccbd-4fd7-ace0-4c3e6509fce7 /obekty/trk-ural/ | draft |
| objects/e6f8a477-f8ac-4d49-b8ac-d5e5e80950f5 /obekty/trk-rodnik/ | draft |
| products/bbe03924-0076-4d05-94f3-9667e9e5cff6 | — |
| products/0fac3354-90a6-4670-9af8-50197fa93f16 | — |
| products/3f0c264f-d2a8-4e68-8c6a-4f038c63e25a | — |
| products/74a36f3f-f912-458b-9ba9-2a2ca337021a | — |
| products/19ab1478-89ca-48fa-a62c-348ea352221e | — |
| products/e8dd9a11-960a-4af1-b71f-ab7d93426b79 | — |
| products/b3686e5f-58a3-4368-8c56-2b2fc1bd8aa0 | — |
| products/8c796bb6-8e0c-4d1c-b8f0-d7bba3096d74 | — |
| products/634a4011-ca5d-4047-916b-7f96cea9582f | — |
| products/8ba0603a-94cf-49fc-8dd3-81e7464dce89 | — |
| global:conditions | global |
| global:snippets | global |
| global:navigation | global |
| global:contacts | global |
| global:promo | global |
| global:prices | global |

</details>

## Противоречия источников (вопросы заказчику)

1. **Формулировка опыта.** ТЗ §11 допускает только «За 21 год специалисты Inex выполнили более 1500 проектов», а 17-meta задаёт description `/obekty/` («1500+ проектов за 21 год…») и `/o-kompanii/` («…21 год, 1500+ проектов…»). В аудите это `warn` (строка взята из 17-meta дословно); в тексте страниц — `error`. Решение: подтвердить исключение для мета-описаний или заменить формулировку в 17-meta.
2. **«М1» как стоп-слово.** Если заказчик внесёт «М1» в `site-settings.stopWords` (завод), оно конфликтует со статьёй «Марки и маркировка стекла» (`/blog/markirovka-zakalennogo-stekla/`, title 17-meta «Стекло М1…»). Исключение задано в `scripts/audit/allowlist.json`.
3. **Оговорка к цене.** Требуемая подпись — «Ориентировочная цена на ДД.ММ.ГГГГ. Точная стоимость — в КП; цена в договоре фиксируется». Подписи без части «цена в договоре фиксируется» помечаются как `error` (см. таблицу).
