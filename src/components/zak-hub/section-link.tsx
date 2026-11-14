import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isExternalHref } from "@/components/blocks/shared";
import { cn } from "@/lib/utils";

/**
 * Underlined link with an arrow of the tempered-glass mockups («Обработка стекла →», the
 * checklist links «Требования к чертежам →»): 17 px medium, primary-pressed, 44 px touch target.
 */
export function SectionLink({
  href,
  children,
  onDark = false,
  className,
}: {
  href: string;
  children: ReactNode;
  onDark?: boolean | undefined;
  className?: string | undefined;
}) {
  const classes = cn(
    "group/link inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-[17px] leading-[1.3] font-medium underline decoration-1 underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2",
    onDark
      ? "text-on-navy hover:text-on-navy focus-visible:outline-on-navy"
      : "text-primary-pressed hover:text-primary-dark focus-visible:outline-brand",
    className
  );
  const arrow = (
    <ArrowRight
      aria-hidden="true"
      strokeWidth={2}
      className="ease-ig size-[18px] shrink-0 transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transition-none"
    />
  );
  return isExternalHref(href) ? (
    <a href={href} rel="noopener noreferrer" className={classes}>
      {children}
      {arrow}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
      {arrow}
    </Link>
  );
}
