import { Clock, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/payload-types";
import { locationCards, type LocationCardData } from "./contact-format";

export interface ContactCardsProps {
  /** The `contacts` global: every address, phone and e-mail comes from it (never hardcoded). */
  contacts: Contact | null;
  /** Card titles are `h2` on `/kontakty/` (no section heading), `h3` under a block heading. */
  titleLevel?: "h2" | "h3" | undefined;
  /** `contactsMap.showHours`: the opening hours line (default `true`). */
  showHours?: boolean | undefined;
  className?: string | undefined;
}

const ICON_CLASS = "text-text-2 mt-[3px] size-[18px] flex-none";

/**
 * Address cards of the contacts page (`Contacts.dc.html`, `.ct-card`): numbered pin shared with
 * the map, title, address and a list of phones / e-mail / hours. Empty lines are not rendered
 * (the warehouse has no phone or e-mail). `tel:` / `mailto:` are plain links: Metrika's
 * delegated click tracking (task 19) records `click_phone` / `click_email`.
 */
export function ContactCards({
  contacts,
  titleLevel = "h2",
  showHours = true,
  className,
}: ContactCardsProps) {
  const cards = locationCards(contacts);
  if (cards.length === 0) return null;
  return (
    <ul
      className={cn(
        "m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-1 max-sm:gap-4",
        className
      )}
    >
      {cards.map((card) => (
        <li key={card.key}>
          <ContactCard card={card} titleLevel={titleLevel} showHours={showHours} />
        </li>
      ))}
    </ul>
  );
}

function ContactCard({
  card,
  titleLevel,
  showHours,
}: {
  card: LocationCardData;
  titleLevel: "h2" | "h3";
  showHours: boolean;
}) {
  const Title = titleLevel;
  const hours = showHours ? card.hours : null;
  const hasList = card.phones.length > 0 || card.email !== null || hours !== null;
  return (
    <article className="bg-surface shadow-card relative flex h-full flex-col gap-3 rounded-xl p-7 max-sm:p-5">
      <span
        aria-hidden="true"
        className="bg-brand absolute top-6 right-6 grid size-8 place-items-center rounded-full text-sm leading-none font-bold text-white max-sm:top-5 max-sm:right-5"
      >
        {card.number}
      </span>
      {card.title ? <Title className="ig-h4 m-0 pr-10">{card.title}</Title> : null}
      {card.address ? (
        <p className="text-ink-3 m-0 pr-10 text-lg leading-snug font-medium">{card.address}</p>
      ) : null}
      {hasList ? (
        <ul className="border-line mt-1 flex list-none flex-col gap-2.5 border-0 border-t p-0 pt-4 text-base leading-normal">
          {card.phones.length > 0 ? (
            <li className="flex items-start gap-3">
              <Phone aria-hidden="true" strokeWidth={2} className={ICON_CLASS} />
              <span>
                {card.phones.map((phone, index) => (
                  <span key={phone.href}>
                    {index > 0 ? ", " : null}
                    <a href={phone.href} className="ig-link whitespace-nowrap">
                      {phone.label}
                    </a>
                  </span>
                ))}
              </span>
            </li>
          ) : null}
          {card.email ? (
            <li className="flex items-start gap-3">
              <Mail aria-hidden="true" strokeWidth={2} className={ICON_CLASS} />
              <a href={card.email.href} className="ig-link break-all">
                {card.email.label}
              </a>
            </li>
          ) : null}
          {hours ? (
            <li className="flex items-start gap-3">
              <Clock aria-hidden="true" strokeWidth={2} className={ICON_CLASS} />
              <span>{hours}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
