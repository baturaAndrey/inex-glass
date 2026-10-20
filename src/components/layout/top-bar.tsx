import Link from "next/link";
import { Badge } from "@/components/ig/badge";
import { Container } from "@/components/ig/container";
import { NavAnchor } from "./nav-anchor";
import { NavDropdown, type NavDropdownItem } from "./nav-dropdown";
import type { ContactsData, HeaderNavData, PromoBadgeData } from "./nav-defaults";

export interface TopBarProps {
  nav: HeaderNavData;
  contacts: ContactsData;
  promo: PromoBadgeData | null;
}

/** Items of «Связаться с нами ▾»: phone, e-mail, messengers (by CMS flags), callback form. */
export function contactItems(nav: HeaderNavData, contacts: ContactsData): NavDropdownItem[] {
  const items: NavDropdownItem[] = [];
  if (nav.showPhone) {
    items.push({
      kind: "link",
      label: contacts.phone.display,
      href: contacts.phone.href,
      icon: "phone",
    });
  }
  if (nav.showEmail) {
    items.push({
      kind: "link",
      label: contacts.email,
      href: `mailto:${contacts.email}`,
      icon: "mail",
    });
  }
  if (nav.showMessengers) {
    for (const messenger of contacts.messengers) {
      items.push({
        kind: "link",
        label: messenger.name,
        href: messenger.url,
        newTab: true,
        icon: messenger.icon,
      });
    }
  }
  items.push({ kind: "callback", label: nav.callbackLabel });
  return items;
}

/**
 * Header row 1 (36 px, `well`, 13 px): «Компания ▾» and «Связаться с нами ▾» on the left,
 * the promo strip in the middle (only while the promo is active — otherwise not in the DOM),
 * audience segments on the right (hidden ≤1100). The whole row is hidden ≤599.
 */
export function TopBar({ nav, contacts, promo }: TopBarProps) {
  const companyItems: NavDropdownItem[] = nav.companyItems.map((item) => ({
    kind: "link",
    label: item.label,
    href: item.href,
    newTab: item.newTab,
  }));

  return (
    <div className="bg-well text-text h-9 text-[13px] leading-[1.4]">
      <Container className="flex h-full items-center justify-between gap-6">
        <div className="flex flex-none items-center gap-5">
          <NavDropdown label={nav.companyLabel} items={companyItems} />
          <NavDropdown label={nav.contactLabel} items={contactItems(nav, contacts)} />
        </div>

        {promo ? (
          <Link
            href={promo.href}
            className="hover:[&>span]:bg-teal-wash flex min-w-0 rounded-sm no-underline"
          >
            <Badge variant="promo" plain className="max-w-full min-w-0 transition-colors">
              <span className="truncate">{promo.text}</span>
            </Badge>
          </Link>
        ) : null}

        <nav aria-label="Для кого" className="flex min-w-0 items-center gap-5 max-md:hidden">
          {nav.segments.map((segment) => (
            <NavAnchor
              key={segment.href}
              link={segment}
              className="text-text hover:text-primary-hover whitespace-nowrap no-underline"
            />
          ))}
        </nav>
      </Container>
    </div>
  );
}
