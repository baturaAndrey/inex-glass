# Task 14: Шапка, подвал, мобильное меню и корневой layout сайта

## Status

pending

## Wave

4

## Description

Общий каркас публичного сайта: трёхстрочная sticky-шапка с мега-меню «Каталог» и «Услуги», строкой разделов (9 ссылок), поиском, главной кнопкой «Рассчитать стоимость», блоком телефона и «Мой расчёт»; мобильное меню; подвал на navy; упрощённая шапка страницы заказа; сборка `src/app/(site)/layout.tsx` (шапка, `<main>`, подвал, cookie-баннер, sticky-CTA на телефоне, провайдер модальных форм, Метрика, слот `{modal}` для перехватывающего маршрута квиза). Данные меню, контактов и акции берутся из CMS (globals `navigation`, `contacts`, `promo`).

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md
**Blocks:** task-22, 23, 29, 30, 33, 34, 35 и все страницы (они живут внутри этого layout)

**Context from dependencies:**
- **task-10** заморозил схему: в `src/payload-types.ts` есть типы globals `Navigation`, `Contact` (slug `contacts`), `Promo`, `SiteSetting(s)` и др. Точные имена полей смотрите в `src/payload/globals/{navigation,contacts,promo}.ts` и `src/payload-types.ts` — **не переименовывайте и не добавляйте поля**. Концептуально: `navigation` хранит верхнюю строку (меню «Компания», меню «Связаться», сегменты), основную строку, строку разделов (9 ссылок), мега-меню «Каталог»/«Услуги» (колонки со ссылками), колонки подвала; `contacts` — три точки (Челябинск офис, Челябинск склад/самовывоз, Екатеринбург офис) с адресом, телефонами, e-mail, часами, массив мессенджеров `{ name, url, icon }`; `promo` — текст, даты, `active`, порог.
- **task-12** дал `Input` (поле поиска) и остальные примитивы форм (`src/components/ig/input.tsx`).
- **task-13** дал `Drawer` (мобильное меню), `Badge` (плашка акции), `CookieBanner`, `StickyCta`, `useConsent`; **task-05** — токены, Rubik, `Button`, `Container`.
- **Same-wave контракты** (создаются параллельно, вы только импортируете; typecheck соберётся после слияния волны):
  - task-15: `@/lib/cms/globals` экспортирует `getNavigation()`, `getContacts()`, `getPromo()`, `getSiteSettings()` (кэшированные загрузчики, возвращают объекты соответствующих типов Payload либо `null`); `@/components/forms/form-dialog-provider` экспортирует `FormDialogProvider` и хук `useFormDialog(): { openForm(formKey, params?), closeForm() }`; `@/components/forms/form-trigger` экспортирует `FormTrigger` (`<FormTrigger formKey="callback" asChild>…</FormTrigger>`); `formKey`: `'drawing' | 'callback' | 'sample' | 'load' | 'contacts' | 'full'`.
  - task-19: `@/components/analytics/metrika` экспортирует серверный компонент `Metrika` (без обязательных пропсов). `Metrika` всегда, в любом окружении и при любом согласии, рендерит `<AttributionCapture/>` (`captureAttribution()` — UTM и страница входа) и `<ClickTracker/>`. Так атрибуция захватывается глобально на каждой странице; отдельно монтировать её в layout не нужно.
  - task-11: `@/lib/domain/promo` — `promoActive(promo, now)` (передавайте поля global `promo` как `PromoInput`: `active`, `text`, `startDate`, `endDate`, `thresholdArea`).

## Files to Create

В `src/components/layout/`:
- `site-header.tsx` — серверный компонент: загружает данные, собирает шапку
- `header-shell.tsx` — `'use client'`: sticky/сжатие по скроллу, спейсер, переключатель шапки по пути (`/zakaz/*`)
- `top-bar.tsx` — верхняя строка (меню «Компания ▾», «Связаться с нами ▾», плашка акции, сегменты)
- `main-row.tsx` — основная строка (логотип, пилюли «Услуги»/«Каталог», «Акции», «Блог», поиск, CTA, телефон, «Мой расчёт», бургер)
- `section-nav.tsx` — строка разделов с «Ещё ▾»
- `mega-menu.tsx` — `'use client'`: панели «Каталог» и «Услуги»
- `mobile-menu.tsx` — `'use client'`: меню в `Drawer`
- `header-search.tsx` — поле поиска (десктоп) и оверлей поиска (мобильный)
- `phone-block.tsx` — телефон, часы, «Заказать звонок»
- `calc-link.tsx` — `'use client'`: ссылка/кнопка «Рассчитать стоимость» с `src`
- `my-calc-link.tsx` — `'use client'`: иконка «Мой расчёт» (с индикатором черновика)
- `site-footer.tsx` — подвал
- `order-header.tsx` — упрощённая шапка страницы заказа
- `nav-defaults.ts` — резервные данные меню (если global пуст) и таблицы URL
- `logo.tsx` — логотип (тёмный/светлый вариант SVG)

Прочее:
- `public/brand/inex-glass-logo-dark.svg`, `public/brand/inex-glass-logo-light.svg` — копии из `res/inex-glass-handoff/design-system/assets/` (если task-05 ещё не положил логотипы; проверить)

## Files to Modify

- `src/app/(site)/layout.tsx` — финальная композиция (см. ниже). В волне 4 файл принадлежит только этой задаче: перезаписать композицию, сохранив импорты шрифта и глобальных стилей из task-05. Позже его меняет только task-34 (волна 6): добавляет слот `modal` и `<PathTracker/>`.
- (опционально) `src/app/(site)/globals.css` — **только** добавить CSS-переменные высоты шапки (см. ниже); остальное не трогать

## Technical Details

### Источники

- Требования: `res/inex-glass-handoff/zadaniya/02-shapka-podval.md`, ТЗ `docs/inex/16-tz-razrabotka.md` §3.2.
- Эталон вёрстки: `res/inex-glass-handoff/prototypes/Home.dc.html` — разметка `<header>` и `<footer class="ftr">` и их CSS в `<helmet><style>` (классы `.top`, `.mainrow`, `.pill`, `.nav`, `.search`, `.cta-full`, `.tel`, `.sec`, `.ftr*`); те же шапка/подвал во всех остальных прототипах. Переписать CSS на Tailwind внутри компонентов (кроме готовых `.ig-*`).
- Логотипы: `res/inex-glass-handoff/design-system/assets/inex-glass-logo-{dark,light}.svg` (финальный SVG пришлёт Inex — файл заменяемый).
- Подвал, тексты: `res/inex-glass-handoff/teksty/01-glavnaya.md` (раздел «Подвал (ссылка-мост)»), `teksty/15-politika-pdn.md` §3.
- Иконки Lucide: `calculator` (CTA), `clipboard-list` («Мой расчёт»), `search`, `phone`, `menu`, `x`, `chevron-down`, `layout-grid`/`menu` в пилюлях.

### Структура шапки (десктоп ≥1101)

1. **Верхняя строка** (фон `well`, 12–13 px): слева «Компания ▾» (о компании, объекты, контакты, реквизиты) и «Связаться с нами ▾» (телефон, e-mail, мессенджеры из `contacts.messengers`, «Заказать звонок» = `FormTrigger formKey="callback"`); по центру — плашка акции (`Badge variant="promo" plain`, ссылка на `/zakalennoe-steklo/#ceny`, текст = `promo.text`) — **только если** `promoActive(promo, new Date())`, иначе блок не рендерится; справа сегменты: «Застройщикам · Подрядчикам · Дизайнерам и архитекторам · Производителям мебели».
2. **Основная строка:** логотип · пилюли «Услуги» и «Каталог» (кнопки с иконкой-бургером, `aria-expanded`, открывают мега-меню) · «Акции» (ссылка `/zakalennoe-steklo/#ceny`, **только при активной акции**) · «Блог» (`/blog/`) · поиск · **«Рассчитать стоимость»** (`Button variant="primary"`, иконка `Calculator`, сразу после поиска) · блок телефона (≥1366: «● Звоните Пн–Пт 9–18» с зелёной точкой, номер крупно `tel:`-ссылкой, пунктирная ссылка «Заказать звонок») · иконка «Мой расчёт».
3. **Строка разделов** (14 px): Закалённое стекло · Триплекс · Обработка стекла · Стеклянные перегородки · Ограждения · Козырьки · Остекление зданий · Стекло для мебели · Зеркала.

Иконки профиля **нет**, корзины/избранного нет.

### Адаптив

| Ширина | Поведение |
|---|---|
| ≥1366 | всё как выше |
| 1101–1365 | поля 40 px; блок телефона скрыт; в строке разделов первые 5 ссылок + «Ещё ▾» (выпадающий список остальных 4) |
| ≤1100 | скрыты сегменты (правая часть верхней строки), пилюли, «Акции/Блог», поиск, строка разделов и полный CTA; остаются логотип, **иконка-CTA** (`Button variant="primary" size="icon"`, `aria-label="Рассчитать стоимость"`), «Мой расчёт», бургер. Бургер открывает `MobileMenu` |
| ≤599 | верхняя строка и «Мой расчёт» скрыты; логотип 32 px, справа иконки: поиск, телефон (`tel:`), бургер; иконка-CTA скрыта; **внизу — `StickyCta`** (из task-13) |

Поля контейнера: `--ig-gutter` (70 / 40 / 24 / 16 px), фон строк — на всю ширину до 1920.

### Sticky и сжатие

- Структура: внешний **спейсер** `<div>` с фиксированной высотой полной шапки по брейкпоинтам (≥1101: верхняя 36 + основная 72 + разделы 44 = 152 px; ≤1100: основная 64 px; ≤599: 56 px) — чтобы страница не прыгала (CLS) — и внутри `position: fixed; top: 0; inset-x: 0; z-index: 40` сама шапка.
- `HeaderShell` (client) слушает `scroll` через `requestAnimationFrame` (passive): при `scrollY > 80` ставит `data-compact="true"`, возвращает при `scrollY < 40` (гистерезис). В compact: верхняя строка и строка разделов схлопываются (`grid-template-rows: 0fr`, 200 мс), основная строка сжимается до **64 px** (логотип 36 px), кнопка «Рассчитать стоимость» остаётся. Тень появляется только в compact.
- Экспортировать CSS-переменные в `:root`: `--ig-header-h` (полная высота по брейкпоинтам) и `--ig-header-compact-h: 64px` (на телефоне 56px) — их используют sticky-сайдбары страниц (`top: calc(var(--ig-header-compact-h) + 16px)`).
- Якоря (`#ceny`, `#rekvizity`) не должны прятаться под шапкой: `scroll-margin-top: calc(var(--ig-header-compact-h) + 16px)` для `[id]` в `main` (добавить в `globals.css` одним правилом).
- `prefers-reduced-motion` — без анимации высоты.

### Мега-меню

Собственная реализация (без новых зависимостей): кнопка-триггер (`aria-expanded`, `aria-controls`, `aria-haspopup="true"`), панель на всю ширину контейнера под основной строкой, открытие по клику (и по hover с задержкой 120 мс на устройствах `pointer: fine`), закрытие по Esc, клику снаружи, потере фокуса, переходу по ссылке; фокус возвращается на триггер; стрелки ←/→ между триггерами не обязательны. Анимация появления 200 мс.

**«Каталог»** — 3 колонки + промо-карточка справа («Рассчитать стоимость по чертежу» + кнопка):
- *Стекло:* Закалённое стекло (4, 6, 8, 10, 12 мм) · Матовое · Тонированное · Крашеное по RAL · Осветлённое · Рифлёное · Гнутое · Триплекс · Для мебели;
- *Конструкции:* Стеклянные перегородки · Ограждения и перила · Козырьки · Душевые перегородки для проектов · Торговые витрины · Зеркала (для залов, для салонов) · Зажимной профиль и спайдеры;
- *Остекление зданий:* Стеклянные фасады · Спайдерное остекление · Витрины и магазины · Лифтовые шахты · Веранды и террасы.

**«Услуги»:** Обработка стекла (кромка, отверстия и вырезы, фацет на зеркалах, матирование, печать, плёнки) · Проектирование узлов · Как заказать (требования к чертежам, допуски по ГОСТ, сроки, упаковка и доставка, документы, оплата, приёмка) · Калькулятор веса стекла.

### Таблица URL (для `nav-defaults.ts` и проверки данных CMS)

| Пункт | URL |
|---|---|
| Закалённое стекло | `/zakalennoe-steklo/` (толщины: `/zakalennoe-steklo/4-mm/`, `6-mm/`, `8-mm/`, `10-mm/`, `12-mm/`) |
| Матовое / Тонированное / Крашеное по RAL / Осветлённое / Рифлёное / Гнутое / Для мебели | `/zakalennoe-steklo/matovoe/`, `tonirovannoe/`, `okrashennoe/`, `osvetlennoe/`, `riflenoe/`, `mollirovannoe/`, `dlya-mebeli/` |
| Триплекс | `/tripleks/` |
| Обработка стекла | `/obrabotka-stekla/` (`kromka/`, `otverstiya-i-vyrezy/`, `facet/`, `matirovanie/`, `pechat/`, `plenki/`) |
| Стеклянные перегородки | `/steklyannye-peregorodki/` |
| Ограждения (и перила) | `/steklyannye-ograzhdeniya/` |
| Козырьки | `/steklyannye-kozyrki/` |
| Душевые перегородки | `/dushevye-peregorodki/` |
| Торговые витрины | `/torgovye-vitriny/` |
| Зеркала / для залов / для салонов | `/zerkala/`, `/zerkala/dlya-zalov/`, `/zerkala/dlya-salonov/` |
| Зажимной профиль и спайдеры | `/furnitura/` |
| Остекление зданий (хаб) и дочерние | `/osteklenie/`; `/osteklenie/fasadov/`, `spajdernoe/`, `vitrin-i-magazinov/`, `liftovyh-shaht/`, `verand-terras-besedok/` |
| Проектирование | `/proektirovanie/` |
| Как заказать (+ дочерние) | `/kak-zakazat/` (`trebovaniya-k-chertezham/`, `dopuski-i-gost/`, `sroki/`, `upakovka-i-dostavka/`, `dokumenty/`, `priemka/`, `oplata/`) |
| Калькулятор веса | `/instrumenty/kalkulyator-vesa-stekla/` |
| Сегменты | `/klientam/zastrojshchikam/`, `/klientam/podryadchikam/`, `/klientam/dizajneram-i-arhitektoram/`, `/klientam/proizvoditelyam-mebeli/` |
| Компания: о компании / объекты / контакты / реквизиты | `/o-kompanii/`, `/obekty/`, `/kontakty/`, `/kontakty/#rekvizity` |
| Блог | `/blog/` |
| Политика / Согласие | `/politika-konfidencialnosti/`, `/soglasie-na-obrabotku-personalnyh-dannyh/` |

Данные берутся из `getNavigation()`; `nav-defaults.ts` содержит ту же структуру как **fallback** (если global пуст, шапка не должна быть пустой, например на свежей БД без сида).

### Мобильное меню (`MobileMenu`, на `Drawer` из task-13)

Полноэкранная панель справа: сверху логотип и кнопка закрытия; блок «Рассчитать стоимость» (primary, на всю ширину) и «Мой расчёт»; аккордеон-разделы «Каталог», «Услуги» (все ссылки мега-меню), «Компания», «Связаться» (телефон, e-mail, мессенджеры, «Заказать звонок»); сегменты «Для кого»; внизу — телефон и часы работы. Закрывается по переходу по ссылке, Esc, оверлею. Блокирует скролл фона (Radix).

### Поиск (`HeaderSearch`)

- Десктоп (≥1101): поле `Input` (скруглённое `rounded-full`, иконка лупы слева, `label` скрыт визуально «Поиск по сайту», placeholder «Введите запрос»), форма `<form action="/poisk/" method="get" role="search">` с `name="q"`. Страница `/poisk/` реализуется задачей 35; до неё ссылка отдаёт 404 — это ожидаемо.
- Мобильный: кнопка-иконка открывает оверлей/панель сверху с тем же полем. Задача 35 впоследствии доработает файл `header-search.tsx` (подсказки) — не усложняйте.

### CTA и «Мой расчёт»

- `CalcLink` (client): `<Link href={'/raschet-stoimosti/?src=' + encodeURIComponent(pathname)}>` (из `usePathname()`), варианты `full` (текст «Рассчитать стоимость» + иконка) и `icon`. Ссылка должна срабатывать как soft-navigation, чтобы перехватывающий маршрут `@modal` (задача 34) открывал квиз в модальном окне.
- `MyCalcLink` (client): `href="/raschet-stoimosti/?resume=1"`, иконка `ClipboardList`, `aria-label="Мой расчёт"`, подсказка `title`. На монтировании проверяет наличие черновика `localStorage['inex-quiz-draft-v1']` (try/catch) и показывает маленькую точку-индикатор (`bg-primary`, `aria-hidden`) + visually-hidden текст «есть сохранённый расчёт».

### Подвал (`SiteFooter`, сервер)

Фон `--ig-navy` (#324B64), логотип светлый, текст `--ig-on-navy-2` (#C9D3DD), заголовки белые; контейнер с `--ig-gutter`. Четыре колонки (на ≤1100 — 2, на ≤599 — 1; `padding-bottom` 104 px на телефоне под sticky-CTA):
1. **Каталог:** Закалённое стекло · Триплекс · Стеклянные перегородки · Ограждения и перила · Козырьки · Остекление зданий · Зеркала;
2. **Услуги / Как заказать:** Обработка стекла · Проектирование · Как заказать · Требования к чертежам · Допуски и ГОСТ · Сроки · Упаковка и доставка · Документы · Калькулятор веса стекла (в ТЗ: «Как заказать (все сервисные страницы)» — выводить все 8 дочерних страниц, если место позволяет);
3. **Компания:** О компании · Объекты · Контакты · Реквизиты (`/kontakty/#rekvizity`);
4. **Контакты** (из `contacts`): телефон крупно (`tel:`), e-mail (`mailto:`), три точки: «Челябинск — офис» (ул. Артиллерийская, 124А · +7 951 489-04-09), «Челябинск — склад и самовывоз» (Свердловский тракт, 7В · пн–пт, 9:00–18:00), «Екатеринбург — офис» (ул. Данилы Зверева, 17б · +7 982 329-11-08). Значения — только из CMS, текст выше — запасной вариант в `nav-defaults.ts`.

Над нижней строкой — ссылка-мост (дословно `teksty/01-glavnaya.md`, «Подвал (ссылка-мост)»): «Двери, лестницы и другие конструкции Inex — на inex.su» (`https://inex.su/`, внешняя ссылка, `rel="noopener"`). *(В ТЗ §3.2 сокращённо: «Двери и другие конструкции — inex.su»; по приоритету «тексты — teksty» используем полную формулировку из teksty/01.)*

Нижняя строка: слева «Политика обработки персональных данных» (`/politika-konfidencialnosti/`) и «Согласие на обработку персональных данных» (`/soglasie-na-obrabotku-personalnyh-dannyh/`); справа «© {год} ИП Копылов А. М.» (год — `new Date().getFullYear()`).

### OrderHeader

`order-header.tsx` — упрощённая шапка для `/zakaz/<токен>/`: логотип, справа `tel:`-ссылка с телефоном, кнопка «Рассчитать стоимость» (на ≤599 — две иконки: телефон и CTA); без меню, без строк разделов, не fixed-сжимающаяся (обычная, sticky не обязателен). Эталон — `<header class="od-head">` в `prototypes/Order.dc.html`. Телефон — из `getContacts()`.

Переключение: `HeaderShell` получает два серверных узла (`full` и `order`) и выбирает по `usePathname()` — для путей, начинающихся с `/zakaz/`, рендерит `order`, иначе `full` (так layout остаётся статичным/ISR и не обращается к `headers()`).

### Корневой layout `src/app/(site)/layout.tsx`

Сохранить из task-05 подключение шрифта (`next/font/local`, переменная `--font-rubik`) и `globals.css`. Композиция:

```tsx
export default function SiteLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <html lang="ru" className={rubik.variable}>
      <body className="min-h-screen flex flex-col bg-bg text-text antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only …">Перейти к содержимому</a>
        <FormDialogProvider>
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
          <CookieBanner />
          <StickyCta />
          {modal}
        </FormDialogProvider>
        <Metrika />
      </body>
    </html>
  );
}
```
`export const metadata`: только `metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000')`, `applicationName: 'Inex Glass'`, `formatDetection: { telephone: false }`; title/description — на страницах (task-15). Параллельный слот `@modal` (папку создаёт задача 34) пока может отсутствовать: тип `modal` сделать необязательным (`modal?: ReactNode`), чтобы layout собирался до задачи 34.

### Environment Variables

- `SITE_URL` — для `metadataBase` (через `@/lib/env`).

## Acceptance Criteria

- [ ] На 1920 / 1366 / 375 шапка и подвал визуально совпадают с `Home.dc.html` и макетом `zadaniya/02-shapka-podval.md`: 3 строки, мега-меню «Каталог» и «Услуги», строка разделов, сжатие при прокрутке до 64 px (CLS = 0 при сжатии — контент не прыгает), на 1280–1365 — 5 ссылок + «Ещё ▾», на ≤1100 — гамбургер и иконка-CTA, на ≤599 — логотип/поиск/телефон/бургер и закреплённая внизу кнопка «Рассчитать стоимость».
- [ ] Плашка акции и ссылка «Акции» видны только при активной акции (проверить, переключая `promo.active` и даты); при неактивной — отсутствуют в DOM.
- [ ] «Рассчитать стоимость» на каждой странице в первом экране (десктоп/планшет — в шапке, телефон — sticky), ведёт на `/raschet-stoimosti/?src=<путь>`; «Мой расчёт» — на `/raschet-stoimosti/?resume=1`.
- [ ] Мега-меню и «Ещё ▾» доступны с клавиатуры (Tab/Enter/Esc), `aria-expanded`/`aria-controls` корректны; мобильное меню блокирует скролл фона и закрывается по ссылке/Esc.
- [ ] Подвал: 4 колонки (2 / 1 на узких), тексты, ссылки, год в «© {год} ИП Копылов А. М.», ссылка-мост на inex.su — как описано; данные контактов приходят из CMS.
- [ ] Путь `/zakaz/*` показывает `OrderHeader`, остальные пути — полную шапку; layout не использует `headers()`/`cookies()` (не делает страницы динамическими).
- [ ] Layout включает `FormDialogProvider`, `CookieBanner`, `StickyCta`, `Metrika`, необязательный слот `modal`; есть skip-link; `lang="ru"`.
- [ ] Ни одна ссылка на `/admin` не использует `next/link`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` проходят (после слияния волны с task-15/19).

## Notes

- Модель: премиум.
- Шапка рендерится сервером с кэшированными данными (теги `global:navigation|contacts|promo`); состояние акции вычисляется при рендере — после даты окончания плашка исчезнет при ближайшей ревалидации (≤ 1 ч для страниц с `revalidate = 3600`; при редактировании `promo` — сразу по тегу).
- Логотип временный; финальный SVG от Inex — подмена файлов в `public/brand/`.
- Строка «разделов» — те же 9 ссылок, что в ТЗ §3.2; «Ещё ▾» выпадает как простое меню (не мега).
- Хуки Radix требуют `'use client'`; серверные компоненты передают данные клиентским через сериализуемые пропсы.
