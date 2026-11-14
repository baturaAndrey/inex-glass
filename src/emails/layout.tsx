import type { CSSProperties, ReactNode, TdHTMLAttributes } from "react";
import { Body, Head, Html, Img, Preview } from "@react-email/components";
import { colors, fontFamily, px, sizes } from "./tokens";

/**
 * Shared shell of all e-mails (prototype `Email.dc.html`): grey page, white 600 px card with the
 * logo, content, optional signature and the navy footer with the company addresses.
 *
 * Mail-client constraints: tables + inline styles only (no flex/grid/CSS variables), Arial, the
 * only image is the PNG logo by absolute URL. `bgcolor` attributes duplicate background colours
 * for Outlook, which ignores `background-color` on some cells.
 */

/* ------------------------------------------------------------------------------------------ */
/* Footer contacts                                                                            */
/* ------------------------------------------------------------------------------------------ */

export type FooterContacts = {
  brandName: string;
  /** «Челябинск — офис: ул. Артиллерийская, 124А · +7 (351) 247-05-57, +7 951 489-04-09». */
  lines: string[];
  email: string;
  phone: string;
  siteLabel: string;
};

/** Used when the `contacts` global is not available (values of ТЗ §4.4 / the prototype). */
export const DEFAULT_FOOTER_CONTACTS: FooterContacts = {
  brandName: "Inex Glass",
  lines: [
    "Челябинск — офис: ул. Артиллерийская, 124А · +7 (351) 247-05-57, +7 951 489-04-09",
    "Челябинск — склад и самовывоз: Свердловский тракт, 7В · пн–пт, 9:00–18:00",
    "Екатеринбург — офис: ул. Данилы Зверева, 17б · +7 982 329-11-08",
  ],
  email: "sale@inex.su",
  phone: "+7 (351) 247-05-57",
  siteLabel: "inexglass.ru",
};

/** Structural subset of the `contacts` global used by the footer. */
export type ContactsLike = {
  brandName?: string | null;
  phones?: { number?: string | null; isPrimary?: boolean | null }[] | null;
  emails?: { address?: string | null; isPrimary?: boolean | null }[] | null;
  locations?:
    | {
        title?: string | null;
        address?: string | null;
        hours?: string | null;
        phones?: { number?: string | null }[] | null;
      }[]
    | null;
};

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

function locationLine(location: NonNullable<ContactsLike["locations"]>[number]): string | null {
  if (!location.title || !location.address) return null;
  const phones = (location.phones ?? [])
    .map((phone) => phone.number?.trim())
    .filter((n): n is string => Boolean(n));
  // Locations without phones (warehouse) show their hours instead, as in the prototype.
  const tail =
    phones.length > 0 ? phones.join(", ") : location.hours ? lowerFirst(location.hours) : "";
  return tail
    ? `${location.title}: ${location.address} · ${tail}`
    : `${location.title}: ${location.address}`;
}

function primaryOf<T extends { isPrimary?: boolean | null }>(rows: T[] | null | undefined) {
  return rows?.find((row) => row.isPrimary) ?? rows?.[0];
}

/** Footer data from the `contacts` global, each part falling back to the constants. */
export function footerFromContacts(
  contacts: ContactsLike | null | undefined,
  siteUrl: string
): FooterContacts {
  const lines = (contacts?.locations ?? [])
    .map(locationLine)
    .filter((line): line is string => line !== null);
  return {
    brandName: contacts?.brandName?.trim() || DEFAULT_FOOTER_CONTACTS.brandName,
    lines: lines.length > 0 ? lines : DEFAULT_FOOTER_CONTACTS.lines,
    email: primaryOf(contacts?.emails)?.address?.trim() || DEFAULT_FOOTER_CONTACTS.email,
    phone: primaryOf(contacts?.phones)?.number?.trim() || DEFAULT_FOOTER_CONTACTS.phone,
    siteLabel: new URL(siteUrl).host,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Primitives                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** `bgcolor` is valid HTML for mail clients but missing from React's `<td>` typings. */
const bgcolor = (color: string) =>
  ({ bgcolor: color }) as unknown as TdHTMLAttributes<HTMLTableCellElement>;

const tableReset = {
  role: "presentation",
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
} as const;

const textStyle = (overrides: CSSProperties = {}): CSSProperties => ({
  margin: 0,
  fontFamily,
  fontSize: px(sizes.body.fontSize),
  lineHeight: sizes.body.lineHeight,
  color: colors.text,
  ...overrides,
});

export const linkStyle: CSSProperties = { color: colors.link, textDecoration: "underline" };

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      style={textStyle({
        fontSize: px(sizes.eyebrow.fontSize),
        lineHeight: sizes.eyebrow.lineHeight,
        color: colors.muted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        paddingBottom: px(20),
      })}
    >
      {children}
    </p>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <h1
      style={textStyle({
        fontSize: px(sizes.h1.fontSize),
        lineHeight: sizes.h1.lineHeight,
        fontWeight: 700,
        paddingBottom: px(20),
      })}
    >
      {children}
    </h1>
  );
}

export function Paragraph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <p
      style={textStyle({
        lineHeight: 1.55,
        paddingBottom: px(20),
        ...(muted ? { color: colors.muted } : {}),
      })}
    >
      {children}
    </p>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p style={textStyle({ fontWeight: 700, paddingBottom: px(8), paddingTop: px(4) })}>
      {children}
    </p>
  );
}

export type DetailRow = { label: string; value: ReactNode };

/** «label — value» rows separated by hairlines (prototype: «Дата отгрузки … 15.11.2026»). */
export function DetailsTable({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  const cell: CSSProperties = {
    padding: "12px 0",
    borderBottom: `1px solid ${colors.line}`,
    fontFamily,
    fontSize: px(sizes.body.fontSize),
    lineHeight: 1.45,
    verticalAlign: "top",
  };
  return (
    <table
      {...tableReset}
      width="100%"
      style={{ width: "100%", borderTop: `1px solid ${colors.line}`, marginBottom: px(20) }}
    >
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td style={{ ...cell, color: colors.muted, paddingRight: px(16), width: "42%" }}>
              {row.label}
            </td>
            <td
              align="right"
              style={{ ...cell, color: colors.text, fontWeight: 700, textAlign: "right" }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Highlighted note (manager's comment for the client). */
export function NoteBox({ children }: { children: ReactNode }) {
  return (
    <table {...tableReset} width="100%" style={{ width: "100%", marginBottom: px(20) }}>
      <tbody>
        <tr>
          <td
            {...bgcolor(colors.noteBg)}
            style={{
              backgroundColor: colors.noteBg,
              border: `1px solid ${colors.noteBorder}`,
              borderRadius: px(8),
              padding: "14px 16px",
              ...textStyle({ color: colors.noteText, lineHeight: 1.5 }),
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Small coloured chip (lead flags, «Повторная заявка»). */
export function Chip({ children, tone = "flag" }: { children: ReactNode; tone?: "flag" | "dup" }) {
  const [bg, fg, border] =
    tone === "dup"
      ? [colors.dupBg, colors.dupText, colors.dupBorder]
      : [colors.flagBg, colors.flagText, colors.flagBorder];
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: px(999),
        padding: "4px 10px",
        margin: "0 6px 6px 0",
        fontFamily,
        fontSize: px(sizes.small.fontSize),
        lineHeight: 1.3,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

/** «Bulletproof» button: the link lives in a coloured cell, so Outlook still shows a button. */
export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <table {...tableReset} style={{ marginTop: px(8), marginBottom: px(20) }}>
      <tbody>
        <tr>
          <td
            {...bgcolor(colors.button)}
            align="center"
            style={{ backgroundColor: colors.button, borderRadius: px(999) }}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: `${px(sizes.button.padY)} ${px(sizes.button.padX)}`,
                fontFamily,
                fontSize: px(sizes.button.fontSize),
                lineHeight: 1,
                fontWeight: 700,
                color: colors.buttonText,
                textDecoration: "none",
                borderRadius: px(999),
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Layout                                                                                     */
/* ------------------------------------------------------------------------------------------ */

export type Signature = {
  name: string;
  title: string;
  phone: string;
  email: string;
};

export type EmailLayoutProps = {
  /** Inbox preview line (hidden pre-header). */
  preview: string;
  siteUrl: string;
  footer: FooterContacts;
  eyebrow?: string;
  signature?: Signature;
  /** Client e-mails: «Вы получили это письмо, потому что …». */
  footerReason?: string;
  children: ReactNode;
};

export const LOGO_PATH = "/email/logo@2x.png";

function SignatureBlock({ signature }: { signature: Signature }) {
  const line = (content: ReactNode, style: CSSProperties = {}) => (
    <p style={textStyle({ lineHeight: sizes.body.lineHeight, paddingBottom: px(4), ...style })}>
      {content}
    </p>
  );
  return (
    <>
      {line("С уважением,")}
      {line(signature.name, { fontWeight: 700 })}
      {line(signature.title, { color: colors.muted })}
      {line(
        <>
          <a href={`tel:${signature.phone.replace(/[^\d+]/g, "")}`} style={linkStyle}>
            {signature.phone}
          </a>
          {" · "}
          <a href={`mailto:${signature.email}`} style={linkStyle}>
            {signature.email}
          </a>
        </>,
        { paddingBottom: 0 }
      )}
    </>
  );
}

function Footer({
  footer,
  siteUrl,
  reason,
}: {
  footer: FooterContacts;
  siteUrl: string;
  reason?: string;
}) {
  const line = (content: ReactNode, style: CSSProperties = {}) => (
    <p
      style={textStyle({
        fontSize: px(sizes.small.fontSize),
        lineHeight: sizes.small.lineHeight,
        color: colors.footerText,
        paddingBottom: px(8),
        ...style,
      })}
    >
      {content}
    </p>
  );
  const strongLink: CSSProperties = { color: colors.footerStrong, textDecoration: "underline" };
  return (
    <>
      {line(footer.brandName, { color: colors.footerStrong, fontWeight: 700 })}
      {footer.lines.map((text) => (
        <p
          key={text}
          style={textStyle({
            fontSize: px(sizes.small.fontSize),
            lineHeight: sizes.small.lineHeight,
            color: colors.footerText,
            paddingBottom: px(8),
          })}
        >
          {text}
        </p>
      ))}
      {line(
        <>
          <a href={`mailto:${footer.email}`} style={strongLink}>
            {footer.email}
          </a>
          {" · "}
          <a href={siteUrl} style={strongLink}>
            {footer.siteLabel}
          </a>
        </>,
        reason ? {} : { paddingBottom: 0 }
      )}
      {reason ? line(reason, { color: colors.footerMuted, paddingBottom: 0 }) : null}
    </>
  );
}

export function EmailLayout({
  preview,
  siteUrl,
  footer,
  eyebrow,
  signature,
  footerReason,
  children,
}: EmailLayoutProps) {
  const logoUrl = new URL(LOGO_PATH, siteUrl).toString();
  const padX = px(sizes.padX);
  return (
    <Html lang="ru" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: colors.bg }}>
        <table {...tableReset} width="100%" style={{ width: "100%", backgroundColor: colors.bg }}>
          <tbody>
            <tr>
              <td {...bgcolor(colors.bg)} align="center" style={{ padding: "40px 12px" }}>
                <table
                  {...tableReset}
                  width={sizes.container}
                  bgcolor={colors.card}
                  style={{
                    width: px(sizes.container),
                    maxWidth: px(sizes.container),
                    backgroundColor: colors.card,
                    borderRadius: px(8),
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: `28px ${padX}`,
                          borderBottom: `1px solid ${colors.line}`,
                        }}
                      >
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-skip-in-text="true"
                        >
                          <Img
                            src={logoUrl}
                            alt="Inex Glass"
                            width={sizes.logoWidth}
                            height={sizes.logoHeight}
                            style={{
                              display: "block",
                              width: px(sizes.logoWidth),
                              height: px(sizes.logoHeight),
                              border: 0,
                              outline: "none",
                              textDecoration: "none",
                            }}
                          />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: `36px ${padX} 8px` }}>
                        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                        {children}
                      </td>
                    </tr>
                    {signature ? (
                      <tr>
                        <td style={{ padding: `16px ${padX} 32px` }}>
                          <SignatureBlock signature={signature} />
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td
                        {...bgcolor(colors.footerBg)}
                        style={{
                          backgroundColor: colors.footerBg,
                          padding: `24px ${padX}`,
                          borderRadius: "0 0 8px 8px",
                        }}
                      >
                        <Footer
                          footer={footer}
                          siteUrl={siteUrl}
                          {...(footerReason ? { reason: footerReason } : {})}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
