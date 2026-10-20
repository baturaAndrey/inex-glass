import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom type-scale utilities declared as `--text-*` in `src/app/(site)/globals.css`
 * (`text-h1`, `text-lead-l`, `text-caption`, …). Plain tailwind-merge does not know them
 * and treats `text-<anything>` as a colour, so `cn("text-ink-2", "text-lead-l")` would drop
 * the colour. Keep in sync with globals.css — `utils.test.ts` fails when they diverge.
 */
export const CUSTOM_TEXT_SIZES = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body",
  "small",
  "micro",
  "price-l",
  "price-m",
  "price-s",
  "stat",
  "lead-l",
  "lead-m",
  "lead",
  "caption",
  "hero-stat",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    // `text` theme feeds the `font-size` class group.
    theme: { text: [...CUSTOM_TEXT_SIZES] },
    // `px-gutter` (@utility in globals.css) is horizontal padding: it must replace `px-4` etc.
    classGroups: { px: [{ px: ["gutter"] }] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
