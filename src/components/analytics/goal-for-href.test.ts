import { describe, expect, it } from "vitest";
import { goalForHref } from "./goal-for-href";

describe("goalForHref", () => {
  it.each([
    ["tel:+74950000000", "click_phone"],
    ["TEL:+74950000000", "click_phone"],
    ["  tel:+7 495 000-00-00", "click_phone"],
    ["mailto:info@example.ru", "click_email"],
    ["MailTo:info@example.ru?subject=КП", "click_email"],
    ["\nmailto:info@example.ru", "click_email"],
  ])("%s → %s", (href, goal) => {
    expect(goalForHref(href)).toBe(goal);
  });

  it.each([
    "https://example.ru/tel:123",
    "/kontakty/",
    "sms:+74950000000",
    "javascript:void(0)",
    "#mailto",
    "",
    null,
    undefined,
  ])("%s → null", (href) => {
    expect(goalForHref(href)).toBeNull();
  });
});
