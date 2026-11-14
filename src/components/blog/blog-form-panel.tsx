import { DrawingPanel } from "@/components/forms/drawing-panel";
import type { FormParams } from "@/components/forms/form-dialog-provider";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getConditions } from "@/lib/cms/globals";
import { asideDescription } from "./article-cta-card";

/**
 * Drawing-form panel in the cream block that closes `/blog/` and every article (Paper mockups
 * `2560_blog` / `2560_blog_statya`, frame `drawing-form`). Heading = the article CTA of teksty/10
 * («[Отправить чертёж на проверку]»); sub = the aside-card line built from the `conditions`
 * global («КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².»).
 */

export const BLOG_FORM_HEADING = "Отправить чертёж на проверку";

/** Lead source of the listing's drawing form (hero button and panel). */
export const BLOG_FORM_SOURCE = "blog";

export interface BlogFormPanelProps {
  headingId: string;
  /** Lead params; the article page sends its own `source`. */
  params?: FormParams | undefined;
}

export async function BlogFormPanel({ headingId, params }: BlogFormPanelProps) {
  const conditions = await getConditions();
  return (
    <CreamBlock>
      <DrawingPanel
        heading={BLOG_FORM_HEADING}
        sub={asideDescription(conditions) || undefined}
        headingId={headingId}
        params={{ label: BLOG_FORM_HEADING, source: BLOG_FORM_SOURCE, ...params }}
        anchorId="form"
      />
    </CreamBlock>
  );
}
