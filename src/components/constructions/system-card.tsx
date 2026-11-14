import { BlockImage, asMedia, fill, hasText } from "@/components/blocks/shared";
import type { SystemItem } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import type { PlaceholderContext } from "@/lib/domain";
import { sanitizeSvg } from "@/lib/svg-sanitize";
import { cn } from "@/lib/utils";

/** Facts of a system card in the prototype order (`.p5-sys__k` / `.p5-sys__v`). */
export const SYSTEM_FACTS = [
  { key: "whereFits", label: "Где уместна" },
  { key: "important", label: "Что важно знать" },
  { key: "howHeld", label: "Как держится стекло" },
  { key: "requiresInGlass", label: "Что нужно в стекле" },
] as const satisfies ReadonlyArray<{ key: keyof SystemItem; label: string }>;

/** A scheme wider than this (viewBox width / height) is drawn full-width (canopy schemes). */
const WIDE_SCHEME_RATIO = 1.3;

/** `true` for a landscape scheme (`viewBox="0 0 240 140"`), `false` for square icons. */
export function isWideScheme(svg: string): boolean {
  const match = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i.exec(svg);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return height > 0 && width / height > WIDE_SCHEME_RATIO;
}

/** Scheme area of the card: sanitized SVG, the uploaded image or a placeholder. */
function SystemPicture({ system }: { system: SystemItem }) {
  const svg = sanitizeSvg(system.schemeSvg);
  if (svg) {
    const wide = isWideScheme(svg);
    return (
      <div
        className={cn(
          // Prototype strokes (#1F6B60) are stored as `currentColor`.
          "bg-bg text-primary-pressed grid place-items-center rounded-[14px]",
          wide
            ? "p-4 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            : "h-[132px] [&_svg]:size-[120px]"
        )}
        // Editor SVG passed through the allow-list sanitizer (`@/lib/svg-sanitize`).
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  const media = asMedia(system.image);
  if (media) {
    return (
      <BlockImage
        media={media}
        size="card"
        sizes="(max-width: 599px) 82vw, (max-width: 1365px) 50vw, 25vw"
        frameClassName="aspect-auto h-[132px] rounded-[14px]"
        className="object-contain"
      />
    );
  }
  return <Placeholder label="схема" className="aspect-auto! h-[132px] rounded-[14px]" />;
}

export interface SystemCardProps {
  system: SystemItem;
  ctx: PlaceholderContext;
  className?: string | undefined;
}

/** System card (`.p5-sys__c`): scheme, name, subtitle and the non-empty «label — value» facts. */
export function SystemCard({ system, ctx, className }: SystemCardProps) {
  const subtitle = fill(system.subtitle, ctx);
  const facts = SYSTEM_FACTS.flatMap(({ key, label }) => {
    const value = hasText(system[key]) ? fill(system[key], ctx) : "";
    return value ? [{ key, label, value }] : [];
  });

  return (
    <article
      className={cn("bg-surface shadow-card flex flex-col gap-3.5 rounded-[20px] p-6", className)}
    >
      <SystemPicture system={system} />
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[19px] leading-[1.3] font-semibold">{fill(system.name, ctx)}</h3>
        {subtitle ? <p className="text-text-2 m-0 text-[14px] leading-[1.45]">{subtitle}</p> : null}
      </div>
      {facts.length > 0 ? (
        <dl className="m-0 flex flex-col gap-0.5">
          {facts.map(({ key, label, value }) => (
            <div key={key} className="flex flex-col gap-0.5 not-first:mt-1.5">
              <dt className="text-text-2 text-[12px] leading-[1.3] font-medium tracking-[.06em] uppercase">
                {label}
              </dt>
              <dd className="m-0 text-[15px] leading-normal">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
