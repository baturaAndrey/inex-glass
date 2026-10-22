import { describe, expect, it } from "vitest";
import { JOB_WRITE_CONTEXT } from "@/jobs/shared";
import { setUpdatedBy, updatedByField } from "./set-updated-by";

const MANAGER = { id: "manager-1", role: "manager" };

const args = (options: {
  user?: unknown;
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
}) =>
  ({
    data: options.data ?? { title: "x" },
    req: { user: options.user ?? null },
    context: options.context ?? {},
    operation: "update",
  }) as any;

describe("setUpdatedBy", () => {
  it("stamps the id of the user who saves", () => {
    expect(setUpdatedBy(args({ user: MANAGER }))).toEqual({ title: "x", updatedBy: MANAGER.id });
  });

  it("stamps null («Система») without a user", () => {
    expect(setUpdatedBy(args({}))).toEqual({ title: "x", updatedBy: null });
  });

  it("overrides a value sent by the client", () => {
    const result = setUpdatedBy(args({ user: MANAGER, data: { updatedBy: "forged" } }));
    expect(result).toEqual({ updatedBy: MANAGER.id });
  });

  it("keeps the stored value for bookkeeping writes (context.keepUpdatedBy)", () => {
    const data = { newLeadNotifiedAt: "2026-10-22T10:00:00.000Z" };
    expect(setUpdatedBy(args({ data, context: { keepUpdatedBy: true } }))).toBe(data);
    expect(setUpdatedBy(args({ data, context: { ...JOB_WRITE_CONTEXT } }))).toBe(data);
  });
});

describe("updatedByField", () => {
  it("is a read-only, system-only relationship to users without population", () => {
    const field = updatedByField();
    expect(field).toMatchObject({
      name: "updatedBy",
      type: "relationship",
      relationTo: "users",
      maxDepth: 0,
      admin: { readOnly: true, position: "sidebar" },
    });
    expect(field.access?.create?.({} as any)).toBe(false);
    expect(field.access?.update?.({} as any)).toBe(false);
  });

  it("is readable by staff only (no staff UUID for anonymous REST/GraphQL)", () => {
    const read = updatedByField().access?.read;
    const as = (user: unknown) => read?.({ req: { user } } as any);
    expect(as(null)).toBe(false);
    expect(as({ id: "u", role: "manager" })).toBe(true);
    expect(as({ id: "u", role: "admin" })).toBe(true);
  });
});
