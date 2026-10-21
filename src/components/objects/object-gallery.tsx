"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "@/components/ig/lightbox";
import type { LightboxImage } from "@/components/ig/lightbox";
import { Placeholder } from "@/components/ig/placeholder";
import { cn } from "@/lib/utils";

export interface GalleryPhoto {
  src: string;
  alt: string;
  caption?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}

export interface ObjectGalleryProps {
  photos: GalleryPhoto[];
  /** Object name: lightbox title. */
  name: string;
}

/** Main photo: two thirds of the page at ≥1101, full width below (prototype `.op-grid`). */
const MAIN_SIZES = "(min-width:1101px) 66vw, 100vw";
const THUMB_SIZES = "(min-width:1101px) 14vw, 20vw";

/**
 * Object photos (prototype `ObjectPage.dc.html`): 16:10 main photo — a button that opens the
 * lightbox at the current position — and a 5-column grid of thumbnails (`aria-pressed`) when
 * there is more than one photo. The main photo is preloaded (LCP; Next 16 `preload`).
 */
export function ObjectGallery({ photos, name }: ObjectGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const photo = photos[current] ?? photos[0];

  if (!photo) {
    return <Placeholder ratio="16/10" label="" className="rounded-xl max-sm:rounded-lg" />;
  }

  const images: LightboxImage[] = photos.map((item) => ({
    src: item.src,
    alt: item.alt,
    ...(item.caption ? { caption: item.caption } : {}),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-3" data-object-gallery="">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-well relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-xl border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline) max-sm:rounded-lg"
      >
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          preload={current === 0}
          sizes={MAIN_SIZES}
          className="object-cover"
          data-gallery-main=""
        />
        <span className="sr-only">
          — фото {current + 1} из {photos.length}, открыть на весь экран
        </span>
      </button>

      {photos.length > 1 ? (
        <div
          role="group"
          aria-label="Фотографии объекта"
          className="grid grid-cols-5 gap-3 max-sm:gap-1.5"
        >
          {photos.map((item, index) => {
            const active = index === current;
            return (
              <button
                key={`${item.src}-${index}`}
                type="button"
                aria-pressed={active}
                aria-label={`Фото ${index + 1}`}
                onClick={() => setCurrent(index)}
                className={cn(
                  "relative aspect-[4/3] cursor-pointer overflow-hidden rounded-md border-2 bg-transparent p-0 transition-colors duration-(--ig-dur-base)",
                  "focus-visible:shadow-(--ig-focus-ring) focus-visible:outline-none",
                  active ? "border-brand" : "hover:border-gray-1 border-transparent"
                )}
              >
                <Image src={item.src} alt="" fill sizes={THUMB_SIZES} className="object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}

      <Lightbox
        images={images}
        open={open}
        index={current}
        onOpenChange={setOpen}
        onIndexChange={setCurrent}
        title={name}
      />
    </div>
  );
}
