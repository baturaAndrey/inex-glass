import { describe, expect, it } from "vitest";
import {
  checkUpload,
  fileExtension,
  LEAD_FILE_POLICY,
  ORDER_FILE_POLICY,
  payloadMimeTypes,
  setDownloadOnlyHeaders,
} from "./upload-policy";

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => new TextEncoder().encode(text);

const PDF_HEAD = ascii("%PDF-1.7\n");
const PNG_HEAD = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPEG_HEAD = bytes(0xff, 0xd8, 0xff, 0xe0);
const DWG_HEAD = ascii("AC1032\0\0\0");
const HTML_HEAD = ascii("<!doctype html><script>alert(1)</script>");

describe("fileExtension", () => {
  it("returns the lower-case extension", () => {
    expect(fileExtension("Чертёж.DWG")).toBe("dwg");
    expect(fileExtension("dir/a.b.pdf")).toBe("pdf");
    expect(fileExtension("noext")).toBe("");
    expect(fileExtension(".htaccess")).toBe("");
  });
});

describe("checkUpload (lead files)", () => {
  it.each([
    ["plan.pdf", "application/pdf", PDF_HEAD, "application/pdf"],
    ["photo.JPG", "image/jpeg", JPEG_HEAD, "image/jpeg"],
    ["photo.png", "image/png", PNG_HEAD, "image/png"],
    ["plan.dwg", "application/octet-stream", DWG_HEAD, "image/vnd.dwg"],
    ["plan.dwg", "image/vnd.dwg", DWG_HEAD, "image/vnd.dwg"],
    ["plan.dxf", "", ascii("  0\r\nSECTION\r\n"), "image/vnd.dxf"],
    ["plan.dxf", "text/plain", ascii("999\nmade by CAD\n  0\nSECTION"), "image/vnd.dxf"],
    ["plan.dxf", "application/dxf", ascii("AutoCAD Binary DXF\r\n"), "image/vnd.dxf"],
    [
      "plan.dxf",
      "",
      Uint8Array.from([0xef, 0xbb, 0xbf, ...ascii("0\nSECTION\n")]),
      "image/vnd.dxf",
    ],
  ])("accepts %s (%s) and stores the canonical type", (filename, mimeType, head, expected) => {
    expect(checkUpload(LEAD_FILE_POLICY, { filename, mimeType, head })).toEqual({
      ok: true,
      mimeType: expected,
    });
  });

  it.each([
    ["an unknown extension", "page.html", "text/html", HTML_HEAD],
    ["a file without extension", "plan", "application/pdf", PDF_HEAD],
    ["a mismatching MIME type", "plan.pdf", "text/html", PDF_HEAD],
    ["SVG under a PNG name", "photo.png", "image/svg+xml", ascii("<svg/>")],
    ["HTML under a DXF name", "plan.dxf", "text/plain", HTML_HEAD],
    [
      "HTML after a BOM under a DXF name",
      "plan.dxf",
      "text/plain",
      Uint8Array.from([0xef, 0xbb, 0xbf, ...HTML_HEAD]),
    ],
    ["HTML under a PDF name", "plan.pdf", "application/pdf", HTML_HEAD],
    ["a non-DWG under a DWG name", "plan.dwg", "application/octet-stream", PNG_HEAD],
    ["webp (orders only)", "photo.webp", "image/webp", ascii("RIFF\0\0\0\0WEBP")],
  ])("rejects %s", (_label, filename, mimeType, head) => {
    expect(checkUpload(LEAD_FILE_POLICY, { filename, mimeType, head }).ok).toBe(false);
  });

  it("skips the signature when the content is not available", () => {
    expect(
      checkUpload(LEAD_FILE_POLICY, { filename: "a.pdf", mimeType: "application/pdf", head: null })
    ).toEqual({ ok: true, mimeType: "application/pdf" });
  });
});

describe("checkUpload (order files)", () => {
  it("accepts packing photos and documents", () => {
    const webp = ascii("RIFF\x10\0\0\0WEBPVP8 ");
    const heic = ascii("\0\0\0\x18ftypheic");
    expect(
      checkUpload(ORDER_FILE_POLICY, { filename: "a.webp", mimeType: "image/webp", head: webp }).ok
    ).toBe(true);
    expect(
      checkUpload(ORDER_FILE_POLICY, { filename: "a.heic", mimeType: "image/heic", head: heic }).ok
    ).toBe(true);
    expect(
      checkUpload(ORDER_FILE_POLICY, {
        filename: "a.pdf",
        mimeType: "application/pdf",
        head: PDF_HEAD,
      }).ok
    ).toBe(true);
  });

  it("rejects CAD drawings", () => {
    expect(
      checkUpload(ORDER_FILE_POLICY, { filename: "a.dwg", mimeType: "", head: DWG_HEAD }).ok
    ).toBe(false);
  });
});

describe("payloadMimeTypes", () => {
  it("lists canonical types; text/plain only where DXF needs it", () => {
    expect(payloadMimeTypes(LEAD_FILE_POLICY)).toEqual([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/vnd.dwg",
      "image/vnd.dxf",
      "text/plain",
    ]);
    expect(payloadMimeTypes(ORDER_FILE_POLICY)).not.toContain("text/plain");
  });
});

describe("setDownloadOnlyHeaders", () => {
  it("forces a sandboxed, non-sniffed download", () => {
    const headers = setDownloadOnlyHeaders(new Headers({ "Content-Type": "text/plain" }));
    expect(headers.get("Content-Disposition")).toBe("attachment");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(headers.get("Content-Type")).toBe("text/plain");
  });
});
