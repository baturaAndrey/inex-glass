import { toFormParams } from "@/components/blocks/cta-buttons";
import type { CtaButtonValue } from "@/components/blocks/cta-buttons";
import { fill } from "@/components/blocks/shared";
import type { BlockOf, LayoutBlock } from "@/components/blocks/types";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import type { FormParams } from "@/components/forms/form-dialog-provider";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import type { PlaceholderContext } from "@/lib/domain";
import { splitClosingBody, splitQuestion } from "@/lib/objects/closing";
import type { ClosingNode } from "@/lib/objects/closing";
import { OBJECTS_BASE_PATH } from "@/lib/objects/filters";
import type { Page } from "@/payload-types";

/**
 * Closing copy of the portfolio (CMS document `/obekty/`, its first `cta` block) arranged for the
 * Paper mockups `2560_obekty` / `2560_obekt`:
 * - the block's buttons («Отправить проект») go to the listing hero;
 * - the last paragraph of its body is the heading + sub of the drawing-form panel;
 * - the paragraphs before it («Среди объектов: …») fill the empty listing.
 * The object pages reuse the same panel, so both read one CMS text.
 */

export interface ObjectsClosing {
  /** The `cta` block it came from (excluded from the generic blocks of the listing). */
  block: BlockOf<"cta"> | null;
  /** Rich-text nodes before the CTA paragraph. */
  lead: ClosingNode[];
  /** Panel heading; `""` keeps the default heading of `DrawingPanel`. */
  heading: string;
  /** Panel sub; `""` keeps the conditions line of `DrawingPanel`. */
  sub: string;
  /** Buttons of the block (hero of the listing). */
  buttons: CtaButtonValue[];
  /** Lead params of the drawing form: the block's form button, else the listing path. */
  formParams: FormParams;
}

const isCta = (block: LayoutBlock): block is BlockOf<"cta"> => block.blockType === "cta";

/** The first form button that opens the drawing form (its `source` / `label` go to the lead). */
function drawingButton(buttons: readonly CtaButtonValue[]): CtaButtonValue | undefined {
  return buttons.find((button) => button.kind === "form" && button.formKey === "drawing");
}

export function objectsClosing(doc: Page | null, ctx: PlaceholderContext): ObjectsClosing {
  const block = (doc?.layout ?? []).find(isCta) ?? null;
  const parts = splitClosingBody(block?.body);
  const { heading, sub } = splitQuestion(fill(parts.cta, ctx));
  const buttons = block?.buttons ?? [];
  const button = drawingButton(buttons);
  return {
    block,
    lead: parts.lead,
    heading,
    sub,
    buttons,
    formParams: toFormParams(button?.formParams, OBJECTS_BASE_PATH),
  };
}

export interface ObjectsFormPanelProps {
  closing: ObjectsClosing;
  headingId: string;
  /** Overrides of the lead params (the object page sends `obekty-<slug>`). */
  params?: FormParams | undefined;
}

/** Drawing-form panel in the cream block that closes the listing and every object page. */
export function ObjectsFormPanel({ closing, headingId, params }: ObjectsFormPanelProps) {
  return (
    <CreamBlock>
      <DrawingPanel
        heading={closing.heading || undefined}
        sub={closing.sub || undefined}
        headingId={headingId}
        params={{ ...closing.formParams, ...params }}
        anchorId="form"
      />
    </CreamBlock>
  );
}
