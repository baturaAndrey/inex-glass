import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Class builder for the design-system button (`.ig-btn*` in ig-components.css).
 * Use it to style links as buttons: `<Link className={buttonVariants({ size: "l" })}>`.
 */
export const buttonVariants = cva("ig-btn", {
  variants: {
    variant: {
      // Fill is --ig-btn-primary-bg (#267D70): white text stays ≥4.5:1.
      primary: "ig-btn--primary",
      secondary: "ig-btn--secondary",
      ghost: "ig-btn--ghost",
      onDark: "ig-btn--on-dark",
    },
    size: {
      l: "ig-btn--l",
      m: "ig-btn--m",
      s: "ig-btn--s",
      // Square 48×48; the accessible name must come from `aria-label`.
      icon: "ig-btn--icon",
    },
    block: {
      true: "ig-btn--block",
      false: null,
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "m",
    block: false,
  },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonBaseProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  variant?: NonNullable<ButtonVariantProps["variant"]>;
  /** Full-width button (`.ig-btn--block`). */
  block?: boolean;
  /** Render the single child element (e.g. `next/link`) with button styles. */
  asChild?: boolean;
  /** Shows a spinner instead of `leftIcon`; stays focusable (`aria-disabled` + `aria-busy`) but ignores activation. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
};

/** An icon-only button has no visible text, so an accessible name is required by type. */
export type ButtonProps = ButtonBaseProps &
  ({ size?: "l" | "m" | "s" } | { size: "icon"; "aria-label": string });

type StateInput = {
  asChild: boolean;
  isDisabled: boolean;
  loading: boolean;
  type: ButtonBaseProps["type"];
  onClick: ButtonBaseProps["onClick"];
};

/**
 * Interaction-state attributes.
 * - `disabled` on a native button: real `disabled` (inert, out of the tab order — expected).
 * - `loading` on a native button: stays focusable (native `disabled` would drop focus mid-submit
 *   and silence screen readers). Activation is blocked without client JS: `onClick` is not
 *   attached and `type="button"` stops a second form submission (also ignores `formAction`).
 * - `asChild` (a link) cannot be `disabled`: `aria-disabled`, out of the tab order (keyboard
 *   Enter would still follow the href) and `pointer-events-none` via the class list.
 */
function getStateProps({ asChild, isDisabled, loading, type, onClick }: StateInput) {
  const isInert = isDisabled || loading;

  if (asChild) {
    return isInert ? { "aria-disabled": true as const, tabIndex: -1 } : onClick ? { onClick } : {};
  }

  if (isDisabled) {
    return { type: type ?? "button", disabled: true };
  }

  if (loading) {
    return { type: "button" as const, "aria-disabled": true as const };
  }

  return { type: type ?? "button", ...(onClick ? { onClick } : {}) };
}

/**
 * Design-system button: variants `primary | secondary | ghost | onDark`, sizes `l | m | s | icon`.
 * Lucide icons in `leftIcon`/`rightIcon` are sized by CSS (20 px, 18 px for `s`).
 * Works in Server Components (no hooks, no generated event handlers).
 */
export function Button({
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  type,
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled);

  if (process.env.NODE_ENV !== "production" && size === "icon" && !props["aria-label"]) {
    console.error('ig/Button: size="icon" requires an aria-label.');
  }

  const Comp = asChild ? Slot : "button";
  const startIcon = loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : leftIcon;

  return (
    <Comp
      data-slot="ig-button"
      aria-busy={loading || undefined}
      className={cn(
        buttonVariants({ variant, size, block }),
        asChild && (isDisabled || loading) && "pointer-events-none",
        className
      )}
      {...props}
      {...getStateProps({ asChild, isDisabled, loading, type, onClick })}
    >
      {startIcon}
      <Slottable>{children}</Slottable>
      {rightIcon}
    </Comp>
  );
}
