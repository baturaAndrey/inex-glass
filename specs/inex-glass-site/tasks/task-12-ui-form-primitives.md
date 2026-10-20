# Task 12: UI-примитивы форм (Field, Input, Select, ConsentCheckbox, Chip, RadioCard, FileUpload, PhoneInput, DatePicker)

## Status

pending

## Wave

3

## Description

React-обёртки над классами дизайн-системы Inex Glass для всех форм сайта: квиз, модальные формы («Отправить чертёж», «Заказать звонок», «Заказать образец», «Подобрать под нагрузку»), форма контактов. Компоненты типизированы, доступны (aria, клавиатура), без логики отправки: загрузку файла на сервер, валидацию по zod и запросы выполняют потребители (task-20, task-21). Стили берутся из `ig-components.css` (классы `.ig-field`, `.ig-input`, `.ig-check`, `.ig-chip`, `.ig-radio-card`, `.ig-upload`, `.ig-file`), подключённого задачей 05.

## Dependencies

**Depends on:** task-05-design-tokens-shell-primitives.md
**Blocks:** task-14-site-header-footer.md (поле поиска), task-16-blocks-render-miniseed.md, task-20-quiz-core.md, task-21-forms-modals.md

**Context from dependencies:** task-05 создал:
- `src/styles/ig-tokens.css` (токены `--ig-*`, с поправками контраста: основная кнопка `#267D70`, hover `#1F6B60`, `--ig-success-text: #237A35`) и `src/styles/ig-components.css` (классы `.ig-*` из `res/inex-glass-handoff/design-system/components.css`), подключённые в `src/app/(site)/globals.css` через `@import … layer(base)` / `layer(components)`;
- Tailwind v4 `@theme inline` с цветами (`bg-primary`, `text-text-2`, `border-line`, …), радиусами, брейкпоинтами `sm=600 / md=1101 / lg=1366 / xl=1536 / 2xl=1920` (`max-sm:` = ≤599) и переменной `--ig-gutter`;
- Rubik через `next/font/local` (`--font-rubik`);
- примитивы в `src/components/ig/`: `container.tsx`, `section.tsx`, `page-hero.tsx`, `button.tsx` (`<Button variant="primary|secondary|ghost|onDark" size="l|m|s|icon" asChild>`), `text-link.tsx`; утилита `cn()` из `@/lib/utils`;
- dev-страницу `src/app/(site)/ui-kit/page.tsx` (404 в production, `SITE_ENV`). Сверяйте точные имена пропсов `Button` по файлу `src/components/ig/button.tsx`.

Тема только светлая; иконки — Lucide (`lucide-react`), линия 2, размер 16–24 px.

## Files to Create

В `src/components/ig/`:
- `field.tsx` — `Field` + контекст (`FieldContext`, `useFieldControl`)
- `input.tsx` — `Input`
- `textarea.tsx` — `Textarea`
- `select.tsx` — `Select`
- `consent-checkbox.tsx` — `ConsentCheckbox`
- `chip.tsx` — `Chip`
- `chip-group.tsx` — `ChipGroup`
- `radio-card.tsx` — `RadioCard`, `RadioCardGroup`
- `file-upload.tsx` — `FileUpload`
- `phone-input.tsx` — `PhoneInput`
- `phone-mask.ts` + `phone-mask.test.ts` — чистые функции маски телефона
- `date-picker.tsx` — `DatePicker`
- `date-mask.ts` + `date-mask.test.ts` — чистые функции даты `дд.мм.гггг`

Демо-страница:
- `src/app/(site)/ui-kit/forms/page.tsx` и `src/app/(site)/ui-kit/forms/forms-demo.tsx` (client) — все компоненты во всех состояниях; страница возвращает `notFound()`, если `SITE_ENV === 'production'` (как `ui-kit/page.tsx`).

## Files to Modify

Нет. (Не править `ig-components.css`, `button.tsx`, `ui-kit/page.tsx` — они принадлежат task-05. Если нужного стиля нет в CSS, добавлять Tailwind-классы в самом компоненте.)

## Technical Details

### Общие правила

- Каждый компонент: `forwardRef` где уместно, принимает `className` (мерж через `cn()`), пробрасывает остальные нативные атрибуты. Состояния — через `aria-invalid`, `aria-describedby`, `aria-checked`, `aria-pressed`, `disabled`; визуально ошибка = класс `is-error` (как в `components.css`).
- Компоненты с состоянием/обработчиками — `'use client'`. `Field` без хуков состояния может быть серверным, но использует `useId`/контекст → тоже `'use client'`.
- Размеры касаний ≥ 44 px на мобильных; видимый фокус (`:focus-visible` уже в CSS).
- Никаких эмодзи, только Lucide-иконки. Тексты ошибок — как указано ниже, дословно.
- Фокус не уводить при ошибке автоматически (это делает форма-потребитель), но `Field` отдаёт `id` ошибки для `aria-describedby`.

### Field / Input / Textarea / Select

```tsx
<Field label="Телефон" required hint="Позвоним в рабочее время" error={errors.phone}>
  <PhoneInput value={…} onChange={…} />
</Field>
```

- `Field` props: `label: ReactNode`, `required?: boolean` (звёздочка `<span class="ig-req" aria-hidden>*</span>`), `optional?: boolean` (серая пометка «необязательно» `.ig-field__opt`), `hint?: ReactNode` (`.ig-field__hint`), `error?: string | null` (`.ig-field__error` с иконкой `TriangleAlert` 16 px, `role="alert"` не нужен — ставим `aria-live="polite"`), `htmlFor?`, `className`, `children`.
- `Field` создаёт `id` через `useId()`, отдаёт в `FieldContext` значения `{ id, describedBy, invalid, required }`. `Input`/`Textarea`/`Select`/`PhoneInput`/`DatePicker` читают контекст через `useFieldControl()` и сами выставляют `id`, `aria-describedby` (hint + error), `aria-invalid`, `aria-required`, класс `is-error`. Вне `Field` работают самостоятельно (контекст необязателен).
- `Input` — `<input class="ig-input">` (высота 48 px), `Textarea` — `.ig-textarea` (min-height 112 px, `resize: vertical`), `Select` — нативный `<select class="ig-select">` со стрелкой из CSS; `Select` принимает `children` (`<option>`) и необязательный `placeholder` (первая отключённая option). Поиск в шапке (task-14) использует `Input` с классом `rounded-full pl-11` (иконка слева — на стороне потребителя).

### ConsentCheckbox

Тексты **дословно** (teksty/15-politika-pdn.md §3): «Даю [согласие на обработку персональных данных] и ознакомлен с [политикой обработки персональных данных]». Ссылки: `/soglasie-na-obrabotku-personalnyh-dannyh/` и `/politika-konfidencialnosti/` (`<a target="_blank" rel="noopener">`, обычные `a` или `next/link`).

Props: `checked: boolean`, `onCheckedChange(checked: boolean)`, `error?: boolean | string` (строка — показать как `.ig-field__error`; `true` — только красная рамка), `id?`, `name?`, `className`. Разметка `.ig-check` (+`is-error`). По умолчанию **не отмечен** (контролируется родителем; не задавать `defaultChecked`). Константа и экспорт текста ошибки: `export const CONSENT_ERROR = 'Чтобы отправить заявку, отметьте согласие на обработку персональных данных'`.

### Chip / ChipGroup

- `Chip`: `<button type="button" class="ig-chip">`; props `active?: boolean` (класс `is-active`, `aria-pressed`), `icon?: ReactNode`, `as?: 'button'`; вариант-ссылка: если передан `href` — рендер `<a>`/`next/link` (для чипсов фильтров и ссылок), `static?: boolean` для `.ig-chip--static` (неинтерактивный тег; с `onRemove` — маленькая кнопка «×» с `aria-label="Убрать фильтр: …"`).
- `ChipGroup`: props `options: { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }[]`, `value`, `onChange`, `mode: 'single' | 'multiple'`, `ariaLabel`/`aria-labelledby`, `className`. Контейнер `.ig-chips` с `role="group"` (multiple, кнопки `aria-pressed`) либо `role="radiogroup"` (single: кнопки `role="radio"`, `aria-checked`, roving tabindex, стрелки ←/→/↑/↓ переключают и фокусируют). Для `single` повторный клик по выбранному может сбрасывать значение, если `allowClear`.
- Тип значения: `single` → `string | null`, `multiple` → `string[]`.

### RadioCard / RadioCardGroup

Для шагов 1 и 2 квиза (тип изделия, толщина).
- `RadioCard` props: `selected: boolean`, `onSelect()`, `icon?: ReactNode` (Lucide 24 px в `.ig-radio-card__icon`), `title: ReactNode`, `sub?: ReactNode`, `disabled?`, `className`; разметка `<button role="radio" aria-checked class="ig-radio-card [is-selected]">` с кружком `.ig-radio-card__mark`.
- `RadioCardGroup` props: `value`, `onChange`, `options: { value; title; sub?; icon? }[]`, `ariaLabel`, `columns?: 2 | 3 | 4` (адаптивная сетка: 4 колонки ≥1366, 3 ≥1101, 2 ≥600, 1–2 на телефоне; для карточек толщин — 2 колонки на телефоне), roving tabindex и стрелки.

### FileUpload

Состояния (визуально — по `Kviz.dc.html`, блок «Шаг 5», `.ig-upload` / `.ig-file`): **пусто**, **drag**, **загрузка** (прогресс), **готово**, **ошибка формата**, **ошибка размера**, **ошибка загрузки**.

```ts
interface FileUploadProps {
  accept: readonly string[];            // расширения без точки, нижний регистр: ['dwg','dxf','pdf','jpg','jpeg','png']
  maxBytes: number;                      // 52428800
  value: { name: string; size: number } | null;       // файл успешно загружен
  uploading?: { name: string; size: number; progress?: number } | null; // 0..1
  onSelect: (file: File) => void;        // вызывается только для валидного файла; загрузку выполняет потребитель
  onClear: () => void;
  onReject?: (reason: 'format' | 'size', file: File) => void;
  error?: string | null;                 // внешняя ошибка (например, сервер отклонил файл)
  title?: ReactNode;                     // по умолчанию «Перетащите чертёж или выберите файл»
  hint?: ReactNode;                      // по умолчанию «DWG, DXF, PDF, JPG или PNG · до 50 МБ» (строится из accept/maxBytes)
  disabled?: boolean;
  id?: string; name?: string;
}
```

- Внутри — скрытый `<input type="file" accept=".dwg,.dxf,…">`, видимая кнопка «выберите файл» (`.ig-link`), drag&drop (`dragenter/over/leave/drop`, класс `is-drag`, заголовок «Отпустите файл»). Один файл за раз.
- Локальная проверка: расширение (по имени, без регистра) входит в `accept`, размер ≤ `maxBytes`. Ошибки (тексты **дословно**, teksty/05-kviz.md «Ошибки формы»):
  - формат: «Подойдут DWG, DXF, PDF, JPG или PNG» (список строится из `accept` в порядке DWG, DXF, PDF, JPG, PNG, с «или» перед последним; для набора без JPG/PNG — «Подойдут DWG, DXF или PDF»);
  - размер: «Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии» (число — из `maxBytes`, 52428800 → «50 МБ»);
  - кнопка в состоянии ошибки — «Выбрать другой файл» (`.ig-link`), сбрасывает локальную ошибку и открывает диалог.
- Готово: плашка `.ig-file` — бейдж расширения (`.ig-file__ext`, ЗАГЛАВНЫМИ), имя (`.ig-file__name`, обрезка), мета `.ig-file__meta` с иконкой `Check`: «{размер} · загружено» (размер: `4,2 МБ`, `850 КБ` — функция `formatFileSize`, экспортируется), кнопка «удалить» (`Button variant="ghost" size="s"`, `aria-label="Удалить файл {имя}"`).
- Загрузка: плашка `.ig-file` + полоса прогресса (`role="progressbar"`, `aria-valuenow`), meta «Загрузка…». Состояния озвучиваются `aria-live="polite"`.
- Работает с клавиатуры (кнопка выбора доступна по Tab/Enter); область drop — `role="group"` с `aria-label`.

### PhoneInput (+ phone-mask.ts)

Контролируемый `<input type="tel" inputMode="tel" autoComplete="tel">` с маской **`+7 (___) ___-__-__`** (placeholder именно такой).

```ts
// phone-mask.ts — чистые функции
phoneDigits(input: string): string          // только цифры национального номера (10 цифр максимум); ведущие 7/8 отбрасываются, если после них ещё ≥10 цифр или ввод начался с них
formatPhoneMask(input: string): string      // '9001234567' → '+7 (900) 123-45-67'; частичный ввод форматируется постепенно: '900' → '+7 (900', '90012' → '+7 (900) 12'
isPhoneComplete(input: string): boolean     // ровно 10 национальных цифр
toE164(input: string): string | null        // '+79001234567' либо null
```

Props: `value: string` (маскированное значение), `onChange(masked: string, e164: string | null)`, остальное как у `Input`. Вставка «8 900 123-45-67», «+7(900)…», «79001234567» нормализуется. Стирание Backspace корректно удаляет маску. Тесты `phone-mask.test.ts`: все перечисленные формы вставки, частичный ввод, лишние символы, пустая строка → `''`, 11 цифр с ведущей 8.

### DatePicker (+ date-mask.ts)

Поле даты с маской `дд.мм.гггг` (как в прототипе Kviz: текстовое поле, placeholder «дд.мм.гггг») и кнопкой-иконкой календаря (`CalendarDays`), открывающей нативный выбор даты через скрытый `<input type="date">` (`showPicker()` с проверкой поддержки).

```ts
// date-mask.ts
maskRuDate(input: string): string                  // '25122026' → '25.12.2026'; по мере ввода
parseRuDate(input: string): string | null          // '25.12.2026' → '2026-12-25'; невалидная дата (31.02.2026) → null
formatRuDateFromIso(iso: string): string           // '2026-12-25' → '25.12.2026'
```

Props: `value: string` (ISO `YYYY-MM-DD` или `''`), `onChange(iso: string)`, `min?: string` (ISO), `max?`, `invalid?`. Локальный текстовый буфер синхронизируется с `value`. При вводе полной невалидной даты — ошибка «Введите дату в формате дд.мм.гггг» (через `Field.error` потребителя; компонент отдаёт `onInvalid?(text)`); значение `min` валидируется только как `aria`/подсказка — **не блокирует** (в квизе даты раньше срока дают подсказку «срочно», а не ошибку). Тесты `date-mask.test.ts`: маска, високосный день (29.02.2028 валидно, 29.02.2027 — null), границы месяцев.

### Демо-страница

`/ui-kit/forms/` показывает: Field с hint/error/required/optional; Input/Textarea/Select в состояниях default/hover/focus/error/disabled; ConsentCheckbox (обычный и с ошибкой); ChipGroup single и multiple; RadioCardGroup (типы изделий с иконками Lucide и толщины с подписью «N × 2,5 кг/м²»); FileUpload во всех семи состояниях (переключатель состояний); PhoneInput; DatePicker.

### Environment Variables

Нет. (Демо-страница использует `SITE_ENV` из `@/lib/env`.)

## Acceptance Criteria

- [ ] Все перечисленные файлы созданы; экспортируемые имена и сигнатуры пропсов совпадают с описанием (на них опираются task-20 и task-21).
- [ ] Тексты — дословно: ConsentCheckbox и `CONSENT_ERROR`; ошибки FileUpload; placeholder телефона `+7 (___) ___-__-__`; placeholder даты «дд.мм.гггг».
- [ ] ConsentCheckbox по умолчанию не отмечен; ссылки ведут на `/soglasie-na-obrabotku-personalnyh-dannyh/` и `/politika-konfidencialnosti/`.
- [ ] FileUpload: форматы/размер проверяются локально, `onSelect` вызывается только для валидного файла; drag&drop работает; состояние ошибки сбрасывается кнопкой «Выбрать другой файл»; корректная работа с клавиатуры.
- [ ] RadioCardGroup и ChipGroup(single) — roving tabindex и стрелки; screen-reader роли `radiogroup`/`radio`, `aria-checked`/`aria-pressed`.
- [ ] `pnpm test` (unit для `phone-mask`, `date-mask`), `pnpm lint`, `pnpm typecheck` проходят.
- [ ] Визуальная проверка `/ui-kit/forms/` на ширинах 375 / 1366 / 1920 против прототипов `res/inex-glass-handoff/prototypes/Controls.dc.html` и `Kviz.dc.html` (блок поля/загрузка/радио-карточки): размеры 48 px, радиусы 10/16, цвета и фокус-кольцо совпадают; нет горизонтального скролла.
- [ ] В production `/ui-kit/forms/` отдаёт 404.

## Notes

- Модель: премиум.
- Источники визуала: `res/inex-glass-handoff/design-system/components.css` (разделы «Поля», «Загрузка файла», «Чекбокс / радио-карточки», «Чипсы»), прототипы `Controls.dc.html`, `Kviz.dc.html`, `Quiz.dc.html`.
- Демо-панели «Демо:» из прототипа Kviz на сайт не переносить.
- Загрузка файла на сервер (`POST /api/upload/`) и токены — вне этой задачи; `FileUpload` получает состояние извне.
