import type { ReactElement } from "react";
import { render } from "@react-email/components";

export type RenderedEmail = { html: string; text: string };

/**
 * Plain-text conversion tweaks (html-to-text, merged with React Email's defaults that skip images
 * and the hidden preview): keep headings in their original case and do not repeat a link's URL
 * when it equals the link text.
 */
const PLAIN_TEXT_OPTIONS = {
  selectors: [
    { selector: "h1", options: { uppercase: false } },
    { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
  ],
};

/**
 * HTML and plain-text versions of an e-mail. Both are sent (multipart/alternative): the text part
 * helps deliverability and is what some clients and screen readers show.
 */
export async function renderEmail(element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true, htmlToTextOptions: PLAIN_TEXT_OPTIONS }),
  ]);
  return { html, text: text.trim() };
}
