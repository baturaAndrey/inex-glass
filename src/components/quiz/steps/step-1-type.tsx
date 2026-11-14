"use client";

import { RadioCardGroup } from "@/components/ig/radio-card";
import type { QuizTypeId } from "@/lib/domain";
import { STEP_TITLES, TYPE_OPTIONS } from "../options";
import { GroupError, QUIZ_CARD_GRID, StepTitle, type QuizStepProps } from "./parts";

const OPTIONS = TYPE_OPTIONS.map(({ value, title, Icon }) => ({
  value,
  title,
  icon: <Icon aria-hidden="true" />,
}));

/** Step 1 «Что нужно рассчитать?» — 11 product types (4 columns ≥1366, 2 on phones). */
export function Step1Type({ q, fieldId, titleId }: QuizStepProps) {
  const error = q.fieldErrors.type;
  const errorId = fieldId("type-error");

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[1]}</StepTitle>
      <div id={fieldId("type")} className="flex flex-col gap-2">
        <RadioCardGroup
          value={q.state.answers.type ?? null}
          onChange={(value) => {
            q.dispatch({ type: "setType", value: value as QuizTypeId });
            q.clearError("type");
          }}
          options={OPTIONS}
          aria-labelledby={titleId}
          aria-describedby={error ? errorId : undefined}
          columns={4}
          mobileColumns={2}
          className={QUIZ_CARD_GRID}
        />
        <GroupError id={errorId} message={error} />
      </div>
    </>
  );
}
