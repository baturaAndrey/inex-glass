import {
  REQUISITES_ANCHOR,
  REQUISITES_TITLE,
  RequisitesCard,
} from "@/components/company/requisites-card";
import { getContacts, getRequisites } from "@/lib/cms/globals";
import { fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * «Реквизиты» on any `pages` document: the card of the `requisites` global (only filled fields;
 * the PDF button only when `showDownload` and a file is uploaded). The section keeps the
 * `#rekvizity` anchor unless the editor set another `anchorId`.
 */
export async function RequisitesBlock({ block, ctx, section }: BlockProps<"requisites">) {
  const [requisites, contacts] = await Promise.all([getRequisites(), getContacts()]);
  const title = fill(block.heading, ctx) || REQUISITES_TITLE;
  return (
    <RequisitesCard
      requisites={requisites}
      contacts={contacts}
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : REQUISITES_ANCHOR}
      headingId={section.headingId}
      title={title}
      headingLevel={block.headingLevel === "h3" ? "h3" : "h2"}
      showDownload={block.showDownload !== false}
    />
  );
}
