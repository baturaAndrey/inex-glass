import { describe, expect, it } from "vitest";
import {
  createInitialState,
  EMPTY_RAW,
  initialQuizState,
  nextEdges,
  quizReducer,
  type QuizAction,
  type QuizDraftSnapshot,
} from "./state";
import type { QuizUiState } from "./types";

const play = (actions: QuizAction[], state: QuizUiState = createInitialState()) =>
  actions.reduce(quizReducer, state);

describe("createInitialState", () => {
  it("applies the card pre-fill", () => {
    const state = createInitialState({ type: "tempered", thickness: 10, kind: "clear" });
    expect(state.answers).toEqual({ type: "tempered", thickness: 10, kind: "clear" });
    expect(state.step).toBe(1);
  });

  it("computes the area from the calculator sizes", () => {
    const state = createInitialState({ maxW: 1500, maxH: 1000, positions: 3 });
    expect(state.answers.area).toBe(4.5);
    expect(state.raw).toMatchObject({ maxW: "1500", maxH: "1000", positions: "3", area: "4,5" });
  });

  it("keeps triplex layers only for triplex and drops unknown thicknesses", () => {
    expect(
      createInitialState({ type: "triplex", triplex: { glass1: 6, glass2: 7, film: 0.76 } }).answers
        .triplex
    ).toEqual({ glass1: 6, film: 0.76 });
    expect(createInitialState({ thickness: 7 }).answers.thickness).toBeUndefined();
  });
});

describe("initialQuizState (draft × pre-fill)", () => {
  const draft: QuizDraftSnapshot = {
    step: 4,
    answers: {
      type: "mirrors",
      thickness: 8,
      kind: "bent",
      bendRadius: 1500,
      edges: ["polished", "facet30"],
      maxW: 1200,
      maxH: 800,
      positions: 2,
      area: 5,
      contact: { name: "Иван", phone: "+7 900 000-00-00", email: "ivan@example.com" },
    },
    raw: { ...EMPTY_RAW, maxW: "1200", maxH: "800", positions: "2", area: "5", bendRadius: "1500" },
  };

  it("no draft + pre-fill: the pre-fill alone", () => {
    const state = initialQuizState({ prefill: { type: "tempered", thickness: 10 }, draft: null });
    expect(state).toMatchObject({ step: 1, maxStepReached: 1, resumed: false });
    expect(state.answers).toEqual({ type: "tempered", thickness: 10 });
  });

  it("draft + no pre-fill: the draft answers and raw texts at step 1", () => {
    const state = initialQuizState({ prefill: {}, draft });
    expect(state).toMatchObject({ step: 1, maxStepReached: 1, resumed: false });
    expect(state.answers).toEqual(draft.answers);
    expect(state.raw).toEqual(draft.raw);
  });

  it("draft + pre-fill of the same type: only the carried fields change", () => {
    const state = initialQuizState({
      prefill: { type: "mirrors", thickness: 10, kind: "clear", maxW: 2000, maxH: 1000 },
      draft,
    });
    expect(state.answers).toMatchObject({
      type: "mirrors",
      thickness: 10,
      kind: "clear",
      edges: ["polished", "facet30"],
      maxW: 2000,
      maxH: 1000,
      positions: 2,
      // New sizes from the link replace the area of the draft.
      area: 4,
      contact: draft.answers.contact,
    });
    // A kind change drops the bend radius and its text (the `setKind` rule).
    expect(state.answers.bendRadius).toBeUndefined();
    expect(state.raw).toMatchObject({ maxW: "2000", maxH: "1000", area: "4", bendRadius: "" });
  });

  it("draft + pre-fill of another type: type-dependent answers are reset", () => {
    const state = initialQuizState({ prefill: { type: "partitions" }, draft });
    expect(state.answers.type).toBe("partitions");
    expect(state.answers.thickness).toBeUndefined();
    // A facet is a mirrors-only edge (the `setType` rule); «polished» stays.
    expect(state.answers.edges).toEqual(["polished"]);
    expect(state.answers).toMatchObject({ kind: "bent", maxW: 1200, area: 5 });
    expect(state.answers.contact).toEqual(draft.answers.contact);

    const triplex = initialQuizState({
      prefill: { type: "triplex", triplex: { glass1: 6, film: 0.76 } },
      draft,
    });
    expect(triplex.answers.thickness).toBeUndefined();
    expect(triplex.answers.triplex).toEqual({ glass1: 6, film: 0.76 });
    expect(triplex.answers.contact).toEqual(draft.answers.contact);

    // Back to a non-triplex type with a thickness: the layers go, the link thickness is used.
    const back = initialQuizState({
      prefill: { type: "tempered", thickness: 12 },
      draft: { ...draft, answers: triplex.answers, raw: triplex.raw },
    });
    expect(back.answers.triplex).toBeUndefined();
    expect(back.answers.thickness).toBe(12);
  });

  it("triplex draft + triplex pre-fill: carried layers override, the others stay", () => {
    const state = initialQuizState({
      prefill: { type: "triplex", triplex: { glass2: 8 } },
      draft: {
        ...draft,
        answers: { type: "triplex", triplex: { glass1: 6, glass2: 6, film: 0.38 } },
      },
    });
    expect(state.answers.triplex).toEqual({ glass1: 6, glass2: 8, film: 0.38 });
  });

  it("resume: the draft wins and continues at its step", () => {
    const state = initialQuizState({
      prefill: { type: "partitions", thickness: 10 },
      resume: true,
      draft,
    });
    expect(state).toMatchObject({ step: 4, maxStepReached: 4, resumed: true });
    expect(state.answers).toEqual(draft.answers);
  });

  it("resume without a draft: the pre-fill", () => {
    const state = initialQuizState({ prefill: { type: "mirrors" }, resume: true, draft: null });
    expect(state).toMatchObject({ step: 1, resumed: false, answers: { type: "mirrors" } });
  });
});

describe("quizReducer", () => {
  it("parses raw numbers with a comma", () => {
    const state = play([
      { type: "setRaw", key: "area", value: "86,5" },
      { type: "setRaw", key: "positions", value: "12,4" },
      { type: "setRaw", key: "holeDiam", value: "12, 16" },
    ]);
    expect(state.answers).toMatchObject({
      area: 86.5,
      positions: 12,
      holes: { diameters: [12, 16] },
    });
    expect(state.raw.area).toBe("86,5");
    expect(play([{ type: "setRaw", key: "area", value: "abc" }]).answers.area).toBeUndefined();
  });

  it("drops the facet when the type is no longer mirrors", () => {
    const state = play([
      { type: "setType", value: "mirrors" },
      { type: "setEdges", value: ["facet30", "polished"] },
      { type: "setType", value: "partitions" },
    ]);
    expect(state.answers.edges).toEqual(["polished"]);
  });

  it("resets kind-dependent answers on a kind change", () => {
    const state = play([
      { type: "setKind", value: "bent" },
      { type: "setRaw", key: "bendRadius", value: "1500" },
      { type: "setKind", value: "tinted" },
      { type: "patch", patch: { tint: "bronze" } },
      { type: "setKind", value: "clear" },
    ]);
    expect(state.answers.bendRadius).toBeUndefined();
    expect(state.answers.tint).toBeUndefined();
    expect(state.raw.bendRadius).toBe("");
  });

  it("navigates without blocking and tracks the furthest step", () => {
    let state = play([{ type: "next" }, { type: "next" }, { type: "back" }]);
    expect(state.step).toBe(2);
    expect(state.maxStepReached).toBe(3);
    state = play([{ type: "back" }]);
    expect(state.step).toBe(1);
    state = play([{ type: "goTo", step: 7 }, { type: "next" }]);
    expect(state.step).toBe(7);
  });

  it("«Нет чертежа» sets noFile and jumps to step 6; a file clears it", () => {
    let state = play([{ type: "goTo", step: 5 }, { type: "skipFile" }]);
    expect(state.step).toBe(6);
    expect(state.answers.noFile).toBe(true);
    state = quizReducer(state, {
      type: "setFile",
      file: { uploadToken: "t", name: "a.pdf", size: 1 },
    });
    expect(state.answers.noFile).toBeUndefined();
  });
});

describe("nextEdges", () => {
  it("makes «не знаю» exclusive", () => {
    expect(nextEdges(["ground"], ["ground", "unknown"])).toEqual(["unknown"]);
    expect(nextEdges(["unknown"], ["polished", "unknown"])).toEqual(["polished"]);
    expect(nextEdges(["ground"], ["ground", "polished"])).toEqual(["ground", "polished"]);
  });
});

describe("type change (manual setType vs. a link's type)", () => {
  // Intentional asymmetry, see the `setType` case in `./state.ts`.
  const glass: QuizAction[] = [
    { type: "setType", value: "tempered" },
    { type: "setThickness", value: "custom" },
    { type: "patch", patch: { customNote: "Ограждение, ветровая нагрузка" } },
  ];

  it("manual setType keeps the thickness and the «подберите» note", () => {
    const state = play([...glass, { type: "setType", value: "partitions" }]);
    expect(state.answers).toMatchObject({
      type: "partitions",
      thickness: "custom",
      customNote: "Ограждение, ветровая нагрузка",
    });
  });

  it("a link with another type resets them over the draft", () => {
    const base = play(glass);
    const state = createInitialState({ type: "partitions" }, base);
    expect(state.answers.type).toBe("partitions");
    expect(state.answers.thickness).toBeUndefined();
    expect(state.answers.customNote).toBeUndefined();
  });

  it("a link with the same type keeps them", () => {
    const state = createInitialState({ type: "tempered" }, play(glass));
    expect(state.answers).toMatchObject({
      thickness: "custom",
      customNote: "Ограждение, ветровая нагрузка",
    });
  });
});
