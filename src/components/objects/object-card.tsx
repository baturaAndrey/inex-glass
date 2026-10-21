import Image from "next/image";
import Link from "next/link";
import { Chip } from "@/components/ig/chip";
import { Placeholder } from "@/components/ig/placeholder";
import type { ObjectCardData } from "@/lib/objects/filters";
import { joinMeta } from "@/lib/objects/format";
import { cn } from "@/lib/utils";

/** `sizes` of the 4 / 3 / 2 / 1-column grid (prototype `Objects.dc.html`). */
export const OBJECT_CARD_SIZES = "(min-width:1366px) 25vw, (min-width:600px) 50vw, 100vw";

export interface ObjectCardProps {
  object: ObjectCardData;
  /** Heading level: `h2` in the listing (under the page H1), `h3` under a section heading. */
  titleAs?: "h2" | "h3";
  /** Muted card on a white section («Другие объекты»): grey fill, no shadow. */
  tone?: "default" | "muted";
  className?: string | undefined;
}

/**
 * Portfolio card (`.ig-card`, the whole card is a link): 4:3 photo or a neutral placeholder,
 * name, «Город · Тип», up to three static chips. Works in Server and Client Components; reused
 * by the listing, «Другие объекты» and other pages (the `objectsFeed` block keeps its own card).
 */
export function ObjectCard({
  object,
  titleAs: Title = "h2",
  tone = "default",
  className,
}: ObjectCardProps) {
  const meta = joinMeta([object.city?.name, object.type?.name]);
  return (
    <Link
      href={object.href}
      className={cn("ig-card h-full", tone === "muted" && "bg-bg shadow-none", className)}
    >
      {object.photo ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={object.photo.src}
            alt={object.photo.alt}
            fill
            sizes={OBJECT_CARD_SIZES}
            className="object-cover"
          />
        </div>
      ) : (
        <Placeholder label="" />
      )}
      <div className="ig-card__body">
        <Title className={cn("ig-card__title", tone === "muted" && "text-[18px]")}>
          {object.name}
        </Title>
        {meta ? <p className="ig-card__sub">{meta}</p> : null}
        {object.chips.length > 0 ? (
          <div className="ig-chips mt-1.5">
            {object.chips.map((chip) => (
              <Chip key={chip} static>
                {chip}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
