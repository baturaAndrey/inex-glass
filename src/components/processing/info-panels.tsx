import { FileCheck2, TriangleAlert } from "lucide-react";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * Info block of the «Обработка стекла» section (Paper mockups `2560_obrabotka-stekla`, «Как
 * считается цена» / «Перед отправкой чертежа», and `2560_service_*`, «how-to-order»): a cream
 * panel inside the 1920 px frame holding two or three light-teal panels side by side (two
 * stack ≤1100 px, three ≤1365 px).
 *
 * A panel is a heading plus CMS rich text. The rich text keeps its own structure, styled for the
 * panel: the first paragraph may read as the lead (24 px), `h3` are sub-headings, lists stay lists.
 * Quotes (`> …` in the editor) become the white note card with the document icon — the editor
 * marks a note by quoting it, no extra fields needed. Tables become the panel's own white card
 * (`PanelTable`, mockup `2560_service_otverstiya` «Допуски диаметра») instead of the site table.
 */

export interface InfoPanel {
  key: string;
  heading?: string | null | undefined;
  headingId: string;
  body: RichTextData | null | undefined;
  /** The first paragraph reads as the lead (24 px), as in the hub panels of the mockup. */
  lead?: boolean | undefined;
  /** `warning` adds the warning icon to the heading (service callouts). */
  tone?: "default" | "warning" | undefined;
}

export interface InfoPanelsProps {
  panels: readonly InfoPanel[];
  ctx: PlaceholderContext;
  /**
   * The block closes the page and touches the footer (hub): only the top corners are rounded.
   * Otherwise it sits between sections with all corners rounded.
   */
  attachedToFooter?: boolean | undefined;
}

type LexicalNode = { type?: unknown; children?: unknown; [key: string]: unknown };

/**
 * Cream background of the block: radial `#FFFAF1 → #FCF6EA` in the mockup; the centre is the
 * warning background lightened with the surface colour, so no colour outside the tokens.
 */
const CREAM =
  "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--ig-warning-bg),var(--ig-surface)_40%)_0%,var(--ig-warning-bg)_100%)]";

/** Panel typography over the `RichText` output (its classes are on the elements themselves). */
const BODY = cn(
  "flex flex-col gap-4",
  // Sub-headings («Отдельно считаются:»): 24 px bold, a bit of air above.
  "[&>h3]:text-h4 [&>h3]:mt-4 [&>h3]:font-bold [&>h4]:mt-4",
  "[&_li]:max-w-none",
  // Links (`.ig-link`, 16 px of its own) follow the size of the text they sit in.
  "[&_a]:text-[length:inherit] [&_a]:leading-[inherit]"
);

/** Lead: the first paragraph of the panel (`InfoPanel.lead`). */
const LEAD =
  "[&>p:first-child]:text-h4 [&>p:first-child]:max-w-none [&>p:first-child]:leading-normal [&>p:first-child]:font-normal";

/**
 * Two panels at 1920: fixed 730 px each, pushed to the edges of the block (mockup); narrower
 * screens split the width equally. Three panels share the width equally. A single panel keeps a
 * readable measure.
 */
const PANEL_WIDTH = {
  single: "max-w-[1100px]",
  pair: "md:max-w-[730px] md:even:justify-self-end",
  triple: "",
} as const;

type PanelWidth = keyof typeof PANEL_WIDTH;

const GRID: Readonly<Record<PanelWidth, string>> = {
  single: "grid-cols-1",
  pair: "grid-cols-2 max-md:grid-cols-1",
  triple: "grid-cols-3 max-lg:grid-cols-1",
};

const widthOf = (count: number): PanelWidth =>
  count >= 3 ? "triple" : count === 2 ? "pair" : "single";

const childrenOf = (node: unknown): LexicalNode[] => {
  const children = (node as { children?: unknown } | null)?.children;
  return Array.isArray(children) ? (children as LexicalNode[]) : [];
};

/** A run of ordinary rich-text nodes, or one table, in document order. */
type BodySegment =
  { kind: "text"; data: RichTextData } | { kind: "table"; node: LexicalNode; data: RichTextData };

/** Rich text with the given root children (same document, other content). */
const withChildren = (data: RichTextData, children: unknown[]): RichTextData => ({
  ...data,
  root: { ...(data.root as LexicalNode), children },
});

/**
 * Splits the rich text into body segments (text runs and tables, in order) and the note cards
 * (quotes, rendered at the bottom of the panel).
 */
function splitPanel(data: RichTextData | null | undefined): {
  segments: BodySegment[];
  notes: RichTextData[];
} {
  if (!data || typeof data.root !== "object" || data.root === null)
    return { segments: [], notes: [] };
  const segments: BodySegment[] = [];
  let run: LexicalNode[] = [];
  const flush = () => {
    if (run.length > 0) segments.push({ kind: "text", data: withChildren(data, run) });
    run = [];
  };
  const notes: RichTextData[] = [];
  for (const node of childrenOf(data.root)) {
    if (node.type === "quote") {
      // The quote's inline children as one paragraph (links and bold kept).
      notes.push(withChildren(data, [{ ...node, type: "paragraph" }]));
    } else if (node.type === "table") {
      flush();
      segments.push({ kind: "table", node, data });
    } else {
      run.push(node);
    }
  }
  flush();
  return { segments, notes };
}

/** Lexical `TableCellHeaderStates`: any non-zero state (row / column / both) is a header cell. */
const isHeaderCell = (cell: LexicalNode): boolean =>
  typeof cell.headerState === "number" && cell.headerState > 0;

/**
 * Cell paragraphs take the cell's typography: `.ig-body` sets the `font` shorthand (weight
 * and size), the colour and `text-wrap` (which beats an inherited `nowrap`), so all three are
 * reset to `inherit` as a whole.
 */
const CELL =
  "[&_p]:m-0 [&_p]:max-w-none [&_p]:[font:inherit] [&_p]:[color:inherit] [&_p]:[text-wrap:inherit]";

/**
 * A table inside a panel (mockup «Допуски диаметра»): a white card, caps column headers,
 * hairline rows; the first column is the label, the others are the values — right-aligned,
 * bold primary-dark (a value without digits, «по согласованию», is medium and a step smaller).
 * Below 1536 px three panels are narrow, so the 20 px text steps down to 16 px (14 px for a
 * text value on phones): a row stays on one line.
 * Panel tables are short (2–3 columns), so phones keep the same layout instead of the site
 * table's cards. A first row of header cells is the `<thead>`.
 */
function PanelTable({
  node,
  data,
  ctx,
}: {
  node: LexicalNode;
  data: RichTextData;
  ctx: PlaceholderContext;
}) {
  const rows = childrenOf(node).filter((row) => row.type === "tablerow");
  const [first, ...rest] = rows;
  if (!first) return null;
  const firstCells = childrenOf(first);
  const hasHeader = firstCells.length > 0 && firstCells.every(isHeaderCell);
  const bodyRows = hasHeader ? rest : rows;
  const align = (index: number) => (index === 0 ? "text-left" : "text-right");
  const cell = (tableCell: LexicalNode) => (
    <div className={CELL}>
      <RichText data={withChildren(data, childrenOf(tableCell))} ctx={ctx} disableContainer />
    </div>
  );

  return (
    <div className="bg-surface shadow-card rounded-lg px-6 py-2 max-sm:px-4">
      <table className="w-full border-collapse">
        {hasHeader ? (
          <thead>
            <tr className="border-hairline border-b">
              {firstCells.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    "text-small text-text-2 py-3 font-medium tracking-[0.04em] uppercase",
                    align(index)
                  )}
                >
                  {cell(header)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-hairline border-b last:border-b-0">
              {childrenOf(row).map((value, index) => {
                const numeric = /\d/.test(lexicalToPlainText({ root: value }));
                return index === 0 ? (
                  <th
                    key={index}
                    scope="row"
                    className="text-lead-l max-xl:text-body py-4 pr-4 text-left align-baseline font-normal text-balance"
                  >
                    {cell(value)}
                  </th>
                ) : (
                  <td
                    key={index}
                    className={cn(
                      // Values are short («±1,0 мм», «по согласованию»): never broken.
                      "text-primary-dark py-4 pl-4 align-baseline whitespace-nowrap tabular-nums",
                      align(index),
                      numeric
                        ? "text-price-m font-bold"
                        : "text-lead-l max-xl:text-body max-sm:text-small font-medium"
                    )}
                  >
                    {cell(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteCard({ data, ctx }: { data: RichTextData; ctx: PlaceholderContext }) {
  return (
    <div className="bg-surface shadow-card flex items-center gap-6 rounded-lg p-6 max-sm:gap-4 max-sm:p-4">
      <FileCheck2
        aria-hidden="true"
        strokeWidth={1.75}
        className="text-navy size-16 shrink-0 max-sm:size-10"
      />
      <div className="border-text text-h4 max-sm:text-body border-l pl-6 leading-normal font-normal max-sm:pl-4 [&_a]:text-[length:inherit] [&_a]:leading-[inherit] [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit]">
        <RichText data={data} ctx={ctx} />
      </div>
    </div>
  );
}

function Panel({
  panel,
  ctx,
  width,
}: {
  panel: InfoPanel;
  ctx: PlaceholderContext;
  width: PanelWidth;
}) {
  const { segments, notes } = splitPanel(panel.body);
  return (
    <div
      className={cn(
        "bg-primary-light border-warning-bg shadow-card flex w-full min-w-0 flex-col gap-6 rounded-4xl border p-8 max-sm:gap-4 max-sm:rounded-xl max-sm:p-5",
        PANEL_WIDTH[width]
      )}
      {...(panel.heading ? { role: "group", "aria-labelledby": panel.headingId } : {})}
    >
      {panel.heading ? (
        <h2 id={panel.headingId} className="ig-h2 m-0 flex items-start gap-3 text-balance">
          {panel.tone === "warning" ? (
            <TriangleAlert
              aria-hidden="true"
              strokeWidth={2}
              className="text-warning-text mt-[0.2em] size-8 shrink-0 max-sm:size-6"
            />
          ) : null}
          {panel.heading}
        </h2>
      ) : null}
      {segments.length > 0 ? (
        <div className={cn(BODY, panel.lead && LEAD)}>
          {segments.map((segment, index) =>
            segment.kind === "text" ? (
              <RichText key={index} data={segment.data} ctx={ctx} disableContainer />
            ) : (
              <PanelTable key={index} node={segment.node} data={segment.data} ctx={ctx} />
            )
          )}
        </div>
      ) : null}
      {notes.length > 0 ? (
        // The note cards close the panel even when the text above is short.
        <div className="mt-auto flex flex-col gap-4 pt-2">
          {notes.map((note, index) => (
            <NoteCard key={index} data={note} ctx={ctx} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function InfoPanels({ panels, ctx, attachedToFooter = false }: InfoPanelsProps) {
  if (panels.length === 0) return null;
  const width = widthOf(panels.length);
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-[1920px] p-(--ig-gutter) max-md:py-12 max-sm:py-8",
        CREAM,
        attachedToFooter ? "rounded-t-4xl max-sm:rounded-t-xl" : "rounded-4xl max-sm:rounded-xl"
      )}
      data-testid="processing-info"
    >
      <div className={cn("grid items-stretch gap-6", GRID[width])}>
        {panels.map((panel) => (
          <Panel key={panel.key} panel={panel} ctx={ctx} width={width} />
        ))}
      </div>
    </section>
  );
}
