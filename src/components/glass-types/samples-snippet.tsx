import type { FormParams } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * «Образцы и цветопроба» (`.ct-sample` of `Osvetl.dc.html`): a deep-teal plate with the shared
 * text of the `snippets` global and a white «Заказать образец» button opening the sample form.
 */

export const SAMPLES_TITLE = "Образцы и цветопроба";
export const SAMPLES_CTA_LABEL = "Заказать образец";

/** Light text on `primary-dark` (prototype `#DCE9E6`, ≈10:1 on #16403D). */
const PLATE_TEXT = "text-[#DCE9E6]";

export interface SamplesSnippetProps {
  /** Rich text of `snippets.items[key]`; `null` → the verbatim fallback of teksty/08. */
  content: RichTextData | null | undefined;
  title?: string | undefined;
  ctaLabel?: string | undefined;
  /** Parameters of the sample form: `label`, `source` (page slug), `vid` (glass kind). */
  formParams: FormParams;
  ctx: PlaceholderContext;
  /** `id` of the `<h2>` (the section is labelled by it). */
  headingId?: string | undefined;
  className?: string | undefined;
}

/**
 * teksty/08-vidy-stekla.md, «Общий блок „Образцы и цветопроба“» — used only when the snippet is
 * missing from the global, so the block never renders empty.
 */
function FallbackText() {
  return (
    <p className="m-0">
      Оттенок, матовость и цвет лучше согласовать до запуска партии. Пришлём образец или фото
      эталона под вашим освещением. Образцы — <strong>бесплатно</strong>, изготовление —{" "}
      <strong>около недели</strong>.
    </p>
  );
}

export function SamplesSnippet({
  content,
  title,
  ctaLabel,
  formParams,
  ctx,
  headingId,
  className,
}: SamplesSnippetProps) {
  const label = ctaLabel?.trim() || SAMPLES_CTA_LABEL;
  return (
    <div
      data-samples-snippet=""
      className={cn(
        "bg-primary-dark grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 rounded-xl p-8 text-white max-sm:grid-cols-1 max-sm:p-6",
        className
      )}
    >
      <div className="flex max-w-[760px] flex-col gap-2">
        <h2
          id={headingId}
          className="m-0 text-[28px] leading-[1.2] font-bold text-white max-sm:text-[24px]"
        >
          {title?.trim() || SAMPLES_TITLE}
        </h2>
        <div
          className={cn(
            PLATE_TEXT,
            "text-[17px] leading-[1.55] [&_a]:text-white [&_p]:m-0 [&_p]:max-w-none [&_p]:text-inherit [&_p]:[font:inherit] [&_strong]:text-white"
          )}
        >
          {content ? <RichText data={content} ctx={ctx} /> : <FallbackText />}
        </div>
      </div>
      <FormTrigger formKey="sample" params={{ ...formParams, label }} asChild>
        <Button
          variant="secondary"
          size="l"
          className="focus-visible:outline-(--ig-focus-outline-on-dark) max-sm:w-full"
        >
          {label}
        </Button>
      </FormTrigger>
    </div>
  );
}
