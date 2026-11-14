import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Intrinsic size of the temporary SVG (the final file from Inex replaces it in public/brand/). */
const LOGO_WIDTH = 69;
const LOGO_HEIGHT = 41;

const SRC = {
  dark: "/brand/inex-glass-logo-dark.svg",
  light: "/brand/inex-glass-logo-light.svg",
} as const;

export interface LogoProps {
  /** `dark` for light backgrounds (header), `light` for navy (footer). */
  variant?: keyof typeof SRC;
  /** Wrap in a link to the home page. */
  href?: string | null;
  /** Height via classes (`h-11`, …); the width follows the aspect ratio. */
  className?: string | undefined;
  /** Above-the-fold logo (header): no lazy loading (not the LCP element, so no preload). */
  eager?: boolean;
}

/**
 * Inex Glass logo. SVG is served as-is (`unoptimized`: the image optimizer does not process SVG).
 */
export function Logo({ variant = "dark", href = "/", className, eager = false }: LogoProps) {
  const image = (
    <Image
      src={SRC[variant]}
      alt={href ? "Inex Glass — на главную" : "Inex Glass"}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      // React's SSR adds `<link rel="preload" as="image">` for every non-lazy <img> of a page
      // rendered in one pass (ISR / prerender) unless its priority is low. The eager header logo
      // must not compete with the LCP hero preload: a few-KB SVG, still fetched without delay.
      fetchPriority={eager ? "low" : "auto"}
      className={cn("block h-11 w-auto", className)}
    />
  );
  if (!href) return image;
  return (
    <Link href={href} className="flex flex-none rounded-sm">
      {image}
    </Link>
  );
}
