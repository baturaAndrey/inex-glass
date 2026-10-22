# Task 12: Остальные экраны админки в теме

## Status

pending

## Wave

3

## Description

Довести до темы макета все экраны админки, которые не покрыты отдельными задачами: списки коллекций (таблица, поиск, фильтры, колонки, пагинация, быстрые фильтры заявок и медиатеки, ячейки-бейджи), вкладку «Управление» заказа, формы глобалов (цены, акция, контакты, настройки сайта), страницу входа с логотипом, медиатеку (сетка/миниатюры, загрузка), страницу аккаунта, просмотр версий и сравнение, всплывающие уведомления (toasts), модалки и дроверы, отчёт по заявкам. Это в основном SCSS в партиале `_screens.scss`; правка компонентов допускается только чтобы заменить inline-стили на `--theme-*` классами `.iga-*`. Адаптив 375 / 1366 / 1920 без горизонтальной прокрутки страницы.

## Dependencies

**Depends on:** task-02-admin-theme-foundation.md, task-03-admin-nav.md, task-04-admin-dashboard.md, task-05-leads-kanban.md, task-07-page-edit-form.md
**Blocks:** task-13-acceptance.md

**Context from dependencies:**
- **task-02** (тема): `admin.theme: 'light'`, Rubik (`--font-rubik` на `<html>` админки), `admin.meta`, `admin.components.graphics.Logo`/`Icon` (логотип Inex Glass уже показывается на экране входа и в шапке — эта задача только стилизует обёртку), токены сайта в `src/styles/ig-vars.css` (`--ig-*`), CSS-переменные Payload переназначены на токены в `_base.scss` (`--theme-elevation-*`, `--theme-success|error|warning-*`, `--font-body`, `--style-radius-*`, `--theme-bg`, `--theme-text`). CSS Payload лежит в `@layer payload-default`, незаслойный `custom.scss` его перекрывает. Базовые классы `.iga-card`, `.iga-btn` (`--primary|--secondary|--ghost|--danger`, `--sm`), `.iga-badge` (`--new|--work|--kp|--ok|--no` + цвет через CSS-переменную `--iga-badge-color`), `.iga-tag`, `.iga-chip` (`[aria-pressed=true]`), `.iga-seg`, `.iga-input`, `.iga-select`, `.iga-field`, `.iga-dl`, `.iga-bar`, `.iga-page-head`, `.iga-section-head`, `.iga-avatar`. Партиал этой задачи `src/app/(payload)/styles/_screens.scss` создан пустым и подключён.
- **task-03**: своё боковое меню (`src/payload/admin/nav/*`, `_nav.scss`), бургер на ≤ 1100 px. **task-04**: дашборд (`_dashboard.scss`). **task-05**: канбан заявок (`_kanban.scss`) и переключатель «Канбан / Таблица» в шапке списка заявок; быстрые фильтры списка (`lead-list-quick-filters.tsx`) могли быть дополнены task-05 — работать с актуальной версией файла. **task-07**: общий вид формы редактирования документа (поля, вкладки, панель документа, кнопки «Сохранить/Опубликовать/Предпросмотр») — в `_edit-form.scss`; здесь его **не дублировать**, только дополнения для конкретных экранов. **task-06**: кнопка «Подключить MAX» в профиле и панель привязки группы — свой `_max.scss`, не трогать.
- Макет: `res/admin-mockup/Leads.dc.html` (поиск-«пилюля», чипы фильтров с счётчиками, сегмент «Канбан / Таблица», бейджи статусов `s-new/s-work/s-ok/s-no`), `Lead.dc.html` / `PageEdit.dc.html` (карточки 16 px радиус, поля 42 px радиус 10, кнопки-«пилюли» 40 px). Цвета — только токены DESIGN.md §3.
- Компоненты с inline-стилями на `var(--theme-*)` (написаны до темы, task-32/33 прошлого спека), которые разрешено переделать на классы:
  - `src/payload/admin/leads/ui.tsx` (`Badge`, `Stack`, `Wrap`, `mutedText`) — **API экспорта не менять** (его используют ячейки, отчёт и, возможно, канбан task-05): `Badge({ children, color?, background?, title? })` рендерит `.iga-badge` и передаёт `color` через `--iga-badge-color` (единственное допустимое inline-значение), `background` — через `--iga-badge-bg`; `mutedText` можно оставить как объект стилей, но без цветов (цвет — класс `.iga-muted`) — либо заменить на экспорт `MUTED_CLASS`, обновив всех потребителей из списка ниже;
  - `src/payload/admin/leads/cells/*.tsx` (status, contact, source, duplicate, flags);
  - `src/payload/admin/leads/lead-list-quick-filters.tsx`, `src/payload/admin/leads/export-panel.tsx`;
  - `src/payload/admin/views/leads-report.tsx`;
  - `src/payload/admin/orders/panel.tsx` (`Panel`, `HINT_STYLE`, `ROW_STYLE`, `FIELD_STYLE`, `INPUT_STYLE`), `status-panel.tsx`, `token-panel.tsx`, `order-manage-view.tsx`, `orders/cells/*.tsx`;
  - `src/payload/admin/media/placeholder-cell.tsx`, `placeholder-filter-link.tsx`.
- Селекторы e2e, которые **нельзя ломать** (атрибуты и тексты сохранить): `[data-quick-filter="…"]` (+ `aria-current="true"` у активного), `[data-placeholder-count]`, `[data-placeholder-badge]`, `data-testid="order-status-panel"`, `data-testid="order-token-panel"` (и `textbox` внутри), `[data-warning="no-email"]`, отчёт: `[data-tile="total"]`, `[data-report="by-source"]`, `tr[data-source]`, `[data-total]`, `[data-export-link]`, `data-period`, `data-row`, `data-status`, `data-count`, `data-grand-total`; Payload-классы таблицы `.table table`, `tbody tr[data-id]`, `td.cell-status`; `.doc-controls__dots`, `.popup__content`; тексты «Повтор», «Новая», «Удалить персональные данные…».

## Files to Create

- нет (кроме, при необходимости, мелких client-обёрток внутри перечисленных папок — не создавать новых регистраций в конфиге)

## Files to Modify

- `src/app/(payload)/styles/_screens.scss` — все стили экранов (классы `.iga-*` и переопределения классов Payload под `.payload__app` / корнем админки)
- `src/payload/admin/leads/ui.tsx`, `src/payload/admin/leads/cells/*.tsx`, `src/payload/admin/leads/lead-list-quick-filters.tsx`, `src/payload/admin/leads/export-panel.tsx` — inline-цвета → классы
- `src/payload/admin/views/leads-report.tsx` — inline-цвета → классы, вёрстка плиток/таблиц как карточки дашборда
- `src/payload/admin/orders/panel.tsx`, `status-panel.tsx`, `token-panel.tsx`, `order-manage-view.tsx`, `src/payload/admin/orders/cells/*.tsx` — inline-цвета → классы
- `src/payload/admin/media/placeholder-cell.tsx`, `placeholder-filter-link.tsx` — inline-цвета → классы

**Не трогать:** `lead-summary-view.tsx`, `erase-menu-item.tsx`, `src/payload/admin/leads/card/*`, `constants.ts` (task-08), `src/payload/admin/leads/history/*` (task-09), `src/payload/admin/leads/kanban/*`, `nav/*`, `views/dashboard.tsx`, `max/*`, `seo/*`, чужие партиалы (`_base`, `_nav`, `_dashboard`, `_kanban`, `_max`, `_edit-form`, `_lead-card`, `_lead-history`), коллекции и `payload.config.ts`, `importMap.js`, `src/payload-types.ts`, `package.json`.

## Technical Details

### Подход

1. Открыть каждый экран в dev (`pnpm dev`, админ из `.env`), снять скриншоты «до» на 375 / 1366 / 1920 (Playwright или DevTools), найти реальные классы Payload 3.91 в DOM (и в `node_modules/@payloadcms/ui/dist/**/index.scss`, `node_modules/@payloadcms/next/dist/views/**`). Названия ниже — ориентир, сверить с DOM.
2. Стили писать в `_screens.scss`, сгруппировав по экранам (комментарий-заголовок на каждый). Специфичность — минимально достаточная (`.collection-list .table` и т. п.), без `!important`, кроме перебивания inline-стилей Payload (оставить комментарий).
3. Цвета — только `var(--ig-*)` (или переменные Payload, уже переназначенные task-02). Шрифт — наследуется (Rubik). Радиусы: карточки 16, поля 10, чипы/бейджи 6, кнопки — pill. Тени — `0 1px 2px rgba(28,31,34,.05)` (как `.iga-card`).
4. Компоненты: заменить объекты inline-стилей на `className` с классами `.iga-*` из `_base.scss` или новыми `.iga-screens-*` / `.iga-orders-*` / `.iga-report-*` / `.iga-media-*` в `_screens.scss`. Раскладку (flex/gap) тоже перенести в классы. Логику, props, тексты, data-атрибуты не менять.
5. `prefers-reduced-motion`: без переходов/подъёма; бесконечных анимаций нет (шиммеры Payload оставить как есть — это не наши стили).

### Экраны и требования

**Списки коллекций** (`.collection-list`, `.list-header`, `.list-controls`, `.search-filter`, `.table`, `.pagination`, `.per-page`, `.where-builder`, `.column-selector`, `.list-selection`):
- шапка списка: заголовок 22/700, кнопка «Создать» — `.iga-btn--primary`-вид (переопределить `.btn--style-primary` в контексте списка, если не сделано в `_base.scss`);
- поиск — «пилюля» 40 px, фон `--ig-bg`, рамка `--ig-line`, фокус `--ig-primary` + кольцо;
- кнопки «Колонки/Фильтры» — вторичные pill; панель фильтров — карточка;
- таблица: фон `--ig-surface`, заголовки колонок 12 px 500 `--ig-text-2` в обычном регистре (КАПС только для меток до 3 слов, DESIGN.md §5), строки 48 px, разделители `--ig-hairline`, hover строки `--ig-primary-light`, ссылки `--ig-primary-pressed`, числа `tabular-nums`; на ≤ 1100 px таблица прокручивается **внутри** своей обёртки (`overflow-x: auto`), страница — нет;
- пагинация и «на странице» — pill-кнопки, текущая — `--ig-primary` фон, белый текст;
- быстрые фильтры заявок (`lead-list-quick-filters.tsx`) — `.iga-chip` (активный — `aria-current="true"` → вид `[aria-pressed=true]`), счётчики `b` `tabular-nums`; кнопка «Выгрузка» — вторичная; `export-panel.tsx` — карточка с `.iga-field`/`.iga-input`/`.iga-select`;
- ячейки: статус — `.iga-badge` с цветом справочника; «Повтор» — `.iga-badge--work`; флаги — `.iga-tag`; контакт/источник — основной текст + вторичная строка `.iga-muted` 12 px; статус заказа и срок ссылки — `.iga-badge` по смыслу (`--ok`, `--work`, `--no`);
- медиатека (`placeholder-filter-link.tsx` + список `media`): чип «Временные изображения» с `[data-placeholder-count]`, миниатюры в ячейке 40×40 радиус 6, бейдж `[data-placeholder-badge]` — `.iga-badge--work`; если список в режиме сетки/папок — карточки с радиусом 10.

**Заказ — вкладка «Управление»** (`order-manage-view.tsx`, `panel.tsx`, `status-panel.tsx`, `token-panel.tsx`): панели — `.iga-card` (заголовок 16/600), поля — `.iga-field` + `.iga-input`/`.iga-select`, подсказки — `.iga-muted` 13 px, предупреждения `[data-warning]` — плашка `--ig-warning-bg`/`--ig-warning-text`, кнопки — `Button` Payload в теме или `.iga-btn`; история статусов — список-таймлайн как в карточке заявки (граница слева `--ig-line`). На 375 px поля в столбик, кнопки на всю ширину.

**Глобалы** (prices, promo, conditions, contacts, requisites, site-settings, navigation, snippets, tech-params — формы Payload): вкладки (`.tabs-field__tabs`) — сегмент-вид `.iga-seg` (фон `--ig-well`, активная — белая с тенью), массивы/группы (`.array-field`, `.group-field`, `.collapsible`) — карточки с радиусом 10 и рамкой `--ig-hairline`; описания полей `--ig-text-2` 13 px. Общие стили полей — из `_edit-form.scss` (task-07); здесь только вкладки/массивы/группы, если task-07 их не покрыла (проверить, не дублировать).

**Вход** (`.login`, `.template-minimal`, `forgot-password`, `reset-password`, `create-first-user`): фон `--ig-bg`, по центру карточка `.iga-card` шириной до 420 px, логотип (графика task-02) сверху ≥ 44 px высотой, поля 42 px, кнопка «Войти» — primary pill на всю ширину, ссылка «Забыли пароль?» — `--ig-primary-pressed`. На 375 px карточка без рамки на всю ширину с полями 16 px.

**Аккаунт** (`/admin/account`): форма как документ (стили task-07) + блок языка/темы Payload скрыть нельзя — привести к виду карточки; переключатель темы Payload — если отображается, скрыть (`display: none`), так как тема только светлая (`admin.theme: 'light'` его обычно убирает — проверить).

**Версии** (`/versions`, `/versions/<id>`; `.view-version`, `.render-field-diffs`, `.field-diff`, `.html-diff`): таблица версий как список коллекций; сравнение — удалённое `--ig-danger-bg`/`--ig-danger-text`, добавленное `--ig-success-bg`/`--ig-success-text` (AA-контраст, правка DESIGN.md: success-text `#237A35`).

**Toasts** (sonner в Payload: `.payload-toast-container`, `.payload-toast-item`, `.toast-success|error|warning|info` — сверить): фон белый, радиус 10, тень `dropdown`, полоска/иконка цвета статуса из семантических токенов.

**Модалки и дроверы** (`.modal`, `.drawer`, `.confirmation-modal`, `.document-drawer`, `.list-drawer`): оверлей `rgba(28,31,34,.4)`, карточка радиус 16, заголовок 20/700, кнопки pill; дровер на 375 px — на всю ширину.

**Отчёт по заявкам** (`/admin/leads-report/`, `leads-report.tsx`): заголовок страницы `.iga-page-head`, выбор периода — `.iga-seg` + поля дат, плитки — карточки-стат как на дашборде (число 32/700 `tabular-nums`, подпись 13 px), таблицы — стиль списков; воронка — горизонтальные `.iga-bar`.

### Адаптив

- 375 px: нет горизонтальной прокрутки страницы (проверка: `document.documentElement.scrollWidth <= innerWidth` на каждом экране); касания ≥ 44 px (чипы, пагинация, кнопки); таблицы прокручиваются внутри обёртки; формы в один столбец.
- 1366 / 1920: контент не растягивается бесконечно — формы глобалов и «Управление» заказа ограничить `max-width: 960px` для колонок полей (таблицы — на всю ширину).

### Скриншоты

`pnpm dev` (или `pnpm build && pnpm start`), админ e2e/локальный; снять для каждой ширины 375 / 1366 / 1920: список заявок (таблица), список заказов, «Управление» заказа, список страниц, медиатека, глобал «Цены», «Настройки сайта» (вкладка «Уведомления и заказы»), вход, аккаунт, сравнение версий страницы, отчёт по заявкам, toast и модалка удаления. Приложить к PR (не коммитить; итоговые скриншоты для отчёта делает task-13).

### Команды

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e -- e2e/admin-leads.spec.ts e2e/orders.spec.ts e2e/placeholder-media.spec.ts e2e/acceptance/roles.spec.ts --project=desktop-1366
git checkout -- src/payload-types.ts src/app/(payload)/admin/importMap.js   # не владелец
```

## Acceptance Criteria

- [ ] Все экраны из списка выглядят в теме макета (цвета, шрифт, радиусы, кнопки-pill, карточки) на 375 / 1366 / 1920; скриншоты приложены к PR.
- [ ] На 375 px ни на одном экране нет горизонтальной прокрутки страницы; таблицы прокручиваются внутри обёртки.
- [ ] В перечисленных компонентах не осталось inline-стилей с цветами и `var(--theme-*)` (проверка: `grep -rn "var(--theme" src/payload/admin` даёт только файлы других задач волны или пусто); допустимы только `--iga-badge-color` / `--iga-badge-bg`.
- [ ] API `Badge`/`Stack`/`Wrap` из `ui.tsx` не изменился (потребители task-05/08 собираются без правок).
- [ ] Все e2e-селекторы из раздела «Context» на месте; `e2e/admin-leads.spec.ts` (тест списка), `e2e/orders.spec.ts`, `e2e/placeholder-media.spec.ts`, `e2e/acceptance/roles.spec.ts` проходят на `desktop-1366`.
- [ ] Переключателя тёмной темы в аккаунте нет; цвета логотипа (оранжевый/голубой) нигде, кроме логотипа, не используются.
- [ ] Стили только в `_screens.scss` (чужие партиалы не тронуты); `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные.

## Notes

- Payload может менять имена классов между минорными версиями; фиксировать стили на классах, которые реально есть в 3.91 (сверка с DOM обязательна), и группировать по экранам, чтобы при обновлении Payload было понятно, что проверять.
- Если для экрана нужен новый компонент или регистрация в конфиге — остановиться и сообщить координатору (конфиг и `importMap.js` в этой волне не трогаются этой задачей).
- `mutedText` и подобные объекты могут использоваться в `lead-summary-view.tsx` старой версии — после слияния task-08 там их уже нет; если task-08 ещё импортирует что-то из `ui.tsx`, экспорт не удалять.

## Поправки координатора (приоритет над текстом выше)

- task-12 зависит также от task-05 (быстрые фильтры, переключатель Канбан/Таблица) и task-07 (общие стили edit-view в `_edit-form.scss`). Общие селекторы edit-view не переопределять; стилизовать только специфичные экраны.
