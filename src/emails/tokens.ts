/**
 * Inline-style tokens of the e-mails (values from `res/inex-glass-handoff/prototypes/Email.dc.html`).
 *
 * Mail clients (Outlook's Word engine, Gmail) ignore CSS variables, flex and grid, so every value
 * is a literal used in inline `style` attributes. The button colour #1F6B60 gives ≥ 4.5:1 with
 * white text (#2B8C7E does not).
 */

export const colors = {
  text: "#1C1F22",
  muted: "#5B636B",
  line: "#E6E8E6",
  bg: "#ECEEEC",
  card: "#FFFFFF",
  button: "#1F6B60",
  buttonText: "#FFFFFF",
  link: "#1F6B60",
  footerBg: "#324B64",
  footerText: "#C9D3DD",
  footerMuted: "#9FB0C2",
  footerStrong: "#FFFFFF",
  noteBg: "#FCF6EA",
  noteBorder: "#F2D59C",
  noteText: "#3A3F44",
  /** Flag chips of the lead e-mail. */
  flagBg: "#FCF6EA",
  flagText: "#8A5A00",
  flagBorder: "#F2D59C",
  dupBg: "#FDECEC",
  dupText: "#A1261B",
  dupBorder: "#F3C1BC",
} as const;

export const fontFamily = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

export const sizes = {
  /** Container width, also the `width` attribute of the outer table. */
  container: 600,
  /** Horizontal padding of the card. */
  padX: 40,
  logoWidth: 69,
  logoHeight: 41,
  h1: { fontSize: 26, lineHeight: 1.25 },
  body: { fontSize: 15, lineHeight: 1.5 },
  small: { fontSize: 13, lineHeight: 1.55 },
  eyebrow: { fontSize: 13, lineHeight: 1.4 },
  button: { fontSize: 16, padY: 16, padX: 32 },
} as const;

export const px = (n: number) => `${n}px`;
