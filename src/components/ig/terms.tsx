import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TermItem {
  /** Lucide icon; a check mark by default. Sized and coloured by `.ig-terms__item svg`. */
  icon?: ReactNode;
  text: ReactNode;
}

export interface TermsProps {
  items: TermItem[];
  /** `bar` — framed strip on white (default); `plain` — no background or border. */
  variant?: "bar" | "plain";
  className?: string | undefined;
}

/**
 * Terms strip (`.ig-terms`): «Заказы от 50 м²», «КП за 2–3 рабочих дня»…
 * Presentational only: building items from the `conditions` global is up to the caller.
 */
export function Terms({ items, variant = "bar", className }: TermsProps) {
  if (items.length === 0) return null;
  return (
    <ul
      className={cn("ig-terms m-0 list-none", variant === "plain" && "ig-terms--plain", className)}
    >
      {items.map((item, index) => (
        <li key={index} className="ig-terms__item">
          {item.icon ?? <Check aria-hidden="true" strokeWidth={2} />}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
