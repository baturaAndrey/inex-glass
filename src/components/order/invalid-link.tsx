import { TriangleAlert } from "lucide-react";
import { Container } from "@/components/ig/container";
import type { OrderFallbackContacts } from "./manager-card";

export const INVALID_LINK_TITLE = "Ссылка больше не действует — свяжитесь с менеджером";

/**
 * «Ссылка больше не действует» — the ONE state for every unusable order link (unknown, malformed,
 * revoked, expired), so the page never reveals whether an order exists. Contacts come from the
 * `contacts` global.
 */
export function InvalidLink({
  title,
  contacts,
}: {
  title: string;
  contacts: OrderFallbackContacts;
}) {
  return (
    <Container>
      <div className="bg-surface shadow-card mx-auto my-16 flex max-w-[720px] flex-col gap-5 rounded-xl px-8 py-7 max-sm:my-8 max-sm:rounded-lg max-sm:px-4 max-sm:py-5">
        <span
          aria-hidden="true"
          className="bg-warning text-warning-text grid size-12 place-items-center rounded-full"
        >
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h1 className="m-0 text-[32px] leading-[1.2] font-bold max-sm:text-[24px]">{title}</h1>
        <div className="flex flex-col gap-3 text-[16px] leading-[1.4]">
          <a
            href={contacts.phone.href}
            className="text-primary-dark text-[22px] leading-[1.3] font-semibold no-underline"
          >
            {contacts.phone.display}
          </a>
          <a
            href={`mailto:${contacts.email}`}
            className="text-primary-pressed hover:text-primary-dark font-medium no-underline"
          >
            {contacts.email}
          </a>
          <span className="ig-small text-text-2">{contacts.workHours}</span>
        </div>
      </div>
    </Container>
  );
}
