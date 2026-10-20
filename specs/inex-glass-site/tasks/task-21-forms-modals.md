# Task 21: Формы и модальные окна («Отправить чертёж», «Заказать звонок», «Заказать образец», «Подобрать под нагрузку», форма контактов, полная форма)

## Status

pending

## Wave

5

## Description

Реализует все формы сайта, кроме квиза: параметризуемую форму с файлом «Отправить чертёж / проект / планировку / размеры / макет» (короткая модальная и полная встроенная версия), «Заказать звонок», «Заказать образец», «Подобрать под нагрузку» и форму на странице «Контакты». Формы открываются в модальном окне через `FormTrigger`/`FormDialogProvider` (создали task-14/15 как каркас с заглушками в реестре) либо встраиваются в страницу блоком `form`. Все формы работают по одним правилам: чекбокс согласия (по умолчанию не отмечен), файл ≤ 50 МБ, антиспам (honeypot + токен формы), цели Метрики, экран «Спасибо». Данные уходят в модуль заявок (`POST /api/leads/`, task-17).

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-17-lead-intake-uploads.md, task-19-metrika-analytics.md, task-20-quiz-core.md (клиентские модули — контракт той же волны)
**Blocks:** task-22-page-home.md, task-23-zak-hub-thicknesses.md, task-24-glass-types.md, task-25-processing.md, task-26-constructions.md (используют `FormBlock` и `FormTrigger` с реальными формами)

**Context from dependencies:**
- **task-15** создал каркас форм: `src/components/forms/form-dialog-provider.tsx` (`FormDialogProvider` — единственное модальное окно сайта на Radix Dialog: оверлей, `DialogTitle`, крестик, возврат фокуса, на ≤599 на весь экран; хук `useFormDialog(): { openForm(key, params?), closeForm(), openKey }`; заголовок по умолчанию: callback — «Заказать звонок», drawing — «Отправить чертёж», sample — «Заказать образец», load — «Подобрать под нагрузку», contacts/full — «Отправить заявку»; `params.title` его переопределяет), `form-trigger.tsx` (`<FormTrigger formKey params asChild>`), `registry.tsx` (`export const FORM_REGISTRY: Record<FormKey, ComponentType<FormComponentProps>>` — пока заглушки; файл передан этой задаче целиком). Типы: `FormKey = 'drawing' | 'callback' | 'sample' | 'load' | 'contacts' | 'full'`; `FormParams { label?: string; source?: string; accept?: string[]; title?: string; [key: string]: unknown }`; `FormComponentProps { params: FormParams; onClose(): void; onSuccess?(): void; variant: 'modal' | 'page' }`. **Прочитать эти файлы до начала работы** и сохранить публичные контракты.
- **task-16** создал блок-рендер `src/components/blocks/render-blocks.tsx` (компоненты блоков получают `{ block, ctx }`) и заглушку `src/components/blocks/form-block.tsx` (блок `form`); сид-фреймворк. Блок `form` в схеме (task-07): `formKey`, `variant` (`card` | `inline` | `page`), `bullets[]` (строки), `showContacts`, `submitLabel`, `fileLabel`, `sourceLabel`, `params` (json) + общие поля секции (`anchorId`, `background`, `heading`, `headingLevel`, `sub`).
- Тексты экрана благодарности и ошибки отправки редактируются в global `site-settings.forms` (`thankYouTitle`, `thankYouText`, `submitErrorText` с меткой `{телефон}`); телефон — `contacts.phones` (основной); часы работы — `contacts.workHours.full`.
- **task-11** (`src/lib/domain/*`): `lead-schemas.ts` — `FORM_TYPES = ['quiz','drawing','callback','sample','load','contacts','full']`, `leadSubmitSchema` (discriminated union по `formType`), `leadSubmitSchemaForForm(formType)` (клиентская валидация), `normalizePhone`, `CONSENT_MESSAGE`. Состав полей по `formType`: `drawing` и `full` — name*, phone*, company, email, city, area, comment, uploadTokens, `sourceLabel?`, `params?`; `callback` — name*, phone*; `sample` — name*, phone*, company, email, glassKind, address, comment; `load` — description*, sizes, mounting, name*, phone*, company, email, uploadTokens; `contacts` — name*, phone*, company, email, comment, uploadTokens. Общая часть: `entryPage`, `utm?`, `metrikaClientId?`, `consent: true`, `formToken`, `company_website?`, `uploadTokens?` (≤ 5). Сообщения: «Заполните поле, чтобы мы могли связаться с вами», «Чтобы отправить заявку, отметьте согласие на обработку персональных данных», «Укажите телефон в формате +7 (900) 000-00-00», «Проверьте адрес электронной почты».
- **task-12** (`src/components/ig/*`): `Field`, `Input`, `Textarea`, `Select`, `ConsentCheckbox`, `FileUpload`, `PhoneInput`, `Chip`/`ChipGroup`. **task-13**: `Callout`, `Breadcrumbs` и пр. **task-05**: `Button`, `Container`, `Section`.
- **task-17**: `POST /api/upload/`, `/api/form-token/`, `POST /api/leads/`; антиспам: honeypot `company_website`, HMAC-метка времени (форма принимается не раньше чем через 3 с после выдачи токена и не позже 2 ч), rate-limit 5 заявок / 10 мин с IP.
- **task-19**: `reachGoal(name, params?)`; цели `form_submit` и `file_upload` (ТЗ §10).
- **task-20 (та же волна, контракт):** клиентские модули, которые эта задача только **использует** и не меняет: `src/lib/client/upload-file.ts` (`uploadFile(file, { signal?, onProgress? }) → { token, name, size, ext }`, `UploadFailure{code}`, `validateClientFile`, `ALLOWED_DRAWING_EXT = ['dwg','dxf','pdf']`, `MAX_UPLOAD_BYTES`), `src/lib/client/submit-lead.ts` (`useFormToken()`, `submitLead(body)`, `SubmitError{code, fieldErrors}`), `src/lib/client/attribution.ts` (`getLeadAttribution(entryPage?) → Promise<{ entryPage, utm, metrikaClientId? }>` — адаптер над `getAttribution()`/`getClientId()` task-19; захват UTM делает глобально `<AttributionCapture/>` в `<Metrika/>`, формы `captureAttribution()` не вызывают). Если к моменту выполнения их ещё нет — использовать согласованные сигнатуры, после слияния сверить; расхождения — в отчёт, модули task-20 не править.

## Files to Create

В `src/components/forms/`:
- `drawing-form.tsx` — `DrawingForm` (параметры `label`, `source`, `accept`; варианты `modal` и `full`)
- `callback-form.tsx` — `CallbackForm`
- `sample-form.tsx` — `SampleForm`
- `load-form.tsx` — `LoadForm`
- `contacts-form.tsx` — `ContactsForm` (встроенная форма страницы контактов)
- `form-shell.tsx` — общая оболочка полей/кнопки/ошибок/благодарности, `useLeadForm()` (состояние, валидация, отправка), `FormThanks`
- `form-texts.ts` — `FORM_TEXTS` (все тексты форм в одном месте; значения по умолчанию для `site-settings.forms`)
- `use-forms-config.ts` — клиентский хук `useFormsConfig()`: один раз за сессию запрашивает `GET /api/forms-config/` (телефон, часы работы, тексты благодарности/ошибки), до ответа и при ошибке использует `FORM_TEXTS` и DOM-fallback телефона (первая `a[href^="tel:"]` на странице)
- `src/app/api/forms-config/route.ts` — публичный `GET`: `{ phone, workHours, thankYouTitle, thankYouText, submitErrorText }` из globals `contacts` и `site-settings` через загрузчики task-15 (только публичные безопасные поля; `Cache-Control: public, max-age=300, stale-while-revalidate=3600`; метка `{телефон}` в `submitErrorText` уже подставлена)
- `form-section.tsx` — серверная секция-обёртка `FormSection` («Отправьте чертёж»: левая колонка с условиями и контактами + карточка формы) для `full` и `contacts`; экспортируется для страниц task-22/23 и используется блоком `form`
- `use-lead-form.test.ts` — Vitest: сборка тела заявки по `formKey` проходит `leadSubmitSchema`
- `src/app/(site)/ui-kit/forms-live/page.tsx` — dev-обвязка (кнопки-триггеры всех модальных форм + встроенные `full`/`contacts`), `notFound()` при `SITE_ENV === 'production'`
- `e2e/forms.spec.ts`

## Files to Modify

- `src/components/forms/registry.tsx` — заменить заглушки реальными формами в `FORM_REGISTRY` (через `next/dynamic`, чтобы код форм не попадал в начальный бандл; сохранить экспортируемую форму реестра из task-15).
- `src/components/blocks/form-block.tsx` — заменить заглушку реальной реализацией блока `form` (см. «FormBlock»). Сохранить имя экспорта и форму пропсов заглушки (`{ block, ctx }`).
- `src/components/forms/form-dialog-provider.tsx` — **минимально**: (а) заголовок окна = `params.title ?? params.label ?? <заголовок по умолчанию для formKey>` (чтобы страницы могли открывать «Отправить планировку», «Загрузить чертёж DWG / DXF» …, передавая `label`); (б) если провайдер не передаёт форме `variant="modal"` и `onClose` — добавить; (в) проверить полноэкранный режим ≤599 и закреплённую кнопку (см. «Оболочка модалки»). Любая правка — в отчёт.

Не трогать: `src/lib/client/*` (task-20), `src/lib/domain/*`, остальные `src/app/api/**` (task-17), `src/app/(site)/layout.tsx` (task-14), `src/components/ig/*`, схему Payload, `src/seed/**` (у формы нет контента в CMS), `form-trigger.tsx` (task-15, кроме явной ошибки — тогда сообщить).

## Technical Details

### Общие правила для всех форм

- `'use client'`. Поля — компоненты `ig/*`; ошибки — `Field error`; первая ошибка получает фокус при неудачной отправке. Подписи: звёздочка `*` у обязательных (через `required`), пометка «необязательно» не ставится, кроме ИНН (в формах его нет).
- **Согласие:** `ConsentCheckbox`, по умолчанию не отмечен; без отметки — ошибка «Чтобы отправить заявку, отметьте согласие на обработку персональных данных» (кнопка `aria-disabled`, но клик показывает ошибку).
- **Антиспам:** скрытое поле `company_website` (вне экрана, `tabIndex={-1}`, `aria-hidden`, `autoComplete="off"`); токен формы `useFormToken()` запрашивается при монтировании формы (не при открытии кода-на-сервере); ответ `token`/`rate_limit` обрабатывать как ошибку отправки.
- **Файл:** `FileUpload` (`accept=['dwg','dxf','pdf']` по умолчанию — для форм JPG/PNG не принимаются сервером; список можно сузить параметром `accept`), `maxBytes=52428800`, подсказка `DWG, DXF, PDF · до 50 МБ`; файл грузится сразу при выборе (`uploadFile` с прогрессом), токен сохраняется в `uploadTokens`; во время загрузки кнопка отправки неактивна (`aria-disabled`, текст не меняется); успех → `reachGoal('file_upload', { ext, form })`. Максимум 1 файл в формах.
- **Отправка:** `submitLead(body)`; тело: `{ formType, entryPage, utm, metrikaClientId, consent: true, formToken, company_website, uploadTokens?, sourceLabel, params, …поля формы }`; `entryPage`/`utm`/`metrikaClientId` — из `await getLeadAttribution(window.location.pathname)`. `sourceLabel` = подпись кнопки/формы (`params.label`, напр. «Отправить чертёж»), `params = { source, … }` (`source` — идентификатор места: `home-hero`, `zakalennoe-steklo`, `thickness-10`, …). Успех → `reachGoal('form_submit', { form: formKey, source })` → экран благодарности. Ошибка → `role="alert"`-баннер с текстом `submitErrorText` («Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}», телефон — ссылкой `tel:`); поля не очищаются.
- **Тексты и телефон из CMS:** `useFormsConfig()` (хук ниже) отдаёт `thankYouTitle`, `thankYouText`, `submitErrorText`, `phone`, `workHours`; значения по умолчанию (`FORM_TEXTS`) равны дословным текстам teksty/05 и сидовым значениям `site-settings.forms`, поэтому форма корректна и до ответа API. Для `FormSection`/`FormBlock` (серверные) те же значения читаются прямо из loader’ов task-15 и передаются пропсом (`config`), запрос к API не нужен.
- **Экран благодарности** (`FormThanks`): иконка `Check` в круге primary-light, заголовок `thankYouTitle` («Спасибо, заявка принята»), текст `thankYouText` («Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня, для больших объёмов дольше. Связь — звонком и по e-mail.» — teksty/05; отдельных текстов для звонка/образца/нагрузки в источниках нет, используется тот же; отметить в отчёте), кнопка «Закрыть» (`onClose`) в модальном варианте; во встроенной форме экран заменяет карточку формы. Фокус — на заголовок, `aria-live="polite"`; в модалке вызывается `onSuccess?.()`.
- Тексты: плейсхолдеры — «ООО «Название»» (компания), «Как к вам обращаться» (имя), `+7 (___) ___-__-__` (телефон, внутри `PhoneInput`), «name@company.ru» (e-mail), «Например, Екатеринбург» (город), «от 50» (площадь). Все строки лежат в `FORM_TEXTS` (`form-texts.ts`).
- Клиентская валидация: `leadSubmitSchemaForForm(formType)` (+ UI-обязательные поля ниже). Серверная — та же схема.

### Оболочка модалки

Каркас (`FormDialogProvider` из task-15) отвечает за `Dialog` (Radix): оверлей `bg-black/50`, **заголовок `DialogTitle`**, закрытие по Esc/оверлею/кнопке `X` (`aria-label="Закрыть"`), возврат фокуса на триггер, на ≤599 — на весь экран. Формы этой задачи в варианте `modal` **не рисуют собственный заголовок** — рендерят подстроку (если есть), поля и футер с кнопкой; заголовок задаёт провайдер из `params.title ?? params.label ?? <по умолчанию>` (см. «Files to Modify»). В варианте `page` заголовок секции рисует `FormSection`. Требования к виду (проверить, при отсутствии — доработать провайдер минимально): контент `rounded-lg` (16), тень `modal`, ширина `max-w-lg` для `callback`, `max-w-2xl` для `drawing`/`sample`/`load` (если провайдер задаёт единую ширину `max-w-lg` — форма работает и в ней; расширять окно под 2-колоночные формы — по `params`/`formKey`), внутренние отступы 24, поля в 2 колонки ≥600 (в узком окне — 1 колонка); **≤599 — на весь экран** (`inset-0`, `h-dvh`, без скругления), тело прокручивается, кнопка отправки закреплена внизу (`sticky bottom-0`, фон `bg-surface`, `pb-[env(safe-area-inset-bottom)]`). Открытие формы не прыгает по высоте при ошибках (ошибки появляются под полем). Z-index выше `StickyCta` и cookie-баннера.

### Формы

Каждый компонент формы — `({ params, onClose, onSuccess, variant }: FormComponentProps) => JSX.Element`, `variant: 'modal' | 'page'`; `params.label` задаёт подпись/`sourceLabel`, `params.source` — метку места, `params.accept` (подмножество `['dwg','dxf','pdf']`) сужает список форматов.

Общие подписи полей (дословно с `Home.dc.html` / `Contacts.dc.html`): «Компания», «Имя», «Телефон», «E-mail», «Файл», «Город доставки», «Площадь, м²», «Комментарий».

1. **`drawing`** — «Отправить чертёж» (одна параметризуемая форма). `params`: `label` (заголовок и `sourceLabel`; по умолчанию «Отправить чертёж»; на страницах бывают «Отправить планировку», «Отправить проект», «Отправить размеры», «Отправить макет», «Отправить размеры зала», «Отправить чертёж на проверку», «Загрузить чертёж DWG / DXF»), `source`, `accept`. Поля **модальной (короткой)** версии: Компания *, Имя *, Телефон *, E-mail, Файл, Комментарий; кнопка «Отправить». Под кнопкой мелко: «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².»
2. **`full`** — полная встроенная форма главной, хаба и карточек толщин (`FormBlock formKey="full"`): Компания *, Имя *, Телефон *, E-mail, Файл, Город доставки, Площадь, м², Комментарий; кнопка «Получить расчёт»; подпись «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².» (тот же набор полей отправляется как `formType: 'full'`). Файл — до 50 МБ (DWG, DXF, PDF). В прототипах хаба и карточек толщины поля «Комментарий» нет — оставить его (общая форма), порядок: Компания, Имя, Телефон, E-mail, Файл (на всю ширину), Город доставки, Площадь, Комментарий (на всю ширину), согласие, кнопка.
3. **`callback`** — «Заказать звонок»: Имя *, Телефон *; кнопка «Заказать звонок»; под полями строка часов работы из `contacts` (напр. «Пн–пт, 9:00–18:00»; без телефонов). Самая короткая форма: `max-w-lg`.
4. **`sample`** — «Заказать образец»: вводный текст «Образцы — бесплатно, изготовление — около недели.» (teksty/08, общий блок «Образцы и цветопроба»); поля: Компания *, Имя *, Телефон *, E-mail, «Вид стекла» (`Select`: Матовое · Тонированное · Крашеное по RAL · Осветлённое · Рифлёное · Другое; предзаполняется параметром `params.vid` со страницы вида стекла: `matte`→Матовое, `tinted`→Тонированное, `painted`→Крашеное по RAL, `low-iron`→Осветлённое, `ribbed`→Рифлёное), «Адрес или город», «Комментарий»; кнопка «Заказать образец».
5. **`load`** — «Подобрать под нагрузку»: подзаголовок «Опишите конструкцию — размер стекла, способ крепления, назначение, — и мы подберём толщину или схему триплекса.» (teksty/03); поля: «Опишите конструкцию: размер стекла, как крепится, где стоит» (`Textarea`, обязательное — это `description`), «Размеры, мм» (`sizes`), «Способ крепления» (`mounting`), Компания *, Имя *, Телефон *, E-mail, Файл (необязательно); `params.thickness` (если открыто с карточки толщины) передаётся в `params` и показывается подписью «Толщина: {N} мм»; кнопка «Отправить».
6. **`contacts`** — форма страницы «Контакты» (`FormBlock formKey="contacts"`): Компания *, Имя * (добавлено решением — схеме нужен `name`), Телефон *, E-mail, Файл, Комментарий; заголовок секции «Отправьте чертёж», текст «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².», кнопка «Отправить».

### FormSection и FormBlock

```ts
// src/components/forms/form-section.tsx  (серверный)
interface FormSectionProps {
  formKey: FormKey;
  heading?: string; sub?: string; bullets?: string[]; showContacts?: boolean;
  submitLabel?: string; fileLabel?: string; sourceLabel?: string; params?: Record<string, unknown>;
  variant?: 'card' | 'inline' | 'page';   // как в блоке: page — секция с левой колонкой, card/inline — только карточка формы
  source?: string;                         // метка места; по умолчанию — путь страницы + '#' + anchorId
  anchorId?: string; background?: string; className?: string;
}
export async function FormSection(props: FormSectionProps): Promise<JSX.Element>

// src/components/blocks/form-block.tsx
export async function FormBlock({ block, ctx }): Promise<JSX.Element>   // маппит поля блока `form` на FormSection
```

Для `full` и `contacts` (по умолчанию `variant: 'page'`) `FormSection` рисует секцию (фон `primary-light` #EAF3F1, отступы `.blk` 96/72/48): две колонки (`minmax(0,560px) 1fr`, gap 64; ≤1100 одна колонка, gap 32). **Левая колонка** (на ≥1101 `sticky top-6`): `h2` (цвет `primary-dark` #16403D) — по умолчанию для `full`: «Отправьте чертёж — посчитаем стоимость и срок», для `contacts`: «Отправьте чертёж»; `bullets` (по умолчанию для `full`: «КП — в среднем за 2–3 рабочих дня.», «Работаем с заказами от 50 м².»; иконка `Check` primary) либо абзац `sub` (для `contacts`: «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².»); при `showContacts` (по умолчанию true для `full`) — контакты **из global `contacts`**: часы (малый muted), основной телефон (22 px/600, `primary-dark`, `tel:`), основной e-mail (`mailto:`). **Правая колонка:** карточка формы (`bg-surface`, `rounded-xl` 24, `shadow-card`, `p-10`; ≤599 `p-5`; сетка 2 колонки gap 20, ≤599 одна). Значения `heading`/`sub`/`bullets`/`showContacts`/`submitLabel`/`fileLabel`/`sourceLabel`/`params` из блока переопределяют умолчания. Для `variant` `card`/`inline` и для `drawing`/`callback`/`sample`/`load` рисуется только карточка формы (`variant="page"` форм-компонента, без левой колонки). `FormBlock` берёт поля блока `form` (имена — `src/payload/blocks/form.ts`) и передаёт в `FormSection`. Страницы task-22/23 используют `FormSection` напрямую либо блок `form` через `RenderBlocks`.

### Метрика (ТЗ §10)

`file_upload` — при успешной загрузке файла; `form_submit` — при успешной отправке любой не-квизовой формы, параметры `{ form: <formKey>, source }`. Кликов по `tel:`/`mailto:` внутри форм/секции касается глобальный трекер task-19 (специального кода не нужно).

### Vitest

`use-lead-form.test.ts`: для каждого `formKey` собирается тело заявки, которое проходит `leadSubmitSchema`; без согласия — ошибка с точным текстом; телефон «8 900 123-45-67» нормализуется; `drawing` с `label`/`source` кладёт `sourceLabel` и `params.source`; honeypot по умолчанию пуст.

### e2e `e2e/forms.spec.ts` (проекты 375 / 1366 / 1920)

Обвязка — `/ui-kit/forms-live/` (не зависит от чужих страниц). Предусловие: `pnpm seed --minimal`. Сценарии:
1. Открытие каждой модальной формы триггером: `role=dialog`, правильный заголовок («Отправить чертёж», «Заказать звонок», «Заказать образец», «Подобрать под нагрузку»), набор полей, согласие не отмечено, фокус внутри; `Esc` закрывает, фокус возвращается на кнопку.
2. Параметризация: триггер с `label="Отправить планировку"` даёт заголовок «Отправить планировку»; `params.vid='matte'` предзаполняет «Вид стекла».
3. Валидация: пустая отправка → «Заполните поле, чтобы мы могли связаться с вами» у обязательных, фокус на первом; без согласия — текст про согласие; неверный телефон/e-mail — тексты схемы.
4. Файл: `.exe` → «Подойдут DWG, DXF или PDF»; PDF-фикстура загружается и показывается плашкой; `uploadTokens` уходит в запросе (перехват `page.route('**/api/leads/')` с `route.continue()` и проверкой `postDataJSON()`: `formType`, `consent`, `sourceLabel`, `params.source`, `entryPage`, `formToken`, `uploadTokens.length`, `company_website === ''`).
5. Успех: **подождать ≥ 3,1 с после открытия формы** (антиспам сервера), заполнить, отправить → «Спасибо, заявка принята», кнопка «Закрыть»; встроенная `full` и `contacts`: экран благодарности заменяет карточку.
6. Ошибки: `route.fulfill({ status: 500 })` → баннер «Не удалось отправить заявку. Попробуйте ещё раз или позвоните: …», данные сохранены; ответ 429 → тот же баннер.
7. Honeypot: заполненное скрытое поле — ответ сервера 200, но на экране показывается успех (поведение «тихого» принятия не должно ломать UI).
8. Метрика: перехват `reachGoal` (init-script + `localStorage['inex-consent-v1']='all'`) — `form_submit` с `{form, source}` и `file_upload`.
9. 375 px: модальная форма на весь экран, кнопка отправки видна без прокрутки (`toBeInViewport`), нет горизонтального скролла; `axe` без критических нарушений в открытом диалоге.
10. `GET /api/forms-config/` → 200, JSON с `phone`, `workHours`, `thankYouTitle`, `thankYouText`, `submitErrorText` (метка `{телефон}` подставлена); текст ошибки в баннере берётся из ответа.

## Acceptance Criteria

- [ ] Реализованы формы `drawing`, `full`, `callback`, `sample`, `load`, `contacts`; реестр `registry.tsx` отдаёт реальные компоненты, `FormTrigger` из любой страницы открывает нужную форму с параметрами `label`/`source`.
- [ ] `FormSection` и блок `form` (`form-block.tsx`) рендерят секцию `full`/`contacts` по макету (`Home.dc.html`, блок «Финальная форма»; `Contacts.dc.html`) с контактами из global `contacts`; тексты благодарности и ошибки берутся из `site-settings.forms`.
- [ ] Согласие не отмечено по умолчанию и обязательно; honeypot, токен формы и тайминг работают; файл ≤ 50 МБ (DWG/DXF/PDF) грузится потоком и уходит токеном.
- [ ] Все тексты (подписи, ошибки, кнопки, экран благодарности) соответствуют разделу «Формы»; нет эмодзи; нет упоминаний Heat Soak, стеклопакетов, срочности.
- [ ] Цели `form_submit` (с `form`, `source`) и `file_upload` отправляются; квиз-цели не затронуты.
- [ ] Тело заявки каждой формы проходит `leadSubmitSchema`; сервер создаёт лид (`ok: true`).
- [ ] Модалка ≤ 599 px — на весь экран с закреплённой кнопкой; ≥ 600 — по центру, `rounded-lg`; доступность: фокус-ловушка, Esc, возврат фокуса, `aria-labelledby`.
- [ ] Код форм подгружается лениво (не в начальном бандле страниц без форм) — проверить отчётом сборки.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (без БД) и `pnpm test:e2e e2e/forms.spec.ts` проходят; `/ui-kit/forms-live/` в production → 404.
- [ ] Файлы task-20 (`src/lib/client/*`), домен, API и схема не изменены.

## Notes

- **Модель:** премиум.
- Источники: `res/inex-glass-handoff/teksty/05-kviz.md` («Ошибки формы», экран после отправки), `teksty/01-glavnaya.md` (финальная форма), `teksty/02`, `teksty/03` (подбор под нагрузку), `teksty/06` (контакты), `teksty/08` («Образцы и цветопроба»), `teksty/15-politika-pdn.md` §3 (чекбокс); `zadaniya/03-glavnaya.md` (блок 10); прототипы `Home`, `ZakHub`, `Thick10`, `Contacts` (формы); `docs/inex/16-tz-razrabotka.md` §6.
- Для файловых форм принимаются только DWG/DXF/PDF (сервер JPG/PNG разрешает лишь квизу, task-17).
- **Открытые вопросы для координатора:** (1) заголовок модалки берётся провайдером (task-15); правка `params.label → title` в провайдере — единственное изменение чужого файла, согласовать; (2) тексты, которых нет в teksty и которые добавлены минимально: «Адрес или город», «Размеры, мм», «Способ крепления», «Толщина: {N} мм», одинаковый текст благодарности для звонка/образца/нагрузки; (3) обязательность поля «Адрес или город» в `sample` не задана — сделано необязательным; (4) публичный `GET /api/forms-config/` — новый маршрут вне зоны task-17; при желании заменить передачей `phone`/текстов пропсами из `(site)/layout.tsx` (task-14).
