"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, PhoneCall } from "lucide-react";
import { Accordion, type AccordionItem } from "@/components/ig/accordion";
import { Button } from "@/components/ig/button";
import { Drawer } from "@/components/ig/drawer";
import { CalcLink } from "./calc-link";
import { Logo } from "./logo";
import { NavAnchor } from "./nav-anchor";
import type { ContactsData, HeaderNavData, MegaMenuData, NavLink } from "./nav-defaults";

const LINK_CLASS = "text-text hover:text-primary-hover text-[16px] leading-[1.4] no-underline";
const CHIP_CLASS =
  "bg-well text-text-2 hover:bg-primary-light hover:text-primary-dark inline-flex h-7 items-center rounded-full px-3 text-[13px] leading-none no-underline";

function LinkList({ links }: { links: NavLink[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <li key={`${link.href}:${link.label}`}>
          <NavAnchor link={link} className={LINK_CLASS} />
        </li>
      ))}
    </ul>
  );
}

function MegaMenuLinks({ menu }: { menu: MegaMenuData }) {
  return (
    <div className="flex flex-col gap-5">
      {menu.columns.map((column) => (
        <div key={column.title} className="flex flex-col gap-3">
          <p className="text-micro text-text-2 tracking-[0.04em] uppercase">{column.title}</p>
          <ul className="flex flex-col gap-3">
            {column.links.map((link) => (
              <li key={`${link.href}:${link.label}`} className="flex flex-col gap-2">
                <NavAnchor link={link} className={LINK_CLASS} />
                {link.subLinks.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label={link.label}>
                    {link.subLinks.map((sub) => (
                      <li key={sub.href}>
                        <NavAnchor link={sub} className={CHIP_CLASS} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export interface MobileMenuPanelProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  nav: HeaderNavData;
  contacts: ContactsData;
  /** «Заказать звонок»: closes the menu and opens the callback form. */
  onCallback(): void;
}

/**
 * Drawer of the mobile menu (see `./mobile-menu`). A separate `next/dynamic` chunk (task 39):
 * Radix Dialog, the accordion and the menu markup load on the first tap on the burger (or when
 * it is hovered / focused), not with every page.
 */
export function MobileMenuPanel({
  open,
  onOpenChange,
  nav,
  contacts,
  onCallback,
}: MobileMenuPanelProps) {
  const onContentClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a")) onOpenChange(false);
  };

  const contactLinks: NavLink[] = [
    ...(nav.showPhone
      ? [{ label: contacts.phone.display, href: contacts.phone.href, newTab: false }]
      : []),
    ...(nav.showEmail
      ? [{ label: contacts.email, href: `mailto:${contacts.email}`, newTab: false }]
      : []),
    ...(nav.showMessengers
      ? contacts.messengers.map((m) => ({ label: m.name, href: m.url, newTab: true }))
      : []),
  ];

  const sections: AccordionItem[] = [
    ...nav.megaMenus.map((menu) => ({
      id: menu.key,
      title: menu.label,
      content: <MegaMenuLinks menu={menu} />,
    })),
    { id: "company", title: nav.companyLabel, content: <LinkList links={nav.companyItems} /> },
    {
      id: "contacts",
      title: nav.contactLabel,
      content: (
        <div className="flex flex-col gap-4">
          <LinkList links={contactLinks} />
          <button type="button" className="ig-link self-start text-[15px]" onClick={onCallback}>
            {nav.callbackLabel}
          </button>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      widthClassName="w-full sm:w-[480px]"
      title={
        <>
          <Logo href={null} className="h-8" />
          <span className="sr-only">Меню</span>
        </>
      }
    >
      {/* Delegated close: every link inside the menu closes it before navigating. */}
      <div className="flex flex-col gap-6" onClick={onContentClick}>
        <div className="flex flex-col gap-3">
          <CalcLink label={nav.ctaLabel} className="h-12 w-full" />
          <Button
            asChild
            variant="secondary"
            block
            leftIcon={<ClipboardList aria-hidden="true" />}
            className="h-12"
          >
            <Link href={nav.myCalcUrl}>{nav.myCalcLabel}</Link>
          </Button>
        </div>

        <Accordion
          items={sections}
          headingLevel={2}
          // Denser rows than the FAQ accordion: header button and panel padding.
          className="[&_[aria-labelledby]>div>div]:pr-0 [&_[aria-labelledby]>div>div]:pb-5 [&_h2>button]:py-4 [&_h2>button]:text-[17px]"
        />

        <MenuSection title="Для кого">
          <LinkList links={nav.segments} />
        </MenuSection>

        <div className="bg-well flex flex-col gap-1 rounded-lg p-4">
          <a
            href={contacts.phone.href}
            className="text-text inline-flex items-center gap-2 text-[18px] leading-[1.3] font-semibold no-underline"
          >
            <PhoneCall aria-hidden="true" className="text-primary size-5" />
            {contacts.phone.display}
          </a>
          <span className="text-text-2 text-[14px]">{contacts.workHoursFull}</span>
        </div>
      </div>
    </Drawer>
  );
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-micro text-text-2 tracking-[0.04em] uppercase">{title}</h2>
      {children}
    </section>
  );
}
