import { describe, expect, it } from "vitest";
import { orderWarnings } from "./order-warnings";

const NOW = new Date("2026-11-20T06:00:00.000Z");

const OK_ORDER = {
  clientEmail: "client@example.com",
  notifyClient: true,
  manager: "user-1",
  currentStatus: "in_production",
  packPhotos: [],
  shipment: {},
  revoked: false,
  expiresAt: null,
};

const keys = (order: Parameters<typeof orderWarnings>[0]) =>
  orderWarnings(order, NOW).map((warning) => warning.key);

describe("orderWarnings", () => {
  it("is empty for a complete order", () => {
    expect(keys(OK_ORDER)).toEqual([]);
  });

  it("warns about a missing client e-mail or disabled notifications", () => {
    expect(keys({ ...OK_ORDER, clientEmail: "" })).toEqual(["no-email"]);
    expect(keys({ ...OK_ORDER, clientEmail: null })).toEqual(["no-email"]);
    expect(keys({ ...OK_ORDER, notifyClient: false })).toEqual(["notifications-off"]);
  });

  it("warns about a missing manager", () => {
    expect(keys({ ...OK_ORDER, manager: null })).toEqual(["no-manager"]);
  });

  it("warns about «Упаковано»/«Отгружено» without photos", () => {
    expect(keys({ ...OK_ORDER, currentStatus: "packed" })).toEqual(["no-photos"]);
    expect(keys({ ...OK_ORDER, currentStatus: "packed", packPhotos: [{}] })).toEqual([]);
    expect(keys({ ...OK_ORDER, currentStatus: "received" })).toEqual([]);
  });

  it("warns about «Отгружено» without carrier or waybill", () => {
    const shipped = { ...OK_ORDER, currentStatus: "shipped", packPhotos: [{}] };
    expect(keys({ ...shipped, shipment: { carrier: "ПЭК" } })).toEqual(["no-shipment"]);
    expect(keys({ ...shipped, shipment: { carrier: "ПЭК", waybill: "  " } })).toEqual([
      "no-shipment",
    ]);
    expect(keys({ ...shipped, shipment: { carrier: "ПЭК", waybill: "123" } })).toEqual([]);
  });

  it("flags revoked and expired links as danger", () => {
    const warnings = orderWarnings(
      { ...OK_ORDER, revoked: true, expiresAt: "2026-11-19T12:00:00.000Z" },
      NOW
    );
    expect(warnings.map((w) => [w.key, w.tone])).toEqual([
      ["revoked", "danger"],
      ["expired", "danger"],
    ]);
    expect(warnings[1]?.text).toContain("19.11.2026");
    expect(keys({ ...OK_ORDER, expiresAt: "2026-12-19T12:00:00.000Z" })).toEqual([]);
  });
});
