import type { ReactNode } from "react";
import { HubObjects } from "@/components/constructions/hub-objects";
import { AllObjectsLink } from "@/components/constructions/objects-column";
import { toObjectCard } from "@/lib/cms/objects";
import { HUB_OBJECTS_ALL_KEY, type HubObjectsGroup } from "@/lib/objects/hub-feed";
import type { Object as PortfolioObject } from "@/payload-types";

/**
 * «Объекты» inside the cream block of the glazing / mirrors hubs and their subpages (Paper
 * mockup `2560_osteklenie`): the heading with «Все объекты →», an optional lead (the CMS text of
 * the `slot-objects` block), then the photo cards of the published objects — or, without any, the
 * `fallback` (the hub's object names as pills).
 */

/** The objects as one group of hub cards (no type chips on these pages). */
export function objectsGroupOf(objects: readonly PortfolioObject[]): HubObjectsGroup | null {
  const cards = objects.flatMap((object) => {
    const card = toObjectCard(object);
    return card
      ? [
          {
            id: card.id,
            href: card.href,
            name: card.name,
            type: card.products[0]?.name ?? "",
            photo: card.photo,
          },
        ]
      : [];
  });
  return cards.length > 0 ? { key: HUB_OBJECTS_ALL_KEY, label: "", objects: cards } : null;
}

export interface CreamObjectsProps {
  heading: string;
  headingId: string;
  group: HubObjectsGroup | null;
  /** Text under the heading (the `slot-objects` rich text without its closing links). */
  lead?: ReactNode;
  /** Shown instead of the cards when no object is published. */
  fallback?: ReactNode;
}

export function CreamObjects({ heading, headingId, group, lead, fallback }: CreamObjectsProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-8 max-sm:gap-6"
      data-section="objects"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 id={headingId} className="ig-h2 m-0">
            {heading}
          </h2>
          <AllObjectsLink />
        </div>
        {lead}
      </div>
      {group ? <HubObjects groups={[group]} /> : (fallback ?? null)}
    </section>
  );
}
