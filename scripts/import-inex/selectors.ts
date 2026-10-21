/**
 * CSS selectors and heuristics for inex.su markup (task 37). Fixed after the `--sample` run of
 * 2026-10-21 (`crawl.ts --sample`); see the import report for what was checked.
 *
 * Portfolio object page (`/portfolio/<cat>/[<sub>/]<object>`):
 *   .content_right > h1                              — object name
 *   .content_right p.example_location a span         — city
 *   .content_right ul.item_show a.fancybox[href]     — full-size photos (`/media/big/…`), the
 *                                                       `title` is the caption «<name>, <city>, фото N»
 *   .content_right .opisanie                          — description (paragraphs with <br>)
 *   inline ymaps script `iconContent: '…'`            — kind of object («Частный коттедж», «ТРК»…)
 *
 * Shower configuration page (`/produkciya/dushevye/<config>`):
 *   .content_right > h1                              — name
 *   #model_slider_dushevye a.fancybox[href]          — slider; the photo named after the URL
 *                                                       slug is the product image, the rest are
 *                                                       installation photos
 *   .content_right p.launch                          — description
 *   .content_right p.product_price                   — price (NOT imported: prices live in CMS globals)
 *   .komplekt                                        — hardware thumbnails (NOT imported)
 *
 * Shower listing (`/produkciya/dushevye`): `.content_right a[href*='/produkciya/dushevye/']` in
 * page order defines the card order.
 */

export const OBJECT = {
  name: ".content_right h1",
  city: ".content_right .example_location span",
  photoLinks: ".content_right ul.item_show a.fancybox[href]",
  description: ".content_right .opisanie",
  /** Fallback when `.opisanie` is missing: paragraphs directly in the content column. */
  descriptionFallback: ".content_right > p:not(.example_location)",
  /** `iconContent: 'Частный коттедж'` of the Yandex map placemark. */
  mapLabel: /iconContent:\s*'([^']*)'/,
} as const;

export const SHOWER = {
  name: ".content_right h1",
  sliderLinks: "#model_slider_dushevye a.fancybox[href]",
  /** Before the slider script runs the markup may keep the commented-out single image. */
  sliderFallback: ".content_right .model a.fancybox[href]",
  description: ".content_right p.launch",
  price: ".content_right p.product_price",
} as const;

export const SHOWER_LISTING = {
  items: ".content_right a[href*='/produkciya/dushevye/']",
} as const;

/** Photo URLs must point at real pictures, not icons, logos or third-party embeds. */
export const PHOTO_URL_ALLOW = /^https:\/\/inex\.su\/(?:media|img)\//i;
export const PHOTO_URL_DENY = /(?:logo|icon|sprite|favicon|_small\.|_m\.)/i;
export const PHOTO_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i;

/** Minimum width or height (px) of an imported photo and minimum file size. */
export const MIN_PHOTO_SIDE = 400;
export const MIN_PHOTO_BYTES = 10 * 1024;

/** Site suffixes stripped from titles («… — Инэкс», «| inex.su»). */
export const TITLE_SUFFIX = /\s*[|—–-]\s*(?:инэкс|inex(?:\.su)?)\s*$/i;

/** «…, фото 3» at the end of an inex.su photo caption. */
export const PHOTO_CAPTION_SUFFIX = /,?\s*фото\s*\d+\s*$/i;

/**
 * Cities searched in the name/description when the page has no explicit location. Spelling as in
 * the `cities` taxonomy; the slug is built with `toLatinSlug`.
 */
export const KNOWN_CITIES = [
  "Челябинск",
  "Екатеринбург",
  "Тюмень",
  "Омск",
  "Новосибирск",
  "Сургут",
  "Магнитогорск",
  "Ишим",
  "Златоуст",
  "Ижевск",
  "Миасс",
  "Копейск",
  "Курган",
  "Снежинск",
  "Павлодар",
  "Нефтеюганск",
  "Ханты-Мансийск",
  "Нижневартовск",
  "Москва",
] as const;

/** Russian case endings to accept «в Челябинске», «Омска»… when searching the text. */
export function cityPattern(city: string): RegExp {
  const stem = city.replace(/[ьаея]$/i, "");
  return new RegExp(`(?<![\\p{L}])${stem}\\p{L}{0,3}(?![\\p{L}])`, "iu");
}

/**
 * Object type (`object-types` slug seeded by task 30) from the map label and the name. First
 * match wins; no match leaves the field empty for the editor.
 */
export const OBJECT_TYPE_RULES: ReadonlyArray<readonly [slug: string, pattern: RegExp]> = [
  ["airport", /аэропорт/i],
  ["arena", /арен/i],
  ["concert-hall", /концертн\p{L}*\s+зал|филармон/iu],
  ["bank", /банк/i],
  ["tc", /(?<![\p{L}])(?:тц|трк|трц|тк|тд)(?![\p{L}])|торгов|молл|plaza|плаза/iu],
  ["office", /офис|(?<![\p{L}])оц(?![\p{L}])|бизнес|управлени|администрац/iu],
  ["cottage", /коттедж|частн\p{L}*\s+дом|частн\p{L}*\s+коттедж|пентхаус|квартир/iu],
] as const;

/**
 * Portfolio category → `products` taxonomy (slug + name). Existing records are found by the slug
 * or an alias (task 30 seeds `peregorodki`, `ograzhdeniya`, `kozyrki`, `fasady`, `dushevye`).
 */
export const CATEGORY_PRODUCTS: Readonly<
  Record<string, { slug: string; name: string; aliases?: readonly string[] }>
> = {
  dushevye: { slug: "dushevye", name: "Душевые", aliases: ["dushevye-peregorodki"] },
  fasady: { slug: "fasady", name: "Фасады", aliases: ["steklyannyj-fasad"] },
  kozyrki: { slug: "kozyrki", name: "Козырьки" },
  ograzhdeniya: { slug: "ograzhdeniya", name: "Ограждения" },
  osteklenie: { slug: "osteklenie", name: "Остекление" },
  peregorodki: { slug: "peregorodki", name: "Перегородки" },
  zerkala: { slug: "zerkala", name: "Зеркала" },
};

/* Content rules (ТЗ §11) applied to imported texts ----------------------------------------- */

/** inex.su contacts: phones and e-mails are removed from imported texts. */
export const PHONE = /(?:\+7|8)[\s(-]*\d{3,4}[\s)-]*\d{1,3}[\s-]*\d{2}[\s-]*\d{2}/g;
export const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * Sentences promising installation / measuring / turnkey work or own production: Inex Glass
 * does not claim them (ТЗ §11), so they are dropped from imported texts and listed in the report.
 */
export const REMOVE_SENTENCE = [
  /монтаж/i,
  /смонтир/i,
  /установ(?:им|ит|ка\s+под)/i,
  /под\s+ключ/i,
  /замер/i,
  /(?:мы|наши\s+специалисты|команда)\s[^.]*изготов/i,
  /звоните|позвоните|оставьте\s+заявку/i,
] as const;

/** Sentences kept but flagged for the editor (doors stay on inex.su). */
export const FLAG_SENTENCE = [/двер/i] as const;
