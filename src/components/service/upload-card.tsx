"use client";

import { FORM_REGISTRY } from "@/components/forms/registry";
import type { FormParams } from "@/components/forms/registry";

export const UPLOAD_CARD_ID = "dr-up";
const UPLOAD_CARD_HEADING = "Загрузите чертёж";

/** The page form never closes: there is no dialog around it. */
const noop = () => {};

const DrawingForm = FORM_REGISTRY.drawing;

/**
 * «Загрузите чертёж» card of the drawings page (`.dr-up` of `Drawings.dc.html`): grey panel with
 * the full drawing form (task 21, `variant="page"`: fields, file, consent, submit). It is the
 * target of the hero's «Загрузить чертёж» anchor, so it keeps clear of the sticky header.
 */
export function UploadCard({ params }: { params: FormParams }) {
  return (
    <section
      id={UPLOAD_CARD_ID}
      aria-labelledby={`${UPLOAD_CARD_ID}-title`}
      className="bg-bg flex scroll-mt-24 flex-col gap-4 rounded-xl p-7 max-sm:p-5"
    >
      <h3 id={`${UPLOAD_CARD_ID}-title`} className="m-0 text-2xl leading-[1.3] font-semibold">
        {UPLOAD_CARD_HEADING}
      </h3>
      <DrawingForm params={params} onClose={noop} variant="page" />
    </section>
  );
}
