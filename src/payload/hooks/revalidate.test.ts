import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateCollection, revalidateGlobal } from "./revalidate";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const revalidateTagMock = vi.mocked(revalidateTag);

/** Minimal hook arguments: the hooks only read `doc`, `previousDoc` and `req.context`. */
function args(
  doc: Record<string, unknown>,
  context: Record<string, unknown> = {},
  previousDoc: Record<string, unknown> = {}
) {
  // Partial Payload hook arguments; `never` lets the object satisfy any hook signature.
  return { doc, previousDoc, req: { context } } as never;
}

describe("revalidateGlobal", () => {
  beforeEach(() => {
    revalidateTagMock.mockReset();
  });

  it("skips revalidation when req.context.disableRevalidate is set", () => {
    const doc = { id: "1" };
    const result = revalidateGlobal("prices")(args(doc, { disableRevalidate: true }));
    expect(result).toBe(doc);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it.each(["prices", "promo", "contacts"])("expires %s immediately", (slug) => {
    revalidateGlobal(slug)(args({}));
    expect(revalidateTagMock).toHaveBeenCalledWith(`global:${slug}`, { expire: 0 });
  });

  it.each(["conditions", "tech-params", "navigation", "site-settings"])(
    "uses stale-while-revalidate for %s",
    (slug) => {
      revalidateGlobal(slug)(args({}));
      expect(revalidateTagMock).toHaveBeenCalledWith(`global:${slug}`, "max");
    }
  );

  it("swallows errors thrown by revalidateTag outside a Next request", () => {
    revalidateTagMock.mockImplementation(() => {
      throw new Error("static generation store missing");
    });
    const doc = { id: "1" };
    expect(() => revalidateGlobal("prices")(args(doc))).not.toThrow();
    expect(revalidateGlobal("prices")(args(doc))).toBe(doc);
  });
});

describe("revalidateCollection", () => {
  beforeEach(() => {
    revalidateTagMock.mockReset();
  });

  it("revalidates collection and document tags on change", () => {
    const doc = { id: "abc", _status: "published" };
    const result = revalidateCollection("pages").afterChange(args(doc));
    expect(result).toBe(doc);
    expect(revalidateTagMock).toHaveBeenCalledWith("collection:pages", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("doc:pages:abc", "max");
  });

  it("does not revalidate a draft without a published version", () => {
    revalidateCollection("pages").afterChange(
      args({ id: "abc", _status: "draft" }, {}, { _status: "draft" })
    );
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidates when a published document is turned back into a draft", () => {
    revalidateCollection("pages").afterChange(
      args({ id: "abc", _status: "draft" }, {}, { _status: "published" })
    );
    expect(revalidateTagMock).toHaveBeenCalledWith("collection:pages", "max");
  });

  it("revalidates collections without drafts", () => {
    revalidateCollection("leads").afterChange(args({ id: "1" }));
    expect(revalidateTagMock).toHaveBeenCalledWith("doc:leads:1", "max");
  });

  it("skips change and delete hooks when disableRevalidate is set", () => {
    const hooks = revalidateCollection("pages");
    hooks.afterChange(args({ id: "1" }, { disableRevalidate: true }));
    hooks.afterDelete(args({ id: "1" }, { disableRevalidate: true }));
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidates on delete and swallows revalidateTag errors", () => {
    revalidateTagMock.mockImplementationOnce(() => {
      throw new Error("outside request");
    });
    const doc = { id: "9" };
    expect(revalidateCollection("objects").afterDelete(args(doc))).toBe(doc);
    expect(revalidateTagMock).toHaveBeenCalledWith("doc:objects:9", "max");
  });
});
