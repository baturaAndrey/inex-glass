import { FileText } from "lucide-react";
import { fill, hasText } from "@/components/blocks/shared";
import type { FormParams } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { Section } from "@/components/ig/section";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import type { Construction } from "@/payload-types";

type SnowCalcBlock = NonNullable<Construction["snowCalcBlock"]>;

export const SNOW_CALC_DEFAULT_CTA = "Отправить проект на расчёт";

/**
 * Form parameters of the CTA: `{ label, source, title }` by default; a JSON object stored in
 * `formParams` overrides individual keys. Non-object JSON (string, array…) is ignored.
 */
export function snowCalcFormParams(
  formParams: SnowCalcBlock["formParams"],
  label: string,
  source: string
): FormParams {
  const custom =
    typeof formParams === "object" && formParams !== null && !Array.isArray(formParams)
      ? (formParams as Record<string, unknown>)
      : {};
  return { label, source, title: label, ...custom };
}

/**
 * «Расчёт под снег» (`.p5-snow`, deep-teal `primary-dark` section): a call to send the project
 * to an Inex Glass engineer — a CTA for a design job, not a calculator.
 */
export function SnowCalcSection({
  block,
  ctx,
  source,
}: {
  block: SnowCalcBlock;
  ctx: PlaceholderContext;
  /** Document slug: the lead source. */
  source: string;
}) {
  const title = fill(block.title, ctx);
  const sideText = fill(block.sideText, ctx);
  const ctaLabel = fill(block.ctaLabel, ctx) || SNOW_CALC_DEFAULT_CTA;
  const headingId = "construction-snow-title";
  return (
    <Section
      variant="primary-dark"
      aria-labelledby={title ? headingId : undefined}
      data-section="snow-calc"
    >
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-12 max-md:grid-cols-1 max-md:gap-6">
        <div className="flex flex-col gap-5">
          {title ? (
            <h2 id={headingId} className="ig-h2 m-0 text-white">
              {title}
            </h2>
          ) : null}
          <RichText
            data={block.body}
            ctx={ctx}
            className="text-[#D7E6E3] [&_a]:text-white [&_a:hover]:text-white [&_li]:text-[#D7E6E3] [&_p]:max-w-none [&_p]:text-[18px] [&_p]:leading-[1.6] [&_p]:text-[#D7E6E3] max-sm:[&_p]:text-[16px] [&_strong]:text-white"
          />
        </div>
        <div className="flex flex-col gap-[18px] rounded-[20px] border border-white/18 bg-white/8 p-7 max-sm:p-5">
          {hasText(sideText) ? (
            <p className="m-0 text-[18px] leading-[1.6] text-[#D7E6E3] max-sm:text-[16px]">
              {sideText}
            </p>
          ) : null}
          <FormTrigger
            formKey="drawing"
            params={snowCalcFormParams(block.formParams, ctaLabel, source)}
            asChild
          >
            <Button
              variant="onDark"
              size="l"
              className="self-start max-sm:w-full max-sm:self-stretch"
              leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
            >
              {ctaLabel}
            </Button>
          </FormTrigger>
        </div>
      </div>
    </Section>
  );
}
