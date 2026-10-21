import { Section, SectionHead } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { OBJECTS_BASE_PATH } from "@/lib/objects/filters";
import type { ObjectCardData } from "@/lib/objects/filters";
import { ObjectCard } from "./object-card";

export interface RelatedObjectsProps {
  objects: readonly ObjectCardData[];
}

const HEADING_ID = "object-related";

/**
 * «Другие объекты» on a white section (prototype `ObjectPage.dc.html`): heading, «Все объекты»
 * link and up to four muted cards. Renders nothing without objects.
 */
export function RelatedObjects({ objects }: RelatedObjectsProps) {
  if (objects.length === 0) return null;
  return (
    <Section variant="sf" aria-labelledby={HEADING_ID} data-related-objects="">
      <SectionHead
        title="Другие объекты"
        headingId={HEADING_ID}
        action={
          <TextLink href={OBJECTS_BASE_PATH} variant="arrow">
            Все объекты
          </TextLink>
        }
      />
      <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 max-sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {objects.map((object) => (
          <li key={object.id} className="flex min-w-0 flex-col">
            <ObjectCard object={object} titleAs="h3" tone="muted" />
          </li>
        ))}
      </ul>
    </Section>
  );
}
