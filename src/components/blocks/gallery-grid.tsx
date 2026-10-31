"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox, type LightboxImage } from "@/components/ig/lightbox";
import { cn } from "@/lib/utils";

export interface GalleryImage extends LightboxImage {
  /** Smaller rendition for the grid (`card` size), the full file opens in the viewer. */
  thumb: string;
}

export interface GalleryGridProps {
  images: GalleryImage[];
  layout: "grid" | "slider";
  /** Accessible name of the viewer dialog. */
  title?: string | undefined;
}

const GRID_SIZES = "(max-width: 599px) 50vw, (max-width: 1100px) 33vw, 25vw";
const SLIDER_SIZES = "(max-width: 599px) 80vw, 360px";

/** Photo grid / horizontal strip; a click opens the full-screen `Lightbox`. */
export function GalleryGrid({ images, layout, title }: GalleryGridProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const slider = layout === "slider";

  return (
    <>
      <ul
        className={cn(
          "m-0 list-none p-0",
          slider
            ? "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
            : "grid grid-cols-2 gap-4 max-sm:gap-2 sm:grid-cols-3 lg:grid-cols-4"
        )}
      >
        {images.map((image, imageIndex) => (
          <li
            key={`${image.src}-${imageIndex}`}
            className={cn(slider && "w-[360px] flex-none snap-start max-sm:w-[80vw]")}
          >
            <figure className="m-0 flex flex-col gap-2">
              <button
                type="button"
                className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg"
                aria-label={`Открыть фото: ${image.alt}`}
                onClick={() => {
                  setIndex(imageIndex);
                  setOpen(true);
                }}
              >
                <Image
                  src={image.thumb}
                  alt={image.alt}
                  fill
                  sizes={slider ? SLIDER_SIZES : GRID_SIZES}
                  className="object-cover"
                />
              </button>
              {image.caption ? (
                <figcaption className="text-small text-text-2">{image.caption}</figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
      <Lightbox
        images={images}
        open={open}
        index={index}
        onOpenChange={setOpen}
        onIndexChange={setIndex}
        {...(title ? { title } : {})}
      />
    </>
  );
}
