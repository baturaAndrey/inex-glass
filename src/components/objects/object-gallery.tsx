"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Lightbox } from "@/components/ig/lightbox";
import type { LightboxImage } from "@/components/ig/lightbox";
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

/** Main photo: the page minus the 460 px facts card at ≥1101, full width below. */
const MAIN_SIZES = "(min-width:1920px) 1290px, (min-width:1101px) 66vw, 100vw";
const THUMB_SIZES = "(min-width:1920px) 210px, (min-width:1101px) 11vw, 25vw";
/** Main photo frame of the mockup: 1288 × 760 at 1920. */
const MAIN_FRAME = "aspect-[1288/760] rounded-xl max-sm:aspect-[4/3] max-sm:rounded-lg";

/**
 * Object photos (Paper mockup `2560_obekt`, frame `gallery`): the big photo (24 px radius) — a
 * button that opens the lightbox at the current position — with the «1 / N» counter chip in its
 * bottom-right corner, and a 6-column grid of thumbnails (`aria-pressed`; 4 on phones) when
 * there is more than one photo. The main photo is preloaded (LCP; Next 16 `preload`). Without
 * photos: a neutral well with an image icon.
 */
export function ObjectGallery({ photos, name }: ObjectGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const photo = photos[current] ?? photos[0];

  if (!photo) {
    return (
      <div
        aria-hidden="true"
        className={cn("bg-well grid place-items-center", MAIN_FRAME)}
        data-object-gallery=""
      >
        <ImageIcon className="text-gray-1 size-14 max-sm:size-10" strokeWidth={1.5} />
      </div>
    );
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
        className={cn(
          "bg-well relative block w-full cursor-zoom-in overflow-hidden border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline)",
          MAIN_FRAME
        )}
      >
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          preload={current === 0}
          fetchPriority={current === 0 ? "high" : "auto"}
          sizes={MAIN_SIZES}
          className="object-cover"
          data-gallery-main=""
        />
        <span className="sr-only">
          — фото {current + 1} из {photos.length}, открыть на весь экран
        </span>
        {photos.length > 1 ? (
          <span
            aria-hidden="true"
            className="bg-surface text-text absolute right-5 bottom-5 rounded-full px-3.5 py-2 text-[14px] leading-[18px] font-medium tabular-nums max-sm:right-3 max-sm:bottom-3"
            data-gallery-counter=""
          >
            {current + 1} / {photos.length}
          </span>
        ) : null}
      </button>

      {photos.length > 1 ? (
        <div
          role="group"
          aria-label="Фотографии объекта"
          className="grid grid-cols-6 gap-3 max-sm:grid-cols-4 max-sm:gap-2"
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
                  "bg-well relative aspect-[205/120] cursor-pointer overflow-hidden rounded-md border-2 p-0 transition-colors duration-200",
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
