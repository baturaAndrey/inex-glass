import { Container } from "@/components/ig/container";
import { getContacts, getNavigation } from "@/lib/cms/globals";
import { FooterShell } from "./footer-shell";
import { loadOrNull } from "./load-global";
import { Logo } from "./logo";
import { NavAnchor } from "./nav-anchor";
import { toContactsData, toFooterNav } from "./nav-data";
import { OrderFooter } from "./order-footer";
import type { ContactsData, FooterColumn } from "./nav-defaults";

const LINK_CLASS = "text-on-navy-2 hover:text-on-navy no-underline hover:underline";

function FooterLinks({ column }: { column: FooterColumn }) {
  return (
    <nav aria-label={column.title} className="flex flex-col gap-2.5">
      <h2 className="text-on-navy mb-1 text-[16px] leading-[1.3] font-semibold">{column.title}</h2>
      {column.links.map((link) => (
        <NavAnchor key={`${link.href}:${link.label}`} link={link} className={LINK_CLASS} />
      ))}
    </nav>
  );
}

function FooterContacts({ contacts }: { contacts: ContactsData }) {
  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="text-on-navy mb-1 text-[16px] leading-[1.3] font-semibold">Контакты</h2>
      <a
        href={contacts.phone.href}
        className="text-on-navy text-[18px] leading-[1.3] font-semibold no-underline hover:underline"
      >
        {contacts.phone.display}
      </a>
      <a href={`mailto:${contacts.email}`} className={LINK_CLASS}>
        {contacts.email}
      </a>
      {contacts.locations.map((location) => (
        <p key={location.title}>
          <span className="text-on-navy">{location.title}</span>
          <br />
          {[location.address, location.detail].filter(Boolean).join(" · ")}
        </p>
      ))}
    </div>
  );
}

/**
 * Site footer on navy: light logo, columns «Каталог» / «Услуги» / «Компания» (navigation
 * global) + «Контакты» (contacts global) — 4 / 2 / 1 columns at ≥1101 / ≤1100 / ≤599 px, the
 * bridge link to inex.su, legal links and «© {year} {holder}». Extra bottom padding on phones
 * keeps the content clear of the sticky CTA.
 *
 * On the client order page `/zakaz/<token>/` the minimal `OrderFooter` replaces it
 * (`FooterShell` picks by pathname, like `HeaderShell` for the header).
 */
export async function SiteFooter() {
  const [navigation, contactsGlobal] = await Promise.all([
    loadOrNull("navigation", getNavigation),
    loadOrNull("contacts", getContacts),
  ]);
  const footer = toFooterNav(navigation);
  const contacts = toContactsData(contactsGlobal);
  const year = new Date().getFullYear();

  const full = (
    <footer className="bg-navy text-on-navy-2 [--ig-focus-outline:var(--ig-focus-outline-on-dark)] [&_:focus-visible]:outline-(--ig-focus-outline-on-dark)">
      <Container className="flex flex-col gap-10 pt-14 pb-8 max-sm:pb-[104px]">
        <Logo variant="light" href="/" className="h-11" />

        <div className="grid grid-cols-4 gap-8 text-[14px] leading-[1.5] max-md:grid-cols-2 max-sm:grid-cols-1">
          {footer.columns.map((column) => (
            <FooterLinks key={column.title} column={column} />
          ))}
          {footer.showContactsColumn ? <FooterContacts contacts={contacts} /> : null}
        </div>

        <a
          href={contacts.inexSuUrl}
          rel="noopener"
          className="text-on-navy self-start text-[15px] leading-[1.4] font-medium underline-offset-3 hover:underline"
        >
          {contacts.inexSuLabel}
        </a>

        <div className="flex flex-wrap justify-between gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-[13px] leading-[1.4]">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footer.bottomLinks.map((link) => (
              <NavAnchor key={link.href} link={link} className={LINK_CLASS} />
            ))}
          </div>
          <span>
            © {year} {contacts.copyrightHolder}
          </span>
        </div>
      </Container>
    </footer>
  );

  return <FooterShell full={full} order={<OrderFooter contacts={contacts} />} />;
}
