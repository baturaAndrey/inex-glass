/**
 * Pure slug helpers (no Payload imports): shared by `slugField` and unit tests.
 */

/** Kebab-case: lowercase Latin letters and digits separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Cyrillic → Latin, GOST 7.79-2000 "system B" simplified to plain ASCII the way the URL registry
 * of the brief does it (`й` → `j`, `х` → `h`, `ц` → `c`, `щ` → `shch`, hard/soft signs dropped).
 */
const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "j",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Latin letters that do not decompose into base letter + combining mark under NFD. */
const LATIN_LIGATURES: Readonly<Record<string, string>> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

/** Combining diacritical marks left after NFD decomposition (`é` → `e` + U+0301). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Builds a kebab-case slug from free text: transliterates Cyrillic, folds Latin diacritics to
 * ASCII (`Café Müller` → `cafe-muller`), turns every other non-alphanumeric character into a
 * hyphen, collapses and trims hyphens.
 *
 * `transliterate("Застройщикам")` → `zastrojshchikam`.
 */
export function transliterate(input: string): string {
  // Cyrillic first: NFD would split `й`/`ё` into `и`/`е` + a combining mark.
  const latin = Array.from(
    input.toLowerCase(),
    (char) => CYRILLIC_TO_LATIN[char] ?? LATIN_LIGATURES[char] ?? char
  )
    .join("")
    // NFD (not NFKD): compatibility forms like `½`, `²` must not turn into digits.
    .normalize("NFD")
    .replace(COMBINING_MARKS, "");
  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
