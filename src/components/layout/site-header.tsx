import type { ReactNode } from "react";
import { getContacts, getNavigation, getPromo } from "@/lib/cms/globals";
import { cn } from "@/lib/utils";
import { HeaderShell } from "./header-shell";
import { loadOrNull } from "./load-global";
import { MainRow } from "./main-row";
import { toContactsData, toHeaderNav, toPromoBadge } from "./nav-data";
import { OrderHeader } from "./order-header";
import { SectionNav } from "./section-nav";
import { TopBar } from "./top-bar";

/**
 * Header row that collapses in the compact state: `grid-template-rows 1fr → 0fr` (200 ms), then
 * `visibility: hidden` so its links leave the tab order. No animation with reduced motion.
 */
function CollapsibleRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "ease-ig grid grid-rows-[1fr] transition-[grid-template-rows,visibility] duration-(--ig-dur-base) motion-reduce:transition-none",
        "group-data-[compact=true]/header:invisible group-data-[compact=true]/header:grid-rows-[0fr]",
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Site header (server). Data: globals `navigation`, `contacts`, `promo` (cached loaders with
 * `global:*` tags). The promo strip / «Акции» link are computed at render time with `now`, so they
 * disappear after the end date on the next revalidation.
 */
export async function SiteHeader() {
  const [navigation, contactsGlobal, promoGlobal] = await Promise.all([
    loadOrNull("navigation", getNavigation),
    loadOrNull("contacts", getContacts),
    loadOrNull("promo", getPromo),
  ]);

  const nav = toHeaderNav(navigation);
  const contacts = toContactsData(contactsGlobal);
  const promo = toPromoBadge(promoGlobal, new Date());

  const full = (
    <>
      <CollapsibleRow className="max-sm:hidden">
        <TopBar nav={nav} contacts={contacts} promo={promo} />
      </CollapsibleRow>
      <MainRow nav={nav} contacts={contacts} promo={promo} />
      <CollapsibleRow className="max-md:hidden">
        <SectionNav nav={nav} />
      </CollapsibleRow>
    </>
  );

  return <HeaderShell full={full} order={<OrderHeader contacts={contacts} />} />;
}
