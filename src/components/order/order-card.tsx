import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * White card of the order page (`.od-card` in `prototypes/Order.dc.html`): radius 24, padding
 * 28/32, soft card shadow; 16 radius and 20/16 padding on phones. `title` is the card's H2.
 */
export function OrderCard({
  title,
  titleId,
  children,
  className,
  as: Element = "section",
}: {
  title: ReactNode;
  titleId?: string;
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return (
    <Element
      aria-labelledby={titleId}
      className={cn(
        "bg-surface shadow-card flex flex-col gap-5 rounded-xl px-8 py-7 max-sm:rounded-lg max-sm:px-4 max-sm:py-5",
        className
      )}
    >
      <h2 id={titleId} className="m-0 text-[20px] leading-[1.3] font-semibold">
        {title}
      </h2>
      {children}
    </Element>
  );
}
