import { describe, expect, it } from "vitest";
import {
  CONSENT_MESSAGE,
  EMAIL_MESSAGE,
  leadSubmitSchema,
  PHONE_MESSAGE,
  REQUIRED_MESSAGE,
} from "@/lib/domain/lead-schemas";
import {
  buildLeadBody,
  FORM_FIELDS,
  leadParams,
  mapServerFieldErrors,
  orderedErrorKeys,
  validateLead,
} from "./lead-body";
import type { FormKey } from "./form-dialog-provider";
import type { LeadMeta, LeadValues } from "./lead-body";

/** All form keys (the provider module is not imported: it pulls in Radix and the registry). */
const FORM_KEYS = Object.keys(FORM_FIELDS) as FormKey[];

/** Valid input for every field any form has. */
const FILLED: Required<LeadValues> = {
  company: "ООО «Стекло»",
  name: "Иван",
  phone: "+7 (900) 123-45-67",
  email: "Ivan@Company.ru",
  city: "Екатеринбург",
  area: "120",
  comment: "Срок — к концу месяца",
  glassKind: "Матовое",
  address: "Челябинск",
  description: "Перегородка 2000 × 1000, крепление в профиль",
  sizes: "2000 × 1000",
  mounting: "профиль",
};

const META: LeadMeta = {
  entryPage: "/zakalennoe-steklo/",
  utm: { source: "yandex", medium: "", campaign: undefined },
  metrikaClientId: "1234567890",
  formToken: "signed-token",
  consent: true,
  honeypot: "",
  uploadTokens: [],
};

/** Only the fields of the given form, like the UI state. */
function valuesFor(formKey: FormKey): LeadValues {
  return Object.fromEntries(FORM_FIELDS[formKey].map((field) => [field, FILLED[field]]));
}

describe("buildLeadBody", () => {
  it.each(FORM_KEYS)("builds a body of «%s» that passes leadSubmitSchema", (formKey) => {
    const body = buildLeadBody(formKey, valuesFor(formKey), { source: "home-hero" }, META);
    const result = leadSubmitSchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    expect(body.formType).toBe(formKey);
    expect(body.utm).toEqual({ source: "yandex" });
  });

  it("normalizes «8 900 123-45-67» to +79001234567", () => {
    const body = buildLeadBody("callback", { name: "Иван", phone: "8 900 123-45-67" }, {}, META);
    const parsed = leadSubmitSchema.parse(body);
    expect(parsed.formType === "callback" && parsed.phone).toBe("+79001234567");
  });

  it("puts the drawing label into sourceLabel and the place into params.source", () => {
    const body = buildLeadBody(
      "drawing",
      valuesFor("drawing"),
      {
        label: "Отправить планировку",
        source: "zakalennoe-steklo",
        accept: ["dwg"],
        thickness: 10,
      },
      { ...META, source: "zakalennoe-steklo" }
    );
    expect(body.sourceLabel).toBe("Отправить планировку");
    expect(body.params).toEqual({ source: "zakalennoe-steklo", thickness: 10 });
    expect(leadSubmitSchema.safeParse(body).success).toBe(true);
  });

  it("defaults the drawing sourceLabel to «Отправить чертёж»", () => {
    const body = buildLeadBody("drawing", valuesFor("drawing"), {}, META);
    expect(body.sourceLabel).toBe("Отправить чертёж");
  });

  it("keeps the honeypot empty by default and sends upload tokens of file forms only", () => {
    const meta = { ...META, uploadTokens: ["upload-token"] };
    const drawing = buildLeadBody("drawing", valuesFor("drawing"), {}, meta);
    const callback = buildLeadBody("callback", valuesFor("callback"), {}, meta);
    expect(drawing.company_website).toBe("");
    expect(drawing.uploadTokens).toEqual(["upload-token"]);
    expect(callback.uploadTokens).toBeUndefined();
  });

  it("keeps the thickness of a load request in sizes (the load schema has no params)", () => {
    const body = buildLeadBody("load", valuesFor("load"), { thickness: 10 }, META);
    expect(body.sizes).toBe("Толщина: 10 мм; 2000 × 1000");
    expect(leadSubmitSchema.safeParse(body).success).toBe(true);
  });

  it.each(FORM_KEYS)("forwards the ad attribution of «%s» through the schema", (formKey) => {
    const attribution = { yclid: "42", gclid: "g-1", referrer: "https://ya.ru/search/?text=x" };
    const body = buildLeadBody(formKey, valuesFor(formKey), {}, { ...META, attribution });
    expect(body.attribution).toEqual(attribution);
    const parsed = leadSubmitSchema.parse(body);
    expect(parsed.attribution).toEqual(attribution);
  });

  it("omits an empty attribution", () => {
    const body = buildLeadBody("callback", valuesFor("callback"), {}, { ...META, attribution: {} });
    expect(body).not.toHaveProperty("attribution");
  });

  it("never fails a lead because of a bad attribution value", () => {
    const body = {
      ...buildLeadBody("callback", valuesFor("callback"), {}, META),
      attribution: { yclid: "x".repeat(501), gclid: 7, referrer: "https://ya.ru/" },
    };
    const parsed = leadSubmitSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.attribution).toEqual({ referrer: "https://ya.ru/" });

    const garbage = leadSubmitSchema.safeParse({ ...body, attribution: "not-an-object" });
    expect(garbage.success).toBe(true);
    expect(garbage.data?.attribution).toBeUndefined();
  });
});

describe("validateLead", () => {
  it("accepts complete input", () => {
    for (const formKey of FORM_KEYS) {
      expect(validateLead(formKey, valuesFor(formKey), true)).toEqual({});
    }
  });

  it("requires the consent with the exact message", () => {
    expect(validateLead("callback", valuesFor("callback"), false)).toEqual({
      consent: CONSENT_MESSAGE,
    });
  });

  it("marks empty required fields, including the UI-required company", () => {
    const errors = validateLead("drawing", {}, false);
    expect(errors).toMatchObject({
      company: REQUIRED_MESSAGE,
      name: REQUIRED_MESSAGE,
      phone: REQUIRED_MESSAGE,
      consent: CONSENT_MESSAGE,
    });
    expect(errors.email).toBeUndefined();
    expect(orderedErrorKeys("drawing", errors)).toEqual(["company", "name", "phone", "consent"]);
  });

  it("requires the construction description of the load form", () => {
    const errors = validateLead("load", { ...valuesFor("load"), description: "  " }, true);
    expect(errors).toEqual({ description: REQUIRED_MESSAGE });
  });

  it("reports the schema messages for a bad phone and e-mail", () => {
    const errors = validateLead(
      "contacts",
      { ...valuesFor("contacts"), phone: "+7 (900) 12", email: "name@" },
      true
    );
    expect(errors).toEqual({ phone: PHONE_MESSAGE, email: EMAIL_MESSAGE });
  });
});

describe("helpers", () => {
  it("leadParams keeps primitives only and drops UI keys", () => {
    expect(
      leadParams(
        { label: "x", title: "y", accept: ["pdf"], vid: "matte", n: 4, ok: true, e: "" },
        "s"
      )
    ).toEqual({ vid: "matte", n: 4, ok: true, source: "s" });
  });

  it("maps server field errors onto the form fields", () => {
    expect(
      mapServerFieldErrors("callback", { phone: PHONE_MESSAGE, "answers.x": "?", consent: "c" })
    ).toEqual({ phone: PHONE_MESSAGE, consent: "c" });
  });
});
