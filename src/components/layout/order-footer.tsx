import { Container } from "@/components/ig/container";
import type { ContactsData } from "./nav-defaults";

export interface OrderFooterProps {
  contacts: Pick<ContactsData, "phone" | "email" | "locations">;
}

const LINK_CLASS = "text-on-navy no-underline hover:underline";

/** «Челябинск — офис» → «Челябинск»: the footer line names the city only. */
const cityOf = (title: string): string => title.split(" — ")[0]?.trim() || title;

/**
 * Minimal footer of the client order page `/zakaz/<token>/` (`.od-foot` in
 * `prototypes/Order.dc.html`): one navy band with «Inex Glass · phone · e-mail» and the
 * addresses. No site navigation — the page is a private status page, like its header
 * (`OrderHeader`). No extra bottom padding: the sticky CTA is hidden on `/zakaz/*`.
 */
export function OrderFooter({ contacts }: OrderFooterProps) {
  const addresses = contacts.locations
    .filter((location) => location.address)
    .map((location) => `${cityOf(location.title)}, ${location.address}`);

  return (
    <footer className="bg-navy text-on-navy-2 [--ig-focus-outline:var(--ig-focus-outline-on-dark)] [&_:focus-visible]:outline-(--ig-focus-outline-on-dark)">
      <Container className="flex flex-wrap justify-between gap-x-8 gap-y-3 py-7 text-[14px] leading-[1.5]">
        <span>
          Inex Glass ·{" "}
          <a href={contacts.phone.href} className={LINK_CLASS}>
            {contacts.phone.display}
          </a>{" "}
          ·{" "}
          <a href={`mailto:${contacts.email}`} className={LINK_CLASS}>
            {contacts.email}
          </a>
        </span>
        {addresses.length > 0 ? <span>{addresses.join(" · ")}</span> : null}
      </Container>
    </footer>
  );
}
