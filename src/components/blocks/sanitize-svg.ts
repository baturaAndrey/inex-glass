import { load } from "cheerio";

/**
 * Allowlist sanitizer for editor-provided inline SVG schemes (`systems[].schemeSvg`).
 * Only drawing elements and presentation attributes survive: no scripts, event handlers,
 * links, external references (`href`, `url(…)`), `foreignObject` or `<style>`.
 */

const ALLOWED_ELEMENTS: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "marker",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "pattern",
]);

const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "fill",
  "fill-opacity",
  "fill-rule",
  "clip-rule",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-miterlimit",
  "opacity",
  "transform",
  "font-size",
  "font-weight",
  "font-family",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "dx",
  "dy",
  "id",
  "class",
  "offset",
  "stop-color",
  "stop-opacity",
  "markerwidth",
  "markerheight",
  "refx",
  "refy",
  "orient",
  "markerunits",
  "marker-start",
  "marker-mid",
  "marker-end",
  "clip-path",
  "mask",
  "gradientunits",
  "gradienttransform",
  "patternunits",
  "preserveaspectratio",
  "xmlns",
  "role",
  "aria-hidden",
  "aria-label",
  "focusable",
]);

/** Only same-document references are allowed inside attribute values: `url(#id)`. */
const EXTERNAL_URL = /url\s*\(\s*(?!['"]?#)/i;
const SCRIPT_URL = /(?:java|vb)script:|data:|expression\s*\(/i;

/**
 * Minimal structural view of the `domhandler` nodes cheerio builds (the package is not a direct
 * dependency, so its types are not imported). Node types other than `tag` and `text` —
 * `cdata`, `comment`, `directive` (`<?…?>`, `<!DOCTYPE>`), `script`, `style` — are dropped.
 */
interface XmlNode {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: XmlNode[];
}

const escapeText = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttribute = (value: string): string => escapeText(value).replace(/"/g, "&quot;");

function isAllowedAttribute(name: string, value: string): boolean {
  return (
    ALLOWED_ATTRIBUTES.has(name.toLowerCase()) &&
    !EXTERNAL_URL.test(value) &&
    !SCRIPT_URL.test(value)
  );
}

/**
 * Re-serializes the tree from scratch instead of trusting the parser's own output: only allowed
 * elements (with their allowed attributes) and text nodes are emitted, and every text / attribute
 * value is escaped. Anything else (CDATA, comments, processing instructions, unknown elements
 * with their whole subtree) never reaches the output, so markup hidden in e.g. a CDATA section
 * cannot be re-parsed as HTML by `dangerouslySetInnerHTML`.
 */
function serialize(node: XmlNode, rootOverrides?: Record<string, string>): string {
  if (node.type === "text") return escapeText(node.data ?? "");
  if (node.type !== "tag" || !node.name || !ALLOWED_ELEMENTS.has(node.name.toLowerCase())) {
    return "";
  }
  const attribs = { ...node.attribs, ...rootOverrides };
  const attributes = Object.entries(attribs)
    .filter(([name, value]) => isAllowedAttribute(name, value))
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
  const children = (node.children ?? []).map((child) => serialize(child)).join("");
  return children
    ? `<${node.name}${attributes}>${children}</${node.name}>`
    : `<${node.name}${attributes}/>`;
}

/** Sanitized SVG markup, or `null` when the input is not an `<svg>` document. */
export function sanitizeSvg(input: string | null | undefined): string | null {
  if (!input || !input.trim()) return null;
  const $ = load(input, { xml: true });
  const topLevel = ($.root().get(0)?.children ?? []) as unknown as XmlNode[];
  // The first element is the document root; a leading `<?xml?>`, doctype or comment is skipped.
  const root = topLevel.find((node) => node.type === "tag");
  if (!root || root.name?.toLowerCase() !== "svg") return null;
  // Decorative scheme next to a text description: hidden from assistive technology.
  return serialize(root, { "aria-hidden": "true", focusable: "false" });
}
