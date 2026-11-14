/** Russian plural forms via `Intl.PluralRules` (CLDR): one / few / many; fractions use «few». */

const ruPluralRules = new Intl.PluralRules("ru");

export function pluralRu(
  n: number,
  forms: readonly [one: string, few: string, many: string]
): string {
  const [one, few, many] = forms;
  switch (ruPluralRules.select(n)) {
    case "one":
      return one;
    case "few":
      return few;
    case "many":
      return many;
    default:
      // 'other' in Russian covers fractions: «1,5 объекта».
      return few;
  }
}

/** «объект» / «объекта» / «объектов» — the word only, without the number. */
export function pluralObjects(n: number): string {
  return pluralRu(n, ["объект", "объекта", "объектов"]);
}
