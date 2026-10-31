import { describe, expect, it, vi } from "vitest";
import {
  assignDefaultStatus,
  normalizeContacts,
  validateInn,
  validateLeadStatus,
} from "./lead-hooks";

/** Minimal collection hook arguments; the hooks only use `data`, `operation`, `originalDoc`, `req`. */
function hookArgs(options: {
  data: Record<string, unknown>;
  operation: "create" | "update";
  originalDoc?: Record<string, unknown>;
  find?: ReturnType<typeof vi.fn>;
}) {
  const { data, operation, originalDoc, find = vi.fn() } = options;
  return { data, operation, originalDoc, req: { payload: { find } } } as any;
}

/** Field validation options; `validateLeadStatus` only reads `operation` and `previousValue`. */
const statusOptions = (operation: "create" | "update", previousValue?: unknown) =>
  ({ operation, previousValue }) as any;

/** `find` answering the "isDefault" query and then the "first by order" query. */
const findStatuses = (flagged: unknown[], first: unknown[] = []) =>
  vi.fn().mockResolvedValueOnce({ docs: flagged }).mockResolvedValueOnce({ docs: first });

describe("assignDefaultStatus", () => {
  it("assigns the flagged default on create", async () => {
    const find = findStatuses([{ id: "new" }]);
    const result = await assignDefaultStatus(hookArgs({ data: {}, operation: "create", find }));
    expect(result).toEqual({ status: "new" });
  });

  it("falls back to the first funnel stage", async () => {
    const find = findStatuses([], [{ id: "first" }]);
    const result = await assignDefaultStatus(hookArgs({ data: {}, operation: "create", find }));
    expect(result).toEqual({ status: "first" });
  });

  it("heals a lead saved before the seed on its next update", async () => {
    const find = findStatuses([{ id: "new" }]);
    const result = await assignDefaultStatus(
      hookArgs({ data: { status: null }, operation: "update", originalDoc: { status: null }, find })
    );
    expect(result).toEqual({ status: "new" });
  });

  it("does not replace a status the user clears on update", async () => {
    const find = vi.fn();
    const data = { status: null };
    const result = await assignDefaultStatus(
      hookArgs({ data, operation: "update", originalDoc: { status: "in-work" }, find })
    );
    expect(result).toBe(data);
    expect(find).not.toHaveBeenCalled();
  });

  it("keeps the lead without status when none exists yet", async () => {
    const find = findStatuses([], []);
    const data = {};
    const result = await assignDefaultStatus(hookArgs({ data, operation: "update", find }));
    expect(result).toBe(data);
  });

  it("keeps an explicit status", async () => {
    const find = vi.fn();
    const data = { status: { id: "kp" } };
    const result = await assignDefaultStatus(hookArgs({ data, operation: "create", find }));
    expect(result).toBe(data);
    expect(find).not.toHaveBeenCalled();
  });
});

describe("validateLeadStatus", () => {
  it("accepts a set status", () => {
    expect(validateLeadStatus("new", statusOptions("update", "new"))).toBe(true);
    expect(validateLeadStatus({ id: "new" } as any, statusOptions("update"))).toBe(true);
  });

  it("accepts an empty status while no status exists (create or stored empty)", () => {
    expect(validateLeadStatus(null, statusOptions("create"))).toBe(true);
    expect(validateLeadStatus(null, statusOptions("update", null))).toBe(true);
    expect(validateLeadStatus(undefined, statusOptions("update", undefined))).toBe(true);
  });

  it("rejects clearing an existing status", () => {
    expect(validateLeadStatus(null, statusOptions("update", "new"))).toBe("Выберите статус заявки");
  });
});

describe("normalizeContacts", () => {
  it("normalizes phone, e-mail and INN and keeps the typed phone", () => {
    const result = normalizeContacts(
      hookArgs({
        data: { phone: " 8 (951) 489-04-09 ", email: " A@B.RU ", inn: "7451-234 567" },
        operation: "create",
      })
    );
    expect(result).toEqual({
      phone: "+79514890409",
      phoneRaw: "8 (951) 489-04-09",
      email: "a@b.ru",
      inn: "7451234567",
    });
  });

  it("keeps an INN without digits as typed so validation rejects it", () => {
    const result = normalizeContacts(hookArgs({ data: { inn: "нет" }, operation: "create" }));
    expect(result).toEqual({ inn: "нет" });
    expect(validateInn("нет", {} as any)).toBe("ИНН должен содержать 10 или 12 цифр");
  });

  it("clears a blank INN", () => {
    const result = normalizeContacts(hookArgs({ data: { inn: "  " }, operation: "create" }));
    expect(result).toEqual({ inn: null });
  });
});
