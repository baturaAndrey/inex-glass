import Image from "next/image";
import { Placeholder } from "@/components/ig/placeholder";
import { cn } from "@/lib/utils";

/**
 * Photo column of the glass-type hero (`.ct-photos` of `Osvetl.dc.html`): two captioned photo
 * cards side by side («Торец обычного / осветлённого стекла»), or one wider card.
 */

/** One hero photo resolved on the server from `glass-types.heroPhotos[]`. */
export interface HeroPhotoView {
  /**
   * Site-relative image URL, or `null` → design-system placeholder (`.ig-ph`). Temporary media
   * (`isPlaceholder`) is shown as a placeholder too: these photos document the product (edge
   * colour, samples), and a stand-in picture must not pass for one.
   */
  src: string | null;
  alt: string;
  caption: string | null;
}

export interface EdgeCompareProps {
  photos: HeroPhotoView[];
  className?: string | undefined;
}

/** Label inside a placeholder (the prototype's `.ig-ph` text). */
const PLACEHOLDER_LABEL = "фото";

/** The aside is ≤520 px wide (one column ≤1100). */
const PAIR_SIZES = "(max-width: 599px) 50vw, (max-width: 1100px) 50vw, 260px";
const SINGLE_SIZES = "(max-width: 1100px) 100vw, 520px";

/**
 * Up to two photo cards; a single photo is shown 4:3 so it does not tower over the text. The
 * first photo is the LCP candidate of the page, so it is preloaded.
 */
export function EdgeCompare({ photos, className }: EdgeCompareProps) {
  const shown = photos.slice(0, 2);
  if (shown.length === 0) return null;
  const pair = shown.length === 2;
  const ratio = pair ? "3/4" : "4/3";

  return (
    <div
      data-hero-photos={shown.length}
      className={cn("grid gap-4", pair ? "grid-cols-2" : "grid-cols-1", className)}
    >
      {shown.map((photo, index) => (
        <figure key={index} className="m-0 flex min-w-0 flex-col gap-2">
          {photo.src ? (
            <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: ratio }}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                preload={index === 0}
                sizes={pair ? PAIR_SIZES : SINGLE_SIZES}
                className="object-cover"
              />
            </div>
          ) : (
            <Placeholder
              ratio={ratio}
              label={PLACEHOLDER_LABEL}
              className="overflow-hidden rounded-lg"
            />
          )}
          {photo.caption ? (
            <figcaption className="text-small text-text-2">{photo.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
