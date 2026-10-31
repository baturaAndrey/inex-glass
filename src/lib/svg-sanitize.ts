import { load } from "cheerio";

/**
 * The ONE allow-list sanitizer for editor-provided inline SVG schemes
 * (`constructions.systems[].schemeSvg`, `systems` block items).
 *
 * The markup is parsed as XML and RE-SERIALIZED from scratch: only allowed elements with their
 * allowed attributes and text nodes are emitted, every value is escaped. Everything else —
 * `<script>`, `<style>`, `<foreignObject>`, `<use>`, `<image>`, `<a>`, animation elements, CDATA,
 * comments, processing instructions, doctypes, unknown elements (with their whole subtree),
 * `on*` handlers, `href` / `xlink:href` — never reaches the output, so the result is safe for
 * `dangerouslySetInnerHTML`.
 *
 * `style` and `class` are NOT allowed: CSS has too many ways to fetch a resource (`u\72l(`,
 * `image-set()`, …) or escape the card (`position:fixed` overlaying the page), and `class` would
 * let editors apply arbitrary site utilities. Presentation attributes cover what schemes need.
 *
 * Accessibility of the root `<svg>`: a scheme that names itself (`role="img"` + non-empty
 * `aria-label`, e.g. the wide canopy schemes) keeps both; any other scheme is decorative next to
 * its text description and gets `aria-hidden="true"` + `focusable="false"`.
 * `decorative: true` forces the latter.
 *
 * Ids are namespaced: every `id` gets a per-scheme prefix and every local reference
 * (`url(#id)` — the only reference form that survives, `href` / `style` are dropped) is rewritten
 * to it. A scheme's `<linearGradient id="g">` can then collide neither with an element id of the
 * page nor with another scheme, and a reference to an id the scheme does not define cannot reach
 * into the page. The prefix is a hash of the input (deterministic: server and client render the
 * same markup) unless the caller passes `idPrefix`. Two identical schemes on one page share the
 * prefix — harmless, their definitions are identical too. Because of the prefix, sanitizing an
 * already sanitized scheme that has ids is not a no-op (the ids get a second prefix).
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

/** Geometric / presentation attributes (compared in lower case: XML keeps `viewBox` as is). */
const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "xmlns",
  "viewbox",
  "preserveaspectratio",
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
  "dx",
  "dy",
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
  "id",
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
]);

/** Root-only accessibility attributes; set by `rootAccessibility`, never copied from input. */
const A11Y_ATTRIBUTES: ReadonlySet<string> = new Set([
  "role",
  "aria-label",
  "aria-hidden",
  "focusable",
]);

/**
 * Presentation attributes are parsed as CSS values, so CSS escapes (`\75rl(`) would bypass any
 * keyword check: a backslash is never needed in a scheme and rejects the attribute outright.
 */
const CSS_ESCAPE = /\\/;
/** Resource-loading / scripting CSS functions and URL schemes. */
const DANGEROUS_VALUE =
  /(?:java|vb)script\s*:|data\s*:|expression\s*\(|@import|behavior\s*:|image-set\s*\(|image\s*\(|src\s*\(|cross-fade\s*\(|element\s*\(/i;
const ANY_URL = /url\s*\(/i;
/** The only `url()` form allowed: a whole-value same-document reference, `url(#grad)`. */
const LOCAL_REFERENCE = /^\s*url\(\s*(['"]?)#[\w.-]+\1\s*\)\s*$/i;
/** The `#id` part of a local reference (applied only to values that passed `isSafeValue`). */
const REFERENCE_TARGET = /(url\(\s*['"]?#)([\w.-]+)/gi;
/** A caller-supplied prefix must start like an XML name so the prefixed id stays valid. */
const VALID_ID_PREFIX = /^[A-Za-z][\w-]*$/;

/**
 * Structural view of the `domhandler` nodes cheerio builds (`domhandler` is not a direct
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

export interface SanitizeSvgOptions {
  /** Always hide the scheme from assistive technology (drops `role` / `aria-label`). */
  decorative?: boolean;
  /**
   * Namespace for the scheme's ids (`[A-Za-z][\w-]*`, e.g. `"sys-3-"`). Defaults to a hash of
   * the markup; an invalid value falls back to the default.
   */
  idPrefix?: string;
}

const escapeText = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttribute = (value: string): string => escapeText(value).replace(/"/g, "&quot;");

/** `true` when an attribute value is plain data: no escapes, no resource loading. */
function isSafeValue(value: string): boolean {
  if (CSS_ESCAPE.test(value) || DANGEROUS_VALUE.test(value)) return false;
  return !ANY_URL.test(value) || LOCAL_REFERENCE.test(value);
}

/** 32-bit FNV-1a of the input in base 36: short, stable, no crypto dependency in the bundle. */
function hashPrefix(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `svg${(hash >>> 0).toString(36)}-`;
}

/** Prefixes an `id` value, or the targets of the local references inside any other value. */
function namespaceValue(name: string, value: string, prefix: string): string {
  if (name.toLowerCase() === "id") return prefix + value;
  return value.replace(REFERENCE_TARGET, (_, head: string, id: string) => head + prefix + id);
}

function serializeAttributes(attribs: Record<string, string>, prefix: string): string {
  return Object.entries(attribs)
    .filter(([name, value]) => ALLOWED_ATTRIBUTES.has(name.toLowerCase()) && isSafeValue(value))
    .map(([name, value]) => ` ${name}="${escapeAttribute(namespaceValue(name, value, prefix))}"`)
    .join("");
}

function serialize(node: XmlNode, prefix: string, extraAttributes = ""): string {
  if (node.type === "text") return escapeText(node.data ?? "");
  if (node.type !== "tag" || !node.name || !ALLOWED_ELEMENTS.has(node.name.toLowerCase())) {
    return "";
  }
  const attributes = serializeAttributes(node.attribs ?? {}, prefix) + extraAttributes;
  const children = (node.children ?? []).map((child) => serialize(child, prefix)).join("");
  return children
    ? `<${node.name}${attributes}>${children}</${node.name}>`
    : `<${node.name}${attributes}/>`;
}

/** Accessibility attributes of the root `<svg>` (rule in the file header), serialized. */
function rootAccessibility(attribs: Record<string, string>, decorative: boolean): string {
  const lookup = (key: string): string =>
    Object.entries(attribs).find(([name]) => name.toLowerCase() === key)?.[1] ?? "";
  const label = lookup("aria-label").trim();
  const labelled = !decorative && lookup("role").trim() === "img" && label !== "";
  return labelled
    ? ` role="img" aria-label="${escapeAttribute(label)}"`
    : ' aria-hidden="true" focusable="false"';
}

/**
 * Sanitized SVG markup, or `""` when the input has no `<svg>` root element (empty input,
 * HTML, an SVG wrapped in another element, unparsable markup…).
 */
export function sanitizeSvg(
  markup: string | null | undefined,
  opts: SanitizeSvgOptions = {}
): string {
  if (!markup || markup.trim() === "") return "";
  let topLevel: XmlNode[];
  try {
    const $ = load(markup, { xml: true });
    topLevel = ($.root().get(0)?.children ?? []) as unknown as XmlNode[];
  } catch {
    return "";
  }
  // A leading `<?xml?>`, doctype or comment is skipped; the first element must be `<svg>`.
  const root = topLevel.find((node) => node.type === "tag");
  if (!root || root.name?.toLowerCase() !== "svg") return "";
  const attribs = Object.fromEntries(
    Object.entries(root.attribs ?? {}).filter(([name]) => !A11Y_ATTRIBUTES.has(name.toLowerCase()))
  );
  const prefix =
    opts.idPrefix && VALID_ID_PREFIX.test(opts.idPrefix) ? opts.idPrefix : hashPrefix(markup);
  return serialize(
    { ...root, attribs },
    prefix,
    rootAccessibility(root.attribs ?? {}, !!opts.decorative)
  );
}
