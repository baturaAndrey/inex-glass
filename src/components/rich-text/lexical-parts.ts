import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { docToHref, type InternalDocRef } from "./internal-links";
import { safeExternalHref, type RichTextData } from "./rich-text";

/**
 * Pure helpers that cut a CMS rich-text value (Lexical state) into the parts a panel layout
 * shows separately, without changing the content: the leading heading (panel title), the first
 * list (one card per item) and a closing row of links («Документы →», «Как снять размеры
 * проёма · Требования к чертежам»). Every part is again a Lexical state (rendered by
 * `RichText`) or a plain link, so nothing is re-typed and the editor keeps one field.
 */

type LexicalNode = {
  type?: unknown;
  tag?: unknown;
  listType?: unknown;
  text?: unknown;
  fields?: unknown;
  children?: unknown;
  [key: string]: unknown;
};

/** A link cut off the end of the text. */
export interface PlainLink {
  label: string;
  href: string;
  /** Absolute http(s) URL: opens another site. */
  external: boolean;
}

const childrenOf = (node: LexicalNode | null | undefined): LexicalNode[] =>
  node && Array.isArray(node.children) ? (node.children as LexicalNode[]) : [];

function rootOf(data: RichTextData | null | undefined): LexicalNode | null {
  const root = data?.root;
  return typeof root === "object" && root !== null ? (root as LexicalNode) : null;
}

/** The same state with other top-level nodes; `null` when none are left. */
function withNodes(data: RichTextData, nodes: LexicalNode[]): RichTextData | null {
  if (nodes.length === 0) return null;
  return { ...data, root: { ...rootOf(data), children: nodes } };
}

/** A paragraph node holding the given inline nodes. */
function paragraph(children: LexicalNode[]): LexicalNode {
  return {
    type: "paragraph",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    children,
  };
}

const isBlank = (node: LexicalNode): boolean =>
  lexicalToPlainText({ root: { children: [node] } }).trim() === "";

/** Separator text between closing links: spaces, «·», «|», «,», «;». */
const SEPARATOR = /^[\s ·|,;]*$/u;

/** Href of a Lexical link node, resolved like the site renderer does; `null` if unusable. */
export function linkHref(node: LexicalNode): string | null {
  const fields = (node.fields ?? {}) as {
    linkType?: unknown;
    url?: unknown;
    doc?: InternalDocRef | null;
  };
  if (fields.linkType === "internal") return docToHref(fields.doc ?? null);
  return safeExternalHref(typeof fields.url === "string" ? fields.url : null);
}

/** Leading heading node → its plain text; the rest stays the body. */
export function splitLeadingHeading(data: RichTextData | null | undefined): {
  heading: string | null;
  body: RichTextData | null;
} {
  const nodes = childrenOf(rootOf(data));
  const [first, ...rest] = nodes;
  if (!data || !first || first.type !== "heading") {
    return { heading: null, body: data && nodes.length > 0 ? data : null };
  }
  const heading = lexicalToPlainText({ root: first }).replace(/\s+/g, " ").trim();
  return { heading: heading || null, body: withNodes(data, rest) };
}

/**
 * Links that close the text (the end of its last paragraph: only links and separators) → plain
 * links; the text before them stays the body. When any of them has no usable href (an
 * unpublished page), nothing is cut and the text is returned as is.
 */
export function splitTrailingLinks(data: RichTextData | null | undefined): {
  body: RichTextData | null;
  links: PlainLink[];
} {
  const nodes = childrenOf(rootOf(data)).filter((node) => !isBlank(node));
  if (!data || nodes.length === 0) return { body: null, links: [] };
  const last = nodes[nodes.length - 1]!;
  if (last.type !== "paragraph") return { body: withNodes(data, nodes), links: [] };

  const inline = childrenOf(last);
  const links: PlainLink[] = [];
  let cut = inline.length;
  for (let index = inline.length - 1; index >= 0; index--) {
    const node = inline[index]!;
    if (node.type === "link") {
      const href = linkHref(node);
      const label = lexicalToPlainText({ root: node }).replace(/\s+/g, " ").trim();
      if (!href || !label) return { body: withNodes(data, nodes), links: [] };
      links.unshift({ label, href, external: /^https?:\/\//i.test(href) });
      cut = index;
    } else if (node.type === "text" && typeof node.text === "string" && SEPARATOR.test(node.text)) {
      continue;
    } else {
      break;
    }
  }
  if (links.length === 0) return { body: withNodes(data, nodes), links: [] };

  const kept = inline.slice(0, cut);
  // The text before the links loses its trailing space («…с партией. [Документы]»).
  const tail = kept[kept.length - 1];
  if (tail?.type === "text" && typeof tail.text === "string") {
    const trimmed = tail.text.replace(/[\s ]+$/u, "");
    if (trimmed) kept[kept.length - 1] = { ...tail, text: trimmed };
    else kept.pop();
  }
  const rest = nodes.slice(0, -1);
  const lastParagraph = { ...last, children: kept };
  const body = isBlank(lastParagraph) ? rest : [...rest, lastParagraph];
  return { body: withNodes(data, body), links };
}

export interface SplitList {
  /** Nodes before the first list (the lead). */
  before: RichTextData | null;
  /** One state per list item (its inline content as a paragraph). */
  items: RichTextData[];
  /** `true` for a numbered list. */
  ordered: boolean;
  /** Nodes after the list. */
  after: RichTextData | null;
}

/** The first top-level list cut out: lead before it, one state per item, the rest after it. */
export function splitFirstList(data: RichTextData | null | undefined): SplitList {
  const nodes = childrenOf(rootOf(data)).filter((node) => !isBlank(node));
  const index = nodes.findIndex((node) => node.type === "list");
  if (!data || index === -1) {
    return {
      before: data ? withNodes(data, nodes) : null,
      items: [],
      ordered: false,
      after: null,
    };
  }
  const list = nodes[index]!;
  const items = childrenOf(list)
    .filter((item) => item.type === "listitem" && !isBlank(item))
    .map((item) => {
      // Inline children become one paragraph; a nested list stays a list after it.
      const inline = childrenOf(item).filter((child) => child.type !== "list");
      const nested = childrenOf(item).filter((child) => child.type === "list");
      return withNodes(data, [paragraph(inline), ...nested])!;
    });
  return {
    before: withNodes(data, nodes.slice(0, index)),
    items,
    ordered: list.listType === "number" || list.tag === "ol",
    after: withNodes(data, nodes.slice(index + 1)),
  };
}

/** `true` when the state is only one list (optionally after nothing): a list of steps / facts. */
export function isOnlyList(data: RichTextData | null | undefined): boolean {
  const { before, items, after } = splitFirstList(data);
  return items.length > 0 && before === null && after === null;
}
