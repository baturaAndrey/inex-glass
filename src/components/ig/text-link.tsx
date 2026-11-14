import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TextLinkVariant = "default" | "arrow" | "dashed";

const VARIANT_CLASS: Record<TextLinkVariant, string | null> = {
  default: null,
  arrow: "ig-link--arrow",
  dashed: "ig-link--dashed",
};

/**
 * Hrefs that must bypass the Next router:
 * - other origins and protocol links (`https:`, `tel:`, `mailto:`, protocol-relative `//`);
 * - the Payload admin (a separate root layout, client-side navigation into it is impossible);
 * - `/api/*` route handlers (file downloads, redirects): the router would try to fetch an RSC
 *   payload / prefetch them instead of letting the browser handle the response.
 */
const NON_ROUTER_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/(?:admin|api)(?:[/?#]|$))/i;

/** A last path segment with an extension (`/files/price.pdf`) is a file, not a page route. */
const FILE_HREF = /(?:^|\/)[^/?#]+\.[a-z\d]{1,8}(?:[?#]|$)/i;

function isNonRouterHref(href: string, download: TextLinkProps["download"]): boolean {
  return download !== undefined || NON_ROUTER_HREF.test(href) || FILE_HREF.test(href);
}

export type TextLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  /** `arrow` appends a Lucide arrow, `dashed` is the small secondary dashed link. */
  variant?: TextLinkVariant | undefined;
  /**
   * Force a plain `<a>` (`true`) or `next/link` (`false`). Detected automatically: `http(s):`,
   * `tel:`, `mailto:`, `/admin`, `/api/*`, file URLs and links with `download` use `<a>`.
   */
  external?: boolean | undefined;
};

/** Text link of the design system (`.ig-link`): `next/link` for site routes, `<a>` otherwise. */
export function TextLink({
  href,
  variant = "default",
  external,
  className,
  children,
  target,
  rel,
  ...props
}: TextLinkProps) {
  const classes = cn("ig-link", VARIANT_CLASS[variant], className);
  // Never leak window.opener / referrer to a page opened in a new tab.
  const safeRel =
    target === "_blank" ? ["noopener noreferrer", rel].filter(Boolean).join(" ") : rel;
  const content = (
    <>
      {children}
      {variant === "arrow" ? <ArrowRight aria-hidden="true" /> : null}
    </>
  );

  if (external ?? isNonRouterHref(href, props.download)) {
    return (
      <a href={href} target={target} rel={safeRel} className={classes} {...props}>
        {content}
      </a>
    );
  }

  // next/link declares these handlers without `| undefined` (exactOptionalPropertyTypes).
  const { onClick, onMouseEnter, onTouchStart, ...linkProps } = props;

  return (
    <Link
      href={href}
      target={target}
      rel={safeRel}
      className={classes}
      {...linkProps}
      {...(onClick ? { onClick } : {})}
      {...(onMouseEnter ? { onMouseEnter } : {})}
      {...(onTouchStart ? { onTouchStart } : {})}
    >
      {content}
    </Link>
  );
}
