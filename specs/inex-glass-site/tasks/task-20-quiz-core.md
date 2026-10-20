# Task 20: Квиз «Расчёт стоимости» — ядро (7 шагов, логика, подсказки, ориентир, флаги, файл, отправка, цели Метрики)

## Status

pending

## Wave

5

## Description

Главная конверсия сайта: клиентский компонент `<Quiz/>` из 7 шагов («Расчёт стоимости»), который собирает всё, что менеджеру нужно для КП, показывает мягкие подсказки (не блокируя заявку), считает ориентир цены, флаги заявки, грузит чертёж на сервер и отправляет заявку в модуль заявок. Задача создаёт **только компонент и клиентскую инфраструктуру** (состояние, черновик в `localStorage`, загрузка файла, отправка, цели Метрики). Маршрутизацию (страница `/raschet-stoimosti/`, модальное окно, разбор URL-параметров, «Мой расчёт») делает task-34 в Wave 6 — поэтому для e2e здесь создаётся dev-обвязка `/ui-kit/quiz/`.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-15-page-framework-seo.md, task-17-lead-intake-uploads.md, task-19-metrika-analytics.md
**Blocks:** task-34-quiz-routing.md (и косвенно task-21, который использует клиентские хелперы из этой задачи — см. «Контракты той же волны»)

**Context from dependencies:**
- **task-11** (`src/lib/domain/*`, чистые функции, барель `@/lib/domain`): `quiz-schema.ts` — константы с id и подписями (`QUIZ_TYPES`: `tempered`, `triplex`, `partitions`, `railings`, `shower`, `canopies`, `facade`, `shopfronts`, `verandas`, `mirrors`, `other`; `QUIZ_KINDS`: `clear`, `low-iron`, `matte`, `tinted`, `painted`, `ribbed`, `bent`; `TINT_COLORS`: `bronze`/`graphite`/`grey`; `QUIZ_EDGES`: `ground`, `polished`, `trapezoid`, `euro`, `facet30`, `facet50`, `unknown`; `QUIZ_DECOR`: `matting`, `print`, `film`; `QUIZ_STAMP`: `standard`, `custom`, `none`; `QUIZ_PACKING`: `film`, `cardboard`, `crate`, `carrier`; `QUIZ_ROLES`: `contractor`, `manufacturer`, `developer`, `designer`, `other`; `DEFAULT_DELIVERY_CITIES`), `QUIZ_DRAFT_KEY = 'inex-quiz-draft-v1'`, схемы `quizAnswersSchema`, `quizDraftSchema`, `sanitizeQuizAnswers`, тип `QuizAnswersDraft`; `lead-schemas.ts` — `leadSubmitSchema` (для квиза: `{ formType:'quiz', entryPage, utm?, metrikaClientId?, consent:true, formToken, company_website?, uploadTokens?, answers }`, где контакты лежат внутри `answers.contact`), `normalizePhone`; `quiz-flags.ts` — `computeQuizFlags(answers, ctx)`, `getQuizHints(answers, ctx)` (`{id, severity:'info'|'warn', text, step: 2|3|4|6}`), `quizEstimate(answers, ctx)` → `{amount,text}|null`, `QUIZ_FLAG_LABELS`; `prices.ts` (`PricesInput`, `priceState`), `promo.ts` (`PromoInput`, `promoActive`), `holes.ts` (`holeHint`, `HOLE_DIAMETER_HINT`, `parseDiameters`, `holeRules`), `weight.ts` (`weightPerM2Single`, `weightPerM2Triplex`, `FILM_THICKNESSES`, `formatWeightKg`), `working-days.ts` (`isUrgent`, `URGENT_MESSAGE`), `format.ts` (`parseNumber`, `formatNumber`, `formatRub`, `formatDateRu`), `limits.ts` (`TechLimits`, `DEFAULT_TECH_LIMITS`). **Не дублировать эти формулы в компонентах.** Сверить реальные имена по исходникам.
- **task-12** (`src/components/ig/*`): `Field` (label/required/optional/hint/error), `Input`, `Textarea`, `Select`, `ConsentCheckbox` (+ `CONSENT_ERROR`), `Chip`/`ChipGroup` (`mode: 'single'|'multiple'`), `RadioCard`/`RadioCardGroup`, `FileUpload` (props `accept`, `maxBytes`, `value`, `uploading`, `onSelect`, `onClear`, `onReject`, `error`; сам файл на сервер не грузит), `PhoneInput` (`onChange(masked, e164)`), `DatePicker` (ISO `YYYY-MM-DD`, `min`, `onInvalid`). Тексты ошибок формата/размера файла, согласия и placeholders уже внутри них.
- **task-05**: токены, `Button` (`variant primary|secondary|ghost`, `size l|m|s|icon`, `asChild`), `cn()`.
- **task-13**: `Callout`, `Badge` (если нужно). **task-15**: cached loaders `@/lib/cms/globals` (`getPrices`, `getPromo`, `getTechParams`, `getSiteSettings`, `getContacts`, … — возвращают объекты, уже адаптированные к доменным типам либо с адаптерами рядом; прочитать файл), `src/components/page/quiz-cta.tsx` (построитель ссылок на квиз; значения параметров `type`/`vid` — id из `quiz-schema.ts`).
- **task-17**: `POST /api/upload/` (multipart, поле `file`, ≤ 50 МБ, сигнатуры PDF/PNG/JPEG/DWG/DXF; ответ с подписанным `token`), `POST /api/form-token/` (выдаёт подписанный временной токен формы), `POST /api/forms/lead/` (JSON, валидируется `leadSubmitSchema`, ответ `{ ok: true, leadId }`; ошибки 400/429). Антиспам: honeypot-поле `company_website` (скрытое, должно быть пустым), HMAC-метка времени из form-token (форма принимается не раньше 3 с и не позже 2 ч после выдачи), rate-limit 5 заявок/10 мин с IP. Точные формы ответов смотреть в `src/app/api/{upload,form-token,forms/lead}/route.ts` и `src/lib/uploads|leads/*`; все различия изолировать в двух клиентских модулях, создаваемых здесь (`upload-file.ts`, `submit-lead.ts`).
- **task-19**: `reachGoal(name, params?)` (безопасный no-op без Метрики/согласия), `getClientId()` и `getAttribution()` в `src/components/analytics/`. Захват UTM и страницы входа (`captureAttribution()`) task-19 делает **глобально**: `<AttributionCapture/>` рендерится внутри `<Metrika/>` в layout на каждой странице. Квиз захват не дублирует, только читает. Сверить реальные пути файлов.
- **task-14** (layout `(site)`): монтирует `<Metrika/>`, `<StickyCta/>`, `<FormDialogProvider/>`. Ссылка «Мой расчёт» в шапке ведёт на `/raschet-stoimosti/?resume=1` (обработка — task-34).

**Контракты той же волны:** task-21 (формы) **использует** три клиентских модуля из этой задачи: `src/lib/client/upload-file.ts`, `src/lib/client/submit-lead.ts`, `src/lib/client/attribution.ts`. Их публичный API фиксируется ниже — менять его после слияния нельзя. Task-34 (Wave 6) использует `<Quiz/>`, `QuizConfig`/`getQuizConfig()`, `persistence.ts` (`loadDraft`, `hasDraft`, `clearDraft`), `QuizHeader`.

## Files to Create

Компонент (`src/components/quiz/`):
- `quiz.tsx` — корневой `'use client'` компонент `<Quiz/>`
- `types.ts` — `QuizProps`, `QuizPrefill`, `QuizConfig`, `QuizUiState`
- `state.ts` — начальное состояние, reducer, действия, селекторы (`toAnswersDraft`)
- `use-quiz.ts` — хук: reducer + черновик + цели Метрики + отправка
- `persistence.ts` — `loadDraft()`, `saveDraft()`, `clearDraft()`, `hasDraft()` (+ `persistence.test.ts` в `jsdom`-проекте или с подменой `localStorage`)
- `options.ts` — подписи, иконки Lucide и порядок вариантов шагов
- `derive.ts` — производные значения (площадь, подсказки, ориентир, флаги, вес карточек) поверх доменной библиотеки (+ `derive.test.ts`)
- `build-payload.ts` — сборка тела `POST /api/forms/lead/` из состояния (+ `build-payload.test.ts`, валидация `leadSubmitSchema`)
- `quiz-header.tsx` — `QuizHeader` (заголовок + строка «7 вопросов …» + необязательная кнопка закрытия) и константы `QUIZ_TITLE`, `QUIZ_META_LINE`
- `quiz-progress.tsx`, `quiz-footer.tsx`, `quiz-hint.tsx`, `quiz-estimate.tsx`
- `steps/step-1-type.tsx`, `steps/step-2-glass.tsx`, `steps/step-3-volume.tsx`, `steps/step-4-processing.tsx`, `steps/step-5-file.tsx`, `steps/step-6-delivery.tsx`, `steps/step-7-contacts.tsx`
- `success.tsx` — экран после отправки

Серверная часть:
- `src/lib/cms/quiz-config.ts` — `getQuizConfig(): Promise<QuizConfig>` (серверный загрузчик на кэшируемых loader’ах task-15)

Клиентские модули (контракт для task-21):
- `src/lib/client/upload-file.ts` (+ тест на `validateClientFile`)
- `src/lib/client/submit-lead.ts`
- `src/lib/client/attribution.ts` (+ тест) — **адаптер** над `getAttribution()` task-19 (собственного хранилища UTM нет)

Dev-обвязка и e2e:
- `src/app/(site)/ui-kit/quiz/page.tsx` — страница-харнесс с `<Quiz variant="page">` (в production → `notFound()`, как `ui-kit/page.tsx`)
- `e2e/quiz.spec.ts`

Сид: **нет** (у квиза нет контента в CMS). Стабы `src/seed/slices/*` не трогать.

## Files to Modify

Нет. Не трогать: `src/components/ig/*` (task-05/12/13), `src/lib/domain/*` (task-11), `src/app/api/**` (task-17), `src/app/(site)/layout.tsx` (task-14), `payload`-схему. Если домен или API не хватает — остановиться и написать координатору.

## Technical Details

### Публичный интерфейс

```ts
// types.ts
export interface QuizPrefill {              // источники: карточки страниц (type/thick/vid/src) и калькулятор веса (w,h,q,t1,t2,film)
  type?: QuizTypeId;
  thickness?: number;                        // 4…19
  kind?: QuizKindId;
  triplex?: { glass1?: number; glass2?: number; film?: number };
  maxW?: number; maxH?: number; positions?: number;
}
export interface QuizConfig {                // сериализуемый (server → client)
  nowIso: string;                            // серверное «сейчас»: priceState/promoActive считаем от него (нет hydration-расхождений)
  prices: PricesInput; promo: PromoInput | null; limits: TechLimits;
  holidays: string[];                        // site-settings.holidays → ISO-даты (isWorkday=true исключаются)
  cities: { name: string; kind: 'city' | 'other' | 'pickup' }[];   // tech-params.deliveryCities (kind other → поле «Город», pickup → самовывоз)
  films: number[];                           // tech-params.weight.filmLayers
  phone: string;                             // основной телефон contacts — для текста ошибки отправки
  minOrderArea: number;                      // conditions.minOrderM2 (50)
  forms: { thankYouTitle: string; thankYouText: string; submitErrorText: string };   // site-settings.forms (submitErrorText содержит метку {телефон})
}
export interface QuizProps {
  config: QuizConfig;
  prefill?: QuizPrefill;                     // разбирает task-34 (src/lib/quiz/prefill.ts)
  entryPage?: string;                        // путь страницы входа ('' → берём из location.pathname)
  variant?: 'page' | 'modal';
  resume?: boolean;                          // восстановить черновик
  onClose?: () => void;                      // для модалки (кнопка закрытия рисуется оболочкой task-34 или QuizHeader)
}
export function Quiz(props: QuizProps): JSX.Element
```

Если `QuizPrefill` уже объявлен в `src/lib/domain/quiz-schema.ts` — импортировать оттуда и реэкспортировать из `types.ts` (одно определение). Разбор URL-параметров (`type`, `thick`, `vid`, `src`, `w`, `h`, `q`, `t1`, `t2`, `film`, `resume`) в `QuizPrefill` — задача task-34; здесь парсера нет. `Quiz` ничего не знает про `useSearchParams`.

**Что рисует `<Quiz/>`:** бейдж «Из карточки: …» (если есть prefill), прогресс (`Шаг N из 7`), тело текущего шага, футер «Назад / Далее / Получить КП», экран успеха. **Не рисует:** оболочку модалки, крестик, и в `variant="page"` — собственный `h1` (на странице `/raschet-stoimosti/` H1 ставит страница). Заголовок «Рассчитаем стоимость вашего заказа» и строка «7 вопросов · около 3 минут · КП в среднем за 2–3 рабочих дня» вынесены в `QuizHeader` (`as: 'h1'|'h2'`, `id`, `onClose?`), которым могут пользоваться страница и оболочка модалки.

**Требования к вёрстке корня** (чтобы task-34 не правил компонент): корень `flex min-h-0 flex-1 flex-col`; тело шага — `overflow-y-auto` (внутри модалки скроллится тело, а не страница); футер с кнопками `sticky bottom-0` с фоном `bg-surface`, верхней границей `border-line` и `pb-[env(safe-area-inset-bottom)]`. В `variant="page"` на ≥600 px футер обычный (не sticky), на ≤599 — sticky.

### Состояние и черновик

Хранить `QuizAnswersDraft` (тип домена) + «сырые» значения текстовых полей (строки с запятой: `positions`, `area`, `maxW`, `maxH`, `holeCount`, `holeDiam`, `bendRadius`, `inn`) — в черновик домена попадают только распарсенные числа (`parseNumber`, запятая допустима). Дополнительно: `step` (1…7), `maxStepReached`.

- Черновик: ключ `QUIZ_DRAFT_KEY`, формат `{ v: 1, step, answers, raw, savedAt }`; запись с debounce 300 мс и принудительно на `pagehide`; чтение — через `quizDraftSchema.safeParse` (битый черновик игнорируется молча). Все обращения к `localStorage` — в `try/catch`; без него квиз работает.
- **В черновик не пишутся:** `consent` (всегда снимается), загруженный файл (токены одноразовые/короткоживущие; при восстановлении шаг 5 показывает пустую зону). Контакты (шаг 7) сохраняются.
- Старт: `resume && hasDraft()` → восстановить; иначе свежий старт с `prefill` (предзаполнение перекрывает черновик; черновик перезаписывается при первом изменении). При восстановлении показывать небольшую строку «Продолжаем ваш расчёт» над прогрессом (в teksty отдельного текста нет).
- Очистка: `clearDraft()` после успешной отправки.
- Предзаполнение: `type`, `thickness`, `kind`, для триплекса — `triplex`; `maxW/maxH/positions` → шаг 3; если заданы `maxW`, `maxH`, `positions` одновременно и площади нет — `area = round2(maxW/1000 · maxH/1000 · positions)`. Бейдж над прогрессом: «Из карточки: {подпись типа}, {N} мм» (+ « , {вид строчными}» если задан) — как «Из карточки: Закалённое стекло, 10 мм» в `Kviz.dc.html`; показывается только при `prefill`, не при `resume`.
- Смена типа: фацет (`facet30/facet50`) сбрасывается, если тип не `mirrors` (`sanitizeQuizAnswers`); смена вида сбрасывает `tint`/`ral`/`bendRadius` так же.

### Шаги (тексты — дословно из `res/inex-glass-handoff/teksty/05-kviz.md`; макет — `prototypes/Kviz.dc.html`, блоки «Шаг 1–7»; демо-панели «Демо:» **не переносить**)

Общий каркас: заголовок шага — `h2` (`Что нужно рассчитать?` и т. д.), на каждый переход фокус уходит на заголовок нового шага (`tabIndex={-1}`), тело скроллится вверх. Прогресс: `role="progressbar"` (`aria-valuemin=1`, `aria-valuemax=7`, `aria-valuenow`), заливка `width: N/7`, подпись «Шаг N из 7», анимация ширины 320 мс. Кнопка «Назад» отключена на шаге 1. Кнопка «Далее» **никогда не блокируется** (валидация = подсказки), кроме финальной отправки.

1. **«Что нужно рассчитать?»** — `RadioCardGroup` (4 колонки ≥1366, 2 на телефоне, иконки скрыты на ≤599 как в прототипе), 11 карточек в порядке `QUIZ_TYPES`: Закалённое стекло · Триплекс · Перегородки · Ограждения · Душевые перегородки · Козырьки · Стеклянный фасад · Торговые витрины · Остекление веранд и террас · Зеркала · Другое. Иконки Lucide (в `options.ts`; если имя отсутствует в установленной версии — взять ближайшую): tempered `RectangleVertical`, triplex `Layers`, partitions `PanelsTopLeft`, railings `Fence`, shower `ShowerHead`, canopies `Umbrella`, facade `Building2`, shopfronts `Store`, verandas `House`, mirrors `Frame`, other `Ellipsis`.
2. **«Какое стекло?»** — подзаголовок «Толщина»: `RadioCardGroup` (5 колонок ≥1366, 2 на телефоне) — 4, 5, 6, 8, 10, 12, 15, 19 мм с подписью веса (`weightPerM2Single(n)` → «10 кг/м²», «12,5 кг/м²»; `formatWeightKg` / `formatNumber`) + карточка «Подберите под нагрузку» (подпись «опишите конструкцию»), при выборе показывается `Textarea` «Опишите конструкцию: размер стекла, как крепится, где стоит» (→ `customNote`). **Для типа «Триплекс»** вместо сетки толщин — конструктор слоёв: «Стекло 1» и «Стекло 2» (чипы 4, 5, 6, 8, 10, 12 мм), «Плёнка EVA» (чипы из `config.films`: 0,38 · 0,76 · 1,14 · 1,52 мм) и строка итога «Схема 6+6, плёнка 0,76 мм · вес ≈ 40,7 кг/м²» (`weightPerM2Triplex`); карточка «Подберите под нагрузку» остаётся. Подзаголовок «Вид»: `ChipGroup single` — Прозрачное · Осветлённое · Матовое · Тонированное · Крашеное по RAL · Рифлёное · Гнутое. Условные поля: **Тонированное** → подзаголовок «Оттенок», чипы бронза · графит · серое; **Крашеное по RAL** → подсказка «Крашеное стекло — толщина 4–15 мм, размер до 3000 × 1600 мм» + поле «Цвет RAL» (placeholder «Например, RAL 9003», max-width 320 px); **Гнутое** → поле «Радиус гиба, мм» + подсказка «Гнутое — до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм». Подсказки приходят из `getQuizHints` (шаг 2).
3. **«Объём и размеры»** — «Сколько позиций и какая общая площадь?»: поля «Позиций», «Площадь, м²» (`inputMode="decimal"`, запятая допустима); «Самое большое стекло»: «ширина» × «высота» мм (визуально скрытые подписи «Ширина, мм»/«Высота, мм»). Подсказки (`getQuizHints`, шаг 3, `QuizHint` с иконками как в прототипе: warn `TriangleAlert`, info `Info`, акция `Check`): площадь `0 < A < 50` → «Мы работаем с заказами от 50 м². Если это часть большого проекта — оставьте контакты, объединим позиции в один заказ»; `A ≥ promo.thresholdArea` и акция активна → `promo.text` (стиль «promo»: фон primary-light); размер вне 150 × 300 — 3000 × 2000 мм → «Нестандартный размер — менеджер уточнит возможность изготовления». **Ориентир** (`quizEstimate`): блок `.qz-est` — крупно «Ориентировочно от {сумма} ₽», мелко «за стекло без обработки и доставки. Цены на {дата_цен}. Точная стоимость — в КП» (см. текст из домена; разбивать на две строки по первой точке допустимо). Показывается только при `priceState==='price'` и `area>0` и числовой толщине; для 15/19 мм, триплекса и просроченной цены — не показывается.
4. **«Обработка»** — группы (подзаголовки `qz-glabel`): **Кромка** — `ChipGroup multiple`: шлифованная · полированная · «трапеция» · «еврокромка» · (фацет 30 мм · фацет 50 мм — **только при типе «Зеркала»**) · не знаю — подскажите («не знаю» взаимоисключающе: выбор снимает остальные, выбор любого другого снимает «не знаю»); **Отверстия** — чипы нет · есть; при «есть»: «Количество», «Диаметры, мм» (placeholder «Например, 12, 16», разбор `parseDiameters`), подсказка `holeHint(толщина)` («Для стекла {N} мм отверстие — не ближе {2N} мм к кромке и {6N} мм к углу (ГОСТ 30698-2014)»; для триплекса/без толщины — общая), и warn-подсказка `HOLE_DIAMETER_HINT` («До 220 мм — при сверлении с одной стороны. Уточним по чертежу»), если любой Ø < 4 или > 130; **«Обработать кромку отверстий изнутри (для металлического крепежа)»** — да · нет; **«Вырезы, пазы, фрезерование»** — да · нет; **Декор** — `multiple`: матирование · печать (до 1100 × 700 мм) · плёнка (при печати и стекле больше 1100 × 700 — подсказка «Печать — до 1100 × 700 мм» из домена); **Клеймо** — в стандартном месте · укажу место · без клейма (при «укажу место» — поле «Место клейма»). **Heat Soak Test в квизе нет** (решение 19.10).
5. **«Чертёж»** — «Прикрепите файл — DWG, DXF, PDF или фото эскиза, до 50 МБ.» `FileUpload` (`accept=['dwg','dxf','pdf','jpg','jpeg','png']`, `maxBytes=52428800`); выбор файла → `uploadFile()` (ниже) с прогрессом, после успеха `file = { uploadToken, name, size }` и `reachGoal('file_upload', { ext })`. Ошибки формата/размера — тексты внутри `FileUpload` («Подойдут DWG, DXF, PDF, JPG или PNG», «Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии»); ошибка сети/сервера — `error="Не удалось загрузить файл. Попробуйте ещё раз"` (в teksty нет отдельного текста — отметить в отчёте). Подсказка (info): «Для простых прямоугольных стёкол подойдёт PDF или эскиз. Сложную форму — контуром в DWG или DXF 1:1». Ссылка-кнопка `.ig-link`: «Нет чертежа? Продолжите — менеджер уточнит размеры» → `noFile = true` и переход на шаг 6 (флаг `no_file`).
6. **«Сроки и доставка»** — `DatePicker` «К какой дате нужно стекло?» (placeholder «дд.мм.гггг», max-width 320 px; `min` не блокирует); подсказка `URGENT_MESSAGE` (warn: «Срочного изготовления нет. Ближайший срок — от 10 рабочих дней с даты договора, для триплекса — от 14») — по `isUrgent(desiredDate, now, isTriplex, holidays)`, **рабочие дни** (праздники из `config.holidays`), не календарные. **Город доставки** — чипы `config.cities[].name` (по умолчанию `DEFAULT_DELIVERY_CITIES`: Челябинск … Волгоград, Другой, Самовывоз (Челябинск)); элемент с `kind: 'other'` («Другой») открывает текстовое поле «Город» (`cityOther`), с `kind: 'pickup'` — самовывоз. **Требования к упаковке** — `multiple`: плёнка · картон · ящик под кран или погрузчик · требования перевозчика (при выборе последнего — `Textarea` «Требования перевозчика»). **«Нужен пакет документов (паспорт, сертификат, протоколы)»** — да · нет (→ `needDocs`, флаг `needs_docs`).
7. **«Контакты»** — поля (2 колонки ≥600): «Компания» *, «ИНН» (пометка «— необязательно»), «Имя» *, «Телефон» * (`PhoneInput`, `+7 (___) ___-__-__`), «E-mail» (на всю ширину); «Кто вы» — чипы single: подрядчик · производитель мебели или изделий · застройщик или генподрядчик · дизайнер или архитектор · другое; **«Комментарий»** (`Textarea`, необязательно; добавлено решением — в teksty нет); `ConsentCheckbox` (**не отмечен** по умолчанию, ссылки на `/soglasie-na-obrabotku-personalnyh-dannyh/` и `/politika-konfidencialnosti/`); кнопка «Получить КП». Скрытое honeypot-поле `company_website` (вне экрана через `absolute -left-[9999px]`, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).

**Единственная блокирующая валидация — при нажатии «Получить КП»:** Компания, Имя, Телефон (обязательны; сообщение «Заполните поле, чтобы мы могли связаться с вами»), согласие («Чтобы отправить заявку, отметьте согласие на обработку персональных данных»; кнопка визуально «выключена» `aria-disabled`, но клик показывает ошибку, как в прототипе). Форматные проверки заполненных необязательных полей (телефон — «Укажите телефон в формате +7 (900) 000-00-00», e-mail — «Проверьте адрес электронной почты», ИНН — «ИНН — 10 или 12 цифр») тоже блокируют отправку, потому что те же правила жёстко применяет сервер (`leadSubmitSchema`). После отказа фокус — на первое невалидное поле. Остальные поля шагов 1–6 — только подсказки.

### Ориентир, подсказки, флаги

Всё считается в `derive.ts` из состояния через доменные функции с `ctx = { now: new Date(config.nowIso), holidays, prices, promo, limits }`: `getQuizHints`, `quizEstimate`, `computeQuizFlags` (`small_volume`, `nonstandard_size`, `urgent`, `no_file`, `needs_docs`). Состояние UI не хранит флаги — они пересчитываются при отправке. Тексты подсказок — только из домена (дословно teksty/05). Компонент `QuizHint` (`role="status"`, `aria-live="polite"`) — три варианта: `info` (#EEF4FA / #2C5B86), `warn` (#FCF6EA / #8A5A00), `promo` (primary-light / #16403D); токены из дизайн-системы, не хардкод hex, если токен есть.

### Загрузка файла: `src/lib/client/upload-file.ts` (контракт для task-21)

```ts
export type UploadErrorCode = 'format' | 'size' | 'rate_limit' | 'network' | 'server';
export class UploadFailure extends Error { code: UploadErrorCode }
export interface UploadedFile { token: string; name: string; size: number; ext: string }
export const ALLOWED_QUIZ_EXT = ['dwg','dxf','pdf','jpg','jpeg','png'] as const;
export const ALLOWED_DRAWING_EXT = ['dwg','dxf','pdf'] as const;     // формы: JPG/PNG принимаются только квизом
export const MAX_UPLOAD_BYTES = 52428800;
export function validateClientFile(file: File, allowed: readonly string[]): 'ok' | 'format' | 'size';
export function uploadFile(file: File, opts?: { signal?: AbortSignal; onProgress?: (fraction: number) => void }): Promise<UploadedFile>;
```

Реализация: `XMLHttpRequest` (нужен прогресс) → `POST /api/upload/`, `FormData` с полем `file`; успех — JSON с `token`; коды 400 → `format`/`size` по `error` из ответа, 413 → `size`, 429 → `rate_limit`, прочее → `server`, обрыв → `network`. Если форма ответа task-17 отличается — адаптировать **только здесь**. Загрузка не через Server Action.

### Отправка: `src/lib/client/submit-lead.ts` (контракт для task-21)

```ts
export class SubmitError extends Error { code: 'validation' | 'rate_limit' | 'token' | 'network' | 'server'; fieldErrors?: Record<string,string> }
export function useFormToken(): { token: string | null; refresh: () => Promise<void> };  // запрашивает токен при монтировании формы; обновляет, если сервер ответил 'token'
export function submitLead(body: Record<string, unknown>): Promise<{ ok: true; leadId: string }>;   // POST /api/forms/lead/ (JSON), ответ-ошибки → SubmitError
```

Токен формы запрашивается **сразу при монтировании** (сервер отклонит отправку раньше 3 с после выдачи и позже 2 ч). При ответе `token` — молча обновить токен и показать пользователю ошибку отправки (повторное нажатие сработает).

### Атрибуция: `src/lib/client/attribution.ts` (контракт для task-21)

```ts
export interface LeadAttribution { entryPage: string; utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }; metrikaClientId?: string }
export async function getLeadAttribution(entryPageOverride?: string): Promise<LeadAttribution>;
// entryPage: override (src квиза / страница формы) → иначе attribution.landing (первая страница сессии) → иначе location.pathname;
// utm — из getAttribution() task-19 (sessionStorage 'inex-attribution-v1'), иначе из location.search;
// metrikaClientId — await getClientId() task-19 (null/таймаут → поле не передаётся)
```

Адаптер **не** вызывает `captureAttribution()` и не пишет в storage: захват делает `<AttributionCapture/>` task-19, глобально через layout. Все обращения к storage — в `try/catch`. Тест: с заглушками `getAttribution`/`getClientId` (override, landing, отсутствие storage).

### Тело заявки: `build-payload.ts`

`buildQuizLeadPayload(state, ctx, { formToken, attribution /* LeadAttribution */, honeypot })` → объект, который **проходит** `leadSubmitSchema` (`formType: 'quiz'`, `entryPage`, `utm`, `metrikaClientId`, `consent: true`, `formToken`, `company_website` как есть, `uploadTokens: [file.uploadToken]` при наличии файла, `answers` = `sanitizeQuizAnswers(...)` со всеми полями шагов, `contact` внутри `answers`, телефон — как введён (нормализует схема)). Флаги и `sourceLabel` сервер вычисляет/берёт сам; клиент дополнительно **не** отправляет флаги (домен пересчитает на сервере) — но тест проверяет, что `computeQuizFlags` на клиентском состоянии даёт ожидаемый набор (для метрики). Тест `build-payload.test.ts`: полный сценарий (single 10 мм, 86 м², отверстия, файл) и сценарий триплекса `6+6/0,76` проходят `leadSubmitSchema.safeParse`; отсутствие согласия — ошибка; запятая в площади («86,5») → 86.5.

### Цели Метрики (ТЗ §10; `reachGoal` из task-19, без прямых `ym()`)

- `quiz_start` — один раз за монтирование (и при восстановлении черновика): `{ entry_page, variant, resumed: boolean }`.
- `quiz_step_N` (N = 1…7) — когда пользователь **прошёл** шаг (нажал «Далее»/ссылку «Нет чертежа?»; для 7 — при успешной отправке перед `quiz_submit`). Один раз на N за монтирование (Set).
- `file_upload` — успешная загрузка чертежа: `{ ext }`.
- `quiz_submit` — успех отправки: `{ type, flags: string (через запятую) }`; параметры без ПДн.
- `form_submit` для квиза **не** отправляется.

### Экран успеха (`success.tsx`)

Заголовок `h2` = `config.forms.thankYouTitle` («Спасибо, заявка принята»); текст = `config.forms.thankYouText` («Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня, для больших объёмов дольше. Связь — звонком и по e-mail.»; значения по умолчанию в коде — дословно teksty/05, если поля CMS пусты); блок «Пока ждёте:» со ссылками «Требования к чертежам» (`/kak-zakazat/trebovaniya-k-chertezham/`, подпись «— если файл ещё не готов») и «Сроки изготовления» (`/kak-zakazat/sroki/`, «— как спланировать заказ»). Иконка `Check` в круге primary-light (как `qz-done__ic`). Блок «Что будет дальше» (3 шага) и третья ссылка «Как мы работаем» есть только в прототипе — **не переносить** (в teksty/05 их нет). Фокус на заголовок. Черновик очищается. Ошибка отправки: баннер `role="alert"` с текстом `config.forms.submitErrorText` («Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}»; метка заменяется на `config.phone` ссылкой `tel:`); данные не теряются.

### Серверный `getQuizConfig()`

Собирает `QuizConfig` из загрузчиков task-15 (`prices`, `promo`, `tech-params`, `site-settings` (праздники), `contacts` (основной телефон)); `nowIso = new Date().toISOString()`. Страницы, использующие его (`/ui-kit/quiz/`, а затем task-34), получают `export const revalidate = 3600`/динамику сами — функция кэширует только свои чтения глобалов (через уже кэшируемые loader’ы), `now` не кэшируется.

### Адаптив (из `Kviz.dc.html`, медиа 599)

Окно ≥600: ширина до 880 px, радиус 24, паддинги 28/32; ≤599: на всю ширину, паддинги 16–20, карточки 2 колонки, иконки радио-карточек скрыты, поля в 1 колонку, `Далее/Назад` в ряд на всю ширину и sticky. Прогресс-бар и подписи переносятся без горизонтального скролла. Брейкпоинты проекта: `max-sm:` = ≤599.

### Dev-обвязка `/ui-kit/quiz/`

Серверная страница: `if (process.env.SITE_ENV === 'production') notFound()`; читает `searchParams` (`type`, `thick`, `vid`, `resume`, `src` — **только** собственная минимальная версия разбора по id из `quiz-schema.ts`; полноценный парсер — task-34), вызывает `getQuizConfig()` и рендерит `<QuizHeader as="h1"/>` + `<Quiz variant="page" .../>` в `Container`. Страница нужна e2e этой задачи; task-34 перенесёт тесты на реальные маршруты.

### e2e `e2e/quiz.spec.ts` (Playwright, проекты 375 / 1366 / 1920)

Предусловие: `pnpm seed --minimal` (globals цен/акции/праздников). Спека использует `/ui-kit/quiz/`. Сценарии:
1. **Полный проход** с предзаполнением `?type=tempered&thick=10&vid=clear`: бейдж «Из карточки: Закалённое стекло, 10 мм»; шаг 3: площадь «86», размеры 3000 × 1200 → виден ориентир «Ориентировочно от …» и **нет** подсказки про 50 м² (если цена просрочена в БД — проверять только отсутствие ориентира с цифрой, ветка по `data-price-state`/тексту); шаг 4: отверстия «есть», диаметры «12, 16» → подсказка с «20 мм» и «60 мм»; шаг 5: загрузка `drawing.pdf` (буфер `%PDF-1.4…`) → плашка файла; шаг 6: город, пакет документов «да»; шаг 7: Компания/Имя/Телефон, согласие → «Получить КП» → экран «Спасибо, заявка принята». **Перед отправкой `await page.waitForTimeout(3100)` после загрузки страницы** (антиспам сервера отклоняет форму раньше 3 с — единственное разрешённое использование ожидания по времени).
2. **Тело запроса**: через `page.route('**/api/forms/lead/', route => { capture; route.continue() })` — проверить `formType === 'quiz'`, `consent === true`, `answers.contact.phone`, `uploadTokens.length === 1`, наличие `entryPage`, `formToken`, пустой `company_website`.
3. **Подсказки**: площадь 49 → «Мы работаем с заказами от 50 м²…»; 120 при активной акции → текст акции (если акции нет в БД — пропуск ветки); размер 3500 × 1200 → «Нестандартный размер…»; толщина 15 мм → ориентира нет; «Крашеное по RAL» → подсказка «…4–15 мм…» и поле «Цвет RAL»; «Гнутое» → поле «Радиус гиба, мм»; тип «Зеркала» → в шаге 4 есть «фацет 30 мм», при смене на «Перегородки» — нет и выбранный фацет сброшен; триплекс → конструктор слоёв.
4. **Срочно**: дата завтрашнего дня → «Срочного изготовления нет…».
5. **Файл**: `.exe` → «Подойдут DWG, DXF, PDF, JPG или PNG»; буфер 52 428 801 байт `.pdf` → «Файл больше 50 МБ…»; DWG-фикстура (`AC1015` + нули) загружается; «Нет чертежа? Продолжите…» переходит на шаг 6.
6. **Согласие/обязательные**: без согласия — «Чтобы отправить заявку, отметьте согласие…»; пустые Компания/Имя/Телефон — «Заполните поле, чтобы мы могли связаться с вами», фокус на первом пустом.
7. **Черновик**: заполнить шаги 1–3, перезагрузить `/ui-kit/quiz/?resume=1` → значения и шаг восстановлены; без `resume` и без prefill → пустой старт; после успешной отправки `localStorage['inex-quiz-draft-v1']` отсутствует.
8. **Ошибка отправки**: `route.fulfill({ status: 500 })` → баннер «Не удалось отправить заявку. Попробуйте ещё раз или позвоните: +7 (351) 247-05-57»; введённые данные на месте.
9. **Метрика**: подменить `window.ym`/перехватить `reachGoal` (через `page.addInitScript` + `consent=all` в `localStorage['inex-consent-v1']`) — зафиксировать `quiz_start`, `quiz_step_1…7`, `file_upload`, `quiz_submit` в нужном порядке.
10. **Клавиатура и a11y**: проход шагов с клавиатуры (Tab/Enter/стрелки в `radiogroup`), `axe` (`@axe-core/playwright`) на каждом шаге без критических нарушений, нет горизонтального скролла на 375, на 375 футер виден (`toBeInViewport`).
Скриншоты шагов 1, 3, 5, 7 и экрана успеха на 375 / 1366 / 1920 прикладывать к отчёту (`testInfo.attach`) для ручной сверки с `prototypes/Kviz.dc.html`.

### Vitest

`derive.test.ts` (подсказки/ориентир/флаги на фиксированном `now`, включая рабочие дни и просроченные цены), `persistence.test.ts` (запись/чтение/битый JSON/недоступный storage — `jsdom`-проект или ручной стаб), `build-payload.test.ts`, `upload-file.test.ts` (`validateClientFile`), `attribution.test.ts` (utm из query и sessionStorage). Тесты `.test.ts` идут в проект `unit` (node): использовать минимальный стаб `globalThis.localStorage/sessionStorage/location`, либо назвать `*.dom.test.ts` для проекта `dom`.

## Acceptance Criteria

- [ ] Созданы все файлы списка; `QuizProps`, `QuizConfig`, `uploadFile`, `submitLead`/`useFormToken`, `getLeadAttribution` соответствуют описанию.
- [ ] Все 7 шагов реализованы по teksty/05 дословно (заголовки, подписи чипов, подсказки, ошибки, экран успеха); Heat Soak Test, стеклопакеты и спецстёкла отсутствуют; фацет виден только при типе «Зеркала».
- [ ] «Далее» не блокируется; блокируют только обязательные контакты, согласие и формат заполненных полей; согласие по умолчанию не отмечено; honeypot присутствует.
- [ ] Подсказки, ориентир и флаги считаются доменными функциями (никаких дублей формул); «срочно» — по рабочим дням; ориентир скрыт для 15/19 мм, триплекса и просроченной цены.
- [ ] Черновик: ключ `inex-quiz-draft-v1`, не хранит согласие и файл, восстанавливается по `resume`, очищается после успеха; без `localStorage` квиз работает.
- [ ] Файл: клиентская проверка формата/размера, загрузка потоком с прогрессом на `POST /api/upload/`, токен уходит в `uploadTokens`; JPG/PNG разрешены только в квизе.
- [ ] Тело заявки проходит `leadSubmitSchema`; сервер принимает заявку (ответ `{ ok:true }`), создаётся лид со страницей входа, UTM, clientId (если есть) и флагами.
- [ ] Цели Метрики `quiz_start`, `quiz_step_1…7`, `file_upload`, `quiz_submit` отправляются один раз и без ПДн.
- [ ] Вёрстка совпадает с `Kviz.dc.html` на 375 / 1366 / 1920: радиус 24, прогресс, радио-карточки, чипы, sticky-футер на ≤599; в `variant="page"` нет собственного `h1`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (без БД) и `pnpm test:e2e e2e/quiz.spec.ts` проходят; `/ui-kit/quiz/` в production → 404.
- [ ] Схема Payload, `src/lib/domain/*`, `src/app/api/**` и файлы чужих задач не изменены.

## Notes

- **Модель:** премиум (сложное состояние и тонкая логика).
- Источники: `docs/inex/struktury-stranic/p0-dokumenty-gost-kviz.md` §4; `res/inex-glass-handoff/teksty/05-kviz.md`; `zadaniya/06-kviz.md`; `prototypes/Kviz.dc.html` (+ `Quiz.dc.html` — состояния компонентов); `docs/inex/15-ssot-tehnologiya.md` §1, §3, §4, §8, §11, §14; ТЗ `docs/inex/16-tz-razrabotka.md` §6, §10.
- Отличия прототипа от решения: «срочно» в прототипе считается календарными днями — **использовать рабочие дни**; цена в ориентире в `zadaniya/06` («≈ 120 400 ₽ …») заменена формулировкой teksty/05; демо-переключатели не переносим.
- Полезные ссылки: `Metrika`/goals — ТЗ §10; Radix/Dialog-оболочка модалки — task-34.
- **Решено координатором:**
  - Один словарь id. Ключи `tech-params.quizOptions` (task-06), `quizPrefill` (task-07), `leads.role/productType` (task-08), параметры `buildQuizHref` (task-15) и парсер task-34 используют id домена task-11 (`shopfronts`, `low-iron`, `painted`, `manufacturer`, `crate`, `facet30/facet50`, …). Маппинга нет.
  - UTM захватываются глобально через `<AttributionCapture/>` внутри `<Metrika/>` (task-19). Квиз только читает их через `getLeadAttribution()`.
- **Открытый вопрос (заказчику, через координатора; см. action-required):** Тексты, которых нет в teksty и которые добавлены минимально: «Продолжаем ваш расчёт», подписи конструктора триплекса («Стекло 1», «Стекло 2», «Плёнка EVA»), «Место клейма», «Город» (для «Другой»), «Комментарий», ошибка загрузки файла по сети — утвердить у заказчика.
- (Ревью волны 3, отложено из task-12) Примитивы форм без тестов: добавить `src/components/ig/file-upload.test.ts` (дословные тексты `formatErrorText`/`sizeErrorText`/`formatFileSize`) и jsdom-тесты `PhoneInput` (ввод, Backspace по маске, вставка) и стрелочной навигации `RadioCardGroup`/`ChipGroup`. Починить `FileUpload` `onDragLeave` (Safari отдаёт `relatedTarget = null` — считать enter/leave счётчиком). `Field` всегда рендерит `<label htmlFor>` — для групп (`ChipGroup`, `RadioCardGroup`, `FileUpload`) отдавать `labelId` в контексте и связывать через `aria-labelledby`. Эти правки в `src/components/ig/*` (task-12) разрешены этой задаче.
- (Волна 4, task-19) Поля ввода контактов (имя, телефон, e-mail, компания, ИНН, комментарий) помечать классом `ym-disable-keys`, чтобы Вебвизор не записывал ввод. Цели — только через `reachGoal` из `src/components/analytics/reach-goal.ts` (`GOALS`), clientId — `getClientId()` из `client-id.ts` (таймаут 1500 мс, не бросает), UTM — `getAttribution()` из `attribution.ts` (через адаптер `src/lib/client/attribution.ts`, создаёт task-20).
- (Ревью волны 4) `src/lib/leads/create-lead.ts` считает флаги по `DEFAULT_TECH_LIMITS` — если task-17 не переключил на `getTechLimits()`/`getHolidays()` из `@/lib/cms/globals`, сделать это (правка разрешена). Атрибуция: `yclid`, `gclid`, `referrer` захватываются task-19, но в схеме `leads` для них нет полей — передавать их в `answers` (JSON) как `attribution.{yclid,gclid,referrer}`, а не терять; схему не менять. «Мой расчёт» (task-14 `my-calc-link.tsx`) не обновляет точку в той же вкладке — при сохранении черновика диспатчить событие `inex:quiz-draft` и подписаться на него в `my-calc-link.tsx` (правка разрешена).
