import Image from "next/image";

/** Intrinsic size of the logo SVG in public/brand/ (same file as the site header). */
const LOGO_WIDTH = 69;
const LOGO_HEIGHT = 41;

/**
 * Admin login screen logo (`admin.components.graphics.Logo`): dark logo on the light background.
 * SVG is served as-is (`unoptimized`: the image optimizer does not process SVG). Height is set by
 * `.iga-logo` in `src/app/(payload)/styles/_base.scss`.
 */
export function AdminLogo() {
  return (
    <Image
      src="/brand/inex-glass-logo-dark.svg"
      alt="Inex Glass"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      unoptimized
      className="iga-logo"
    />
  );
}
