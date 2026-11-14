import { Phone } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { CalcLink } from "./calc-link";
import { Logo } from "./logo";
import type { ContactsData } from "./nav-defaults";

export interface OrderHeaderProps {
  contacts: Pick<ContactsData, "phone">;
}

/**
 * Simplified header of the client order page `/zakaz/<token>/` (`.od-head` in
 * `prototypes/Order.dc.html`): logo, phone and «Рассчитать стоимость». No menus, not fixed.
 * ≤599 px: two icon buttons — phone and the CTA.
 */
export function OrderHeader({ contacts }: OrderHeaderProps) {
  return (
    <header className="bg-surface shadow-[0_1px_0_var(--ig-hairline)]">
      <Container className="flex items-center justify-between gap-4 py-3.5">
        <Logo eager className="h-11 max-sm:h-8" />
        <div className="flex items-center gap-6 max-sm:gap-1">
          <a
            href={contacts.phone.href}
            className="text-text hover:text-primary-hover text-[16px] leading-[1.3] font-semibold whitespace-nowrap no-underline max-sm:hidden"
          >
            {contacts.phone.display}
          </a>
          <CalcLink className="max-sm:hidden" />
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
          <CalcLink variant="icon" className="hidden max-sm:inline-flex" />
        </div>
      </Container>
    </header>
  );
}
