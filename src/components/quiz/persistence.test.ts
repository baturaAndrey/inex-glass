import { afterEach, describe, expect, it, vi } from "vitest";
import { QUIZ_DRAFT_KEY } from "@/lib/domain";
import { clearDraft, hasDraft, loadDraft, QUIZ_DRAFT_EVENT, saveDraft } from "./persistence";
import { EMPTY_RAW } from "./state";

/** In-memory `localStorage`. */
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function installWindow(storage: unknown) {
  const events: string[] = [];
  vi.stubGlobal("window", {
    localStorage: storage,
    dispatchEvent: (event: Event) => {
      events.push(event.type);
      return true;
    },
  });
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const NOW = new Date("2026-10-20T10:00:00.000Z");

describe("quiz draft persistence", () => {
  it("saves and loads the draft without consent and file", () => {
    const storage = memoryStorage();
    const events = installWindow(storage);
    saveDraft(
      {
        step: 3,
        answers: {
          type: "tempered",
          thickness: 10,
          area: 86.5,
          consent: true,
          file: { uploadToken: "tok", name: "a.pdf", size: 10 },
          contact: { company: "ООО", phone: "+7 (900" },
        },
        raw: { ...EMPTY_RAW, area: "86,5" },
      },
      NOW
    );

    const stored = JSON.parse(storage.data.get(QUIZ_DRAFT_KEY)!);
    expect(stored).toMatchObject({ v: 1, step: 3, savedAt: NOW.toISOString() });
    expect(stored.answers.consent).toBeUndefined();
    expect(stored.answers.file).toBeUndefined();
    expect(events).toEqual([QUIZ_DRAFT_EVENT]);

    const draft = loadDraft();
    expect(draft?.step).toBe(3);
    expect(draft?.answers).toEqual({
      type: "tempered",
      thickness: 10,
      area: 86.5,
      contact: { company: "ООО", phone: "+7 (900" },
    });
    expect(draft?.raw.area).toBe("86,5");
    expect(hasDraft()).toBe(true);
  });

  it("ignores broken JSON, foreign versions and invalid steps", () => {
    const storage = memoryStorage();
    installWindow(storage);
    storage.setItem(QUIZ_DRAFT_KEY, "{not json");
    expect(loadDraft()).toBeNull();
    storage.setItem(QUIZ_DRAFT_KEY, JSON.stringify({ v: 2, step: 1, answers: {} }));
    expect(loadDraft()).toBeNull();
    storage.setItem(QUIZ_DRAFT_KEY, JSON.stringify({ v: 1, step: 9, answers: {} }));
    expect(loadDraft()).toBeNull();
    storage.setItem(QUIZ_DRAFT_KEY, JSON.stringify({ v: 1, step: 2, answers: "x" }));
    expect(loadDraft()).toBeNull();
    expect(hasDraft()).toBe(false);
  });

  it("drops outdated option ids and keeps the rest", () => {
    const storage = memoryStorage();
    installWindow(storage);
    storage.setItem(
      QUIZ_DRAFT_KEY,
      JSON.stringify({ v: 1, step: 2, answers: { type: "stekloppaket", kind: "clear" }, raw: 5 })
    );
    const draft = loadDraft();
    expect(draft?.answers).toEqual({ kind: "clear" });
    expect(draft?.raw).toEqual(EMPTY_RAW);
  });

  it("clears the draft and notifies", () => {
    const storage = memoryStorage();
    const events = installWindow(storage);
    storage.setItem(QUIZ_DRAFT_KEY, JSON.stringify({ v: 1, step: 1, answers: {} }));
    clearDraft();
    expect(storage.data.has(QUIZ_DRAFT_KEY)).toBe(false);
    expect(events).toEqual([QUIZ_DRAFT_EVENT]);
  });

  it("works without storage (blocked or throwing)", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
      dispatchEvent: () => true,
    });
    expect(() => saveDraft({ step: 1, answers: {}, raw: EMPTY_RAW })).not.toThrow();
    expect(loadDraft()).toBeNull();
    expect(() => clearDraft()).not.toThrow();

    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    installWindow(throwing);
    expect(() => saveDraft({ step: 1, answers: {}, raw: EMPTY_RAW })).not.toThrow();
    expect(hasDraft()).toBe(false);
  });

  it("is a no-op on the server", () => {
    expect(loadDraft()).toBeNull();
    expect(() => saveDraft({ step: 1, answers: {}, raw: EMPTY_RAW })).not.toThrow();
  });
});
