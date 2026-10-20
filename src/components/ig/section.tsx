import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./container";

export type SectionVariant = "bg" | "sf" | "dark" | "primary-dark";

/**
 * Full-width background of a page block (`.blk--*` in the prototypes).
 * Dark variants re-point `--ig-section-sub` so `SectionHead` sub stays ≥4.5:1 (WCAG AA):
 * on-navy-2 #C9D3DD is ≈6:1 on navy #324B64 and ≈7.5:1 on primary-dark #16403D.
 * Light variants reset it, so a light section nested in a dark one is correct too.
 */
const VARIANT_CLASS: Record<SectionVariant, string> = {
  bg: "bg-bg [--ig-section-sub:var(--ig-text-2)]",
  sf: "bg-surface [--ig-section-sub:var(--ig-text-2)]",
  dark: "bg-navy text-on-navy [--ig-section-sub:var(--ig-on-navy-2)]",
  "primary-dark": "bg-primary-dark text-on-navy [--ig-section-sub:var(--ig-on-navy-2)]",
};

export type SectionProps = ComponentPropsWithoutRef<"section"> & {
  /** Background: page `bg` (default), white `sf`, navy `dark`, deep teal `primary-dark`. */
  variant?: SectionVariant;
  /** Rendered element; `section` by default. */
  as?: "section" | "div";
  /** Wrap children into `Container` (default `true`). Set `false` for full-bleed content. */
  contained?: boolean;
  /** Extra classes for the inner `Container`. */
  containerClassName?: string | undefined;
};

/**
 * Page block with the design-system vertical rhythm: 96 / 72 / 48 px
 * (desktop / ≤1100 / ≤599). The background spans the full width, content is limited by `Container`.
 * Pass `id` for anchors (e.g. `ceny`) and `aria-labelledby` pointing at the block heading.
 */
export function Section({
  variant = "bg",
  as: Element = "section",
  contained = true,
  containerClassName,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Element
      className={cn("py-24 max-md:py-[72px] max-sm:py-12", VARIANT_CLASS[variant], className)}
      {...props}
    >
      {contained ? <Container className={containerClassName}>{children}</Container> : children}
    </Element>
  );
}

export type SectionHeadProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  /** Block heading, rendered as `<h2>`. */
  title: ReactNode;
  /** Optional paragraph under / next to the heading. */
  sub?: ReactNode;
  /** Optional action on the right, usually `<TextLink variant="arrow">`. */
  action?: ReactNode;
  /** `id` of the `<h2>`; reference it from `Section aria-labelledby`. */
  headingId?: string | undefined;
  headingClassName?: string | undefined;
  subClassName?: string | undefined;
};

/** Block header (`.blk__head` of the Home prototype): heading + optional sub and action. */
export function SectionHead({
  title,
  sub,
  action,
  headingId,
  headingClassName,
  subClassName,
  className,
  ...props
}: SectionHeadProps) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-4 max-sm:mb-6",
        className
      )}
      {...props}
    >
      <h2 id={headingId} className={cn("ig-h2 max-w-[900px]", headingClassName)}>
        {title}
      </h2>
      {sub ? (
        <p
          className={cn(
            // Typed `text-(color:…)` / `text-(length:…)` so tailwind-merge keeps a `subClassName` colour override working.
            "m-0 max-w-[620px] text-(length:--ig-lead-size) leading-normal text-pretty text-(color:--ig-section-sub)",
            subClassName
          )}
        >
          {sub}
        </p>
      ) : null}
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
