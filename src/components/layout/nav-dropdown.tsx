"use client";

import type { ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Mail, MessageCircle, Phone, PhoneCall, Send } from "lucide-react";
import { useFormDialog } from "@/components/forms/form-dialog-provider";
import { cn } from "@/lib/utils";
import { NavAnchor } from "./nav-anchor";
import type { MessengerIcon } from "./nav-defaults";

export type DropdownIcon = "phone" | "mail" | "callback" | MessengerIcon;

export type NavDropdownItem =
  | { kind: "link"; label: string; href: string; newTab?: boolean; icon?: DropdownIcon }
  | { kind: "callback"; label: string };

const ICONS: Record<DropdownIcon, typeof Phone> = {
  phone: Phone,
  mail: Mail,
  callback: PhoneCall,
  telegram: Send,
  whatsapp: MessageCircle,
  max: MessageCircle,
  viber: MessageCircle,
  vk: MessageCircle,
  other: MessageCircle,
};

const ITEM_CLASS =
  "text-text flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-[14px] leading-[1.4] no-underline outline-none select-none data-[highlighted]:bg-well data-[highlighted]:text-primary-hover [&>svg]:size-4 [&>svg]:flex-none [&>svg]:text-text-2";

function ItemIcon({ icon }: { icon: DropdownIcon | undefined }) {
  if (!icon) return null;
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" />;
}

export interface NavDropdownProps {
  label: ReactNode;
  items: NavDropdownItem[];
  triggerClassName?: string | undefined;
  align?: "start" | "center" | "end";
}

/**
 * Simple dropdown of the header («Компания ▾», «Связаться с нами ▾», «Ещё ▾»): Radix menu
 * (keyboard: Enter/Space/↓ open, arrows move, Esc closes and returns focus). Portalled, so it is
 * never clipped by the collapsing header rows. `modal={false}`: the page keeps its scrollbar.
 */
export function NavDropdown({ label, items, triggerClassName, align = "start" }: NavDropdownProps) {
  const { openForm } = useFormDialog();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={cn(
          "group/dd text-text hover:text-primary-hover data-[state=open]:text-primary-hover inline-flex cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent p-0",
          triggerClassName
        )}
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform duration-(--ig-dur-base) group-data-[state=open]/dd:rotate-180 motion-reduce:transition-none"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="border-hairline bg-surface shadow-dropdown data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 z-50 min-w-[220px] rounded-md border p-1.5 duration-(--ig-dur-fast) motion-reduce:animate-none"
        >
          {items.map((item) =>
            item.kind === "callback" ? (
              <DropdownMenu.Item
                key={`callback:${item.label}`}
                className={ITEM_CLASS}
                onSelect={() => openForm("callback")}
              >
                <ItemIcon icon="callback" />
                {item.label}
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item key={`${item.href}:${item.label}`} asChild className={ITEM_CLASS}>
                <NavAnchor
                  link={{ href: item.href, label: item.label, newTab: Boolean(item.newTab) }}
                >
                  <ItemIcon icon={item.icon} />
                  {item.label}
                </NavAnchor>
              </DropdownMenu.Item>
            )
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
