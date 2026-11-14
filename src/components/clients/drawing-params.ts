import { toFormParams } from "@/components/blocks/cta-buttons";
import { fill } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import type { FormParams } from "@/components/forms/form-dialog-provider";
import type { PlaceholderContext } from "@/lib/domain";
import { CLIENTS_FORM_ANCHOR } from "./copy";

/**
 * Lead params of the drawing-form panel closing every «Клиентам» page: the page's `form` block
 * (`params`, `sourceLabel`), with the page and the panel anchor as the fallback source.
 */
export function drawingPanelParams(
  form: BlockOf<"form"> | null,
  path: string,
  ctx: PlaceholderContext
): FormParams {
  const fallbackSource = `${path}#${CLIENTS_FORM_ANCHOR}`;
  if (!form) return { source: fallbackSource };
  const params = toFormParams(form.params, fallbackSource);
  const label = fill(form.sourceLabel, ctx);
  return label ? { ...params, label } : params;
}
