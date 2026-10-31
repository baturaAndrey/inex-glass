import {
  convertMarkdownToLexical,
  editorConfigFactory,
  EXPERIMENTAL_TableFeature,
  HeadingFeature,
  LinkFeature,
} from "@payloadcms/richtext-lexical";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import type { RichTextBlock } from "@/payload-types";
import type { SanitizedServerEditorConfig } from "@payloadcms/richtext-lexical";
import type { Payload } from "payload";

/** Serialized Lexical state as stored in every `richText` field of the generated types. */
export type LexicalState = RichTextBlock["content"];

/**
 * Feature keys of the seed converter. It mirrors `src/payload/editor.ts` (same block-level
 * features, headings h2–h4, links to the same collections, tables) and additionally keeps `bold` and
 * `italic`: `teksty/` use **bold** / *italic*, and the site renderer outputs the text-format
 * bits even though editors have no toolbar buttons for them.
 */
const SEED_FEATURE_KEYS: ReadonlySet<string> = new Set([
  "paragraph",
  "unorderedList",
  "orderedList",
  "blockquote",
  "horizontalRule",
  "toolbarInline",
  "bold",
  "italic",
]);

const editorConfigCache = new WeakMap<Payload, Promise<SanitizedServerEditorConfig>>();

/**
 * Sanitized server editor config for `markdownToLexical`, built once per Payload instance.
 * Needs the sanitized Payload config, so it is only available inside `payload run` / a server.
 */
export function getEditorConfig(payload: Payload): Promise<SanitizedServerEditorConfig> {
  let cached = editorConfigCache.get(payload);
  if (!cached) {
    cached = editorConfigFactory.fromFeatures({
      config: payload.config,
      features: ({ defaultFeatures }) => [
        ...defaultFeatures.filter((feature) => SEED_FEATURE_KEYS.has(feature.key)),
        HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4"] }),
        LinkFeature({ enabledCollections: [...LINKABLE_COLLECTIONS] }),
        EXPERIMENTAL_TableFeature(),
      ],
    });
    editorConfigCache.set(payload, cached);
  }
  return cached;
}

/**
 * Markdown → Lexical with Payload's official converter. Supported: `##`/`###`/`####` headings,
 * paragraphs, **bold**, *italic*, bulleted and numbered lists, `> quotes`, `---`, links
 * `[text](/path/)` and GFM tables (`| a | b |`; a `|---|` line after the first row turns it into
 * the header row — `headerState: 1` on its cells).
 *
 * Text such as `{цена_10мм}` stays plain text — placeholders are resolved at render time.
 */
export function markdownToLexical(
  markdown: string,
  editorConfig: SanitizedServerEditorConfig
): LexicalState {
  const state = convertMarkdownToLexical({ editorConfig, markdown: markdown.trim() });
  trimTableCells(state.root);
  // The converter returns lexical's `SerializedEditorState`; the generated field type is the
  // same JSON with an index signature, which interfaces cannot satisfy structurally.
  return state as unknown as LexicalState;
}

type MutableNode = { type?: unknown; text?: unknown; children?: unknown };

const childNodes = (node: MutableNode): MutableNode[] =>
  Array.isArray(node.children) ? (node.children as MutableNode[]) : [];

/**
 * The table transformer keeps the padding of `| cell |` («␠Здание␠»). Trims the first and last
 * text node of every paragraph inside a table cell (in place); inner spacing is untouched.
 */
function trimTableCells(node: MutableNode, inCell = false): void {
  const isCell = inCell || node.type === "tablecell";
  if (isCell && node.type === "paragraph") {
    const texts = childNodes(node).filter((child) => typeof child.text === "string");
    const first = texts[0];
    const last = texts[texts.length - 1];
    if (first) first.text = (first.text as string).trimStart();
    if (last) last.text = (last.text as string).trimEnd();
    // A cell that starts with **bold** leaves an empty text node in front of it.
    node.children = childNodes(node).filter((child) => child.text !== "");
    return;
  }
  for (const child of childNodes(node)) trimTableCells(child, isCell);
}

/** `markdownToLexical` with the editor config resolved from the seed's Payload instance. */
export async function markdown(ctx: { payload: Payload }, md: string): Promise<LexicalState> {
  return markdownToLexical(md, await getEditorConfig(ctx.payload));
}

/** Text node with Lexical's format bit mask (1 = bold, 2 = italic). */
function textNode(text: string, format = 0) {
  return { type: "text", text, format, detail: 0, mode: "normal", style: "", version: 1 };
}

function paragraphNode(text: string) {
  return {
    type: "paragraph",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    textFormat: 0,
    textStyle: "",
    children: text === "" ? [] : [textNode(text)],
  };
}

/**
 * Plain paragraphs without the Payload config (usable anywhere, also in unit tests): one
 * Lexical paragraph per argument, text kept verbatim (no markdown parsing).
 */
export function paragraphs(...texts: string[]): LexicalState {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: texts.map(paragraphNode),
    },
  };
}
