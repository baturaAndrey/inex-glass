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

/**
 * Address cards of the contacts page (Paper mockup `2560_kontakty`, 2026-11, frame
 * `locations`): white 24 px cards, the number badge (shared with the map chips) before the
 * title, the address, then under a hairline the phones and e-mail as links and the hours.
 * Empty lines are not rendered (the warehouse has no phone or e-mail). `tel:` / `mailto:` are
 * plain links: Metrika's delegated click tracking (task 19) records `click_phone` /
 * `click_email`. Three in a row; one column ≤1100 px.
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

/** Contact link: brand text colour, underline on hover only (the card is a list of links). */
const CONTACT_LINK =
  "text-primary-pressed hover:text-primary-dark focus-visible:outline-brand text-[17px] leading-[22px] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

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
    <article className="bg-surface border-hairline flex h-full flex-col gap-6 rounded-xl border p-10 max-lg:p-8 max-sm:gap-4 max-sm:p-5">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="bg-primary grid size-9 flex-none place-items-center rounded-full text-base leading-none font-semibold text-white"
        >
          {card.number}
        </span>
        {card.title ? <Title className="ig-h4 m-0 text-balance">{card.title}</Title> : null}
      </div>
      {card.address ? (
        <p className="text-text m-0 text-[19px] leading-[1.4] font-medium max-sm:text-lg">
          {card.address}
        </p>
      ) : null}
      {hasList ? (
        <ul className="border-hairline m-0 flex list-none flex-col gap-3 border-0 border-t p-0 pt-5">
          {card.phones.length > 0 ? (
            <li className="text-primary-pressed text-[17px] leading-[22px]">
              {card.phones.map((phone, index) => (
                <span key={phone.href}>
                  {index > 0 ? ", " : null}
                  <a
                    href={phone.href}
                    className={cn(CONTACT_LINK, "font-medium whitespace-nowrap")}
                  >
                    {phone.label}
                  </a>
                </span>
              ))}
            </li>
          ) : null}
          {card.email ? (
            <li>
              <a href={card.email.href} className={cn(CONTACT_LINK, "break-all")}>
                {card.email.label}
              </a>
            </li>
          ) : null}
          {hours ? <li className="text-text-2 text-base leading-5">{hours}</li> : null}
        </ul>
      ) : null}
    </article>
  );
}
