import type { ReactNode } from "react";
import { BlockImage, asMedia } from "@/components/blocks/shared";
import { Card } from "@/components/ig/card";
import { Placeholder } from "@/components/ig/placeholder";
import { TextLink } from "@/components/ig/text-link";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Object as PortfolioObject } from "@/payload-types";

export const DEFAULT_OBJECTS_HEADING = "Объекты";
export const OBJECTS_PATH = "/obekty/";
export const ALL_OBJECTS_LABEL = "Все объекты";
/** At most this many object cards next to a construction. */
export const OBJECTS_LIMIT = 4;

/** Column layout: 2-up inside a half-width column; 4 / 3 / 2 / 1 as a full-width row (hub). */
const GRID_CLASS = {
  column: "grid grid-cols-2 gap-4 max-sm:grid-cols-1",
  row: "grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4",
} as const;

const IMAGE_SIZES = {
  column: "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 25vw",
  row: "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (max-width: 1365px) 33vw, 25vw",
} as const;

/** Object cards with a resolvable URL (published objects always have a path). */
export function objectCards(
  objects: PortfolioObject[]
): Array<{ doc: PortfolioObject; href: string }> {
  return objects.flatMap((doc) => {
    const href = docUrl("objects", doc);
    return href ? [{ doc, href }] : [];
  });
}

/** Simplified object card (`.p5-objs .ig-card`): photo or placeholder, name. */
function ObjectCard({
  doc,
  href,
  mode,
}: {
  doc: PortfolioObject;
  href: string;
  mode: keyof typeof GRID_CLASS;
}) {
  const photo = doc.photos?.[0];
  const media = photo ? asMedia(photo.image) : null;
  return (
    <Card
      href={href}
      className="h-full w-full shadow-none [&_.ig-card__body]:px-5 [&_.ig-card__body]:pt-4 [&_.ig-card__body]:pb-5 [&_.ig-card__title]:text-[18px]"
      title={doc.name}
      arrow={false}
      image={
        media ? (
          <BlockImage media={media} alt={photo?.alt} size="card" sizes={IMAGE_SIZES[mode]} />
        ) : (
          <Placeholder />
        )
      }
    />
  );
}

export interface ObjectsListProps {
  objects: PortfolioObject[];
  mode: keyof typeof GRID_CLASS;
  className?: string | undefined;
}

/** Grid of up to `OBJECTS_LIMIT` object cards. */
export function ObjectsList({ objects, mode, className }: ObjectsListProps) {
  const cards = objectCards(objects).slice(0, OBJECTS_LIMIT);
  if (cards.length === 0) return null;
  return (
    <ul className={cn(GRID_CLASS[mode], "m-0 list-none p-0", className)} data-objects-list="">
      {cards.map(({ doc, href }) => (
        <li key={doc.id} className="flex">
          <ObjectCard doc={doc} href={href} mode={mode} />
        </li>
      ))}
    </ul>
  );
}

/** «Все объекты →» link to the portfolio. */
export function AllObjectsLink() {
  return (
    <TextLink href={OBJECTS_PATH} variant="arrow">
      {ALL_OBJECTS_LABEL}
    </TextLink>
  );
}

export interface ObjectsColumnProps {
  heading: string;
  headingId: string;
  /** Layout blocks of the `slot-objects-` slot (paragraph, «Все объекты» link). */
  slot?: ReactNode;
  objects: PortfolioObject[];
}

/**
 * Right column of «Документы + объекты» (`.p5-col`): heading, slot text, object cards.
 * Renders nothing when there is neither slot content nor a published object.
 */
export function ObjectsColumn({ heading, headingId, slot, objects }: ObjectsColumnProps) {
  const hasObjects = objectCards(objects).length > 0;
  if (!slot && !hasObjects) return null;
  return (
    <div className="flex min-w-0 flex-col gap-5" data-column="objects">
      <h2 id={headingId} className="ig-h2 m-0">
        {heading}
      </h2>
      {slot}
      {hasObjects ? <ObjectsList objects={objects} mode="column" /> : null}
    </div>
  );
}
