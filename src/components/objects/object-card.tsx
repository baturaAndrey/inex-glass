import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { ObjectCardData } from "@/lib/objects/filters";
import { joinMeta, MAX_CARD_CHIPS } from "@/lib/objects/format";
import { cn } from "@/lib/utils";

/** `sizes` of the 4 / 3 / 2 / 1-column grid (Paper mockup `2560_obekty`, 1920 frame). */
export const OBJECT_CARD_SIZES =
  "(min-width:1920px) 430px, (min-width:1366px) 25vw, (min-width:1101px) 33vw, (min-width:600px) 50vw, 100vw";

export interface ObjectCardProps {
  object: ObjectCardData;
  /** Heading level: `h2` in the listing (under the page H1), `h3` under a section heading. */
  titleAs?: "h2" | "h3";
  className?: string | undefined;
}

/**
 * Portfolio card of the Paper mockups `2560_obekty` / `2560_obekt` (the whole card is a link):
 * photo (or a neutral well with an image icon) with the product tags as white pills over its
 * top-left corner; body — «Город · Тип · Год», the name, a hairline and the glass line (the
 * card chips: editor `chips[]` or generated from the spec, joined with « · »).
 * Used by the listing and «Другие объекты».
 */
export function ObjectCard({ object, titleAs: Title = "h2", className }: ObjectCardProps) {
  const meta = joinMeta([object.city?.name, object.type?.name, object.year]);
  const products = object.products.slice(0, MAX_CARD_CHIPS);
  const spec = object.chips.join(" · ");

  return (
    <Link
      href={object.href}
      className={cn(
        "group bg-surface border-hairline text-text flex h-full flex-col overflow-hidden rounded-lg border no-underline",
        "ease-ig hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2",
        className
      )}
      data-object-card=""
    >
      <div className="bg-well relative aspect-[427/300] shrink-0 overflow-hidden">
        {object.photo ? (
          <Image
            src={object.photo.src}
            alt={object.photo.alt}
            fill
            sizes={OBJECT_CARD_SIZES}
            className="object-cover"
          />
        ) : (
          <div aria-hidden="true" className="grid h-full place-items-center">
            <ImageIcon className="text-gray-1 size-10" strokeWidth={1.5} />
          </div>
        )}
        {products.length > 0 ? (
          <ul className="absolute top-4 left-4 m-0 flex list-none flex-wrap gap-1.5 p-0 pr-4">
            {products.map((product) => (
              <li
                key={product.slug}
                className="bg-surface text-primary-dark rounded-full px-3 py-1.5 text-[13px] leading-4 font-medium"
              >
                {product.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-6 pt-6 pb-7 max-sm:px-5 max-sm:pt-5 max-sm:pb-6">
        {meta ? <p className="text-text-2 m-0 text-[13px] leading-4 font-medium">{meta}</p> : null}
        <Title className="group-hover:text-primary-pressed m-0 text-[20px] leading-[1.3] font-semibold transition-colors duration-200 max-sm:text-[18px]">
          {object.name}
        </Title>
        {spec ? (
          <p className="border-hairline text-text-2 m-0 border-t pt-3 text-[15px] leading-normal">
            {spec}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
