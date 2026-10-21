import { ContactCards } from "@/components/company/contact-cards";
import { mapPoints } from "@/components/company/contact-format";
import { YandexMap } from "@/components/company/yandex-map";
import { getContacts } from "@/lib/cms/globals";
import { BlockSection, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * «Контакты и карта» on any `pages` document: address cards and the click-to-load Yandex map,
 * both from the `contacts` global (`global:contacts` tag — edits show up on every page).
 * `showLocations` / `showHours` / `showMap` switch the parts; nothing left → no section.
 */
export async function ContactsMapBlock({ block, ctx, section }: BlockProps<"contactsMap">) {
  const contacts = await getContacts();
  const showLocations = block.showLocations !== false;
  const points = block.showMap === false ? [] : mapPoints(contacts);
  const cards = showLocations ? (
    <ContactCards
      contacts={contacts}
      titleLevel={hasText(block.heading) ? "h3" : "h2"}
      showHours={block.showHours !== false}
    />
  ) : null;
  if (!contacts || (!showLocations && points.length === 0)) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="flex flex-col gap-8">
        {cards}
        {points.length > 0 ? <YandexMap points={points} /> : null}
      </div>
    </BlockSection>
  );
}
