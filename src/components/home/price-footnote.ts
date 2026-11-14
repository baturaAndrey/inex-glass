import { priceCaption, replacePlaceholders } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";

/** Mark tying the footnote to the «от … ₽/м²*» prices of the catalog cards. */
export const PRICE_FOOTNOTE_MARK = "*";

/**
 * Footnote under the home catalog cards: «* Ориентировочная цена на 15.10.2026. Точная
 * стоимость — в КП; цена в договоре фиксируется». The text is the `prices.caption` global
 * (`{дата_цен}` substituted) and, when that is empty, `priceCaption()` of the domain library —
 * the same ТЗ §11 wording used next to every other price on the site, never a block-local copy.
 */
export function homePriceFootnote(
  captionTemplate: string | null | undefined,
  ctx: PlaceholderContext
): string {
  const template = captionTemplate?.trim() || priceCaption(ctx.prices);
  const caption = replacePlaceholders(template, ctx).trim();
  return `${PRICE_FOOTNOTE_MARK} ${caption}`;
}
