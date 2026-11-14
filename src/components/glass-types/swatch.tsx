import Image from "next/image";
import { cn } from "@/lib/utils";
import { SWATCH_BASE_COLOR, swatchPatternStyle, type SwatchPatternKey } from "./swatch-patterns";

/**
 * Resolved swatch of a glass variant, computed on the server from the CMS fields
 * (`swatchKind`, `swatchColor`, `swatchImage`, `patternKey`) so the client picker receives plain,
 * already validated data.
 */
export type SwatchData =
  | { kind: "color"; color: string }
  | { kind: "image"; src: string }
  | { kind: "pattern"; pattern: SwatchPatternKey }
  | { kind: "none" };

export interface SwatchProps {
  swatch: SwatchData;
  /** `sizes` of the image swatch (grid width of the card). */
  sizes?: string | undefined;
  className?: string | undefined;
}

const DEFAULT_SIZES = "(max-width: 599px) 50vw, (max-width: 1100px) 33vw, 20vw";

/**
 * Square sample of a variant (`.vd-sw`): solid colour, photo or CSS pattern. Decorative — the
 * variant name next to it carries the meaning, so it is hidden from assistive technology.
 * No hooks: renders in Server Components and inside the client picker alike.
 */
export function Swatch({ swatch, sizes = DEFAULT_SIZES, className }: SwatchProps) {
  const frame = cn("relative block aspect-square overflow-hidden rounded-md", className);

  switch (swatch.kind) {
    case "image":
      return (
        <span aria-hidden="true" className={frame} style={{ backgroundColor: SWATCH_BASE_COLOR }}>
          <Image src={swatch.src} alt="" fill sizes={sizes} className="object-cover" />
        </span>
      );
    case "pattern":
      return (
        <span aria-hidden="true" className={frame} style={swatchPatternStyle(swatch.pattern)} />
      );
    case "color":
      return (
        <span aria-hidden="true" className={frame} style={{ backgroundColor: swatch.color }} />
      );
    case "none":
      return (
        <span aria-hidden="true" className={frame} style={{ backgroundColor: SWATCH_BASE_COLOR }} />
      );
  }
}
