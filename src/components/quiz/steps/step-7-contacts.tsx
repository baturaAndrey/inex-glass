"use client";

import { ChipGroup } from "@/components/ig/chip-group";
import { ConsentCheckbox } from "@/components/ig/consent-checkbox";
import { Field } from "@/components/ig/field";
import { Input } from "@/components/ig/input";
import { PhoneInput } from "@/components/ig/phone-input";
import { Textarea } from "@/components/ig/textarea";
import { MAX_LONG_TEXT, MAX_SHORT_TEXT } from "@/lib/domain";
import type { QuizRoleId } from "@/lib/domain";
import { COMMENT_LABEL, ROLE_OPTIONS, STEP_TITLES } from "../options";
import { FieldGrid, QuizGroup, StepTitle, type QuizStepProps } from "./parts";

/** Webvisor must not record what is typed into contact fields (task-19). */
const NO_KEYS = "ym-disable-keys";

/**
 * Step 7 «Контакты». The only blocking validation of the quiz happens on «Получить КП»:
 * company, name, phone, the format of filled optional fields and the consent (unticked by
 * default). The honeypot `company_website` is rendered off-screen.
 */
export function Step7Contacts({ q, fieldId, titleId }: QuizStepProps) {
  const contact = q.state.answers.contact ?? {};
  const errors = q.fieldErrors;
  const roleLabelId = fieldId("role-label");

  const setContact =
    (key: "company" | "name" | "email" | "comment", field?: "company" | "name" | "email") =>
    (event: { target: { value: string } }) => {
      q.dispatch({ type: "setContact", key, value: event.target.value });
      if (field) q.clearError(field);
    };

  return (
    <>
      <StepTitle id={titleId}>{STEP_TITLES[7]}</StepTitle>
      <FieldGrid>
        <Field label="Компания" required htmlFor={fieldId("company")} error={errors.company}>
          <Input
            className={NO_KEYS}
            autoComplete="organization"
            maxLength={MAX_SHORT_TEXT}
            value={contact.company ?? ""}
            onChange={setContact("company", "company")}
          />
        </Field>
        <Field label="ИНН" optional htmlFor={fieldId("inn")} error={errors.inn}>
          <Input
            className={NO_KEYS}
            inputMode="numeric"
            maxLength={20}
            value={q.state.raw.inn}
            onChange={(event) => {
              q.dispatch({ type: "setRaw", key: "inn", value: event.target.value });
              q.clearError("inn");
            }}
          />
        </Field>
        <Field label="Имя" required htmlFor={fieldId("name")} error={errors.name}>
          <Input
            className={NO_KEYS}
            autoComplete="name"
            maxLength={MAX_SHORT_TEXT}
            value={contact.name ?? ""}
            onChange={setContact("name", "name")}
          />
        </Field>
        <Field label="Телефон" required htmlFor={fieldId("phone")} error={errors.phone}>
          <PhoneInput
            className={NO_KEYS}
            value={contact.phone ?? ""}
            onChange={(masked) => {
              q.dispatch({ type: "setContact", key: "phone", value: masked });
              q.clearError("phone");
            }}
          />
        </Field>
        <Field
          label="E-mail"
          htmlFor={fieldId("email")}
          error={errors.email}
          className="sm:col-span-2"
        >
          <Input
            className={NO_KEYS}
            type="email"
            autoComplete="email"
            maxLength={254}
            value={contact.email ?? ""}
            onChange={setContact("email", "email")}
          />
        </Field>
      </FieldGrid>

      <QuizGroup labelId={roleLabelId} label="Кто вы">
        <ChipGroup
          mode="single"
          allowClear
          options={ROLE_OPTIONS}
          value={contact.role ?? null}
          onChange={(value) =>
            q.dispatch({
              type: "setContact",
              key: "role",
              value: (value ?? undefined) as QuizRoleId | undefined,
            })
          }
          aria-labelledby={roleLabelId}
        />
      </QuizGroup>

      <Field label={COMMENT_LABEL} optional htmlFor={fieldId("comment")}>
        <Textarea
          className={NO_KEYS}
          maxLength={MAX_LONG_TEXT}
          value={contact.comment ?? ""}
          onChange={setContact("comment")}
        />
      </Field>

      <ConsentCheckbox
        id={fieldId("consent")}
        checked={q.state.answers.consent === true}
        onCheckedChange={(checked) => {
          q.dispatch({ type: "patch", patch: { consent: checked || undefined } });
          q.clearError("consent");
        }}
        error={errors.consent}
      />

      {/* Honeypot: invisible to people, filled by naive bots; the server drops such leads. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={fieldId("company_website")}>Сайт компании</label>
        <input
          id={fieldId("company_website")}
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={q.honeypot}
          onChange={(event) => q.setHoneypot(event.target.value)}
        />
      </div>
    </>
  );
}
