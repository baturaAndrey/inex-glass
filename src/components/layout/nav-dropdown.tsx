"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessengerIcon } from "./nav-defaults";

export type DropdownIcon = "phone" | "mail" | "callback" | MessengerIcon;

export type NavDropdownItem =
  | { kind: "link"; label: string; href: string; newTab?: boolean; icon?: DropdownIcon }
  | { kind: "callback"; label: string };

export interface NavDropdownProps {
  label: ReactNode;
  items: NavDropdownItem[];
  triggerClassName?: string | undefined;
  align?: "start" | "center" | "end";
}

/** Trigger classes shared by the static trigger and the Radix one (identical look). */
export function navDropdownTriggerClass(className?: string): string {
  return cn(
    "group/dd text-text hover:text-primary-hover data-[state=open]:text-primary-hover inline-flex cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent p-0",
    className
  );
}

export function NavDropdownChevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      className="size-3.5 transition-transform duration-(--ig-dur-base) group-data-[state=open]/dd:rotate-180 motion-reduce:transition-none"
    />
  );
}

type MenuModule = typeof import("./nav-dropdown-menu");
type MenuComponent = MenuModule["NavDropdownMenu"];

/** One shared request for the chunk (several dropdowns in the header). */
let menuModule: Promise<MenuModule> | null = null;
const loadMenu = () => (menuModule ??= import("./nav-dropdown-menu"));

/** Keys that open a Radix menu from its trigger. */
const OPEN_KEYS = new Set(["Enter", " ", "ArrowDown"]);

/**
 * Simple dropdown of the header («Компания ▾», «Связаться с нами ▾», «Ещё ▾»).
 *
 * The Radix menu (`./nav-dropdown-menu`, with floating-ui ≈ 20 KB gzip) is a lazy chunk (task
 * 39): the server renders a static trigger with the same markup; hovering, focusing or touching
 * it loads the chunk, which then replaces the trigger in the same frame (a plain `import()` kept
 * in state, not `next/dynamic`, so no empty Suspense fallback flashes) and keeps the focus.
 * Activating the static trigger before the chunk arrived opens the menu once it is mounted. The
 * menu items were never in the server HTML (Radix renders them only while open): SEO unchanged.
 */
export function NavDropdown(props: NavDropdownProps) {
  const [menu, setMenu] = useState<{
    Component: MenuComponent;
    open: boolean;
    focused: boolean;
  } | null>(null);
  // Hand-over state, read when the chunk resolves (set synchronously by the events).
  const handOver = useRef({ open: false, focused: false });

  if (menu) {
    return <menu.Component {...props} defaultOpen={menu.open} focusTrigger={menu.focused} />;
  }

  const load = () => {
    void loadMenu().then((mod) =>
      setMenu((current) => current ?? { Component: mod.NavDropdownMenu, ...handOver.current })
    );
  };
  const open = () => {
    handOver.current.open = true;
    load();
  };

  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={false}
      className={navDropdownTriggerClass(props.triggerClassName)}
      onPointerEnter={load}
      onFocus={() => {
        handOver.current.focused = true;
        load();
      }}
      onBlur={() => {
        handOver.current.focused = false;
      }}
      onClick={open}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (!OPEN_KEYS.has(event.key)) return;
        event.preventDefault();
        open();
      }}
    >
      {props.label}
      <NavDropdownChevron />
    </button>
  );
}
