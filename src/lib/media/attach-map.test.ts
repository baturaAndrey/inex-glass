import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATTACH_MAP,
  bindingTouches,
  canAttach,
  isWrite,
  resolveTarget,
  targetKey,
} from "../../../scripts/attach-map";
import type { Binding, ManifestEntryLike } from "../../../scripts/attach-map";

const MANIFEST_PATH = path.resolve(import.meta.dirname, "../../../public/generated/manifest.json");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ManifestEntryLike[];

const entry = (target: ManifestEntryLike["target"]): ManifestEntryLike => ({ id: "x", target });

describe("targetKey", () => {
  it("builds stable keys for doc, template and section targets", () => {
    expect(
      targetKey({ kind: "doc", collection: "glass-types", slug: "matovoe", field: "card.image" })
    ).toBe("doc:glass-types/matovoe#card.image");
    expect(targetKey({ kind: "template", slug: "home", field: "heroImage" })).toBe(
      "template:home#heroImage"
    );
    expect(targetKey({ kind: "section", slug: "forms", field: "backgroundKey" })).toBe(
      "section:forms#backgroundKey"
    );
  });
});

describe("resolveTarget", () => {
  it("maps a glass-type card to the document card field and its hub cards", () => {
    const result = resolveTarget(
      entry({ kind: "doc", collection: "glass-types", slug: "matovoe", field: "card.image" })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings).toEqual<Binding[]>([
      { kind: "docField", collection: "glass-types", slug: "matovoe", field: "card.image" },
      { kind: "cardLinks", hrefs: ["/zakalennoe-steklo/matovoe/"] },
    ]);
  });

  it("maps the home background to the hero block of the home page", () => {
    const result = resolveTarget(entry({ kind: "template", slug: "home", field: "heroImage" }));
    expect(result).toMatchObject({
      ok: true,
      bindings: [{ kind: "heroBlock", select: { home: true } }],
    });
  });

  it("maps a template background to every document of the collection", () => {
    const result = resolveTarget(
      entry({ kind: "template", slug: "processing", field: "heroImage" })
    );
    expect(result.ok && result.bindings[0]).toEqual({
      kind: "eachDoc",
      collection: "processing-services",
      field: "heroImage",
    });
  });

  it("maps the constructions hub (manifest says `pages`) to the constructions document", () => {
    const result = resolveTarget(
      entry({
        kind: "doc",
        collection: "pages",
        slug: "steklyannye-konstrukcii",
        field: "card.image",
      })
    );
    expect(result.ok && result.bindings[0]).toMatchObject({
      kind: "docField",
      collection: "constructions",
      slug: "steklyannye-konstrukcii",
    });
  });

  it("reports an unknown target as a map bug", () => {
    const result = resolveTarget(
      entry({
        kind: "doc",
        collection: "glass-types",
        slug: "nesushchestvuyushchee",
        field: "card.image",
      })
    );
    expect(result).toMatchObject({ ok: false, unknown: true });
  });

  it("reports a documented schema gap as «no target», not as a bug", () => {
    const result = resolveTarget(entry({ kind: "section", slug: "forms", field: "backgroundKey" }));
    expect(result).toMatchObject({ ok: false, unknown: false });
    expect(result.ok ? "" : result.reason).toMatch(/схем/);
  });

  it("does not resolve inherited object keys", () => {
    const result = resolveTarget(
      entry({ kind: "doc", collection: "pages", slug: "constructor", field: "card.image" })
    );
    expect(result.ok).toBe(false);
  });

  it("covers every target of the real manifest", () => {
    const unknown = manifest
      .map((item) => resolveTarget(item))
      .filter((result) => !result.ok && result.unknown)
      .map((result) => result.key);
    expect(unknown).toEqual([]);
  });

  it("binds every hero and catalog card target of the manifest (no gaps there)", () => {
    const catalog = new Set(["glass-types", "processing-services", "constructions"]);
    const gaps = manifest
      .filter((item) => item.target.kind === "doc" && catalog.has(item.target.collection ?? ""))
      .map((item) => resolveTarget(item))
      .filter((result) => !result.ok);
    expect(gaps).toEqual([]);
  });

  it("keeps the map free of stale targets", () => {
    const keys = new Set(manifest.map((item) => targetKey(item.target)));
    expect(Object.keys(ATTACH_MAP).filter((key) => !keys.has(key))).toEqual([]);
  });

  it("uses verbatim site paths (leading and trailing slash) for card links", () => {
    for (const rule of Object.values(ATTACH_MAP)) {
      for (const binding of rule.bindings ?? []) {
        if (binding.kind !== "cardLinks") continue;
        for (const href of binding.hrefs)
          expect(href).toMatch(/^\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/);
      }
    }
  });
});

describe("bindingTouches (--only)", () => {
  it("limits bindings to one collection", () => {
    const doc: Binding = {
      kind: "docField",
      collection: "articles",
      slug: "a",
      field: "card.image",
    };
    expect(bindingTouches(doc, "articles")).toBe(true);
    expect(bindingTouches(doc, "pages")).toBe(false);
    expect(bindingTouches({ kind: "heroBlock", select: { home: true } }, "pages")).toBe(true);
    expect(bindingTouches({ kind: "heroBlock", select: { home: true } }, "articles")).toBe(false);
    expect(bindingTouches({ kind: "cardLinks", hrefs: ["/a/"] }, "constructions")).toBe(true);
    expect(bindingTouches({ kind: "cardLinks", hrefs: ["/a/"] }, "articles")).toBe(false);
  });
});

describe("canAttach — never overwrite", () => {
  const MEDIA = "new-media";

  it("fills an empty slot", () => {
    expect(canAttach(null, MEDIA, false)).toBe("attach");
  });

  it("is a no-op when the slot already holds this media", () => {
    expect(canAttach({ id: MEDIA, isPlaceholder: true }, MEDIA, false)).toBe("unchanged");
    expect(canAttach({ id: MEDIA, isPlaceholder: true }, MEDIA, true)).toBe("unchanged");
  });

  it("never replaces a real image, even with the force flag", () => {
    expect(canAttach({ id: "real", isPlaceholder: false }, MEDIA, false)).toBe("skip-real");
    expect(canAttach({ id: "real", isPlaceholder: false }, MEDIA, true)).toBe("skip-real");
  });

  it("replaces another placeholder only with --force-replace-placeholders", () => {
    expect(canAttach({ id: "old", isPlaceholder: true }, MEDIA, false)).toBe("skip-placeholder");
    expect(canAttach({ id: "old", isPlaceholder: true }, MEDIA, true)).toBe("replace");
  });

  it("writes only on attach and replace", () => {
    expect(isWrite("attach")).toBe(true);
    expect(isWrite("replace")).toBe(true);
    expect(isWrite("unchanged")).toBe(false);
    expect(isWrite("skip-real")).toBe(false);
    expect(isWrite("skip-placeholder")).toBe(false);
  });
});
