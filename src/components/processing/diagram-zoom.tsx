"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { Lightbox } from "@/components/ig/lightbox";

/**
 * The diagram of a service page «about» panel. ≤599 px the diagram is scaled to the panel width
 * (its labels get small), so a tap opens it full size in the `Lightbox`; a «Открыть схему» hint
 * sits under it. ≥600 px the diagram is legible as is: no button, no hint — the image only.
 *
 * The button is an overlay next to the image, not its parent: a button's children are
 * presentational, so wrapping the image would hide its `alt` (the only text of the diagram for
 * screen readers) behind the button label.
 */

export interface DiagramZoomProps {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  sizes: string;
}

const HINT = "Открыть схему";

export function DiagramZoom({ src, alt, caption, width, height, sizes }: DiagramZoomProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className="h-auto w-full"
      />
      <p
        aria-hidden="true"
        className="text-micro text-primary-pressed m-0 mt-3 hidden items-center gap-1.5 max-sm:flex"
      >
        <ZoomIn aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
        {HINT}
      </p>
      <button
        type="button"
        className="focus-visible:outline-brand absolute inset-0 hidden cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 max-sm:block"
        aria-label={`${HINT}: ${caption}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      />
      <Lightbox
        images={[{ src, alt, caption, width, height }]}
        open={open}
        index={0}
        onOpenChange={setOpen}
        onIndexChange={() => undefined}
        title={caption}
      />
    </div>
  );
}
