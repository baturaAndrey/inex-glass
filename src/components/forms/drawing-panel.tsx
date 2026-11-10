import { getConditions } from "@/lib/cms/globals";
import { cn } from "@/lib/utils";
import type { Condition } from "@/payload-types";
import { FORM_TEXTS } from "./form-texts";
import { getServerFormsConfig } from "./forms-config-server";
import { InlineForm } from "./registry";
import type { FormParams } from "./form-dialog-provider";

/**
 * «Отправьте чертёж — посчитаем стоимость и срок» as the dark panel of the Paper mockups
 * `2560_zakalennoe-steklo` / `2560_zak_tolshchina_10mm` (frame `drawing-form`): heading and the
 * conditions line on the left, the full lead form (`full`: company, name, phone, e-mail, file,
 * city, area, comment) in a white card on the right. Same form and behaviour as `FormSection`;
 * only the frame differs. Stacks ≤1100 px.
 *
 * The conditions line is built from the `conditions` global (КП · minimum order · fixed price),
 * so it follows the CMS values.
 */

export interface DrawingPanelProps {
  /** Heading; the default is the heading of the site's full form section. */
  heading?: string | undefined;
  /**
   * Line under the heading; the default is built from the `conditions` global. `/kontakty/`
   * passes the teksty line of its form block.
   */
  sub?: string | undefined;
  /**
   * Form of the card: `full` (default) or `contacts` (`/kontakty/`: company, name, phone,
   * e-mail, file, comment — teksty/06).
   */
  formKey?: "full" | "contacts" | undefined;
  headingId: string;
  /** Lead params (`source`, `label` = CRM caption, …). */
  params: FormParams;
  /** In-page anchor of the panel (`form`). */
  anchorId?: string | undefined;
  className?: string | undefined;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** «КП в среднем за 2–3 рабочих дня · заказы от 50 м² · цена в договоре фиксируется». */
export function drawingPanelSubline(
  conditions: Pick<Condition, "kpText" | "minOrderText" | "priceFixedText"> | null
): string {
  if (!conditions) return "";
  const parts = [conditions.kpText, conditions.minOrderText, conditions.priceFixedText]
    .map((part) => part?.trim().replace(/[.]$/u, "") ?? "")
    .filter(Boolean);
  return parts.map((part, index) => (index === 0 ? part : lowerFirst(part))).join(" · ");
}

export async function DrawingPanel({
  heading,
  sub,
  formKey = "full",
  headingId,
  params,
  anchorId,
  className,
}: DrawingPanelProps) {
  const [config, conditions] = await Promise.all([getServerFormsConfig(), getConditions()]);
  const subline = sub?.trim() || drawingPanelSubline(conditions);

  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      className={cn(
        "bg-primary-dark grid scroll-mt-24 grid-cols-[minmax(0,480px)_minmax(0,1fr)] items-start gap-14 rounded-4xl p-14 max-lg:gap-10 max-lg:p-10 max-md:grid-cols-1 max-md:gap-8 max-sm:gap-6 max-sm:rounded-xl max-sm:p-5",
        className
      )}
      data-form-section={formKey}
      data-testid="drawing-panel"
    >
      <div className="flex flex-col gap-5 max-sm:gap-3">
        <h2 id={headingId} className="ig-h2 text-on-navy m-0 text-balance">
          {heading || FORM_TEXTS.section.fullHeading}
        </h2>
        {subline ? (
          <p className="text-on-navy-2 m-0 text-[17px] leading-[1.55] max-sm:text-base">
            {subline}
          </p>
        ) : null}
      </div>
      <div className="bg-surface text-text rounded-xl p-8 max-sm:p-5">
        <InlineForm
          formKey={formKey}
          params={params}
          config={{
            phone: config.phone,
            workHours: config.workHours,
            thankYouTitle: config.thankYouTitle,
            thankYouText: config.thankYouText,
            submitErrorText: config.submitErrorText,
          }}
        />
      </div>
    </section>
  );
}
