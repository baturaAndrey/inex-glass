/**
 * Plain text from a Lexical rich-text value (`SerializedEditorState` or its `root` node).
 * Used for `readingTimeMinutes`, site search and FAQPage JSON-LD. Pure: no Payload imports.
 */

type LexicalNode = {
  type?: unknown;
  text?: unknown;
  children?: unknown;
};

/** Element nodes rendered as separate blocks: their text is separated by a line break. */
const BLOCK_NODE_TYPES: ReadonlySet<string> = new Set([
  "root",
  "paragraph",
  "heading",
  "quote",
  "list",
  "listitem",
  "table",
  "tablerow",
  "tablecell",
  "block",
  "horizontalrule",
]);

const isNode = (value: unknown): value is LexicalNode =>
  typeof value === "object" && value !== null;

function collect(node: LexicalNode, out: string[]): void {
  if (node.type === "linebreak") {
    out.push("\n");
    return;
  }
  if (node.type === "tab") {
    out.push(" ");
    return;
  }
  if (typeof node.text === "string") {
    out.push(node.text);
    return;
  }
  const isBlock = typeof node.type === "string" && BLOCK_NODE_TYPES.has(node.type);
  if (isBlock) out.push("\n");
  if (Array.isArray(node.children)) {
    for (const child of node.children) if (isNode(child)) collect(child, out);
  }
  if (isBlock) out.push("\n");
}

/**
 * Concatenates all text of a Lexical document. Block nodes (paragraphs, headings, list items…)
 * are separated by `\n`; runs of spaces are collapsed and blank lines removed.
 */
export function lexicalToPlainText(value: unknown): string {
  if (!isNode(value)) return "";
  const maybeRoot = (value as { root?: unknown }).root;
  const root = isNode(maybeRoot) ? maybeRoot : value;

  const parts: string[] = [];
  collect(root, parts);
  return parts
    .join("")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

/** Number of words in a plain text (letters/digits sequences, Cyrillic included). */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Reading speed used for `readingTimeMinutes`. */
export const WORDS_PER_MINUTE = 180;

/** Reading time in whole minutes (at least 1 for non-empty text). */
export function readingTimeMinutes(value: unknown, wordsPerMinute = WORDS_PER_MINUTE): number {
  const words = countWords(lexicalToPlainText(value));
  return words === 0 ? 0 : Math.ceil(words / wordsPerMinute);
}
