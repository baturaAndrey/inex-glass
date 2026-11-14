import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadedFile } from "@/lib/client/upload-file";
import { DEFAULT_TECH_LIMITS, SEED_PRICES_2026_10_15 } from "@/lib/domain";
import { createInitialState, quizReducer, type QuizAction } from "./state";
import type { QuizConfig, QuizUiState } from "./types";

/** Network edges of the quiz controller; everything else (reducer, payload, schema) is real. */
const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  submitLead: vi.fn(),
  refresh: vi.fn(async () => {}),
}));

vi.mock("@/lib/client/upload-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/upload-file")>()),
  uploadFile: mocks.uploadFile,
}));

vi.mock("@/lib/client/submit-lead", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client/submit-lead")>()),
  submitLead: mocks.submitLead,
  useFormToken: () => ({ token: "form-token", refresh: mocks.refresh }),
}));

vi.mock("@/lib/client/attribution", () => ({
  getLeadAttribution: async () => ({ entryPage: "/", utm: {}, extra: { yclid: "42" } }),
}));

vi.mock("@/components/analytics/reach-goal", () => ({ reachGoal: vi.fn() }));

const { useQuiz, UPLOAD_ERROR_TEXT } = await import("./use-quiz");
const { UploadFailure } = await import("@/lib/client/upload-file");

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

const ANSWERED: QuizAction[] = [
  { type: "setType", value: "tempered" },
  { type: "setThickness", value: 10 },
  { type: "setKind", value: "clear" },
  { type: "setContact", key: "company", value: "ООО Стройка" },
  { type: "setContact", key: "name", value: "Иван" },
  { type: "setContact", key: "phone", value: "+7 (900) 123-45-67" },
  { type: "patch", patch: { consent: true } },
  { type: "goTo", step: 7 },
];

const UPLOADED: UploadedFile = {
  token: "upload-token",
  name: "drawing.pdf",
  size: 1024,
  ext: "pdf",
};

function initialState(): QuizUiState {
  return ANSWERED.reduce(quizReducer, createInitialState());
}

/** A promise the test settles by hand (the upload "in flight"). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderQuiz() {
  return renderHook(() =>
    useQuiz({ config: CONFIG, initial: initialState(), entryPage: "/", variant: "page" })
  );
}

const drawing = () => new File(["%PDF"], "drawing.pdf", { type: "application/pdf" });

beforeEach(() => {
  mocks.submitLead.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("useQuiz submit while the drawing is uploading", () => {
  it("waits for the upload and sends the lead with the file", async () => {
    const upload = deferred<UploadedFile>();
    mocks.uploadFile.mockReturnValue(upload.promise);
    const { result } = renderQuiz();

    act(() => void result.current.selectFile(drawing()));
    expect(result.current.uploading).not.toBeNull();

    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.submit();
    });
    await waitFor(() => expect(result.current.status).toBe("submitting"));
    expect(mocks.submitLead).not.toHaveBeenCalled();

    await act(async () => {
      upload.resolve(UPLOADED);
      await submitted;
    });

    expect(mocks.submitLead).toHaveBeenCalledTimes(1);
    const payload = mocks.submitLead.mock.calls[0]?.[0] as {
      uploadTokens?: string[];
      answers: Record<string, unknown>;
    };
    expect(payload.uploadTokens).toEqual(["upload-token"]);
    expect(payload.answers.file).toEqual({
      uploadToken: "upload-token",
      name: "drawing.pdf",
      size: 1024,
    });
    expect(payload.answers).not.toHaveProperty("noFile");
    expect(payload.answers.attribution).toEqual({ yclid: "42" });
    expect(result.current.status).toBe("done");
  });

  it("does not send the lead when the upload fails and shows the upload error on step 5", async () => {
    const upload = deferred<UploadedFile>();
    mocks.uploadFile.mockReturnValue(upload.promise);
    const { result } = renderQuiz();

    act(() => void result.current.selectFile(drawing()));
    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.submit();
    });

    await act(async () => {
      upload.reject(new UploadFailure("network", "offline"));
      await submitted;
    });

    expect(mocks.submitLead).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.uploadError).toBe(UPLOAD_ERROR_TEXT);
    expect(result.current.state.step).toBe(5);
  });

  it("sends the lead without a file when the upload was cancelled", async () => {
    const upload = deferred<UploadedFile>();
    mocks.uploadFile.mockImplementation(
      (_file: File, opts: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          opts.signal?.addEventListener("abort", () =>
            reject(new DOMException("Upload aborted", "AbortError"))
          );
          void upload.promise.then(resolve);
        })
    );
    const { result } = renderQuiz();

    act(() => void result.current.selectFile(drawing()));
    let submitted!: Promise<void>;
    act(() => {
      submitted = result.current.submit();
    });

    await act(async () => {
      result.current.clearFile();
      await submitted;
    });

    expect(mocks.submitLead).toHaveBeenCalledTimes(1);
    const payload = mocks.submitLead.mock.calls[0]?.[0] as { uploadTokens?: string[] };
    expect(payload.uploadTokens).toBeUndefined();
  });

  it("submits right away when no upload is in flight", async () => {
    const { result } = renderQuiz();
    await act(async () => {
      await result.current.submit();
    });
    expect(mocks.uploadFile).not.toHaveBeenCalled();
    expect(mocks.submitLead).toHaveBeenCalledTimes(1);
  });
});
