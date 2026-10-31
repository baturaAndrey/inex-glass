import { beforeAll, describe, expect, it, vi } from "vitest";
import type { TextFieldValidation } from "payload";

let validateMessengerUrl: TextFieldValidation;

beforeAll(async () => {
  // `users.ts` reads the env at import time (cookie settings); provide a minimal valid one.
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test");
  vi.stubEnv("PAYLOAD_SECRET", "test-payload-secret-test-payload-secret");
  ({ validateMessengerUrl } = await import("./users"));
});

describe("validateMessengerUrl", () => {
  const validate = (value: string | null) => validateMessengerUrl(value, {} as any);

  it.each([
    null,
    "",
    "  ",
    "https://t.me/inexglass",
    "https://wa.me/79514890409",
    "tg://resolve?domain=inexglass",
  ])("accepts %j", (value) => {
    expect(validate(value)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>",
    "http://t.me/x",
    "t.me/inexglass",
    "ftp://x",
  ])("rejects %s", (value) => {
    expect(validate(value)).toBe("Нужна ссылка https://… или tg://…");
  });
});
