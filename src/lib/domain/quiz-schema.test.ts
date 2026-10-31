import { describe, expect, it } from "vitest";
import { CONSENT_MESSAGE, INN_MESSAGE, PHONE_MESSAGE, REQUIRED_MESSAGE } from "./contact-fields";
import {
  QUIZ_DRAFT_KEY,
  QUIZ_EDGES,
  QUIZ_KINDS,
  QUIZ_THICKNESSES,
  QUIZ_TYPES,
  quizAnswersSchema,
  quizDraftSchema,
  sanitizeQuizAnswers,
} from "./quiz-schema";
import type { QuizAnswersDraft } from "./quiz-schema";

const validAnswers = () => ({
  type: "tempered",
  thickness: 10,
  kind: "clear",
  contact: { company: "ООО Стройка", name: "Иван", phone: "8 (900) 123-45-67" },
  consent: true,
});

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("quiz constants", () => {
  it("lists types and kinds with labels from teksty/05-kviz.md", () => {
    expect(QUIZ_TYPES).toHaveLength(11);
    expect(QUIZ_TYPES[0]).toEqual({ id: "tempered", label: "Закалённое стекло" });
    expect(QUIZ_TYPES.at(-1)).toEqual({ id: "other", label: "Другое" });
    expect(QUIZ_KINDS.map((k) => k.label)).toEqual([
      "Прозрачное",
      "Осветлённое",
      "Матовое",
      "Тонированное",
      "Крашеное по RAL",
      "Рифлёное",
      "Гнутое",
    ]);
    expect(QUIZ_EDGES.find((e) => e.id === "unknown")?.label).toBe("не знаю — подскажите");
    expect(QUIZ_THICKNESSES).toEqual([4, 5, 6, 8, 10, 12, 15, 19, "custom"]);
    expect(QUIZ_DRAFT_KEY).toBe("inex-quiz-draft-v1");
  });
});

describe("quizAnswersSchema", () => {
  it("accepts minimal valid answers and normalizes contacts", () => {
    const result = quizAnswersSchema.safeParse(validAnswers());
    expect(result.success).toBe(true);
    expect(result.data?.contact.phone).toBe("+79001234567");
    expect(result.data?.edges).toEqual([]);
    expect(result.data?.holes).toEqual({ has: false });
  });

  it("requires consent with the exact message", () => {
    const result = quizAnswersSchema.safeParse({ ...validAnswers(), consent: false });
    expect(messagesOf(result)).toEqual([CONSENT_MESSAGE]);
  });

  it("requires name and phone", () => {
    const result = quizAnswersSchema.safeParse({
      ...validAnswers(),
      contact: { company: "ООО", name: " ", phone: "" },
    });
    expect(messagesOf(result)).toEqual([REQUIRED_MESSAGE, REQUIRED_MESSAGE]);
  });

  it("rejects an invalid phone and INN", () => {
    const result = quizAnswersSchema.safeParse({
      ...validAnswers(),
      contact: { company: "ООО", name: "Иван", phone: "123", inn: "123456789" },
    });
    expect(messagesOf(result).sort()).toEqual([INN_MESSAGE, PHONE_MESSAGE].sort());
  });

  it("accepts 10- and 12-digit INN", () => {
    for (const inn of ["7451234567", "745123456789"]) {
      const contact = { ...validAnswers().contact, inn };
      expect(quizAnswersSchema.safeParse({ ...validAnswers(), contact }).success).toBe(true);
    }
  });

  it("parses the area with a decimal comma", () => {
    const result = quizAnswersSchema.parse({ ...validAnswers(), area: "49,5" });
    expect(result.area).toBe(49.5);
  });

  it("drops unparsable soft fields instead of blocking", () => {
    const result = quizAnswersSchema.parse({
      ...validAnswers(),
      area: "много",
      desiredDate: "завтра",
      edges: ["polished", "removed-option"],
    });
    expect(result.area).toBeUndefined();
    expect(result.desiredDate).toBeUndefined();
    expect(result.edges).toEqual(["polished"]);
  });

  it("requires a note for «Подберите под нагрузку» and RAL for painted", () => {
    const custom = quizAnswersSchema.safeParse({ ...validAnswers(), thickness: "custom" });
    expect(custom.error?.issues[0]?.path).toEqual(["customNote"]);
    const painted = quizAnswersSchema.safeParse({ ...validAnswers(), kind: "painted" });
    expect(painted.error?.issues[0]?.path).toEqual(["ral"]);
  });

  it("requires triplex layers for triplex", () => {
    const missing = quizAnswersSchema.safeParse({ ...validAnswers(), type: "triplex" });
    expect(missing.success).toBe(false);
    const ok = quizAnswersSchema.safeParse({
      ...validAnswers(),
      type: "triplex",
      triplex: { glass1: 8, glass2: "8", film: 0.76 },
    });
    expect(ok.success).toBe(true);
    expect(ok.data?.triplex).toEqual({ glass1: 8, glass2: 8, film: 0.76 });
  });

  it("parses free-text hole diameters", () => {
    const result = quizAnswersSchema.parse({
      ...validAnswers(),
      holes: { has: true, count: "4", diameters: "10, 12,5; 20" },
    });
    expect(result.holes).toEqual({ has: true, count: 4, diameters: [10, 12.5, 20] });
  });

  it("sanitizes incompatible answers in the output", () => {
    const result = quizAnswersSchema.parse({
      ...validAnswers(),
      edges: ["facet30", "ground"],
      tint: "bronze",
      triplex: { glass1: 8, glass2: 8, film: 0.76 },
    });
    expect(result.edges).toEqual(["ground"]);
    expect(result.tint).toBeUndefined();
    expect(result.triplex).toBeUndefined();
  });
});

describe("quizDraftSchema", () => {
  it("accepts an empty draft", () => {
    expect(quizDraftSchema.parse({})).toEqual({});
  });

  it("does not break on triplex without layers", () => {
    const result = quizDraftSchema.safeParse({ type: "triplex", thickness: "8" });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ type: "triplex", thickness: 8 });
  });

  it("drops outdated values instead of failing", () => {
    const result = quizDraftSchema.parse({
      type: "stekloppaket",
      kind: "clear",
      area: "12,5",
      triplex: "broken",
      contact: { phone: "8 900", email: "not-an-email" },
    });
    expect(result.type).toBeUndefined();
    expect(result.kind).toBe("clear");
    expect(result.area).toBe(12.5);
    expect(result.triplex).toBeUndefined();
    expect(result.contact).toEqual({ phone: "8 900", email: "not-an-email" });
  });
});

describe("sanitizeQuizAnswers", () => {
  it("drops facet when the type is not mirrors", () => {
    const mirrors: QuizAnswersDraft = { type: "mirrors", edges: ["facet50", "polished"] };
    expect(sanitizeQuizAnswers(mirrors).edges).toEqual(["facet50", "polished"]);
    expect(sanitizeQuizAnswers({ ...mirrors, type: "partitions" }).edges).toEqual(["polished"]);
  });

  it("drops kind-dependent fields after a kind change", () => {
    const draft: QuizAnswersDraft = {
      type: "tempered",
      kind: "clear",
      tint: "grey",
      ral: "9005",
      bendRadius: 1500,
      triplex: { glass1: 8 },
    };
    const result = sanitizeQuizAnswers(draft);
    expect(result).toEqual({ type: "tempered", kind: "clear" });
    expect(sanitizeQuizAnswers({ ...draft, kind: "tinted" }).tint).toBe("grey");
    expect(sanitizeQuizAnswers({ ...draft, kind: "painted" }).ral).toBe("9005");
    expect(sanitizeQuizAnswers({ ...draft, kind: "bent" }).bendRadius).toBe(1500);
  });

  it("does not mutate the input", () => {
    const draft: QuizAnswersDraft = { kind: "clear", tint: "grey" };
    sanitizeQuizAnswers(draft);
    expect(draft.tint).toBe("grey");
  });
});
