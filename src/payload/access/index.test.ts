import { describe, expect, it } from "vitest";
import { adminOrSelfFieldAccess } from "./index";
import type { FieldAccess } from "payload";

type FieldAccessArgs = Parameters<FieldAccess>[0];

const ADMIN = { id: "admin-1", role: "admin" };
const MANAGER = { id: "manager-1", role: "manager" };
const OTHER_MANAGER_ID = "manager-2";

/** Builds the minimal field-access args the helper reads: `req.user`, `id`, `doc`. */
const call = (user: unknown, target: { id?: unknown; doc?: unknown } = {}) =>
  adminOrSelfFieldAccess({ req: { user }, ...target } as unknown as FieldAccessArgs);

describe("adminOrSelfFieldAccess", () => {
  it("allows an admin on any document", () => {
    expect(call(ADMIN, { doc: { id: OTHER_MANAGER_ID } })).toBe(true);
    expect(call(ADMIN)).toBe(true);
  });

  it("allows a manager on their own document (by doc or by id)", () => {
    expect(call(MANAGER, { doc: { id: MANAGER.id } })).toBe(true);
    expect(call(MANAGER, { id: MANAGER.id })).toBe(true);
  });

  it("denies a manager on another manager's document", () => {
    expect(call(MANAGER, { doc: { id: OTHER_MANAGER_ID } })).toBe(false);
    expect(call(MANAGER, { id: OTHER_MANAGER_ID })).toBe(false);
  });

  it("denies a manager when the target document is unknown", () => {
    expect(call(MANAGER)).toBe(false);
  });

  it("denies without a user or with an unknown role", () => {
    expect(call(null, { doc: { id: MANAGER.id } })).toBe(false);
    expect(call(undefined)).toBe(false);
    expect(call({ id: MANAGER.id, role: "guest" }, { doc: { id: MANAGER.id } })).toBe(false);
  });
});
