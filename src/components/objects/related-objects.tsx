import { TextLink } from "@/components/ig/text-link";
import { OBJECTS_BASE_PATH } from "@/lib/objects/filters";
import type { ObjectCardData } from "@/lib/objects/filters";
import { ObjectCard } from "./object-card";

export interface RelatedObjectsProps {
  objects: readonly ObjectCardData[];
}

const HEADING_ID = "object-related";

/**
 * «Другие объекты» of the object page (Paper mockup `2560_obekt`, frames `related-head` /
 * `related`): heading with «Все объекты →» and up to four listing cards (4 / 3 / 2 / 1 columns;
 * in the 3-column range only the first three, so the row stays full).
 * Renders nothing without objects.
 */
export function RelatedObjects({ objects }: RelatedObjectsProps) {
  if (objects.length === 0) return null;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex flex-col gap-8 max-sm:gap-5"
      data-related-objects=""
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={HEADING_ID} className="ig-h2 m-0">
          Другие объекты
        </h2>
        <TextLink href={OBJECTS_BASE_PATH} variant="arrow">
          Все объекты
        </TextLink>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 max-md:gap-5 max-sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:max-lg:[&>li:nth-child(n+4)]:hidden">
        {objects.map((object) => (
          <li key={object.id} className="flex min-w-0 flex-col">
            <ObjectCard object={object} titleAs="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
