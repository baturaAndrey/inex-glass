import { describe, expect, it } from "vitest";
import { DEFAULT_TECH_LIMITS, leadSubmitSchema, SEED_PRICES_2026_10_15 } from "@/lib/domain";
import { buildQuizLeadPayload, fieldErrorsFromServer, validateQuizPayload } from "./build-payload";
import { submitFlags } from "./derive";
import { createInitialState, quizReducer, type QuizAction } from "./state";
import type { QuizConfig, QuizUiState } from "./types";

const ATTRIBUTION = {
  entryPage: "/zakalennoe-steklo/10-mm/",
  utm: { source: "yandex", medium: "cpc" },
  metrikaClientId: "1234567890",
  extra: { yclid: "42" },
};
const OPTIONS = { formToken: "form-token", attribution: ATTRIBUTION, honeypot: "" };

const CONFIG: QuizConfig = {
  nowIso: "2026-10-20T05:00:00.000Z",
  prices: SEED_PRICES_2026_10_15,
  promo: null,
  limits: DEFAULT_TECH_LIMITS,
  holidays: [],
  cities: [],
  films: [0.76],
  phone: "+7 (351) 247-05-57",
  minOrderArea: 50,
  forms: { thankYouTitle: "", thankYouText: "", submitErrorText: "" },
};

function play(actions: QuizAction[], state: QuizUiState = createInitialState()): QuizUiState {
  return actions.reduce(quizReducer, state);
}

const CONTACT: QuizAction[] = [
  { type: "setContact", key: "company", value: "ООО Стройка" },
  { type: "setContact", key: "name", value: "Иван" },
  { type: "setContact", key: "phone", value: "+7 (900) 123-45-67" },
  { type: "patch", patch: { consent: true } },
];

const FULL_SINGLE: QuizAction[] = [
  { type: "setType", value: "tempered" },
  { type: "setThickness", value: 10 },
  { type: "setKind", value: "clear" },
  { type: "setRaw", key: "area", value: "86,5" },
  { type: "setRaw", key: "positions", value: "12" },
  { type: "setRaw", key: "maxW", value: "3000" },
  { type: "setRaw", key: "maxH", value: "1200" },
  { type: "setHoles", has: true },
  { type: "setRaw", key: "holeCount", value: "4" },
  { type: "setRaw", key: "holeDiam", value: "12, 16" },
  { type: "setFile", file: { uploadToken: "upload-token", name: "drawing.pdf", size: 1024 } },
  { type: "patch", patch: { city: "Челябинск", needDocs: true } },
  ...CONTACT,
];

describe("buildQuizLeadPayload", () => {
  it("builds a full single-glass lead that passes leadSubmitSchema", () => {
    const payload = buildQuizLeadPayload(play(FULL_SINGLE), OPTIONS);
    const parsed = leadSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);

    expect(payload).toMatchObject({
      formType: "quiz",
      entryPage: "/zakalennoe-steklo/10-mm/",
      utm: { source: "yandex", medium: "cpc" },
      metrikaClientId: "1234567890",
      consent: true,
      formToken: "form-token",
      company_website: "",
      uploadTokens: ["upload-token"],
    });
    expect(payload.answers).toMatchObject({
      type: "tempered",
      thickness: 10,
      kind: "clear",
      area: 86.5,
      positions: 12,
      holes: { has: true, count: 4, diameters: [12, 16] },
      file: { uploadToken: "upload-token", name: "drawing.pdf", size: 1024 },
      contact: { company: "ООО Стройка", name: "Иван", phone: "+7 (900) 123-45-67" },
      attribution: { yclid: "42" },
    });
    if (parsed.success && parsed.data.formType === "quiz") {
      expect(parsed.data.answers.contact.phone).toBe("+79001234567");
      expect(parsed.data.answers.area).toBe(86.5);
      // Ad click ids ride in the stored answers JSON: the schema must not strip them.
      expect(parsed.data.answers.attribution).toEqual({ yclid: "42" });
    }
  });

  it("builds a triplex 6+6 / 0,76 lead", () => {
    const state = play([
      { type: "setType", value: "triplex" },
      { type: "setTriplex", layer: "glass1", value: 6 },
      { type: "setTriplex", layer: "glass2", value: 6 },
      { type: "setTriplex", layer: "film", value: 0.76 },
      { type: "setKind", value: "clear" },
      ...CONTACT,
    ]);
    const payload = buildQuizLeadPayload(state, OPTIONS);
    expect(leadSubmitSchema.safeParse(payload).success).toBe(true);
    expect(payload.answers).toMatchObject({
      type: "triplex",
      thickness: 6,
      triplex: { glass1: 6, glass2: 6, film: 0.76 },
    });
    expect(payload.uploadTokens).toBeUndefined();
  });

  it("does not let a single-glass thickness chosen earlier leak into triplex", () => {
    const state = play([
      { type: "setThickness", value: 15 },
      { type: "setType", value: "triplex" },
      { type: "setKind", value: "clear" },
      ...CONTACT,
    ]);
    const check = validateQuizPayload(buildQuizLeadPayload(state, OPTIONS));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.errors).toHaveProperty("triplex");
  });

  it("fails without consent with the teksty/05 message", () => {
    const state = play(
      FULL_SINGLE.filter((action) => action.type !== "patch" || !action.patch.consent)
    );
    const check = validateQuizPayload(buildQuizLeadPayload(state, OPTIONS));
    expect(check).toMatchObject({
      ok: false,
      first: "consent",
      errors: {
        consent: "Чтобы отправить заявку, отметьте согласие на обработку персональных данных",
      },
    });
  });

  it("reports empty contacts in focus order and unanswered choices", () => {
    const check = validateQuizPayload(buildQuizLeadPayload(createInitialState(), OPTIONS));
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.first).toBe("type");
    expect(check.errors).toMatchObject({
      type: "Заполните поле, чтобы мы могли связаться с вами",
      thickness: "Заполните поле, чтобы мы могли связаться с вами",
      kind: "Заполните поле, чтобы мы могли связаться с вами",
      company: "Заполните поле, чтобы мы могли связаться с вами",
      name: "Заполните поле, чтобы мы могли связаться с вами",
      phone: "Заполните поле, чтобы мы могли связаться с вами",
    });
  });

  it("checks the format of filled optional fields", () => {
    const state = play([
      ...FULL_SINGLE,
      { type: "setContact", key: "email", value: "not-an-email" },
      { type: "setRaw", key: "inn", value: "123" },
      { type: "setContact", key: "phone", value: "+7 (900) 12" },
    ]);
    const check = validateQuizPayload(buildQuizLeadPayload(state, OPTIONS));
    expect(check).toMatchObject({
      ok: false,
      first: "inn",
      errors: {
        inn: "ИНН — 10 или 12 цифр",
        phone: "Укажите телефон в формате +7 (900) 000-00-00",
        email: "Проверьте адрес электронной почты",
      },
    });
  });

  it("requires RAL for painted and the description for «Подберите под нагрузку»", () => {
    const state = play([
      ...FULL_SINGLE,
      { type: "setThickness", value: "custom" },
      { type: "setKind", value: "painted" },
    ]);
    const check = validateQuizPayload(buildQuizLeadPayload(state, OPTIONS));
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(Object.keys(check.errors).sort()).toEqual(["customNote", "ral"]);
      expect(check.first).toBe("customNote");
    }
  });

  it("flags a missing token as a transport error", () => {
    const check = validateQuizPayload(
      buildQuizLeadPayload(play(FULL_SINGLE), { ...OPTIONS, formToken: "" })
    );
    expect(check).toMatchObject({ ok: false, transport: true, first: null });
  });

  it("gives the flags expected by Metrika", () => {
    const payload = buildQuizLeadPayload(play(FULL_SINGLE), OPTIONS);
    expect(submitFlags(payload.answers, CONFIG)).toEqual(["needs_docs"]);
  });
});

describe("fieldErrorsFromServer", () => {
  it("maps server paths to quiz fields", () => {
    expect(
      fieldErrorsFromServer({
        "answers.contact.phone": "Укажите телефон в формате +7 (900) 000-00-00",
        "uploadTokens.0": "x",
      })
    ).toEqual({
      errors: { phone: "Укажите телефон в формате +7 (900) 000-00-00" },
      first: "phone",
    });
  });
});
