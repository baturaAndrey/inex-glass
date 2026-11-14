import type { ComponentPropsWithRef, ReactNode } from "react";
import Link from "next/link";
import { isRouterHref } from "./nav-paths";
import type { NavLink } from "./nav-defaults";

export type NavAnchorProps = Omit<ComponentPropsWithRef<"a">, "href" | "children"> & {
  link: Pick<NavLink, "href" | "label"> & Partial<Pick<NavLink, "newTab">>;
  /** Content instead of `link.label`. */
  children?: ReactNode;
};

/**
 * Menu link: `next/link` for site routes, a plain `<a>` for external / `tel:` / `mailto:` /
 * `/admin` / `/api` hrefs. New-tab links never leak `window.opener`. Works in Server and Client
 * Components (no hooks).
 */
export function NavAnchor({ link, children, onClick, ...props }: NavAnchorProps) {
  const newTabProps = link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const content = children ?? link.label;

  if (!isRouterHref(link.href)) {
    return (
      <a href={link.href} onClick={onClick} {...newTabProps} {...props}>
        {content}
      </a>
    );
  }

  // next/link declares these handlers without `| undefined` (exactOptionalPropertyTypes).
  const { onMouseEnter, onTouchStart, ...linkProps } = props;

  return (
    <Link
      href={link.href}
      {...newTabProps}
      {...linkProps}
      {...(onClick ? { onClick } : {})}
      {...(onMouseEnter ? { onMouseEnter } : {})}
      {...(onTouchStart ? { onTouchStart } : {})}
    >
      {content}
    </Link>
  );
}
