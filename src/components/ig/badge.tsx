import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "promo" | "success" | "info";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  promo: "ig-badge--promo",
  success: "ig-badge--success",
  info: "ig-badge--info",
};

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
  /** Sentence case, 13 px, no tracking — the promo strip in the header (`Home.dc.html`, UIKit). */
  plain?: boolean;
};

/** Status / promo label (`.ig-badge`). No «Хит» / «Новинка» badges in this design system. */
export function Badge({ variant = "promo", plain = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "ig-badge",
        VARIANT_CLASS[variant],
        plain && "text-[13px] tracking-normal normal-case",
        className
      )}
      {...props}
    />
  );
}
