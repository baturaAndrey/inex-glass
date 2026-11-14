import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { RichText } from "@/components/rich-text/rich-text";
import { getSnippets } from "@/lib/cms/globals";
import { toFormParams } from "./cta-buttons";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * Reusable fragment from the `snippets` global, looked up by `snippetKey` («Образцы и
 * цветопроба», …): its rich text plus an optional form button. A missing key renders nothing.
 */
export async function SnippetBlock({ block, ctx, section }: BlockProps<"snippet">) {
  const snippets = await getSnippets();
  const snippet = snippets?.items?.find((item) => item.key === block.snippetKey);
  if (!snippet) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[blocks] snippet «${block.snippetKey}» not found in the snippets global`);
    }
    return null;
  }
  const title = fill(snippet.title, ctx);
  const ctaLabel = fill(snippet.ctaLabel, ctx);
  const formKey = snippet.ctaFormKey && snippet.ctaFormKey !== "none" ? snippet.ctaFormKey : null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="bg-surface shadow-card flex max-w-[1100px] flex-col gap-4 rounded-xl p-8 max-sm:p-5">
        {!block.heading && title ? <p className="ig-h4 m-0">{title}</p> : null}
        <RichText data={snippet.content} ctx={ctx} />
        {formKey && hasText(ctaLabel) ? (
          <div>
            <FormTrigger formKey={formKey} params={toFormParams(snippet.ctaFormParams)} asChild>
              <Button variant="secondary">{ctaLabel}</Button>
            </FormTrigger>
          </div>
        ) : null}
      </div>
    </BlockSection>
  );
}
