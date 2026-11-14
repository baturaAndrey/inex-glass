# Task 11: Превью черновика страницы

## Status

complete

## Wave

3

## Description

Дать редактору посмотреть несохранённую в публикации версию страницы (`pages`) на сайте: кнопка «Предпросмотр» в форме страницы открывает `/api/preview/?path=<путь>`, роут проверяет, что пользователь — сотрудник, и путь внутренний, включает Next Draft Mode и перенаправляет на страницу. В режиме превью загрузчик страниц читает последнюю версию документа (черновик) в обход кэша, а на сайте виден баннер «Режим превью» с кнопкой «Выйти». Без режима превью сайт работает как сейчас (ISR, `unstable_cache`, только опубликованное). Обновить приёмочный e2e 11c и добавить e2e превью черновика.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-07-page-edit-form.md
**Blocks:** task-13-acceptance.md

**Context from dependencies:**
- **task-01**: в `src/payload/collections/content/pages.ts` подключено `admin.preview` → `buildPreviewUrl` из `src/lib/preview/preview-url.ts` (заглушка возвращает `null`, поэтому кнопка «Предпросмотр» сейчас не показывается). Тип — `GeneratePreviewURL` из `payload`: `(doc: Record<string, unknown>, { req, locale, token }) => string | null | Promise<string | null>`. `pages.ts` в волне 3 не меняется.
- **task-07**: форма редактирования страницы в теме админки (SEO-счётчики, сниппет, «Изменена / Кем»); кнопка «Предпросмотр» — штатная кнопка Payload в панели документа, её стиль уже в `_edit-form.scss`. Эта задача только начинает возвращать URL.
- Существующее:
  - `pages` — `versions: DRAFT_VERSIONS` (черновики), `access.read: publishedOrLoggedIn`, поле `path` (полный путь `/…/` со слешами, считает `computePagePath`), обязательные `title`, `template` (`home|hub|service|segment|company|contacts|legal|listing|tool|generic`), `slug` (`slugField({ from: 'title' })`), необязательный `parent`.
  - `src/lib/cms/queries.ts`: `getPageByPath(path, { depth })` → React `cache` (`getPageByPathMemo`) → `getPublishedBy('pages', 'path', …)` = `findPublishedId` + `findPublishedById` (оба через `cached()` из `./cache.ts` = `unstable_cache` с тегами `collection:pages`, `lookup:pages`, `doc:pages:<id>`; читают анонимно, `overrideAccess: false`, с условием `_status: published`). `toPagePath()` нормализует путь.
  - Где читается страница по пути (все идут через `getPageByPath`, поэтому правка одного загрузчика покрывает их): `src/app/(site)/[[...slug]]/page.tsx` (страница и `generateMetadata`, шаблоны фиксированных URL из `src/app/(site)/_fixed/**` — `page.tsx` (главная), `kontakty`, `o-kompanii`, `o-kompanii/sotrudniki`, `zakalennoe-steklo`, `blog`), `src/app/(site)/obekty/page.tsx`, `src/app/(site)/obekty/page/[n]/page.tsx`, `src/app/(site)/blog/page/[n]/page.tsx`, `src/lib/blog/listing-metadata.ts`. Остальные загрузчики (`articles.ts`, `objects.ts`, `construction-queries.ts`, `globals.ts`, `team.ts`) **не меняются**: превью — только для `pages` (только у них `admin.preview`).
  - `cacheComponents` выключен. По документации Next 16 (`node_modules/next/dist/docs/01-app/02-guides/draft-mode.md`) в режиме Draft Mode `unstable_cache` обходится автоматически, страница исключается из ISR-кэша и отдаётся с `Cache-Control: private, no-cache, no-store`; cookie — `__prerender_bypass` (значение меняется с каждым `next build`, подделать нельзя). Фильтр «только опубликованные» при этом остаётся — его и надо снять для черновика.
  - `src/lib/leads-admin/auth.ts`: `requireStaff(request)` (`payload.auth({ headers })`, 401 без сессии, 403 без роли staff), `jsonError`, `NO_STORE_HEADERS`.
  - `src/proxy.ts` не обрабатывает `/api/*` (matcher), basic auth стейджинга на `/api` не действует; страница, на которую ведёт редирект, проходит proxy как обычно.
  - Корневой layout сайта `src/app/(site)/layout.tsx` должен оставаться статическим: без `headers()`/`cookies()`; `draftMode()` статичность не ломает (при пререндере `isEnabled === false`), но это надо подтвердить выводом `pnpm build`.

## Files to Create

- `src/lib/preview/safe-path.ts` — `safeInternalPath(raw)`: проверка и нормализация внутреннего пути
- `src/lib/preview/safe-path.test.ts` — unit-тесты (Vitest, `unit`)
- `src/lib/preview/draft.ts` — `isDraftModeEnabled()`: `draftMode().isEnabled` с `try/catch` (вне запроса Next → `false`)
- `src/app/api/preview/route.ts` — `GET`: включить Draft Mode и перенаправить
- `src/app/api/preview/exit/route.ts` — `POST`: выключить Draft Mode и вернуть на страницу
- `src/components/preview/preview-banner.tsx` — server component баннера «Режим превью»
- `e2e/preview.spec.ts` — e2e превью черновика

## Files to Modify

- `src/lib/preview/preview-url.ts` — реализовать `buildPreviewUrl`
- `src/lib/cms/queries.ts` — `getPageByPath`: в Draft Mode читать последнюю версию (черновик) без кэша
- `src/app/(site)/layout.tsx` — вставить `<PreviewBanner />` (единственная правка layout)
- `e2e/acceptance/admin.spec.ts` — тест 11c: проверить реальное превью вместо аннотации «live preview не настроен»; обновить шапку-комментарий файла

**Не трогать:** `src/payload/collections/**`, `src/payload.config.ts`, другие загрузчики `src/lib/cms/*`, `src/lib/cms/cache.ts`, страницы `src/app/(site)/**` (кроме layout), `importMap.js`, `src/payload-types.ts`.

## Technical Details

### `buildPreviewUrl` (`src/lib/preview/preview-url.ts`)

```ts
import type { GeneratePreviewURL } from "payload";

export const PREVIEW_API_PATH = "/api/preview/";
export const PREVIEW_EXIT_PATH = "/api/preview/exit/";

/** `/api/preview/?path=%2Fo-kompanii%2F` for a page with a path; `null` hides the button. */
export const buildPreviewUrl: GeneratePreviewURL = (doc) => {
  const path = typeof doc.path === "string" ? doc.path : null;
  if (!path || !path.startsWith("/")) return null;
  return `${PREVIEW_API_PATH}?path=${encodeURIComponent(path)}`;
};
```

Относительный URL — Payload открывает его в новой вкладке того же origin. Слеш перед `?` — из-за `trailingSlash: true`. Экспортируемое имя `buildPreviewUrl` и путь файла — контракт task-01.

### `safeInternalPath` (`src/lib/preview/safe-path.ts`)

`export function safeInternalPath(raw: string | null | undefined): string | null` — возвращает нормализованный путь или `null`:
- строка длиной 1…512, начинается с `/`, **не** с `//` и не с `/\`; без `\` и управляющих символов (`[\u0000-\u001f\u007f]`);
- `new URL(raw, 'http://preview.invalid')` → `origin === 'http://preview.invalid'` (ловит `/%2F%2Fevil`, `/\t//evil` и т. п. после декодирования парсером);
- запрещены префиксы `/api/`, `/admin` (превью — только страницы сайта), `/_next/`;
- результат — `pathname` (query и hash отбрасываются), с завершающим слешем (`toPagePath` из `src/lib/cms/queries.ts` или собственная эквивалентная функция — без импорта Payload в чистый модуль: лучше скопировать 4 строки нормализации).

Тесты: `/`, `/o-kompanii/`, `/o-kompanii` → `/o-kompanii/`; `//evil.com`, `/\\evil.com`, `https://evil.com`, `javascript:alert(1)`, `/%0d%0aSet-Cookie:x`, `/admin/`, `/api/preview/`, пустая строка, 600 символов → `null`; `?a=1#x` отбрасываются.

### `GET /api/preview/` (`src/app/api/preview/route.ts`)

```ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { jsonError, requireStaff } from "@/lib/leads-admin/auth";
import { safeInternalPath } from "@/lib/preview/safe-path";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response; // 401 «Требуется вход» / 403 «Недостаточно прав»
  const path = safeInternalPath(new URL(request.url).searchParams.get("path"));
  if (!path) return jsonError(400, "Некорректный путь превью");
  (await draftMode()).enable();
  redirect(path); // 307 на внутренний путь, cookie __prerender_bypass в ответе
}
```

- Доступ — admin и manager (оба читают черновики в админке). Ни id документа, ни секрет в URL не передаются: авторизация — сессия Payload (cookie `payload-token`), CSRF-правило Payload для cookie применяется в `payload.auth`.
- В лог — одна строка `info` с `userId` и `path` (без ПДн).

### `POST /api/preview/exit/` (`src/app/api/preview/exit/route.ts`)

- `(await draftMode()).disable()`; адрес возврата — заголовок `Referer`, если его origin совпадает с `SITE_URL` (`getEnv()`), и путь проходит `safeInternalPath`; иначе `/`.
- Ответ — `NextResponse.redirect(new URL(target, getEnv().SITE_URL), 303)` (303: браузер перейдёт на страницу методом GET; `redirect()` из `next/navigation` даёт 307 и повторил бы POST). E2E проверяет, что в ответе cookie `__prerender_bypass` удаляется (`Set-Cookie` с истёкшей датой). Если Next не переносит изменение cookie Draft Mode в собственный `NextResponse`, дополнительно вызвать `res.cookies.delete('__prerender_bypass')` и оставить комментарий почему.
- Только `POST` (кнопка в баннере — `<form method="post">`, такие формы не префетчатся); `GET` → 405.

### Загрузчик (`src/lib/cms/queries.ts`)

```ts
import { isDraftModeEnabled } from "@/lib/preview/draft";

const getDraftPageByPathMemo = cache(async (path: string, depth: number): Promise<Page | null> => {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "pages",
    where: { path: { equals: path } },
    draft: true,          // последняя версия: черновик, если есть, иначе опубликованная
    limit: 1,
    depth,
    pagination: false,
    overrideAccess: true, // роут превью уже проверил сотрудника; cookie Draft Mode не подделать
  });
  return (docs[0] as Page | undefined) ?? null;
});

export async function getPageByPath(path: string, opts: { depth?: number } = {}): Promise<Page | null> {
  const key = toPagePath(path);
  const depth = opts.depth ?? DOC_DEPTH;
  if (await isDraftModeEnabled()) return getDraftPageByPathMemo(key, depth);
  return getPageByPathMemo(key, depth);
}
```

- Ветка черновика **не** идёт через `cached()` (кэш не нужен и не должен наполняться черновиками; `unstable_cache` в Draft Mode и так обходится).
- Сигнатура `getPageByPath` не меняется (возвращала `Promise<Page | null>` — остаётся).
- Связанные документы внутри страницы (медиа, карточки) при `depth` подтягиваются Payload в их текущем состоянии — это допустимо (превью — про страницу).
- `src/lib/preview/draft.ts`:
  ```ts
  import { draftMode } from "next/headers";
  export async function isDraftModeEnabled(): Promise<boolean> {
    try { return (await draftMode()).isEnabled; } catch { return false; } // seed, jobs, тесты
  }
  ```

### Баннер (`src/components/preview/preview-banner.tsx`)

```tsx
import { isDraftModeEnabled } from "@/lib/preview/draft";
import { PREVIEW_EXIT_PATH } from "@/lib/preview/preview-url";

export async function PreviewBanner() {
  if (!(await isDraftModeEnabled())) return null;
  return (
    <div role="status" className="bg-warning-bg text-warning-text border-warning border-b">
      <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center gap-3 px-(--ig-gutter) py-2 text-small">
        <span>Режим превью: показан черновик страницы</span>
        <form method="post" action={PREVIEW_EXIT_PATH}>
          <button type="submit" className="ig-btn ig-btn--secondary ig-btn--s">Выйти</button>
        </form>
      </div>
    </div>
  );
}
```

- Только токены/классы дизайн-системы (DESIGN.md: `warning-bg`/`warning-text`/`warning`, `.ig-btn`, `px-(--ig-gutter)`); можно использовать `Button` из `src/components/ig/button.tsx` с `type="submit"`, если он поддерживает форму без client-кода. Никакого client JS. Касание ≥ 44 px на мобильном (кнопка `s` растянуть по высоте `min-h-11` на `max-sm:`).
- В `src/app/(site)/layout.tsx`: `<PreviewBanner />` сразу после ссылки «Перейти к содержимому», до `<FormDialogProvider>`. Обновить комментарий-описание композиции layout.
- Проверить `pnpm build`: типы маршрутов (`○`/`●`/`ƒ`) в выводе такие же, как до правки. Если `draftMode()` в layout делает маршруты динамическими — перенести баннер в `src/app/(site)/[[...slug]]/page.tsx` внутрь страницы (и в `obekty`/`blog` не добавлять) и описать это в PR.

### E2E

**`e2e/preview.spec.ts`** — только проект `desktop-1366`, `test.describe.configure({ mode: 'serial' })`, админ — `adminApi`/`signInBrowser` из `e2e/helpers/admin-api.ts` (не логиниться напрямую):
1. Аноним: `GET /api/preview/?path=%2F` → 401; менеджер (`staffApi(admin, 'manager')`, удалить в `afterAll`) → не 401/403 (307).
2. Админ: `path=//evil.com`, `path=https%3A%2F%2Fevil.com`, `path=%2Fadmin%2F`, без `path` → 400 (`maxRedirects: 0`).
3. Фикстура: `POST /api/pages/` (опубликованная) с `title: 'Превью e2e <tag>'`, `template: 'generic'`, `slug: 'preview-e2e-<tag>'`, `_status: 'published'` (+ обязательные поля, если есть — посмотреть `pages.ts`, текст тела — `lexicalDoc` из `e2e/helpers/acceptance-admin.ts`); затем `PATCH /api/pages/<id>/?draft=true` с `title: 'Черновик e2e <tag>'`, `_status: 'draft'`.
4. Аноним: `GET <path>` → 200, HTML содержит «Превью e2e <tag>» и не содержит «Черновик e2e <tag>».
5. Браузер (`signInBrowser`): `page.goto('/api/preview/?path=' + encodeURIComponent(path))` → URL = `path`, виден `getByRole('status')` с текстом «Режим превью», заголовок страницы — «Черновик e2e <tag>»; ответ страницы с `cache-control`, содержащим `no-store`.
6. Клик «Выйти» → URL = `path`, баннера нет, заголовок — «Превью e2e <tag>».
7. `afterAll`: удалить страницу (`DELETE /api/pages/<id>/`).

**`e2e/acceptance/admin.spec.ts` → 11c** (название: «11c. preview: pages are framed by the site itself and the draft preview works»): оставить проверки `X-Frame-Options: SAMEORIGIN` и встраивания; аннотацию «Payload live preview не настроен…» убрать; добавить: админ (существующий `token`) открывает форму редактирования главной (`/admin/collections/pages/<id home>/`, id — `GET /api/pages/?where[path][equals]=%2F&limit=1&depth=0`), видна кнопка/ссылка «Предпросмотр» (подпись Payload ru), её `href` (или URL открываемой вкладки) содержит `/api/preview/?path=%2F`; `GET` этого URL с `Authorization: JWT <token>` и `maxRedirects: 0` → 307, `location` = `/`, `set-cookie` содержит `__prerender_bypass`. Live preview (`admin.livePreview`) по-прежнему не настраивается — это вне задачи, упомянуть в шапке-комментарии файла.

### Команды

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # сравнить таблицу маршрутов до/после
pnpm test:e2e -- e2e/preview.spec.ts e2e/acceptance/admin.spec.ts --project=desktop-1366
git checkout -- src/payload-types.ts src/app/(payload)/admin/importMap.js   # не владелец
```

## Acceptance Criteria

- [ ] В форме страницы есть «Предпросмотр»; он открывает `/api/preview/?path=<path>`; для страницы без `path` кнопки нет.
- [ ] `/api/preview/`: аноним → 401, не-staff → 403, небезопасный путь (`//…`, абсолютный URL, `/admin`, `/api`, управляющие символы) → 400, сотрудник → 307 на внутренний путь с cookie Draft Mode.
- [ ] В режиме превью страница показывает последнюю (черновую) версию; без режима — только опубликованную; кэш (`unstable_cache`, ISR) черновиком не наполняется (после выхода аноним видит опубликованное).
- [ ] Баннер «Режим превью» виден только в режиме превью; «Выйти» (POST `/api/preview/exit/`) выключает режим и возвращает на ту же страницу.
- [ ] Таблица маршрутов `pnpm build` не изменилась (layout остался статическим) либо баннер перенесён, как описано, и это отражено в PR.
- [ ] `safe-path.test.ts` зелёный; `e2e/preview.spec.ts` и обновлённый 11c проходят на `desktop-1366`; `e2e/acceptance/visual.spec.ts` не изменил baseline (баннера нет без превью).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные; `payload-types.ts` и `importMap.js` не закоммичены.

## Notes

- `cacheComponents` выключен — `'use cache'` не используется; Draft Mode обходит `unstable_cache` сам.
- Не путать с Payload Live Preview (iframe в админке) — он не настраивается.
- Превью статей/объектов не входит: у этих коллекций нет `admin.preview`, их загрузчики не меняются.
- Cookie Draft Mode живёт до закрытия браузера; повторный вход в превью — снова через кнопку в админке.
