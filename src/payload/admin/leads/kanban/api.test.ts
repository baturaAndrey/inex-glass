import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPayloadError, PATCH_FALLBACK_MESSAGE, patchLead } from "./api";

describe("extractPayloadError", () => {
  it("reads the field errors of a ValidationError", () => {
    expect(
      extractPayloadError({
        errors: [
          {
            name: "ValidationError",
            message: "The following field is invalid: refuseReason",
            data: {
              collection: "leads",
              errors: [{ path: "refuseReason", message: "Укажите причину отказа" }],
            },
          },
        ],
      })
    ).toEqual({
      message: "Укажите причину отказа",
      fieldErrors: [{ path: "refuseReason", message: "Укажите причину отказа" }],
    });
  });

  it("falls back to the error message", () => {
    expect(
      extractPayloadError({ errors: [{ message: "You are not allowed to perform this action." }] })
    ).toEqual({
      message: "You are not allowed to perform this action.",
      fieldErrors: [],
    });
  });

  it("survives null, HTML and garbage", () => {
    const fallback = { message: PATCH_FALLBACK_MESSAGE, fieldErrors: [] };
    expect(extractPayloadError(null)).toEqual(fallback);
    expect(extractPayloadError("<html>502 Bad Gateway</html>")).toEqual(fallback);
    expect(extractPayloadError({ errors: [] })).toEqual(fallback);
    expect(extractPayloadError({ errors: [{ data: { errors: [{ path: "x" }] } }] })).toEqual(
      fallback
    );
  });
});

describe("patchLead", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes the lead with the session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(patchLead("abc-1", { status: "s1" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/leads/abc-1/?depth=0", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "s1" }),
    });
  });

  it("returns the server error", async () => {
    const body = { errors: [{ data: { errors: [{ path: "refuseReason", message: "Нет" }] } }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 }))
    );
    await expect(patchLead("x", {})).resolves.toEqual({
      ok: false,
      message: "Нет",
      fieldErrors: [{ path: "refuseReason", message: "Нет" }],
    });
  });

  it("handles an HTML error page and a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 500 }))
    );
    await expect(patchLead("x", {})).resolves.toMatchObject({
      ok: false,
      message: PATCH_FALLBACK_MESSAGE,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(patchLead("x", {})).resolves.toMatchObject({
      ok: false,
      message: PATCH_FALLBACK_MESSAGE,
    });
  });
});
