import { describe, expect, it } from "vitest";
import {
  contentDisposition,
  downloadName,
  fileTypeLabel,
  findOrderFile,
  formatFileSize,
  isDisplayableImage,
  isUuid,
  parseThumbnailWidth,
  safeContentType,
  storedFileName,
} from "./files";

const PHOTO = { id: "11111111-1111-4111-8111-111111111111", filename: "pack-1.jpg" };
const DOC = { id: "22222222-2222-4222-8222-222222222222", filename: "passport.pdf" };
const FOREIGN = "33333333-3333-4333-8333-333333333333";

const order = {
  packPhotos: [{ photo: PHOTO, caption: "Пирамида 1" }],
  documents: [{ title: "Паспорт качества", file: DOC }],
};

describe("findOrderFile", () => {
  it("finds a packing photo and a document of the order", () => {
    expect(findOrderFile(order, PHOTO.id)).toEqual({
      role: "photo",
      file: PHOTO,
      caption: "Пирамида 1",
    });
    expect(findOrderFile(order, DOC.id)).toEqual({
      role: "document",
      file: DOC,
      title: "Паспорт качества",
    });
  });

  it("rejects files that do not belong to the order", () => {
    expect(findOrderFile(order, FOREIGN)).toBeNull();
    expect(findOrderFile({}, PHOTO.id)).toBeNull();
    // Not populated (depth 0): the route cannot know the file name, so it is not served.
    expect(findOrderFile({ documents: [{ title: "x", file: DOC.id }] }, DOC.id)).toBeNull();
  });
});

describe("file names", () => {
  it("keeps only the base name of the stored file", () => {
    expect(storedFileName("passport.pdf")).toBe("passport.pdf");
    expect(storedFileName("../../etc/passwd")).toBe("passwd");
    expect(storedFileName("..\\..\\boot.ini")).toBe("boot.ini");
    expect(storedFileName("..")).toBeNull();
    expect(storedFileName("")).toBeNull();
    expect(storedFileName(null)).toBeNull();
  });

  it("builds the download name from the title and the stored extension", () => {
    expect(downloadName("Паспорт качества", "passport.pdf")).toBe("Паспорт качества.pdf");
    expect(downloadName("Спецификация.PDF", "spec.pdf")).toBe("Спецификация.PDF");
    expect(downloadName("Акт 1/2‮gpj", "act.pdf")).toBe("Акт 1-2gpj.pdf");
    expect(downloadName("Без файла", null)).toBe("Без файла");
  });

  it("encodes Content-Disposition with an ASCII fallback", () => {
    expect(contentDisposition("attachment", "Паспорт качества.pdf")).toBe(
      `attachment; filename="pasport-kachestva.pdf"; filename*=UTF-8''%D0%9F%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82%20%D0%BA%D0%B0%D1%87%D0%B5%D1%81%D1%82%D0%B2%D0%B0.pdf`
    );
    expect(contentDisposition("inline", "a'(b).png")).toContain("filename*=UTF-8''a%27%28b%29.png");
  });
});

describe("content types and widths", () => {
  it("allow-lists MIME types", () => {
    expect(safeContentType("application/pdf")).toBe("application/pdf");
    expect(safeContentType("image/webp")).toBe("image/webp");
    expect(safeContentType("text/html")).toBe("application/octet-stream");
    expect(safeContentType("image/heic")).toBe("application/octet-stream");
    expect(safeContentType(null)).toBe("application/octet-stream");
    expect(isDisplayableImage("image/png")).toBe(true);
    expect(isDisplayableImage("image/heic")).toBe(false);
    expect(isDisplayableImage("application/pdf")).toBe(false);
  });

  it("accepts only the allow-listed thumbnail widths", () => {
    expect(parseThumbnailWidth("320")).toBe(320);
    expect(parseThumbnailWidth("1920")).toBe(1920);
    expect(parseThumbnailWidth("500")).toBeNull();
    expect(parseThumbnailWidth("480px")).toBeNull();
    expect(parseThumbnailWidth("")).toBeNull();
    expect(parseThumbnailWidth(null)).toBeNull();
  });

  it("checks uuids", () => {
    expect(isUuid(PHOTO.id)).toBe(true);
    expect(isUuid("../etc")).toBe(false);
  });
});

describe("labels", () => {
  it("formats type and size", () => {
    expect(fileTypeLabel("passport.pdf")).toBe("PDF");
    expect(fileTypeLabel("photo.jpeg")).toBe("JPG");
    expect(fileTypeLabel("noext")).toBeNull();
    expect(formatFileSize(840 * 1024)).toBe("840 КБ");
    expect(formatFileSize(1.24 * 1024 * 1024)).toBe("1,2 МБ");
    expect(formatFileSize(10)).toBe("1 КБ");
    expect(formatFileSize(undefined)).toBeNull();
  });
});
