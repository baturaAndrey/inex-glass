import { FormSection } from "@/components/forms/form-section";
import { toFormParams } from "./cta-buttons";
import { fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * `form` block: an inline site form (task 21). Maps the block fields onto `FormSection`
 * (`full` / `contacts` → the «Отправьте чертёж» section with the left column, other forms or the
 * `card` / `inline` variants → the form card). Placeholders in the texts are substituted.
 *
 * `params.source` defaults to the page path + `#anchorId`, so the manager sees which section of
 * which page the lead came from.
 */
export async function FormBlock({ block, ctx, section, page }: BlockProps<"form">) {
  const anchorId = hasText(block.anchorId) ? block.anchorId.trim() : undefined;
  const fallbackSource = page?.path ? `${page.path}${anchorId ? `#${anchorId}` : ""}` : undefined;
  const params = toFormParams(block.params, fallbackSource);
  const bullets = (block.bullets ?? []).map((item) => fill(item.text, ctx)).filter(hasText);
  const background = block.background && block.background !== "auto" ? block.background : undefined;

  return (
    <FormSection
      formKey={block.formKey}
      variant={block.variant ?? undefined}
      heading={fill(block.heading, ctx) || undefined}
      headingLevel={block.headingLevel ?? undefined}
      headingId={section.headingId}
      sub={fill(block.sub, ctx) || undefined}
      bullets={bullets.length > 0 ? bullets : undefined}
      showContacts={block.showContacts ?? undefined}
      submitLabel={fill(block.submitLabel, ctx) || undefined}
      fileLabel={fill(block.fileLabel, ctx) || undefined}
      sourceLabel={fill(block.sourceLabel, ctx) || undefined}
      params={params}
      anchorId={anchorId}
      background={background ?? (block.variant === "page" ? undefined : section.variant)}
    />
  );
}
