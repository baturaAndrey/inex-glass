"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useFormDialog } from "@/components/forms/form-dialog-provider";
import { Button } from "@/components/ig/button";
import { cn } from "@/lib/utils";
import type { ContactsData, HeaderNavData } from "./nav-defaults";

const loadPanel = () => import("./mobile-menu-panel");

/** Client-only: the closed menu has no markup (Radix renders nothing while closed anyway). */
const MobileMenuPanel = dynamic(() => loadPanel().then((mod) => mod.MobileMenuPanel), {
  ssr: false,
});

/** Starts loading the drawer chunk before the tap (hover / focus / touch of the burger). */
const preloadPanel = () => void loadPanel();

export interface MobileMenuProps {
  nav: HeaderNavData;
  contacts: ContactsData;
  className?: string | undefined;
}

/**
 * Mobile menu (≤1100 px): burger button + full-screen `Drawer` on the right. CTA and «Мой
 * расчёт» first, then accordion sections (Каталог, Услуги, Компания, Связаться), audiences and
 * the phone with working hours. Closes on any link, Esc and the overlay; Radix locks the page
 * scroll while open.
 *
 * The drawer (`./mobile-menu-panel`) is a lazy chunk mounted on the first open and kept mounted
 * afterwards (exit animation, instant reopen) — task 39, JS budget.
 */
export function MobileMenu({ nav, contacts, className }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { openForm } = useFormDialog();

  // Close after a route change (e.g. browser back while the menu is open).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const openMenu = () => {
    setMounted(true);
    setOpen(true);
  };

  const openCallback = () => {
    setOpen(false);
    openForm("callback");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Меню"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openMenu}
        onPointerEnter={preloadPanel}
        onTouchStart={preloadPanel}
        onFocus={preloadPanel}
        className={cn("size-11 flex-none", className)}
      >
        <Menu aria-hidden="true" />
      </Button>

      {mounted ? (
        <MobileMenuPanel
          open={open}
          onOpenChange={setOpen}
          nav={nav}
          contacts={contacts}
          onCallback={openCallback}
        />
      ) : null}
    </>
  );
}
