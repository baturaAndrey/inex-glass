"use client";

import { useState, type KeyboardEvent, type TouchEvent, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useReturnFocus } from "@/components/ig/use-return-focus";
import { LIGHTBOX_WIDTH, THUMBNAIL_WIDTH } from "@/lib/orders/photo-widths";
import type { PublicPhoto } from "@/lib/orders/public-view";
import { OrderCard } from "./order-card";

/**
 * «Фото упаковки»: thumbnails (4 / 3 / 2 columns) that open a full-screen viewer with ← / →,
 * Esc, swipe and the «N из M» counter; empty state «Фото появятся при отгрузке».
 *
 * Photos are private order files served by `/zakaz/<token>/docs/<id>/?w=…` with
 * `Cache-Control: no-store`, so they are plain `<img>` elements: `next/image` (and therefore
 * the shared `ig/Lightbox`, built on it) would route them through the Next image optimizer,
 * which caches them and is not allowed to fetch these URLs (`images.localPatterns`). The viewer
 * below mirrors `ig/Lightbox` (same Radix dialog, controls and behaviour) with `<img>`.
 */

export interface PackPhotosProps {
  /** Base of the file URLs: `/zakaz/<token>/docs/`. */
  docsBase: string;
  photos: PublicPhoto[];
  caption: string | null;
  emptyText: string;
}

const SWIPE_THRESHOLD = 50;
const CONTROL_CLASS =
  "grid size-12 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-white transition-colors duration-(--ig-dur-base) hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline-on-dark) [&_svg]:size-[22px]";

const photoUrl = (base: string, id: string, width: number) => `${base}${id}/?w=${width}`;
const wrap = (index: number, count: number) => ((index % count) + count) % count;

function PhotoViewer({
  docsBase,
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  docsBase: string;
  photos: PublicPhoto[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const returnFocus = useReturnFocus(open);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = photos.length;
  const current = index === null ? 0 : wrap(index, count);
  const photo = photos[current];
  const several = count > 1;

  const go = (step: number) => {
    if (several) onIndexChange(wrap(current + step, count));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      go(event.key === "ArrowLeft" ? -1 : 1);
    }
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(touch.clientY - start.y)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 duration-(--ig-dur-base)" />
        <DialogPrimitive.Content
          {...returnFocus}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex flex-col items-center gap-4 p-6 text-white duration-(--ig-dur-base) outline-none max-sm:gap-3 max-sm:p-4"
        >
          <DialogPrimitive.Title className="sr-only">Фото упаковки</DialogPrimitive.Title>
          <div className="flex w-full max-w-[1100px] items-center justify-between gap-4">
            <DialogPrimitive.Description className="m-0 min-w-0 text-[15px] leading-[1.4]">
              {photo?.alt}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className={CONTROL_CLASS} aria-label="Закрыть">
              <X aria-hidden="true" strokeWidth={2} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 w-full max-w-[1100px] flex-1 items-center justify-center">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- private no-store file, see above
              <img
                key={photo.id}
                src={photoUrl(docsBase, photo.id, LIGHTBOX_WIDTH)}
                alt={photo.alt}
                decoding="async"
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : null}
          </div>
          <div className="flex w-full max-w-[1100px] items-center justify-center gap-4 text-[15px]">
            {several ? (
              <button
                type="button"
                className={CONTROL_CLASS}
                aria-label="Предыдущее фото"
                onClick={() => go(-1)}
              >
                <ChevronLeft aria-hidden="true" strokeWidth={2} />
              </button>
            ) : null}
            <span aria-live="polite" className="min-w-16 text-center tabular-nums">
              {current + 1} из {count}
            </span>
            {several ? (
              <button
                type="button"
                className={CONTROL_CLASS}
                aria-label="Следующее фото"
                onClick={() => go(1)}
              >
                <ChevronRight aria-hidden="true" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function PackPhotos({ docsBase, photos, caption, emptyText }: PackPhotosProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <OrderCard title="Фото упаковки" titleId="order-photos-title">
      {photos.length === 0 ? (
        <div className="border-line text-text-2 flex items-center gap-3.5 rounded-lg border-[1.5px] border-dashed p-6 text-[15px] leading-[1.45]">
          <Camera aria-hidden="true" className="text-muted size-7 flex-none" strokeWidth={2} />
          <span>{emptyText}</span>
        </div>
      ) : (
        <>
          <ul className="m-0 grid list-none grid-cols-4 gap-3 p-0 max-[1365px]:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-2">
            {photos.map((photo, index) => (
              <li key={photo.id} className="min-w-0">
                <button
                  type="button"
                  aria-label={`Открыть фото упаковки ${index + 1}`}
                  onClick={() => setOpenIndex(index)}
                  className="bg-well hover:shadow-card-hover block w-full cursor-pointer overflow-hidden rounded-[12px] border-0 p-0 transition-[transform,box-shadow] duration-(--ig-dur-base) hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- private no-store file, see above */}
                  <img
                    src={photoUrl(docsBase, photo.id, THUMBNAIL_WIDTH)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block aspect-[4/3] w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
          {caption ? <span className="ig-small text-text-2">{caption}</span> : null}
          <PhotoViewer
            docsBase={docsBase}
            photos={photos}
            index={openIndex}
            onIndexChange={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        </>
      )}
    </OrderCard>
  );
}
