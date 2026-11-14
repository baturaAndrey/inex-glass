import { describe, expect, it } from "vitest";
import { REFUSE_REASON_REQUIRED_MESSAGE } from "@/payload/hooks/lead-messages";
import {
  buildLeadPatch,
  needsContractConfirm,
  parseKpAmount,
  parsePayloadErrors,
  reasonError,
  rebaseForm,
} from "./processing";
import type { ProcessingForm, ProcessingStatus } from "./processing";

const STATUSES: ProcessingStatus[] = [
  { id: "new", name: "Новая", isContract: false, requiresReason: false },
  { id: "work", name: "В работе", isContract: false, requiresReason: false },
  { id: "contract", name: "Договор", isContract: true, requiresReason: false },
  { id: "refused", name: "Отказ", isContract: false, requiresReason: true },
];

const BASE: ProcessingForm = {
  status: "new",
  assignee: "u1",
  flags: ["urgent", "needs_docs"],
  refuseReasonCode: null,
  refuseReason: "",
  kpAmount: null,
};

const form = (patch: Partial<ProcessingForm>): ProcessingForm => ({ ...BASE, ...patch });

describe("buildLeadPatch", () => {
  it("is empty for an unchanged form (flag order does not matter)", () => {
    expect(buildLeadPatch(BASE, form({ flags: ["needs_docs", "urgent"] }), STATUSES)).toEqual({});
  });

  it("returns only the changed keys", () => {
    expect(
      buildLeadPatch(BASE, form({ status: "work", flags: ["urgent"], kpAmount: 168000 }), STATUSES)
    ).toEqual({ status: "work", flags: ["urgent"], kpAmount: 168000 });
  });

  it("sends assignee null for «Не назначен»", () => {
    expect(buildLeadPatch(BASE, form({ assignee: "" }), STATUSES)).toEqual({ assignee: null });
    expect(buildLeadPatch(BASE, form({ assignee: null }), STATUSES)).toEqual({ assignee: null });
  });

  it("sends an emptied kpAmount as null", () => {
    expect(buildLeadPatch(form({ kpAmount: 5 }), form({ kpAmount: null }), STATUSES)).toEqual({
      kpAmount: null,
    });
  });

  it("sends the changed refusal fields with a requiresReason status", () => {
    expect(
      buildLeadPatch(
        BASE,
        form({ status: "refused", refuseReasonCode: "other", refuseReason: "  Нет бюджета " }),
        STATUSES
      )
    ).toEqual({ status: "refused", refuseReasonCode: "other", refuseReason: "Нет бюджета" });
  });

  it("does not resend an unchanged stored reason", () => {
    const stored = form({ status: "work", refuseReasonCode: "expensive" });
    expect(buildLeadPatch(stored, { ...stored, status: "refused" }, STATUSES)).toEqual({
      status: "refused",
    });
  });

  it("drops the hidden refusal fields of a status without requiresReason", () => {
    expect(
      buildLeadPatch(BASE, form({ status: "work", refuseReasonCode: "expensive" }), STATUSES)
    ).toEqual({ status: "work" });
  });
});

describe("needsContractConfirm", () => {
  it("asks when the lead enters a contract status", () => {
    expect(needsContractConfirm("new", "contract", STATUSES)).toBe(true);
    expect(needsContractConfirm(null, "contract", STATUSES)).toBe(true);
  });

  it("does not ask otherwise", () => {
    expect(needsContractConfirm("contract", "contract", STATUSES)).toBe(false);
    expect(needsContractConfirm("new", "work", STATUSES)).toBe(false);
    expect(needsContractConfirm("new", null, STATUSES)).toBe(false);
    expect(needsContractConfirm("new", "unknown", STATUSES)).toBe(false);
  });
});

describe("reasonError", () => {
  it("accepts a code other than «Другое» without a text", () => {
    expect(reasonError(form({ status: "refused", refuseReasonCode: "expensive" }), STATUSES)).toBe(
      null
    );
  });

  it("requires the text for «Другое» and for no code", () => {
    expect(reasonError(form({ status: "refused", refuseReasonCode: "other" }), STATUSES)).toBe(
      REFUSE_REASON_REQUIRED_MESSAGE
    );
    expect(reasonError(form({ status: "refused", refuseReason: "   " }), STATUSES)).toBe(
      REFUSE_REASON_REQUIRED_MESSAGE
    );
  });

  it("accepts a text alone (legacy) or «Другое» with a text", () => {
    expect(reasonError(form({ status: "refused", refuseReason: "Дорого" }), STATUSES)).toBe(null);
    expect(
      reasonError(
        form({ status: "refused", refuseReasonCode: "other", refuseReason: "Передумали" }),
        STATUSES
      )
    ).toBe(null);
  });

  it("ignores statuses without requiresReason", () => {
    expect(reasonError(form({ status: "work", refuseReasonCode: "other" }), STATUSES)).toBe(null);
  });
});

describe("parsePayloadErrors", () => {
  it("reads the field errors of a ValidationError", () => {
    expect(
      parsePayloadErrors({
        errors: [
          {
            name: "ValidationError",
            message: "The following field is invalid: refuseReason",
            data: {
              collection: "leads",
              errors: [
                { path: "refuseReason", message: REFUSE_REASON_REQUIRED_MESSAGE },
                { path: "refuseReason", message: "second message is ignored" },
                { path: "kpAmount", message: "Минимум 0" },
                { message: "no path" },
                "garbage",
              ],
            },
          },
        ],
      })
    ).toEqual({
      fields: { refuseReason: REFUSE_REASON_REQUIRED_MESSAGE, kpAmount: "Минимум 0" },
      message: "The following field is invalid: refuseReason",
    });
  });

  it("gives no message for an error without data (403)", () => {
    expect(
      parsePayloadErrors({ errors: [{ message: "You are not allowed to perform this action." }] })
    ).toEqual({ fields: {}, message: null });
  });

  it("survives garbage", () => {
    for (const body of [
      null,
      undefined,
      "<html>",
      42,
      [],
      {},
      { errors: "x" },
      { errors: [null] },
    ]) {
      expect(parsePayloadErrors(body)).toEqual({ fields: {}, message: null });
    }
  });
});

describe("rebaseForm", () => {
  it("takes new server values for untouched fields and keeps the edits", () => {
    const edited = form({ kpAmount: 1000 });
    const fresh = form({ assignee: "u2", flags: ["urgent"] });
    expect(rebaseForm(BASE, fresh, edited)).toEqual({ ...fresh, kpAmount: 1000 });
  });
});

describe("parseKpAmount", () => {
  it("parses numbers and treats empty or invalid input as null", () => {
    expect(parseKpAmount("168000")).toBe(168000);
    expect(parseKpAmount(" ")).toBe(null);
    expect(parseKpAmount("abc")).toBe(null);
  });
});
