import { describe, expect, it } from "vitest";
import {
  acceptedFormatLabels,
  defaultUploadHint,
  fileExtension,
  formatErrorText,
  formatFileSize,
  sizeErrorText,
  validateFile,
} from "./file-upload";

const QUIZ = ["dwg", "dxf", "pdf", "jpg", "jpeg", "png"];
const FORMS = ["dwg", "dxf", "pdf"];
const MAX = 52428800;

/** NBSP-free comparison is not needed: the texts use regular spaces (teksty/05-kviz.md). */
describe("file-upload texts (verbatim teksty/05-kviz.md)", () => {
  it("format error", () => {
    expect(formatErrorText(QUIZ)).toBe("Подойдут DWG, DXF, PDF, JPG или PNG");
    expect(formatErrorText(FORMS)).toBe("Подойдут DWG, DXF или PDF");
    expect(formatErrorText([".PDF"])).toBe("Подойдут PDF");
  });

  it("size error", () => {
    expect(sizeErrorText(MAX)).toBe(
      "Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии"
    );
  });

  it("default hint and format labels", () => {
    expect(defaultUploadHint(QUIZ, MAX)).toBe("DWG, DXF, PDF, JPG или PNG · до 50 МБ");
    expect(acceptedFormatLabels(["png", "jpeg", "jpg", "svg"])).toEqual(["JPG", "PNG", "SVG"]);
  });
});

describe("formatFileSize", () => {
  it("uses binary units and a decimal comma", () => {
    expect(formatFileSize(0)).toBe("0 Б");
    expect(formatFileSize(-5)).toBe("0 Б");
    expect(formatFileSize(Number.NaN)).toBe("0 Б");
    expect(formatFileSize(12)).toBe("12 Б");
    expect(formatFileSize(850 * 1024)).toBe("850 КБ");
    expect(formatFileSize(4.2 * 1024 * 1024)).toBe("4,2 МБ");
    expect(formatFileSize(MAX)).toBe("50 МБ");
  });
});

describe("validateFile / fileExtension", () => {
  it("checks the extension case-insensitively, then the size", () => {
    expect(fileExtension("Plan.DWG")).toBe("dwg");
    expect(fileExtension("noext")).toBe("");
    expect(fileExtension(".hidden")).toBe("");
    expect(validateFile({ name: "a.PDF", size: 1 }, QUIZ, MAX)).toBeNull();
    expect(validateFile({ name: "a.exe", size: 1 }, QUIZ, MAX)).toBe("format");
    expect(validateFile({ name: "a.pdf", size: MAX + 1 }, QUIZ, MAX)).toBe("size");
  });
});
