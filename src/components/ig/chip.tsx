"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `.ig-chip` is 36 px high; on phones an invisible pseudo-element extends the hit area to
 * 44 px without changing the look (rows of chips are 8 px apart, so areas do not overlap).
 */
const TOUCH_TARGET =
  "relative max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1";

type ChipCommonProps = {
  /** Selected state: `.is-active` (+ `aria-pressed` on buttons). */
  active?: boolean | undefined;
  /** Lucide icon before the label (14 px via CSS). */
  icon?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
};

export type ChipButtonProps = ChipCommonProps &
  Omit<ComponentPropsWithRef<"button">, "children" | "className" | "type"> & {
    as?: "button" | undefined;
    href?: undefined;
    static?: false | undefined;
  };

export type ChipLinkProps = ChipCommonProps &
  Omit<ComponentPropsWithRef<"a">, "children" | "className" | "href"> & {
    /** Renders the chip as a link (`next/link`), e.g. for catalogue filters. */
    href: string;
    static?: false | undefined;
  };

export type ChipStaticProps = ChipCommonProps &
  Omit<ComponentPropsWithRef<"span">, "children" | "className"> & {
    /** Non-interactive tag (`.ig-chip--static`). */
    static: true;
    href?: undefined;
    /** Adds a small "×" button that removes the tag (e.g. an applied filter). */
    onRemove?: (() => void) | undefined;
    /** Accessible name of the "×" button. Default: `Убрать фильтр: {children}`. */
    removeLabel?: string | undefined;
  };

export type ChipProps = ChipButtonProps | ChipLinkProps | ChipStaticProps;

function isStatic(props: ChipProps): props is ChipStaticProps {
  return props.static === true;
}

function isLink(props: ChipProps): props is ChipLinkProps {
  return typeof props.href === "string";
}

/** Plain text of a ReactNode for accessible names (elements contribute nothing). */
function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  return "";
}

/**
 * Design-system chip (`.ig-chip`): a toggle button (default), a link (`href`) or a static tag
 * (`static`, optionally removable with a "×" button).
 */
export function Chip(props: ChipProps) {
  if (isStatic(props)) {
    const {
      static: _static,
      active,
      icon,
      className,
      children,
      onRemove,
      removeLabel,
      ...rest
    } = props;
    return (
      <span
        data-slot="ig-chip"
        className={cn(
          "ig-chip ig-chip--static",
          active && "is-active",
          onRemove && "pr-1",
          className
        )}
        {...rest}
      >
        {icon}
        {children}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel ?? `Убрать фильтр: ${nodeText(children)}`.trim()}
            className={cn(
              "relative grid size-5 cursor-pointer place-items-center rounded-full text-text-2 transition-colors hover:bg-line hover:text-text",
              // 44 px hit area around the 20 px glyph.
              "after:absolute after:-inset-3"
            )}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </span>
    );
  }

  if (isLink(props)) {
    const { static: _static, active, icon, className, children, href, ...rest } = props;
    // next/link declares these handlers without `| undefined` (exactOptionalPropertyTypes).
    const { onClick, onMouseEnter, onTouchStart, ...linkProps } = rest;
    return (
      <Link
        href={href}
        data-slot="ig-chip"
        aria-current={active ? "true" : undefined}
        className={cn("ig-chip", TOUCH_TARGET, active && "is-active", className)}
        {...linkProps}
        {...(onClick ? { onClick } : {})}
        {...(onMouseEnter ? { onMouseEnter } : {})}
        {...(onTouchStart ? { onTouchStart } : {})}
      >
        {icon}
        {children}
      </Link>
    );
  }

  const { as: _as, static: _static, active, icon, className, children, role, ...rest } = props;
  // Inside a radiogroup the state is exposed via `aria-checked` (set by ChipGroup) instead.
  const pressed = role === "radio" || active === undefined ? undefined : active;

  return (
    <button
      type="button"
      role={role}
      aria-pressed={pressed}
      data-slot="ig-chip"
      className={cn(
        "ig-chip",
        TOUCH_TARGET,
        active && "is-active",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
