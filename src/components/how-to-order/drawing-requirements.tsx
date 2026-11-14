import { fill, hasText } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { RichText } from "@/components/rich-text/rich-text";
import { HolesScheme } from "@/components/templates/thickness/holes-rules";
import type { PlaceholderContext, TechLimits } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Sections of «Требования к чертежам» with their own look in the Paper mockup
 * `2560_kak-zakazat_trebovaniya`: the technological limits as tiles (`sec-limits`) and the GOST
 * holes rules beside the holes drawing (`sec-holes`). Both read the page's CMS blocks.
 */

export interface LimitTile {
  key: string;
  label: string;
  value: string;
  /** Second line of the value (after the first «; »), smaller. */
  note: string;
}

/** «до 1200 × 2000 мм; радиус от 1000 мм …» → value «до 1200 × 2000 мм» + note «радиус …». */
export function splitLimitValue(text: string): { value: string; note: string } {
  const trimmed = text.trim();
  const at = trimmed.indexOf("; ");
  return at === -1
    ? { value: trimmed, note: "" }
    : { value: trimmed.slice(0, at).trim(), note: trimmed.slice(at + 2).trim() };
}

export function limitTilesOf(block: BlockOf<"table">, ctx: PlaceholderContext): LimitTile[] {
  return (block.table?.rows ?? []).flatMap((row, index) => {
    const label = fill(row.cells?.[0]?.value, ctx);
    const raw = fill(row.cells?.[1]?.value, ctx);
    if (!label || !raw) return [];
    return [{ key: row.id ?? String(index), label, ...splitLimitValue(raw) }];
  });
}

/** «Технологические ограничения»: one white tile per row — caption, bold value, optional note. */
export function LimitTiles({ tiles }: { tiles: readonly LimitTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <dl
      className="m-0 grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3"
      data-testid="limit-tiles"
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="bg-surface border-hairline flex flex-col gap-1.5 rounded-lg border p-6 max-sm:p-5"
        >
          <dt className="text-text-2 text-sm leading-[18px]">{tile.label}</dt>
          <dd className="m-0 flex flex-col gap-1.5">
            <span
              className={cn(
                "font-bold tabular-nums",
                tile.note
                  ? "text-xl leading-[1.3]"
                  : "text-2xl leading-[1.25] max-sm:text-xl max-sm:leading-[1.3]"
              )}
            >
              {tile.value}
            </span>
            {tile.note ? (
              <span className="text-ink-3 text-[15px] leading-normal">{tile.note}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Thickness of the drawing and its example (teksty: «Пример: стекло 10 мм → …»). */
const SCHEME_THICKNESS = 10;

/**
 * «Отверстия по ГОСТ 30698-2014»: the holes drawing for 10 mm (same as the thickness cards) on
 * the left; the rules of the callout as brand-dot bullets and its example in a light-teal note on
 * the right. Stacks ≤1100 px.
 */
export function HolesRulesPanel({
  block,
  ctx,
  holes,
}: {
  block: BlockOf<"callout">;
  ctx: PlaceholderContext;
  holes: TechLimits["holes"];
}) {
  const items = block.items ?? [];
  return (
    <div
      className="flex items-center gap-8 max-md:flex-col max-md:items-stretch max-sm:gap-5"
      data-testid="holes-rules"
    >
      <HolesScheme
        n={SCHEME_THICKNESS}
        holes={holes}
        className="w-[460px] shrink-0 max-md:w-full max-md:max-w-[620px] xl:w-[620px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        {items.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {items.map((item, index) => (
              <li
                key={item.id ?? index}
                className="flex gap-3 text-[17px] leading-normal max-sm:text-base [&_p]:inline [&_p]:text-[length:inherit]"
              >
                <span
                  aria-hidden="true"
                  className="bg-brand mt-[9px] size-2 shrink-0 rounded-full max-sm:mt-2"
                />
                <div className="min-w-0">
                  {hasText(item.lead) ? <strong>{fill(item.lead, ctx)} </strong> : null}
                  <RichText data={item.text} ctx={ctx} disableContainer />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {block.body ? (
          <div className="bg-primary-light mt-2 rounded-[12px] px-5 py-4">
            <RichText
              data={block.body}
              ctx={ctx}
              className="flex flex-col gap-2 [&_a]:text-[length:inherit] [&_p]:max-w-none [&_p]:text-base [&_p]:leading-[1.55]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
