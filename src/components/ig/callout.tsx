import type { ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutVariant = "warning" | "info";

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: ReactNode;
  /** Rendered as a bulleted list under the title. */
  items?: ReactNode[];
  children?: ReactNode;
  className?: string | undefined;
}

/** Highlighted note (`.ig-callout`): «Что важно знать до заказа», ГОСТ-справка… */
export function Callout({ variant = "warning", title, items, children, className }: CalloutProps) {
  const Icon = variant === "info" ? Info : TriangleAlert;
  return (
    <div
      role="note"
      className={cn("ig-callout", variant === "info" && "ig-callout--info", className)}
    >
      <span className="ig-callout__icon" aria-hidden="true">
        <Icon strokeWidth={2} />
      </span>
      <div className="ig-body min-w-0 flex-1 [&>*+*]:mt-2 [&>p]:m-0">
        {title ? <p className="ig-callout__title">{title}</p> : null}
        {items && items.length > 0 ? (
          <ul className="list-disc">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </div>
  );
}
