import Image from "next/image";

/** Intrinsic size of the logo SVG in public/brand/ (same file as the site header). */
const LOGO_WIDTH = 69;
const LOGO_HEIGHT = 41;

/**
 * Admin mark in the header / breadcrumbs (`admin.components.graphics.Icon`): the dark logo,
 * scaled down by `.iga-icon` in `src/app/(payload)/styles/_base.scss`. Not decorative: Payload
 * wraps it in a link with no other text, so the alt is the link's accessible name.
 */
export function AdminIcon() {
  return (
    <Image
      src="/brand/inex-glass-logo-dark.svg"
      alt="Inex Glass"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      unoptimized
      className="iga-icon"
    />
  );
}
