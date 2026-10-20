"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";
import { CalcLink } from "./calc-link";
import { NavAnchor } from "./nav-anchor";
import type { MegaMenuData, MegaMenuKey, MegaPromoCard } from "./nav-defaults";

/** Hover intent before opening (pointer: fine only). */
const HOVER_OPEN_DELAY_MS = 120;
/** Grace period to travel from the pill down to the panel without closing it. */
const HOVER_CLOSE_DELAY_MS = 250;

export interface MegaMenuProps {
  menus: MegaMenuData[];
  className?: string | undefined;
}

/**
 * Mega-menu pills «Услуги» / «Каталог» and their full-width panels (disclosure pattern, no extra
 * dependencies). Each panel follows its trigger in the DOM (Tab goes trigger → panel links →
 * next trigger) and is positioned against the main header row (`relative`), so this component's
 * wrapper must stay unpositioned.
 *
 * Opens on click, and on hover after 120 ms for fine pointers. Closes on Esc (focus back to the
 * trigger), click outside, focus leaving the menu, following a link and route change.
 */
export function MegaMenu({ menus, className }: MegaMenuProps) {
  const baseId = useId();
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<MegaMenuKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<MegaMenuKey, HTMLButtonElement>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (next: MegaMenuKey | null, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setOpenKey(next);
      }, delay);
    },
    [clearTimer]
  );

  const close = useCallback(() => {
    clearTimer();
    setOpenKey(null);
  }, [clearTimer]);

  // Close on navigation (also covers browser back/forward). Adjusting state while rendering is
  // the React-recommended way to react to a changed value without an extra effect pass.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenKey(null);
  }

  // Esc and click outside, only while a panel is open.
  useEffect(() => {
    if (openKey === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      triggerRefs.current.get(openKey)?.focus();
      close();
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openKey, close]);

  useEffect(() => clearTimer, [clearTimer]);

  const isHoverPointer = (event: PointerEvent) =>
    event.pointerType === "mouse" && window.matchMedia("(pointer: fine)").matches;

  const onPointerEnter = (key: MegaMenuKey) => (event: PointerEvent) => {
    if (!isHoverPointer(event)) return;
    // Already open (e.g. moving back from the panel): just cancel a pending close.
    if (openKey === key) clearTimer();
    else schedule(key, HOVER_OPEN_DELAY_MS);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (!isHoverPointer(event)) return;
    if (openKey === null) clearTimer();
    else schedule(null, HOVER_CLOSE_DELAY_MS);
  };

  // Focus moving outside the whole menu (Tab past the last link) closes it. A `null`
  // relatedTarget (click on a non-focusable spot) is handled by the pointerdown listener.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) close();
  };

  // Following any link inside a panel closes it immediately.
  const onPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a")) close();
  };

  return (
    <div ref={rootRef} className={cn("flex flex-none gap-2", className)} onBlur={onBlur}>
      {menus.map((menu) => {
        const isOpen = openKey === menu.key;
        const triggerId = `${baseId}-${menu.key}-trigger`;
        const panelId = `${baseId}-${menu.key}-panel`;
        return (
          <Fragment key={menu.key}>
            <button
              ref={(node) => {
                if (node) triggerRefs.current.set(menu.key, node);
                else triggerRefs.current.delete(menu.key);
              }}
              id={triggerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-haspopup="true"
              onClick={() => {
                clearTimer();
                setOpenKey(isOpen ? null : menu.key);
              }}
              onPointerEnter={onPointerEnter(menu.key)}
              onPointerLeave={onPointerLeave}
              className={cn(
                "border-text bg-surface text-text inline-flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-[18px] text-[15px] leading-none font-medium",
                "ease-ig transition-colors duration-(--ig-dur-base) motion-reduce:transition-none",
                "hover:border-brand hover:text-primary-hover",
                "aria-expanded:border-brand aria-expanded:bg-primary-light aria-expanded:text-primary-hover"
              )}
            >
              <Menu aria-hidden="true" className="size-[18px]" />
              {menu.label}
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              onClick={onPanelClick}
              onPointerEnter={onPointerEnter(menu.key)}
              onPointerLeave={onPointerLeave}
              className={cn(
                "border-hairline bg-surface shadow-dropdown absolute inset-x-0 top-full z-10 border-t",
                "max-h-[calc(100dvh-var(--ig-header-compact-h))] overflow-y-auto overscroll-contain",
                "animate-in fade-in-0 slide-in-from-top-1 duration-(--ig-dur-base) motion-reduce:animate-none",
                // Pills exist only on desktop; never leave a panel open after a resize.
                "max-md:hidden"
              )}
            >
              <MegaPanel menu={menu} />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function MegaPanel({ menu }: { menu: MegaMenuData }) {
  return (
    <Container
      className={cn(
        "grid gap-x-10 gap-y-8 pt-8 pb-10",
        menu.promoCard
          ? "grid-cols-[repeat(var(--cols),minmax(0,1fr))_minmax(0,320px)] max-lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))_minmax(0,260px)]"
          : "grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
      )}
      style={{ "--cols": Math.max(menu.columns.length, 1) } as CSSProperties}
    >
      {menu.columns.map((column) => (
        <div key={column.title} className="flex min-w-0 flex-col gap-4">
          <p className="text-micro text-text-2 tracking-[0.04em] uppercase">{column.title}</p>
          <ul className="flex flex-col gap-3">
            {column.links.map((link) => (
              <li key={`${link.href}:${link.label}`} className="flex flex-col gap-2">
                <NavAnchor
                  link={link}
                  className="text-text hover:text-primary-hover text-[16px] leading-[1.35] font-medium no-underline"
                />
                {link.hint ? <span className="text-text-2 text-[13px]">{link.hint}</span> : null}
                {link.subLinks.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label={link.label}>
                    {link.subLinks.map((sub) => (
                      <li key={sub.href}>
                        <NavAnchor
                          link={sub}
                          className="bg-well text-text-2 hover:bg-primary-light hover:text-primary-dark inline-flex h-7 items-center rounded-full px-3 text-[13px] leading-none no-underline transition-colors duration-(--ig-dur-fast)"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {menu.promoCard ? <PromoCard card={menu.promoCard} /> : null}
    </Container>
  );
}

function PromoCard({ card }: { card: MegaPromoCard }) {
  return (
    <div className="bg-primary-light flex flex-col items-start gap-4 self-start rounded-lg p-6">
      <p className="text-h6 text-primary-dark text-balance">{card.title}</p>
      {card.text ? <p className="text-text-2 text-[14px] leading-[1.45]">{card.text}</p> : null}
      {card.buttonKind === "link" && card.url ? (
        <Button asChild variant="primary" className="h-11 px-[22px] text-[15px]">
          <Link href={card.url}>{card.buttonLabel}</Link>
        </Button>
      ) : (
        <CalcLink label={card.buttonLabel} />
      )}
    </div>
  );
}
