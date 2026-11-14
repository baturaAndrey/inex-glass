import { Phone } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { CalcLink } from "./calc-link";
import { HeaderSearch, MobileSearch } from "./header-search";
import { Logo } from "./logo";
import { MegaMenu } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";
import { MyCalcLink } from "./my-calc-link";
import { NavAnchor } from "./nav-anchor";
import { PhoneBlock } from "./phone-block";
import type { ContactsData, HeaderNavData, PromoBadgeData } from "./nav-defaults";

export interface MainRowProps {
  nav: HeaderNavData;
  contacts: ContactsData;
  promo: PromoBadgeData | null;
}

/** Transitions of the compact header; none with `prefers-reduced-motion`. */
const COMPACT_TRANSITION = "ease-ig duration-(--ig-dur-base) motion-reduce:transition-none";

/**
 * Header row 2. Desktop: logo · «Услуги»/«Каталог» pills · «Акции» (active promo only) · «Блог»
 * · search · «Рассчитать стоимость» · phone block (≥1366) · «Мой расчёт».
 * ≤1100: logo · CTA icon · «Мой расчёт» · burger. ≤599: logo · search · phone · burger (the CTA
 * moves to the sticky bottom bar).
 * Heights: 72 / 64 / 56 px; 64 px in the compact state. It is `relative`: mega-menu panels are
 * positioned against it.
 */
export function MainRow({ nav, contacts, promo }: MainRowProps) {
  return (
    <div className="bg-surface relative">
      <Container
        className={`flex h-[72px] items-center gap-4 transition-[height] group-data-[compact=true]/header:h-16 max-md:h-16 max-sm:h-14 max-sm:gap-1 max-sm:group-data-[compact=true]/header:h-14 ${COMPACT_TRANSITION}`}
      >
        <Logo
          eager
          className={`h-11 transition-[height] group-data-[compact=true]/header:h-9 max-sm:h-8 max-sm:group-data-[compact=true]/header:h-8 ${COMPACT_TRANSITION}`}
        />

        <MegaMenu menus={nav.megaMenus} className="max-md:hidden" />

        <nav
          aria-label="Основное"
          className="flex flex-none items-center gap-5 text-[15px] leading-none font-medium max-md:hidden"
        >
          {promo ? (
            <NavAnchor
              link={nav.actionsLink}
              className="text-text hover:text-primary-hover no-underline"
            />
          ) : null}
          {nav.links.map((link) => (
            <NavAnchor
              key={link.href}
              link={link}
              className="text-text hover:text-primary-hover no-underline"
            />
          ))}
        </nav>

        <HeaderSearch
          label={nav.searchLabel}
          placeholder={nav.searchPlaceholder}
          className="flex-[1_1_200px] max-md:hidden"
        />

        <CalcLink label={nav.ctaLabel} className="max-md:hidden" />

        <PhoneBlock
          contacts={contacts}
          callbackLabel={nav.callbackLabel}
          className="max-lg:hidden"
        />

        <div className="flex flex-none items-center gap-1 max-md:ml-auto max-md:gap-2 max-sm:gap-0.5">
          <CalcLink
            variant="icon"
            label={nav.ctaLabel}
            className="hidden max-md:inline-flex max-sm:hidden"
          />
          <MyCalcLink href={nav.myCalcUrl} label={nav.myCalcLabel} className="max-sm:hidden" />
          <MobileSearch
            label={nav.searchLabel}
            placeholder={nav.searchPlaceholder}
            className="hidden max-sm:inline-flex"
          />
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`Позвонить ${contacts.phone.display}`}
            className="hidden size-11 max-sm:inline-flex"
          >
            <a href={contacts.phone.href}>
              <Phone aria-hidden="true" />
            </a>
          </Button>
          <MobileMenu nav={nav} contacts={contacts} className="md:hidden" />
        </div>
      </Container>
    </div>
  );
}
