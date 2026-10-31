import { notFound } from "next/navigation";
import type { FormKey, FormParams } from "@/components/forms/form-dialog-provider";
import { FormSection } from "@/components/forms/form-section";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { Section } from "@/components/ig/section";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";

/**
 * Dev harness of the live site forms (task 21): triggers of every modal form (with the
 * parameterisations pages use) and the embedded `full` / `contacts` sections. Used by
 * `e2e/forms.spec.ts`; submissions create real leads. 404 when SITE_ENV=production, never indexed.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI kit — формы (живые)",
  robots: { index: false, follow: false },
};

interface TriggerDemo {
  id: string;
  formKey: FormKey;
  label: string;
  params?: FormParams;
}

const TRIGGERS: TriggerDemo[] = [
  { id: "drawing", formKey: "drawing", label: "Отправить чертёж", params: { source: "ui-kit" } },
  {
    id: "drawing-plan",
    formKey: "drawing",
    label: "Отправить планировку",
    params: { label: "Отправить планировку", source: "ui-kit-plan" },
  },
  {
    id: "drawing-dwg",
    formKey: "drawing",
    label: "Загрузить чертёж DWG / DXF",
    params: { label: "Загрузить чертёж DWG / DXF", source: "ui-kit-dwg", accept: ["dwg", "dxf"] },
  },
  { id: "callback", formKey: "callback", label: "Заказать звонок", params: { source: "ui-kit" } },
  { id: "sample", formKey: "sample", label: "Заказать образец", params: { source: "ui-kit" } },
  {
    id: "sample-matte",
    formKey: "sample",
    label: "Заказать образец (матовое)",
    params: { source: "ui-kit-matte", vid: "matte" },
  },
  { id: "load", formKey: "load", label: "Подобрать под нагрузку", params: { source: "ui-kit" } },
  {
    id: "load-10",
    formKey: "load",
    label: "Подобрать под нагрузку (10 мм)",
    params: { source: "thickness-10", thickness: 10 },
  },
];

export default function UiKitFormsLivePage() {
  if (getEnv().SITE_ENV === "production") notFound();

  return (
    <>
      <Section variant="bg">
        <h1 className="ig-h2 mb-6">Формы сайта</h1>
        <div className="flex flex-wrap gap-3">
          {TRIGGERS.map((trigger) => (
            <FormTrigger
              key={trigger.id}
              formKey={trigger.formKey}
              params={trigger.params}
              data-testid={`open-${trigger.id}`}
              asChild
            >
              <Button variant="secondary">{trigger.label}</Button>
            </FormTrigger>
          ))}
        </div>
      </Section>
      <FormSection formKey="full" anchorId="forma" source="ui-kit-full" />
      <FormSection formKey="contacts" anchorId="kontakty-forma" source="ui-kit-contacts" />
    </>
  );
}
