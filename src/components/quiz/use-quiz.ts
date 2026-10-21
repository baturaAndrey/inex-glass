"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reachGoal, type GoalName } from "@/components/analytics/reach-goal";
import { formatErrorText, sizeErrorText } from "@/components/ig/file-upload";
import { getLeadAttribution } from "@/lib/client/attribution";
import { SubmitError, submitLead, useFormToken } from "@/lib/client/submit-lead";
import {
  ALLOWED_QUIZ_EXT,
  MAX_UPLOAD_BYTES,
  UploadFailure,
  uploadFile,
} from "@/lib/client/upload-file";
import {
  buildQuizLeadPayload,
  ERROR_FIELD_STEP,
  fieldErrorsFromServer,
  validateQuizPayload,
} from "./build-payload";
import { deriveQuiz, quizContext, submitFlags } from "./derive";
import { clearDraft, saveDraft } from "./persistence";
import { quizReducer, type QuizAction } from "./state";
import type {
  QuizConfig,
  QuizErrorField,
  QuizFieldErrors,
  QuizFile,
  QuizStep,
  QuizUiState,
} from "./types";

/**
 * Quiz controller: reducer + draft persistence + Metrika goals + file upload + submission.
 * Components get everything through the returned object and never talk to storage, analytics
 * or the API directly.
 */

/** Draft write debounce. */
export const DRAFT_SAVE_DELAY_MS = 300;

/** (не из teksty) Network/server failure of the drawing upload. */
export const UPLOAD_ERROR_TEXT = "Не удалось загрузить файл. Попробуйте ещё раз";

const STEP_GOALS: Record<QuizStep, GoalName> = {
  1: "quiz_step_1",
  2: "quiz_step_2",
  3: "quiz_step_3",
  4: "quiz_step_4",
  5: "quiz_step_5",
  6: "quiz_step_6",
  7: "quiz_step_7",
};

export type QuizSubmitStatus = "idle" | "submitting" | "done";

export interface QuizUploading {
  name: string;
  size: number;
  progress?: number | undefined;
}

/** How a drawing upload ended (what `submit()` waits for while it is in flight). */
type UploadOutcome = { kind: "done"; file: QuizFile } | { kind: "failed" } | { kind: "aborted" };

export interface UseQuizOptions {
  config: QuizConfig;
  initial: QuizUiState;
  entryPage: string;
  variant: "page" | "modal";
}

function currentPath(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export function useQuiz({ config, initial, entryPage, variant }: UseQuizOptions) {
  const [state, rawDispatch] = useReducer(quizReducer, initial);
  const [fieldErrors, setFieldErrors] = useState<QuizFieldErrors>({});
  const [focusRequest, setFocusRequest] = useState<{ field: QuizErrorField; seq: number } | null>(
    null
  );
  const [status, setStatus] = useState<QuizSubmitStatus>("idle");
  const [submitFailed, setSubmitFailed] = useState(false);
  const [uploading, setUploading] = useState<QuizUploading | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const { token, refresh } = useFormToken();

  const ctx = useMemo(() => quizContext(config), [config]);
  const derived = useMemo(() => deriveQuiz(state.answers, ctx), [state.answers, ctx]);

  /* ------------------------------ draft ------------------------------ */

  // The draft is (over)written only after the first user change: opening the quiz with a
  // pre-fill must not wipe a saved calculation the visitor has not touched yet.
  const dirtyRef = useRef(false);
  const stateRef = useRef(state);
  const saveTimerRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const flushDraft = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current || doneRef.current) return;
    const { step, answers, raw } = stateRef.current;
    saveDraft({ step, answers, raw });
  }, []);

  useEffect(() => {
    if (!dirtyRef.current || doneRef.current) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushDraft, DRAFT_SAVE_DELAY_MS);
  }, [state, flushDraft]);

  useEffect(() => {
    window.addEventListener("pagehide", flushDraft);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      // Unmount (modal closed, navigation): persist what is pending.
      flushDraft();
    };
  }, [flushDraft]);

  const dispatch = useCallback((action: QuizAction) => {
    dirtyRef.current = true;
    rawDispatch(action);
  }, []);

  /* ------------------------------ goals ------------------------------ */

  const goalPage = entryPage || currentPath();
  const startedRef = useRef(false);
  const passedStepsRef = useRef(new Set<QuizStep>());

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    reachGoal("quiz_start", {
      entry_page: goalPage,
      variant,
      resumed: initial.resumed,
    });
    // Once per mount by design: later prop changes do not restart the quiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passStep = useCallback((step: QuizStep) => {
    if (passedStepsRef.current.has(step)) return;
    passedStepsRef.current.add(step);
    reachGoal(STEP_GOALS[step]);
  }, []);

  /* ------------------------------ navigation ------------------------------ */

  const next = useCallback(() => {
    passStep(stateRef.current.step);
    dispatch({ type: "next" });
  }, [dispatch, passStep]);

  const back = useCallback(() => dispatch({ type: "back" }), [dispatch]);

  const skipFile = useCallback(() => {
    passStep(5);
    dispatch({ type: "skipFile" });
  }, [dispatch, passStep]);

  const clearError = useCallback((field: QuizErrorField) => {
    setFieldErrors((errors) => {
      if (errors[field] === undefined) return errors;
      const { [field]: _removed, ...rest } = errors;
      return rest;
    });
  }, []);

  /* ------------------------------ file ------------------------------ */

  const uploadAbortRef = useRef<AbortController | null>(null);
  // The upload in flight, so that `submit()` can wait for it instead of sending the lead
  // without the drawing. Cleared (before it settles) by the upload that set it.
  const pendingUploadRef = useRef<Promise<UploadOutcome> | null>(null);

  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const selectFile = useCallback(
    async (file: File) => {
      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setUploadError(null);
      setUploading({ name: file.name, size: file.size, progress: 0 });

      // Declared up front: a synchronous failure reaches `finally` before `run()` returns.
      let pending: Promise<UploadOutcome> | null = null;
      const run = async (): Promise<UploadOutcome> => {
        try {
          const uploaded = await uploadFile(file, {
            signal: controller.signal,
            formToken: token,
            purpose: "quiz",
            onProgress: (progress) =>
              setUploading((current) => (current ? { ...current, progress } : current)),
          });
          // Cleared or replaced while the response was on its way: the result is stale.
          if (controller.signal.aborted) return { kind: "aborted" };
          const quizFile: QuizFile = {
            uploadToken: uploaded.token,
            name: uploaded.name,
            size: uploaded.size,
          };
          dispatch({ type: "setFile", file: quizFile });
          reachGoal("file_upload", { ext: uploaded.ext });
          return { kind: "done", file: quizFile };
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return { kind: "aborted" };
          }
          const code = error instanceof UploadFailure ? error.code : "server";
          setUploadError(
            code === "format"
              ? formatErrorText(ALLOWED_QUIZ_EXT)
              : code === "size"
                ? sizeErrorText(MAX_UPLOAD_BYTES)
                : UPLOAD_ERROR_TEXT
          );
          return { kind: "failed" };
        } finally {
          if (uploadAbortRef.current === controller) {
            uploadAbortRef.current = null;
            setUploading(null);
          }
          if (pendingUploadRef.current === pending) pendingUploadRef.current = null;
        }
      };

      const promise = run();
      pending = promise;
      pendingUploadRef.current = promise;
      await promise;
      if (pendingUploadRef.current === promise) pendingUploadRef.current = null;
    },
    [dispatch, token]
  );

  const clearFile = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    pendingUploadRef.current = null;
    setUploading(null);
    setUploadError(null);
    dispatch({ type: "setFile", file: undefined });
  }, [dispatch]);

  /* ------------------------------ submit ------------------------------ */

  const showFieldErrors = useCallback((errors: QuizFieldErrors, first: QuizErrorField) => {
    setFieldErrors(errors);
    const step = ERROR_FIELD_STEP[first];
    if (step !== stateRef.current.step) rawDispatch({ type: "goTo", step });
    setFocusRequest((previous) => ({ field: first, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  const submit = useCallback(async () => {
    if (status !== "idle") return;
    setSubmitFailed(false);

    // 1. Blocking checks with the server schema (contacts, consent, unanswered choices).
    const draftAttribution = { entryPage: entryPage || "/", utm: {} };
    const check = validateQuizPayload(
      buildQuizLeadPayload(state, {
        formToken: token ?? "pending",
        attribution: draftAttribution,
        honeypot,
      })
    );
    if (!check.ok && check.first) {
      showFieldErrors(check.errors, check.first);
      return;
    }
    setFieldErrors({});

    // 2. No form token (request failed): get one and let the visitor retry.
    if (!token) {
      void refresh();
      setSubmitFailed(true);
      return;
    }

    setStatus("submitting");

    // 3. A drawing is still uploading: wait for it (a newer upload replaces the awaited one)
    // instead of sending the lead without the file. A failed upload keeps its error on step 5
    // and the lead is not sent; a cancelled one is sent without the file.
    let submitState = state;
    let pending = pendingUploadRef.current;
    if (pending) {
      let outcome: UploadOutcome = { kind: "aborted" };
      while (pending) {
        outcome = await pending;
        const latest = pendingUploadRef.current;
        pending = latest === pending ? null : latest;
      }
      if (outcome.kind === "failed") {
        setStatus("idle");
        rawDispatch({ type: "goTo", step: 5 });
        return;
      }
      // `state` of this render predates the upload result: patch the file in explicitly.
      const { file: _stale, ...answers } = state.answers;
      submitState = {
        ...state,
        answers: outcome.kind === "done" ? { ...answers, file: outcome.file } : answers,
      };
    }

    try {
      const attribution = await getLeadAttribution(entryPage || undefined);
      const payload = buildQuizLeadPayload(submitState, {
        formToken: token,
        attribution,
        honeypot,
      });
      await submitLead(payload);

      doneRef.current = true;
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      clearDraft();
      passStep(7);
      const flags = submitFlags(payload.answers as typeof state.answers, config);
      reachGoal("quiz_submit", { type: state.answers.type ?? "", flags: flags.join(",") });
      setStatus("done");
    } catch (error) {
      setStatus("idle");
      if (error instanceof SubmitError) {
        if (error.code === "token" && error.serverCode !== "too_fast") void refresh();
        const server = error.fieldErrors ? fieldErrorsFromServer(error.fieldErrors) : null;
        if (server?.first) {
          showFieldErrors(server.errors, server.first);
          return;
        }
        // The temp file expired or failed the re-check: ask for the drawing again on step 5.
        const fileMessage = Object.entries(error.fieldErrors ?? {}).find(
          ([path]) => path.startsWith("uploadTokens") || path === "answers.file"
        )?.[1];
        if (fileMessage) {
          rawDispatch({ type: "setFile", file: undefined });
          setUploadError(fileMessage);
          rawDispatch({ type: "goTo", step: 5 });
          return;
        }
      }
      setSubmitFailed(true);
    }
  }, [status, entryPage, state, token, honeypot, showFieldErrors, refresh, passStep, config]);

  return {
    state,
    dispatch,
    derived,
    config,
    next,
    back,
    skipFile,
    submit,
    status,
    submitFailed,
    fieldErrors,
    clearError,
    focusRequest,
    uploading,
    uploadError,
    setUploadError,
    selectFile,
    clearFile,
    honeypot,
    setHoneypot,
  };
}

export type QuizController = ReturnType<typeof useQuiz>;
