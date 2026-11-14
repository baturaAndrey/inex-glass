import { transliterate } from "@/payload/fields/transliterate";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Article structure from the Lexical `body`: the H2 headings become the table of contents
 * («Содержание») and split the root into sections, so every H2 can be rendered with a stable
 * anchor (`<h2 id="pochemu-ono-rassypaetsya">`). Pure helpers (unit-tested).
 */

/** A serialized Lexical node, as much as these helpers need to know about it. */
export interface LexicalNodeLike {
  type?: unknown;
  tag?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

export interface TocItem {
  /** Anchor of the heading (`id` of the `<h2>`). */
  id: string;
  /** Plain text of the heading. */
  text: string;
}

export interface ArticleSection {
  /** `null` for the nodes before the first H2 (the intro). */
  heading: TocItem | null;
  /** Root nodes after the heading, up to the next H2. */
  nodes: LexicalNodeLike[];
}

/** Content chunk of a section: a run of ordinary nodes, or one table. */
export type ArticleChunk =
  { kind: "rich"; nodes: LexicalNodeLike[] } | { kind: "table"; node: LexicalNodeLike };

/** Anchor for headings without Latin/Cyrillic letters or digits (e.g. «—»). */
const FALLBACK_ANCHOR = "razdel";

const isNode = (value: unknown): value is LexicalNodeLike =>
  typeof value === "object" && value !== null;

/** Root children of a Lexical value (`{ root: { children } }`); `[]` for anything else. */
export function rootNodes(value: unknown): LexicalNodeLike[] {
  if (!isNode(value)) return [];
  const root = (value as { root?: unknown }).root;
  if (!isNode(root) || !Array.isArray(root.children)) return [];
  return root.children.filter(isNode);
}

export const isH2 = (node: LexicalNodeLike): boolean =>
  node.type === "heading" && node.tag === "h2";

export const isTable = (node: LexicalNodeLike): boolean => node.type === "table";

/**
 * Anchor from a heading text: transliterated, lower case, hyphens (`Почему оно рассыпается` →
 * `pochemu-ono-rassypaetsya`). `used` collects the anchors of the article: a repeated heading
 * gets `-2`, `-3`… The returned anchor is added to `used`.
 */
export function slugifyHeading(text: string, used: Set<string>): string {
  const base = transliterate(text) || FALLBACK_ANCHOR;
  let anchor = base;
  for (let suffix = 2; used.has(anchor); suffix += 1) anchor = `${base}-${suffix}`;
  used.add(anchor);
  return anchor;
}

/** Splits the root by H2: an intro section (heading `null`, only when non-empty), then one per H2. */
export function splitSections(value: unknown): ArticleSection[] {
  const used = new Set<string>();
  const sections: ArticleSection[] = [];
  let current: ArticleSection = { heading: null, nodes: [] };

  for (const node of rootNodes(value)) {
    if (isH2(node)) {
      if (current.heading !== null || current.nodes.length > 0) sections.push(current);
      const text = lexicalToPlainText({ root: node }).replace(/\s+/g, " ").trim();
      current = { heading: { id: slugifyHeading(text, used), text }, nodes: [] };
    } else {
      current.nodes.push(node);
    }
  }
  if (current.heading !== null || current.nodes.length > 0) sections.push(current);
  return sections;
}

/** Table of contents: the H2 headings with their anchors (same ids as `splitSections`). */
export function extractToc(value: unknown): TocItem[] {
  return splitSections(value)
    .map((section) => section.heading)
    .filter((heading): heading is TocItem => heading !== null);
}

/** Splits section nodes into rich-text runs and standalone tables (tables get their own view). */
export function splitChunks(nodes: readonly LexicalNodeLike[]): ArticleChunk[] {
  const chunks: ArticleChunk[] = [];
  let run: LexicalNodeLike[] = [];
  for (const node of nodes) {
    if (isTable(node)) {
      if (run.length > 0) chunks.push({ kind: "rich", nodes: run });
      run = [];
      chunks.push({ kind: "table", node });
    } else {
      run.push(node);
    }
  }
  if (run.length > 0) chunks.push({ kind: "rich", nodes: run });
  return chunks;
}

/** A Lexical value with the given root children (to render a slice of the body with `RichText`). */
export function lexicalFromNodes(nodes: readonly LexicalNodeLike[]): {
  root: Record<string, unknown>;
} {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [...nodes],
    },
  };
}
