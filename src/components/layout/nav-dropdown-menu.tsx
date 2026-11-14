"use client";

import { useEffect, useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Mail, MessageCircle, Phone, PhoneCall, Send } from "lucide-react";
import { useFormDialog } from "@/components/forms/form-dialog-provider";
import { NavAnchor } from "./nav-anchor";
import { NavDropdownChevron, navDropdownTriggerClass } from "./nav-dropdown";
import type { DropdownIcon, NavDropdownProps } from "./nav-dropdown";

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

export interface NavDropdownMenuProps extends NavDropdownProps {
  /** Open right away: the visitor activated the static trigger before this chunk arrived. */
  defaultOpen?: boolean;
  /** Move the focus to the trigger on mount: it replaced a focused static trigger. */
  focusTrigger?: boolean;
}

/**
 * The interactive part of `NavDropdown` (see `./nav-dropdown`), a lazy chunk: Radix menu
 * (keyboard: Enter/Space/↓ open, arrows move, Esc closes and returns focus). Portalled, so it is
 * never clipped by the collapsing header rows. `modal={false}`: the page keeps its scrollbar.
 */
export function NavDropdownMenu({
  label,
  items,
  triggerClassName,
  align = "start",
  defaultOpen = false,
  focusTrigger = false,
}: NavDropdownMenuProps) {
  const { openForm } = useFormDialog();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hand-over from the static trigger (the props never change after mount).
    if (focusTrigger && !defaultOpen) triggerRef.current?.focus({ preventScroll: true });
  }, [focusTrigger, defaultOpen]);

  return (
    <DropdownMenu.Root modal={false} defaultOpen={defaultOpen}>
      <DropdownMenu.Trigger ref={triggerRef} className={navDropdownTriggerClass(triggerClassName)}>
        {label}
        <NavDropdownChevron />
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
