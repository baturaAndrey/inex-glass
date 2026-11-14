import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ContainerElement = "div" | "section" | "header" | "footer" | "nav" | "article" | "aside";

export type ContainerProps = ComponentPropsWithoutRef<"div"> & {
  /** Rendered element; `div` by default. */
  as?: ContainerElement;
};

/**
 * Content width of the design system: up to 1920 px, horizontal gutter `--ig-gutter`
 * (70 / 40 / 24 / 16 px at ≥1366 / 1101–1365 / 600–1100 / ≤599).
 */
export function Container({ as: Element = "div", className, ...props }: ContainerProps) {
  return (
    <Element
      className={cn("mx-auto w-full max-w-[1920px] px-(--ig-gutter)", className)}
      {...props}
    />
  );
}
