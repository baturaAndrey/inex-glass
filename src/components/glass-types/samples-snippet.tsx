import type { FormParams } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * «Образцы и цветопроба» (Paper mockup `2560_glass_matovoe`, section «samples»): a deep-teal
 * plate (`primary-dark`, 24 px radius) with the shared text of the `snippets` global and a white
 * pill «Заказать образец» opening the sample form. ≤1100 px the button goes under the text,
 * ≤599 px it spans the width.
 */

export const SAMPLES_TITLE = "Образцы и цветопроба";
export const SAMPLES_CTA_LABEL = "Заказать образец";

/** Light text on `primary-dark` (`on-navy-2` #C9D3DD, ≈8.8:1 on #16403D); bold parts white. */
const PLATE_TEXT = "text-on-navy-2";

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
        "bg-primary-dark grid grid-cols-[minmax(0,1fr)_auto] items-center gap-12 rounded-xl px-14 py-12 text-white",
        "max-md:grid-cols-1 max-md:items-start max-md:gap-6 max-md:px-8 max-md:py-10 max-sm:px-5 max-sm:py-8",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <h2 id={headingId} className="text-h3 m-0 font-bold text-white">
          {title?.trim() || SAMPLES_TITLE}
        </h2>
        <div
          className={cn(
            PLATE_TEXT,
            "text-lead max-w-[760px] [&_a]:text-white [&_p]:m-0 [&_p]:max-w-none [&_p]:text-inherit [&_p]:[font:inherit] [&_strong]:font-semibold [&_strong]:text-white"
          )}
        >
          {content ? <RichText data={content} ctx={ctx} /> : <FallbackText />}
        </div>
      </div>
      <FormTrigger formKey="sample" params={{ ...formParams, label }} asChild>
        <Button
          variant="secondary"
          size="l"
          className="text-primary-dark hover:text-primary-dark border-transparent focus-visible:outline-(--ig-focus-outline-on-dark) max-md:justify-self-start max-sm:w-full"
        >
          {label}
        </Button>
      </FormTrigger>
    </div>
  );
}
