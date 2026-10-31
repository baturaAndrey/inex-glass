import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardProps {
  /** Makes the whole card a link (hover: lift by 2 px + card-hover shadow, arrow turns teal). */
  href?: string;
  /** Top media, usually `next/image` or `<Placeholder />`. */
  image?: ReactNode;
  /** Small label above the title (`.ig-label`), e.g. «Статья». */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Heading level of the title; `h3` by default (cards sit under a section `<h2>`). */
  titleAs?: "h2" | "h3" | "h4";
  sub?: ReactNode;
  /** Left side of the footer (price, note). */
  footer?: ReactNode;
  /** Round arrow in the footer; shown by default for link cards. */
  arrow?: boolean;
  /** Extra body content after the sub (chips, specs). */
  children?: ReactNode;
  className?: string | undefined;
}

/** Section / object / article card (`.ig-card`): media, title, sub, footer with an arrow. */
export function Card({
  href,
  image,
  eyebrow,
  title,
  titleAs: Title = "h3",
  sub,
  footer,
  arrow,
  children,
  className,
}: CardProps) {
  const showArrow = arrow ?? Boolean(href);
  const body = (
    <>
      {image}
      <div className="ig-card__body">
        {eyebrow ? <span className="ig-label">{eyebrow}</span> : null}
        <Title className="ig-card__title">{title}</Title>
        {sub ? <p className="ig-card__sub">{sub}</p> : null}
        {children}
        {footer || showArrow ? (
          <div className="ig-card__foot">
            <div className="min-w-0">{footer}</div>
            {showArrow ? (
              <span className="ig-card__arrow" aria-hidden="true">
                <ArrowRight strokeWidth={2} />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("ig-card", className)}>
        {body}
      </Link>
    );
  }
  return <div className={cn("ig-card", className)}>{body}</div>;
}
