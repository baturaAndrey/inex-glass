import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Closing copy of the portfolio listing (pure, no Next / Payload imports).
 *
 * The CMS document `/obekty/` ends with a `cta` block whose body holds two paragraphs (teksty
 * §5): «**Среди объектов:** …» and «Ищете решение для похожего объекта? Пришлите проект —
 * подберём стекло и узлы.». The Paper mockups `2560_obekty` / `2560_obekt` place them apart: the
 * last paragraph becomes the heading + sub of the drawing-form panel, the paragraphs before it
 * stay rich text (shown in place of the grid while no object is published). The split never
 * rewrites the copy: joined back, heading and sub give the paragraph verbatim.
 */

/** Minimal Lexical node: what the split reads. */
export interface ClosingNode {
  type?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

export interface ClosingParts {
  /** Root children before the CTA paragraph («Среди объектов: …»), as stored. */
  lead: ClosingNode[];
  /** Plain text of the last paragraph (the CTA), trimmed; `""` without one. */
  cta: string;
}

const isNode = (value: unknown): value is ClosingNode =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Root children of a Lexical value (`{ root: { children } }`), `[]` for anything else. */
function rootChildren(value: unknown): ClosingNode[] {
  if (!isNode(value)) return [];
  const root = value.root;
  if (!isNode(root) || !Array.isArray(root.children)) return [];
  return root.children.filter(isNode);
}

const hasText = (node: ClosingNode) => lexicalToPlainText(node).trim() !== "";

/**
 * Splits the `cta` body: the LAST non-empty paragraph is the CTA text, every non-empty node
 * before it is the lead. A body without paragraphs keeps everything in `lead`.
 */
export function splitClosingBody(body: unknown): ClosingParts {
  const nodes = rootChildren(body).filter(hasText);
  let index = -1;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i]?.type === "paragraph") {
      index = i;
      break;
    }
  }
  if (index === -1) return { lead: nodes, cta: "" };
  const cta = nodes[index];
  return {
    lead: [...nodes.slice(0, index), ...nodes.slice(index + 1)],
    cta: cta ? lexicalToPlainText(cta).replace(/\s+/g, " ").trim() : "",
  };
}

export interface ClosingHeading {
  /** First sentence when it is a question («Ищете решение для похожего объекта?»). */
  heading: string;
  /** The rest of the text («Пришлите проект — подберём стекло и узлы.»). */
  sub: string;
}

/**
 * «Вопрос? Остальное.» → heading = the question, sub = the rest. Without a question followed by
 * more text the whole text is the sub and the heading is empty (the caller keeps its default).
 */
export function splitQuestion(text: string): ClosingHeading {
  const clean = text.replace(/\s+/g, " ").trim();
  const match = /^([^?]+\?)\s+(\S.*)$/u.exec(clean);
  if (!match?.[1] || !match[2]) return { heading: "", sub: clean };
  return { heading: match[1].trim(), sub: match[2].trim() };
}
