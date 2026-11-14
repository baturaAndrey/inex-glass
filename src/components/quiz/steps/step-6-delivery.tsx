"use client";

import { useState } from "react";
import { ChipGroup } from "@/components/ig/chip-group";
import { DatePicker } from "@/components/ig/date-picker";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { Textarea } from "@/components/ig/textarea";
import { MAX_LONG_TEXT } from "@/lib/domain";
import type { QuizPackingId } from "@/lib/domain";
import {
  CARRIER_NOTE_LABEL,
  CITY_OTHER_LABEL,
  fromYesNo,
  PACKING_OPTIONS,
  STEP_TITLES,
  toYesNo,
  YES_NO_OPTIONS,
} from "../options";
import { QuizHints } from "../quiz-hint";
import { QuizGroup, StepTitle, type QuizStepProps } from "./parts";

/**
 * Step 6 «Сроки и доставка»: desired date (the «urgent» hint counts WORKING days with the CMS
 * holidays), delivery city, packing and the document package.
 */
export function Step6Delivery({ q, fieldId, titleId }: QuizStepProps) {
  const { answers } = q.state;
  const [dateError, setDateError] = useState<string | null>(null);
  const cities = q.config.cities;
  const selectedCity = cities.find((city) => city.name === answers.city);
  const packing = answers.packing ?? [];
  const ids = {
    city: fieldId("city-label"),
    packing: fieldId("packing-label"),
    docs: fieldId("docs-label"),
  };

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[6]}</StepTitle>

      <div className="flex flex-col gap-2.5">
        <Field
          label="К какой дате нужно стекло?"
          htmlFor={fieldId("desiredDate")}
          error={dateError}
          className="max-w-[320px]"
        >
          <DatePicker
            value={answers.desiredDate ?? ""}
            onChange={(iso) => {
              setDateError(null);
              q.dispatch({ type: "patch", patch: { desiredDate: iso || undefined } });
            }}
            onInvalid={setDateError}
          />
        </Field>
        <QuizHints hints={q.derived.hintsByStep[6]} />
      </div>

      <QuizGroup labelId={ids.city} label="Город доставки">
        <ChipGroup
          mode="single"
          allowClear
          options={cities.map((city) => ({ value: city.name, label: city.name }))}
          value={selectedCity?.name ?? null}
          onChange={(value) => {
            const city = cities.find((item) => item.name === value);
            q.dispatch({
              type: "patch",
              patch: {
                city: city?.name,
                // The free-text city belongs to «Другой» only.
                cityOther: city?.kind === "other" ? answers.cityOther : undefined,
              },
            });
          }}
          aria-labelledby={ids.city}
        />
        {selectedCity?.kind === "other" ? (
          <Field label={CITY_OTHER_LABEL} htmlFor={fieldId("cityOther")} className="max-w-[320px]">
            <Input
              value={answers.cityOther ?? ""}
              maxLength={100}
              autoComplete="address-level2"
              onChange={(event) =>
                q.dispatch({ type: "patch", patch: { cityOther: event.target.value } })
              }
            />
          </Field>
        ) : null}
      </QuizGroup>

      <QuizGroup labelId={ids.packing} label="Требования к упаковке">
        <ChipGroup
          mode="multiple"
          options={PACKING_OPTIONS}
          value={packing}
          onChange={(value) =>
            q.dispatch({ type: "patch", patch: { packing: value as QuizPackingId[] } })
          }
          aria-labelledby={ids.packing}
        />
        {packing.includes("carrier") ? (
          <Field label={CARRIER_NOTE_LABEL} htmlFor={fieldId("packingNote")}>
            <Textarea
              className="min-h-20"
              value={answers.packingNote ?? ""}
              maxLength={MAX_LONG_TEXT}
              onChange={(event) =>
                q.dispatch({ type: "patch", patch: { packingNote: event.target.value } })
              }
            />
          </Field>
        ) : null}
      </QuizGroup>

      <QuizGroup labelId={ids.docs} label="Нужен пакет документов (паспорт, сертификат, протоколы)">
        <ChipGroup
          mode="single"
          allowClear
          options={YES_NO_OPTIONS}
          value={toYesNo(answers.needDocs)}
          onChange={(value) => q.dispatch({ type: "patch", patch: { needDocs: fromYesNo(value) } })}
          aria-labelledby={ids.docs}
        />
      </QuizGroup>
    </>
  );
}
