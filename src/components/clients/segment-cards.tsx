import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientSegment, ClientSegments } from "./segments";

/**
 * Segment cards of the hub `/klientam/` (Paper mockup `2560_klientam`, row `segments`): a white
 * card per client segment — photo on top, the segment title, «Ваша задача» + task, a hairline,
 * «Что берём на себя» + what we take on, «Подробнее →». The title link covers the whole card.
 *
 * The cards share row tracks (CSS subgrid), so titles, tasks and the hairlines line up across a
 * row whatever the text lengths. 4 columns from 1366 px, 2 below, 1 on phones.
 */

export interface SegmentCardItem extends ClientSegment {
  photo: { src: string; alt: string } | null;
}

/** A quarter of the content at ≥1366, half below, the full width on phones. */
const IMAGE_SIZES =
  "(max-width: 599px) 100vw, (max-width: 1365px) 50vw, (min-width: 1920px) 450px, 25vw";

/** Photo band: 300 px in the mockup (1920); lower where the cards get narrower. */
const PHOTO_HEIGHT =
  "h-[300px] max-xl:h-[240px] max-lg:h-[280px] max-md:h-[240px] max-sm:h-[220px]";

const LABEL = "text-micro m-0 tracking-[0.08em] uppercase";

/** Rows of one card in the parent grid: photo, title, task, take, link. */
const CARD_ROWS = "row-span-5";

function SegmentCard({
  item,
  taskLabel,
  takeLabel,
}: {
  item: SegmentCardItem;
  taskLabel: string;
  takeLabel: string;
}) {
  const titleId = `segment-${item.key}`;
  return (
    <li
      className={cn(
        CARD_ROWS,
        "group/card bg-surface border-line ease-ig relative grid grid-rows-subgrid gap-y-0 overflow-hidden rounded-xl border transition-[transform,box-shadow] duration-200",
        "focus-within:shadow-card-hover hover:shadow-card-hover hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      )}
      data-testid="segment-card"
    >
      <div className={cn("bg-well relative", PHOTO_HEIGHT)}>
        {item.photo ? (
          <Image
            src={item.photo.src}
            alt={item.photo.alt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
        ) : null}
      </div>
      <h2
        id={titleId}
        className="m-0 px-8 pt-8 text-[26px] leading-[1.2] font-bold text-balance max-xl:text-[24px] max-sm:px-5 max-sm:pt-6 max-sm:text-[22px]"
      >
        {/* The title link stretches over the card (`after:`), so the whole card is clickable. */}
        <Link
          href={item.href}
          className="text-text hover:text-text focus-visible:after:outline-brand no-underline after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2"
        >
          {item.title}
        </Link>
      </h2>
      <div className="flex flex-col gap-2 px-8 pt-6 max-sm:px-5 max-sm:pt-4">
        {taskLabel ? <p className={cn(LABEL, "text-text-2")}>{taskLabel}</p> : null}
        <p className="text-text m-0 text-lg leading-[1.4] font-medium">{item.task}</p>
      </div>
      <div className="px-8 pt-6 max-sm:px-5 max-sm:pt-4">
        <div className="border-hairline flex h-full flex-col gap-2 border-t pt-5 max-sm:pt-4">
          {takeLabel ? <p className={cn(LABEL, "text-primary-pressed")}>{takeLabel}</p> : null}
          <p className="text-ink-3 m-0 text-base leading-normal">{item.take}</p>
        </div>
      </div>
      {item.more ? (
        <span
          aria-hidden="true"
          className="text-primary-pressed flex items-center gap-2 self-end px-8 pt-6 pb-9 text-base leading-5 font-medium max-sm:px-5 max-sm:pt-5 max-sm:pb-6"
        >
          <span className="underline decoration-1 underline-offset-4">{item.more}</span>
          <ArrowRight
            strokeWidth={2}
            className="ease-ig size-[18px] transition-transform duration-200 group-hover/card:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      ) : (
        <span aria-hidden="true" className="pb-9 max-sm:pb-6" />
      )}
    </li>
  );
}

export function SegmentCards({
  segments,
  items,
}: {
  segments: Pick<ClientSegments, "taskLabel" | "takeLabel">;
  items: readonly SegmentCardItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ul
      className="m-0 grid list-none grid-cols-4 gap-6 p-0 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4"
      data-testid="segment-cards"
    >
      {items.map((item) => (
        <SegmentCard
          key={item.key}
          item={item}
          taskLabel={segments.taskLabel}
          takeLabel={segments.takeLabel}
        />
      ))}
    </ul>
  );
}
