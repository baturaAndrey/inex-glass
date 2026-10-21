"use client";

import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { STEP_TITLES } from "../options";
import { QuizEstimate } from "../quiz-estimate";
import { QuizHints } from "../quiz-hint";
import { FieldGrid, QuizGroup, StepSub, StepTitle, type QuizStepProps } from "./parts";
import type { QuizRawKey } from "../types";

/**
 * Step 3 «Объём и размеры»: positions, total area, the largest glass. Hints (small volume,
 * promo, non-standard size) and the price estimate come from the domain.
 */
export function Step3Volume({ q, fieldId, titleId }: QuizStepProps) {
  const { raw } = q.state;
  const { estimate, priceState } = q.derived;
  const set = (key: QuizRawKey) => (event: { target: { value: string } }) =>
    q.dispatch({ type: "setRaw", key, value: event.target.value });

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[3]}</StepTitle>
      <StepSub>Сколько позиций и какая общая площадь?</StepSub>
      <FieldGrid>
        <Field label="Позиций" htmlFor={fieldId("positions")}>
          <Input inputMode="numeric" value={raw.positions} onChange={set("positions")} />
        </Field>
        <Field label="Площадь, м²" htmlFor={fieldId("area")}>
          <Input inputMode="decimal" value={raw.area} onChange={set("area")} />
        </Field>
      </FieldGrid>

      <QuizGroup labelId={fieldId("size-label")} label="Самое большое стекло">
        <div
          className="flex items-center gap-2.5"
          role="group"
          aria-labelledby={fieldId("size-label")}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Ширина, мм</span>
            <Input
              inputMode="decimal"
              placeholder="ширина"
              value={raw.maxW}
              onChange={set("maxW")}
            />
          </label>
          <span className="text-text-2" aria-hidden="true">
            ×
          </span>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Высота, мм</span>
            <Input
              inputMode="decimal"
              placeholder="высота"
              value={raw.maxH}
              onChange={set("maxH")}
            />
          </label>
          <span className="text-text-2" aria-hidden="true">
            мм
          </span>
        </div>
      </QuizGroup>

      <QuizHints hints={q.derived.hintsByStep[3]} />
      <div data-price-state={priceState ?? "none"} className="contents">
        {estimate ? <QuizEstimate estimate={estimate} /> : null}
      </div>
    </>
  );
}
