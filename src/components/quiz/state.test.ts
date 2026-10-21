import { describe, expect, it } from "vitest";
import { createInitialState, nextEdges, quizReducer, type QuizAction } from "./state";
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
