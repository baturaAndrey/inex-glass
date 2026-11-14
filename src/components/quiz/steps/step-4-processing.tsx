"use client";

import { ChipGroup } from "@/components/ig/chip-group";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { MAX_LONG_TEXT } from "@/lib/domain";
import type { QuizDecorId, QuizEdgeId, QuizStampId } from "@/lib/domain";
import {
  DECOR_OPTIONS,
  edgeOptions,
  fromYesNo,
  HOLES_OPTIONS,
  STAMP_NOTE_LABEL,
  STAMP_OPTIONS,
  STEP_TITLES,
  toYesNo,
  YES_NO_OPTIONS,
} from "../options";
import { QuizHints } from "../quiz-hint";
import { FieldGrid, QuizGroup, StepTitle, type QuizStepProps } from "./parts";

/**
 * Step 4 «Обработка»: edges (facet only for mirrors, «не знаю» exclusive), holes with the
 * GOST hint, inner hole edge, cut-outs, decor and the stamp. Heat Soak Test is not offered.
 */
export function Step4Processing({ q, fieldId, titleId }: QuizStepProps) {
  const { answers, raw } = q.state;
  const hints = q.derived.hintsByStep[4];
  const holeHints = hints.filter((hint) => hint.id === "holes" || hint.id === "hole_diameter");
  const decorHints = hints.filter((hint) => hint.id === "print");
  const ids = {
    edges: fieldId("edges-label"),
    holes: fieldId("holes-label"),
    inner: fieldId("inner-label"),
    cutouts: fieldId("cutouts-label"),
    decor: fieldId("decor-label"),
    stamp: fieldId("stamp-label"),
  };

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[4]}</StepTitle>

      <QuizGroup labelId={ids.edges} label="Кромка">
        <ChipGroup
          mode="multiple"
          options={edgeOptions(answers.type)}
          value={answers.edges ?? []}
          onChange={(value) => q.dispatch({ type: "setEdges", value: value as QuizEdgeId[] })}
          aria-labelledby={ids.edges}
        />
      </QuizGroup>

      <QuizGroup labelId={ids.holes} label="Отверстия">
        <ChipGroup
          mode="single"
          allowClear
          options={HOLES_OPTIONS}
          value={toYesNo(answers.holes?.has)}
          onChange={(value) => q.dispatch({ type: "setHoles", has: fromYesNo(value) })}
          aria-labelledby={ids.holes}
        />
        {answers.holes?.has ? (
          <>
            <FieldGrid>
              <Field label="Количество" htmlFor={fieldId("holeCount")}>
                <Input
                  inputMode="numeric"
                  value={raw.holeCount}
                  onChange={(event) =>
                    q.dispatch({ type: "setRaw", key: "holeCount", value: event.target.value })
                  }
                />
              </Field>
              <Field label="Диаметры, мм" htmlFor={fieldId("holeDiam")}>
                <Input
                  inputMode="decimal"
                  placeholder="Например, 12, 16"
                  value={raw.holeDiam}
                  onChange={(event) =>
                    q.dispatch({ type: "setRaw", key: "holeDiam", value: event.target.value })
                  }
                />
              </Field>
            </FieldGrid>
            <QuizHints hints={holeHints} />
          </>
        ) : null}
      </QuizGroup>

      <FieldGrid>
        <QuizGroup
          labelId={ids.inner}
          label="Обработать кромку отверстий изнутри (для металлического крепежа)"
        >
          <ChipGroup
            mode="single"
            allowClear
            options={YES_NO_OPTIONS}
            value={toYesNo(answers.holeInnerEdge)}
            onChange={(value) =>
              q.dispatch({ type: "patch", patch: { holeInnerEdge: fromYesNo(value) } })
            }
            aria-labelledby={ids.inner}
          />
        </QuizGroup>
        <QuizGroup labelId={ids.cutouts} label="Вырезы, пазы, фрезерование">
          <ChipGroup
            mode="single"
            allowClear
            options={YES_NO_OPTIONS}
            value={toYesNo(answers.cutouts)}
            onChange={(value) =>
              q.dispatch({ type: "patch", patch: { cutouts: fromYesNo(value) } })
            }
            aria-labelledby={ids.cutouts}
          />
        </QuizGroup>
      </FieldGrid>

      <QuizGroup labelId={ids.decor} label="Декор">
        <ChipGroup
          mode="multiple"
          options={DECOR_OPTIONS}
          value={answers.decor ?? []}
          onChange={(value) =>
            q.dispatch({ type: "patch", patch: { decor: value as QuizDecorId[] } })
          }
          aria-labelledby={ids.decor}
        />
        <QuizHints hints={decorHints} />
      </QuizGroup>

      <QuizGroup labelId={ids.stamp} label="Клеймо">
        <ChipGroup
          mode="single"
          allowClear
          options={STAMP_OPTIONS}
          value={answers.stamp ?? null}
          onChange={(value) =>
            q.dispatch({
              type: "patch",
              patch: { stamp: (value ?? undefined) as QuizStampId | undefined },
            })
          }
          aria-labelledby={ids.stamp}
        />
        {answers.stamp === "custom" ? (
          <Field label={STAMP_NOTE_LABEL} htmlFor={fieldId("stampNote")}>
            <Input
              value={answers.stampNote ?? ""}
              maxLength={MAX_LONG_TEXT}
              onChange={(event) =>
                q.dispatch({ type: "patch", patch: { stampNote: event.target.value } })
              }
            />
          </Field>
        ) : null}
      </QuizGroup>
    </>
  );
}
