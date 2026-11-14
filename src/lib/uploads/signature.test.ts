import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ALLOWED_EXTENSIONS, isReadableImage, validateFile } from "./signature";

const bytes = (...values: number[]) => Buffer.from(values);
const ascii = (text: string) => Buffer.from(text, "latin1");

const PDF = ascii("%PDF-1.7\n%âãÏÓ\n1 0 obj");
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46);
const DWG = ascii("AC1032\u0000\u0000\u0000\u0000\u0000\u0001");
const DXF_ASCII = ascii("  0\r\nSECTION\r\n  2\r\nHEADER\r\n");
const DXF_BOM = Buffer.concat([bytes(0xef, 0xbb, 0xbf), ascii("0\nSECTION\n2\nHEADER\n")]);
const DXF_BINARY = ascii("AutoCAD Binary DXF\r\n\u001a\u0000");
const EXE = ascii("MZ\u0090\u0000\u0003\u0000\u0000\u0000");
const HTML = ascii("<!doctype html><script>alert(1)</script>");

describe("validateFile", () => {
  it.each([
    ["pdf", PDF, "pdf"],
    ["png", PNG, "png"],
    ["jpg", JPEG, "jpeg"],
    ["jpeg", JPEG, "jpeg"],
    ["dwg", DWG, "dwg"],
    ["dxf", DXF_ASCII, "dxf"],
    ["dxf", DXF_BINARY, "dxf"],
    ["dxf", DXF_BOM, "dxf"],
  ] as const)("accepts a valid .%s in the quiz", (ext, head, kind) => {
    expect(validateFile(ext, head, "quiz")).toEqual({ ok: true, kind });
  });

  it.each([
    ["pdf", PNG],
    ["png", JPEG],
    ["jpg", PDF],
    ["dwg", PDF],
    ["dxf", HTML],
    ["pdf", Buffer.alloc(0)],
  ] as const)("rejects a .%s with foreign or empty content", (ext, head) => {
    expect(validateFile(ext, head, "quiz")).toEqual({ ok: false, reason: "format" });
  });

  it("rejects a renamed executable", () => {
    expect(validateFile("pdf", EXE, "form")).toEqual({ ok: false, reason: "format" });
    expect(validateFile("exe", EXE, "quiz")).toEqual({ ok: false, reason: "format" });
  });

  it("allows JPG/PNG only for the quiz", () => {
    expect(validateFile("jpg", JPEG, "form")).toEqual({ ok: false, reason: "format" });
    expect(validateFile("png", PNG, "form")).toEqual({ ok: false, reason: "format" });
    expect(validateFile("pdf", PDF, "form")).toEqual({ ok: true, kind: "pdf" });
    expect(validateFile("dwg", DWG, "form")).toEqual({ ok: true, kind: "dwg" });
  });

  it("ignores extension case and a leading dot", () => {
    expect(validateFile("PDF", PDF, "form")).toEqual({ ok: true, kind: "pdf" });
    expect(validateFile(".Dwg", DWG, "form")).toEqual({ ok: true, kind: "dwg" });
  });

  it("requires a PDF trailer (%%EOF + xref) in the tail when the tail is given", () => {
    const trailer = ascii("xref\n0 1\ntrailer<<>>\nstartxref\n9\n%%EOF\n");
    expect(validateFile("pdf", PDF, "form", trailer)).toEqual({ ok: true, kind: "pdf" });
    const rejected = { ok: false, reason: "format" };
    expect(validateFile("pdf", PDF, "form", ascii("endobj\n"))).toEqual(rejected);
    expect(validateFile("pdf", PDF, "form", ascii("%%EOF\n"))).toEqual(rejected);
    // Non-PDF kinds ignore the tail.
    expect(validateFile("dwg", DWG, "form", ascii("x"))).toEqual({ ok: true, kind: "dwg" });
  });

  it("keeps the allow-lists of the spec", () => {
    expect(ALLOWED_EXTENSIONS.form).toEqual(["dwg", "dxf", "pdf"]);
    expect(ALLOWED_EXTENSIONS.quiz).toEqual(["dwg", "dxf", "pdf", "jpg", "jpeg", "png"]);
  });
});

describe("isReadableImage", () => {
  it("accepts decodable images and rejects truncated or mislabeled ones", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "t17-sig-"));
    try {
      const image = sharp({ create: { width: 3, height: 2, channels: 3, background: "#777" } });
      const png = path.join(dir, "a.png");
      const jpg = path.join(dir, "a.jpg");
      const broken = path.join(dir, "b.jpg");
      await writeFile(png, await image.clone().png().toBuffer());
      await writeFile(jpg, await image.clone().jpeg().toBuffer());
      await writeFile(broken, JPEG);

      expect(await isReadableImage("png", png)).toBe(true);
      expect(await isReadableImage("jpeg", jpg)).toBe(true);
      expect(await isReadableImage("jpeg", broken)).toBe(false);
      expect(await isReadableImage("jpeg", png)).toBe(false);
      expect(await isReadableImage("pdf", broken)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
