import { describe, expect, it } from "vitest";
import {
  ALLOWED_DRAWING_EXT,
  ALLOWED_QUIZ_EXT,
  MAX_UPLOAD_BYTES,
  uploadErrorCode,
  validateClientFile,
} from "./upload-file";

const file = (name: string, size = 1000) => ({ name, size });

describe("validateClientFile", () => {
  it("accepts drawings and, in the quiz, sketch photos", () => {
    for (const name of ["plan.dwg", "PLAN.DXF", "a.pdf", "photo.JPG", "photo.jpeg", "s.png"]) {
      expect(validateClientFile(file(name), ALLOWED_QUIZ_EXT)).toBe("ok");
    }
  });

  it("rejects photos in the site forms and unknown formats", () => {
    expect(validateClientFile(file("photo.jpg"), ALLOWED_DRAWING_EXT)).toBe("format");
    expect(validateClientFile(file("setup.exe"), ALLOWED_QUIZ_EXT)).toBe("format");
    expect(validateClientFile(file("noext"), ALLOWED_QUIZ_EXT)).toBe("format");
    expect(validateClientFile(file(".pdf"), ALLOWED_QUIZ_EXT)).toBe("format");
  });

  it("checks the 50 MB limit inclusively", () => {
    expect(validateClientFile(file("a.pdf", MAX_UPLOAD_BYTES), ALLOWED_QUIZ_EXT)).toBe("ok");
    expect(validateClientFile(file("a.pdf", MAX_UPLOAD_BYTES + 1), ALLOWED_QUIZ_EXT)).toBe("size");
  });

  it("reports the format before the size", () => {
    expect(validateClientFile(file("a.exe", MAX_UPLOAD_BYTES + 1), ALLOWED_QUIZ_EXT)).toBe(
      "format"
    );
  });
});

describe("uploadErrorCode", () => {
  it("maps server answers", () => {
    expect(uploadErrorCode(400, "format")).toBe("format");
    expect(uploadErrorCode(413, "size")).toBe("size");
    expect(uploadErrorCode(413, undefined)).toBe("size");
    expect(uploadErrorCode(429, "rate")).toBe("rate_limit");
    expect(uploadErrorCode(500, "server")).toBe("server");
    expect(uploadErrorCode(400, "bad_request")).toBe("server");
  });
});
