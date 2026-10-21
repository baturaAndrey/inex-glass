"use client";

import { ChipGroup } from "@/components/ig/chip-group";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { RadioCardGroup } from "@/components/ig/radio-card";
import { Textarea } from "@/components/ig/textarea";
import { FILM_THICKNESSES, formatNumber, MAX_LONG_TEXT, NBSP } from "@/lib/domain";
import type { QuizKindId, TintColorId } from "@/lib/domain";
import { thicknessWeightLabel, triplexSummary } from "../derive";
import {
  BEND_RADIUS_LABEL,
  CUSTOM_NOTE_LABEL,
  CUSTOM_THICKNESS,
  CUSTOM_THICKNESS_SUB,
  CUSTOM_THICKNESS_TITLE,
  KIND_OPTIONS,
  mmLabel,
  RAL_LABEL,
  RAL_PLACEHOLDER,
  STEP_TITLES,
  THICKNESS_VALUES,
  TINT_OPTIONS,
  TRIPLEX_GLASS_VALUES,
  TRIPLEX_LABELS,
} from "../options";
import { QuizHint } from "../quiz-hint";
import { parseThicknessValue } from "../state";
import {
  GroupError,
  QUIZ_CARD_GRID,
  QuizGroup,
  StepSub,
  StepTitle,
  type QuizStepProps,
} from "./parts";

const THICKNESS_OPTIONS = [
  ...THICKNESS_VALUES.map((t) => ({
    value: String(t),
    title: mmLabel(t),
    sub: thicknessWeightLabel(t),
  })),
  { value: CUSTOM_THICKNESS, title: CUSTOM_THICKNESS_TITLE, sub: CUSTOM_THICKNESS_SUB },
];

const CUSTOM_ONLY_OPTION = [THICKNESS_OPTIONS[THICKNESS_OPTIONS.length - 1]!];

const GLASS_OPTIONS = TRIPLEX_GLASS_VALUES.map((t) => ({ value: String(t), label: mmLabel(t) }));

/** Field width of the RAL / radius inputs (prototype `max-width: 320px`). */
const NARROW = "max-w-[320px]";

/** Step 2 «Какое стекло?»: thickness (or the triplex constructor) and the kind of glass. */
export function Step2Glass({ q, fieldId, titleId }: QuizStepProps) {
  const { answers, raw } = q.state;
  const errors = q.fieldErrors;
  const isTriplex = answers.type === "triplex";
  const isCustom = answers.thickness === CUSTOM_THICKNESS;
  const hints = q.derived.hintsByStep[2];
  const paintedHint = hints.find((hint) => hint.id === "painted");
  const bentHint = hints.find((hint) => hint.id === "bent");
  const thicknessLabelId = fieldId("thickness-label");
  const kindLabelId = fieldId("kind-label");

  const filmOptions = q.config.films
    .filter((film) => (FILM_THICKNESSES as readonly number[]).includes(film))
    .map((film) => ({ value: String(film), label: `${formatNumber(film)}${NBSP}мм` }));
  const summary = isTriplex ? triplexSummary(answers.triplex) : null;

  function setThickness(value: string) {
    const parsed = parseThicknessValue(value);
    // In the triplex constructor the single card works as a toggle.
    const next = isTriplex && parsed === CUSTOM_THICKNESS && isCustom ? undefined : parsed;
    q.dispatch({ type: "setThickness", value: next });
    q.clearError("thickness");
  }

  function setLayer(layer: "glass1" | "glass2" | "film", value: string | null) {
    q.dispatch({ type: "setTriplex", layer, value: value === null ? undefined : Number(value) });
    q.clearError("triplex");
  }

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[2]}</StepTitle>

      <StepSub id={thicknessLabelId}>Толщина</StepSub>
      {isTriplex ? (
        <div id={fieldId("triplex")} className="flex flex-col gap-4">
          <QuizGroup labelId={fieldId("glass1-label")} label={TRIPLEX_LABELS.glass1}>
            <ChipGroup
              mode="single"
              options={GLASS_OPTIONS}
              value={answers.triplex?.glass1 !== undefined ? String(answers.triplex.glass1) : null}
              onChange={(value) => setLayer("glass1", value)}
              aria-labelledby={fieldId("glass1-label")}
            />
          </QuizGroup>
          <QuizGroup labelId={fieldId("glass2-label")} label={TRIPLEX_LABELS.glass2}>
            <ChipGroup
              mode="single"
              options={GLASS_OPTIONS}
              value={answers.triplex?.glass2 !== undefined ? String(answers.triplex.glass2) : null}
              onChange={(value) => setLayer("glass2", value)}
              aria-labelledby={fieldId("glass2-label")}
            />
          </QuizGroup>
          <QuizGroup labelId={fieldId("film-label")} label={TRIPLEX_LABELS.film}>
            <ChipGroup
              mode="single"
              options={filmOptions}
              value={answers.triplex?.film !== undefined ? String(answers.triplex.film) : null}
              onChange={(value) => setLayer("film", value)}
              aria-labelledby={fieldId("film-label")}
            />
          </QuizGroup>
          {summary ? (
            <p className="text-small text-text m-0 font-medium" data-slot="quiz-triplex-summary">
              {summary}
            </p>
          ) : null}
          <GroupError id={fieldId("triplex-error")} message={errors.triplex} />
          <div id={fieldId("thickness")}>
            <RadioCardGroup
              value={isCustom ? CUSTOM_THICKNESS : null}
              onChange={setThickness}
              options={CUSTOM_ONLY_OPTION}
              aria-labelledby={thicknessLabelId}
              columns={2}
              mobileColumns={1}
              className={QUIZ_CARD_GRID}
            />
          </div>
        </div>
      ) : (
        <div id={fieldId("thickness")} className="flex flex-col gap-2">
          <RadioCardGroup
            value={answers.thickness !== undefined ? String(answers.thickness) : null}
            onChange={setThickness}
            options={THICKNESS_OPTIONS}
            aria-labelledby={thicknessLabelId}
            aria-describedby={errors.thickness ? fieldId("thickness-error") : undefined}
            columns={4}
            mobileColumns={2}
            className={`${QUIZ_CARD_GRID} lg:grid-cols-5`}
          />
          <GroupError id={fieldId("thickness-error")} message={errors.thickness} />
        </div>
      )}
      {isCustom ? (
        <Field label={CUSTOM_NOTE_LABEL} htmlFor={fieldId("customNote")} error={errors.customNote}>
          <Textarea
            value={answers.customNote ?? ""}
            maxLength={MAX_LONG_TEXT}
            onChange={(event) => {
              q.dispatch({ type: "patch", patch: { customNote: event.target.value } });
              q.clearError("customNote");
            }}
          />
        </Field>
      ) : null}

      <StepSub id={kindLabelId}>Вид</StepSub>
      <div id={fieldId("kind")} className="flex flex-col gap-2">
        <ChipGroup
          mode="single"
          options={KIND_OPTIONS}
          value={answers.kind ?? null}
          onChange={(value) => {
            q.dispatch({ type: "setKind", value: (value ?? undefined) as QuizKindId | undefined });
            q.clearError("kind");
          }}
          aria-labelledby={kindLabelId}
          aria-describedby={errors.kind ? fieldId("kind-error") : undefined}
        />
        <GroupError id={fieldId("kind-error")} message={errors.kind} />
      </div>

      {answers.kind === "tinted" ? (
        <QuizGroup labelId={fieldId("tint-label")} label="Оттенок">
          <ChipGroup
            mode="single"
            allowClear
            options={TINT_OPTIONS}
            value={answers.tint ?? null}
            onChange={(value) =>
              q.dispatch({
                type: "patch",
                patch: { tint: (value ?? undefined) as TintColorId | undefined },
              })
            }
            aria-labelledby={fieldId("tint-label")}
          />
        </QuizGroup>
      ) : null}

      {answers.kind === "painted" ? (
        <div className="flex flex-col gap-2.5">
          {paintedHint ? <QuizHint variant="info">{paintedHint.text}</QuizHint> : null}
          <Field label={RAL_LABEL} htmlFor={fieldId("ral")} error={errors.ral} className={NARROW}>
            <Input
              value={answers.ral ?? ""}
              placeholder={RAL_PLACEHOLDER}
              maxLength={50}
              onChange={(event) => {
                q.dispatch({ type: "patch", patch: { ral: event.target.value } });
                q.clearError("ral");
              }}
            />
          </Field>
        </div>
      ) : null}

      {answers.kind === "bent" ? (
        <div className="flex flex-col gap-2.5">
          <Field label={BEND_RADIUS_LABEL} htmlFor={fieldId("bendRadius")} className={NARROW}>
            <Input
              inputMode="decimal"
              value={raw.bendRadius}
              onChange={(event) =>
                q.dispatch({ type: "setRaw", key: "bendRadius", value: event.target.value })
              }
            />
          </Field>
          {bentHint ? <QuizHint variant="info">{bentHint.text}</QuizHint> : null}
        </div>
      ) : null}
    </>
  );
}
