"use client";

import { useRef, type KeyboardEvent, type TouchEvent } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useReturnFocus } from "./use-return-focus";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface LightboxProps {
  images: LightboxImage[];
  open: boolean;
  index: number;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
  /** Visually hidden dialog title. */
  title?: string;
}

/** Minimal horizontal travel of a swipe, px. */
const SWIPE_THRESHOLD = 50;

/** Round 48 px control on the dark backdrop (`.od-lb__btn` in `Order.dc.html`). */
const CONTROL_CLASS =
  "grid size-12 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-white transition-colors duration-(--ig-dur-base) hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ig-focus-outline-on-dark) [&_svg]:size-[22px]";

/** Wraps an index into `[0, count)`: navigation is cyclic. */
function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * Full-screen photo viewer on Radix Dialog: black/80 backdrop, `next/image` (contain),
 * caption, «N из M» counter, cyclic prev / next. Keyboard ← / → / Esc, touch swipe (50 px).
 * Focus is trapped while open and returns to the trigger on close (Radix).
 * Neighbouring frames are rendered invisibly so they are already loaded when shown.
 */
export function Lightbox({
  images,
  open,
  index,
  onOpenChange,
  onIndexChange,
  title = "Просмотр фото",
}: LightboxProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const returnFocus = useReturnFocus(open);
  const count = images.length;
  if (count === 0) return null;

  const current = wrap(index, count);
  const image = images[current];
  if (!image) return null;
  const hasSeveral = count > 1;
  const neighbours = hasSeveral
    ? [...new Set([wrap(current - 1, count), wrap(current + 1, count)])].filter(
        (i) => i !== current
      )
    : [];

  const go = (step: number) => {
    if (hasSeveral) onIndexChange(wrap(current + step, count));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Mostly horizontal and long enough; vertical drags are left to scrolling.
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const description = image.caption ?? image.alt;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 duration-(--ig-dur-base)" />
        <DialogPrimitive.Content
          {...returnFocus}
          className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex flex-col items-center gap-4 px-6 pt-6 pb-6 text-white duration-(--ig-dur-base) outline-none max-sm:gap-3 max-sm:px-4 max-sm:pt-4"
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          <div className="flex w-full max-w-[1100px] items-center justify-between gap-4">
            <DialogPrimitive.Description className="m-0 min-w-0 text-[15px] leading-[1.4] text-white">
              {description}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className={CONTROL_CLASS} aria-label="Закрыть">
              <X aria-hidden="true" strokeWidth={2} />
            </DialogPrimitive.Close>
          </div>

          <div className="relative min-h-0 w-full max-w-[1100px] flex-1">
            {neighbours.map((neighbour) => {
              const preload = images[neighbour];
              return preload ? (
                <Image
                  key={`preload-${neighbour}`}
                  src={preload.src}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="100vw"
                  className="pointer-events-none object-contain opacity-0"
                />
              ) : null;
            })}
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <div className="flex w-full max-w-[1100px] items-center justify-center gap-4 text-[15px]">
            {hasSeveral ? (
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
            {hasSeveral ? (
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
