import { describe, expect, it } from "vitest";
import {
  CONSENT_MESSAGE,
  EMAIL_MESSAGE,
  FORM_TYPES,
  leadSubmitSchema,
  leadSubmitSchemaForForm,
  normalizeEmail,
  normalizePhone,
  PHONE_MESSAGE,
  REQUIRED_MESSAGE,
} from "./lead-schemas";

const base = { entryPage: "/zakalennoe-steklo/", consent: true, formToken: "token-1" };

describe("normalizePhone", () => {
  it.each([
    ["8 (900) 123-45-67", "+79001234567"],
    ["+7 900 123 45 67", "+79001234567"],
    ["9001234567", "+79001234567"],
    ["7-351-247-05-57", "+73512470557"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["900123456", "3512470557", "+1 900 123 45 67", "8 900 123 45 67 89", ""])(
    "%s → null",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    }
  );
});

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Ivan@Example.RU ")).toBe("ivan@example.ru");
  });
});

describe("leadSubmitSchema", () => {
  it("accepts a callback with name, phone, consent and token only", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      formType: "callback",
      name: "Иван",
      phone: "+7 900 123 45 67",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ formType: "callback", phone: "+79001234567" });
  });

  it("rejects a callback without consent with the exact message", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      consent: false,
      formType: "callback",
      name: "Иван",
      phone: "89001234567",
    });
    expect(result.error?.issues.map((i) => i.message)).toEqual([CONSENT_MESSAGE]);
  });

  it("requires name and phone", () => {
    const result = leadSubmitSchema.safeParse({ ...base, formType: "contacts" });
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      REQUIRED_MESSAGE,
      REQUIRED_MESSAGE,
    ]);
  });

  it("rejects a malformed phone and e-mail", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      formType: "contacts",
      name: "Иван",
      phone: "12345",
      email: "ivan@",
    });
    expect(result.error?.issues.map((i) => i.message).sort()).toEqual(
      [EMAIL_MESSAGE, PHONE_MESSAGE].sort()
    );
  });

  it("normalizes the e-mail and treats an empty one as absent", () => {
    const ok = leadSubmitSchema.parse({
      ...base,
      formType: "contacts",
      name: "Иван",
      phone: "89001234567",
      email: " Ivan@Example.RU ",
    });
    expect(ok).toMatchObject({ email: "ivan@example.ru" });
    const empty = leadSubmitSchema.parse({
      ...base,
      formType: "contacts",
      name: "Иван",
      phone: "89001234567",
      email: "",
    });
    expect(empty).not.toHaveProperty("email", "");
  });

  it("accepts the honeypot field", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      formType: "callback",
      name: "Bot",
      phone: "89001234567",
      company_website: "http://spam.example",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a drawing / full lead with uploads and context", () => {
    for (const formType of ["drawing", "full"] as const) {
      const result = leadSubmitSchema.safeParse({
        ...base,
        formType,
        name: "Иван",
        phone: "89001234567",
        area: "120,5",
        uploadTokens: ["u1", "u2"],
        sourceLabel: "Отправить чертёж",
        params: { thickness: 10, kind: "clear" },
        utm: { source: "yandex", campaign: "" },
      });
      expect(result.success, formType).toBe(true);
      expect(result.data).toMatchObject({ area: 120.5 });
    }
  });

  it("limits uploads to 5 tokens", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      formType: "drawing",
      name: "Иван",
      phone: "89001234567",
      uploadTokens: ["1", "2", "3", "4", "5", "6"],
    });
    expect(result.success).toBe(false);
  });

  it("requires a description for «подобрать под нагрузку»", () => {
    const lead = { ...base, formType: "load", name: "Иван", phone: "89001234567" };
    expect(leadSubmitSchema.safeParse(lead).success).toBe(false);
    expect(leadSubmitSchema.safeParse({ ...lead, description: "Ограждение 1,1 м" }).success).toBe(
      true
    );
  });

  it("accepts a sample request", () => {
    const result = leadSubmitSchema.safeParse({
      ...base,
      formType: "sample",
      name: "Иван",
      phone: "89001234567",
      glassKind: "Осветлённое",
      address: "Екатеринбург",
    });
    expect(result.success).toBe(true);
  });

  it("validates quiz leads through the answers schema", () => {
    const answers = {
      type: "tempered",
      thickness: 10,
      kind: "clear",
      contact: { company: "ООО", name: "Иван", phone: "89001234567" },
      consent: true,
    };
    expect(leadSubmitSchema.safeParse({ ...base, formType: "quiz", answers }).success).toBe(true);
    const noContact = { ...answers, contact: { company: "ООО" } };
    expect(
      leadSubmitSchema.safeParse({ ...base, formType: "quiz", answers: noContact }).success
    ).toBe(false);
  });

  it("rejects an unknown form type", () => {
    expect(leadSubmitSchema.safeParse({ ...base, formType: "spam" }).success).toBe(false);
  });
});

describe("leadSubmitSchemaForForm", () => {
  it("returns a schema for every form type", () => {
    for (const formType of FORM_TYPES) {
      expect(leadSubmitSchemaForForm(formType).shape.formType.value).toBe(formType);
    }
  });

  it("validates one form", () => {
    const schema = leadSubmitSchemaForForm("callback");
    expect(
      schema.safeParse({ ...base, formType: "callback", name: "Иван", phone: "9001234567" }).success
    ).toBe(true);
  });
});
