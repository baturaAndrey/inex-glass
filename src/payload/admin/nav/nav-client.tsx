"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { useNav } from "@payloadcms/ui";
import { ChevronDown, LogOut } from "lucide-react";
import { ACCOUNT_PATH, ADMIN_ROOT_PATH, LOGOUT_PATH } from "./nav-config";
import { NAV_ICON_SIZE, NAV_ICONS } from "./nav-icons";
import type { NavGroup, NavItem, NavLink } from "./build-nav";
import type { NavCounterKey } from "./nav-config";
import type { NavCounters } from "./nav-counters";

/**
 * Client half of the admin sidebar: highlights the current link (`usePathname`), expands the
 * children of the active item and toggles the others. Everything else (groups, visibility,
 * counters, user) is computed on the server by `inex-nav.tsx` and passed as plain data.
 *
 * Links are plain `<a>` (project rule for `/admin`): each one is a full navigation, after which
 * Payload's `NavProvider` starts the nav closed again on ≤ 1440 px, so the mobile overlay needs
 * no explicit close on click.
 *
 * Payload treats everything ≤ 1440 px as "small" and starts the nav closed there, while the
 * mockup (DESIGN.md: overlay only ≤ 1100 px) shows the sidebar at 1366. `useSidebarOnLaptop`
 * re-opens it once on load between 1101 and 1440 px; the toggler keeps working afterwards.
 */

/** Widths where the sidebar is a column (not an overlay) but Payload starts it closed. */
const LAPTOP_SIDEBAR_QUERY = "(min-width: 1101px) and (max-width: 1440px)";

/**
 * Opens the nav while Payload's `NavProvider` is still initialising (`hydrated` and not yet
 * `shouldAnimate`, i.e. within its 100 ms start-up window after the last breakpoint change),
 * so it undoes only the provider's automatic close, never a user's toggle, and without the
 * open animation.
 */
function useSidebarOnLaptop(): void {
  const { hydrated, navOpen, setNavOpen, shouldAnimate } = useNav();
  useEffect(() => {
    if (!hydrated || shouldAnimate || navOpen) return;
    if (window.matchMedia(LAPTOP_SIDEBAR_QUERY).matches) setNavOpen(true);
  }, [hydrated, shouldAnimate, navOpen, setNavOpen]);
}

export interface NavUser {
  name: string;
  initials: string;
  roleLabel: string;
}

interface NavClientProps {
  groups: NavGroup[];
  counters: NavCounters;
  user: NavUser | null;
}

const COUNTER_META: Record<NavCounterKey, { ariaLabel: (n: number) => string; soft: boolean }> = {
  newLeads: { ariaLabel: (n) => `новых: ${n}`, soft: false },
  activeOrders: { ariaLabel: (n) => `в работе: ${n}`, soft: true },
};

const withTrailingSlash = (path: string) => (path.endsWith("/") ? path : `${path}/`);

function linkMatches(link: NavLink, path: string): boolean {
  if (link.exact) return path === link.href;
  return link.activePrefixes.some((prefix) => path.startsWith(prefix));
}

/** Longest prefix of `link` that matches `path` (0 = no match). */
function matchLength(link: NavLink, path: string): number {
  if (link.exact) return path === link.href ? link.href.length : 0;
  return Math.max(0, ...link.activePrefixes.filter((p) => path.startsWith(p)).map((p) => p.length));
}

/**
 * The one link of an active item that gets `aria-current="page"`: the child whose `href` is the
 * current path, else the item if its `href` is, else the child with the most specific prefix,
 * else the item itself.
 */
function currentLink(item: NavItem, path: string): NavLink | null {
  if (!linkMatches(item, path)) return null;
  // A child wins a tie with the item: «Каталог» links to its first child, «Заказы» to «Все заказы».
  const exactChild = item.children.find((child) => child.href === path);
  if (exactChild) return exactChild;
  if (item.href === path) return item;
  let best: NavLink | null = null;
  let bestLength = 0;
  for (const child of item.children) {
    const length = matchLength(child, path);
    if (length > bestLength) {
      best = child;
      bestLength = length;
    }
  }
  return best ?? item;
}

function Counter({ kind, value }: { kind: NavCounterKey; value: number | null }) {
  if (value === null || value <= 0) return null;
  const meta = COUNTER_META[kind];
  return (
    <span
      className={meta.soft ? "iga-nav__count iga-nav__count--soft" : "iga-nav__count"}
      aria-label={meta.ariaLabel(value)}
    >
      {value}
    </span>
  );
}

function NavItemView({
  item,
  path,
  counters,
}: {
  item: NavItem;
  path: string;
  counters: NavCounters;
}) {
  const listId = useId();
  const active = linkMatches(item, path);
  const current = currentLink(item, path);
  // A user toggle holds only for the path it was made on; navigation re-derives from `active`.
  const [toggled, setToggled] = useState<{ path: string; open: boolean } | null>(null);
  const open = toggled && toggled.path === path ? toggled.open : active;
  const Icon = NAV_ICONS[item.icon];
  const expandable = item.children.length > 1;

  return (
    <div className="iga-nav__item" data-nav-item={item.id}>
      <div className="iga-nav__row">
        <a
          className={active ? "iga-nav__link is-active" : "iga-nav__link"}
          href={item.href}
          id={item.domId}
          aria-current={current === item ? "page" : undefined}
        >
          <Icon size={NAV_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
          <span className="iga-nav__label">{item.label}</span>
          {item.counter ? <Counter kind={item.counter} value={counters[item.counter]} /> : null}
        </a>
        {expandable ? (
          <button
            type="button"
            className="iga-nav__toggle"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`Показать разделы «${item.label}»`}
            onClick={() => setToggled({ path, open: !open })}
          >
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {expandable ? (
        <ul className="iga-nav__sub" id={listId} hidden={!open}>
          {item.children.map((child) => {
            const isCurrent = current === child;
            return (
              <li key={child.href}>
                <a
                  className={isCurrent ? "iga-nav__sublink is-active" : "iga-nav__sublink"}
                  href={child.href}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {child.label}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function NavClient({ groups, counters, user }: NavClientProps) {
  const path = withTrailingSlash(usePathname() ?? ADMIN_ROOT_PATH);
  const groupIdPrefix = useId();
  useSidebarOnLaptop();

  return (
    <nav className="nav__wrap iga-nav" aria-label="Главное меню">
      <a className="iga-nav__brand" href={ADMIN_ROOT_PATH}>
        {/* Plain <img>: the admin does not use next/image; the SVG logo needs no optimisation. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="iga-nav__logo"
          src="/brand/inex-glass-logo-light.svg"
          alt="Inex Glass"
          height={36}
        />
        <span className="iga-nav__brand-sub">
          панель
          <br />
          управления
        </span>
      </a>

      <div className="iga-nav__groups">
        {groups.map((group) => {
          const labelId = `${groupIdPrefix}-${group.id}`;
          return (
            <div className="iga-nav__group" role="group" aria-labelledby={labelId} key={group.id}>
              <div className="iga-nav__group-label" id={labelId}>
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavItemView key={item.id} item={item} path={path} counters={counters} />
              ))}
            </div>
          );
        })}
      </div>

      {user ? (
        <div className="iga-nav__user">
          <a
            className="iga-nav__user-link"
            href={ACCOUNT_PATH}
            aria-current={path === ACCOUNT_PATH ? "page" : undefined}
          >
            <span className="iga-avatar" aria-hidden="true">
              {user.initials}
            </span>
            <span className="iga-nav__user-text">
              <span className="iga-nav__user-name">{user.name}</span>
              <small className="iga-nav__user-role">{user.roleLabel}</small>
            </span>
          </a>
          <a className="iga-nav__logout" href={LOGOUT_PATH} aria-label="Выйти" title="Выйти">
            <LogOut size={NAV_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </nav>
  );
}
