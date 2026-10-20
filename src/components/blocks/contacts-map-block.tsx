import { NeutralStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 29 (wrapper over `src/components/company/*`: contacts
 * from the `contacts` global, map loaded on click). Keep the export name and the props.
 */
export function ContactsMapBlock({ block, ctx, section }: BlockProps<"contactsMap">) {
  return <NeutralStub block={block} ctx={ctx} section={section} />;
}
