import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Contacts and map from the `contacts` global; the map loads on click only (152-FZ). */
export const ContactsMapBlock: Block = {
  slug: "contactsMap",
  dbName: scopedDbName("blk_contacts"),
  interfaceName: "ContactsMapBlock",
  labels: { singular: "Контакты и карта", plural: "Контакты и карта" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        { name: "showMap", type: "checkbox", label: "Карта (по клику)", defaultValue: true },
        { name: "showLocations", type: "checkbox", label: "Адреса", defaultValue: true },
        { name: "showHours", type: "checkbox", label: "Часы работы", defaultValue: true },
      ],
    },
  ],
};
