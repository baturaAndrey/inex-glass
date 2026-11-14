import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
  hasPrivateMetadata,
  stripImageMetadata,
  stripUploadMetadata,
} from "./strip-image-metadata";

/** A 4×2 JPEG with EXIF (GPS-like text + orientation 6 = rotated 90° clockwise). */
async function jpegWithExif(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 2, channels: 3, background: "#3a7" } })
    .jpeg()
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Copyright: "Inex test", ImageDescription: "GPS 55.16,61.40" } },
    })
    .toBuffer();
}

describe("stripImageMetadata", () => {
  it("drops EXIF and bakes the orientation into the pixels", async () => {
    const input = await jpegWithExif();
    expect(hasPrivateMetadata(await sharp(input).metadata())).toBe(true);

    const output = await stripImageMetadata(input);
    expect(output).not.toBeNull();
    const metadata = await sharp(output!).metadata();
    expect(hasPrivateMetadata(metadata)).toBe(false);
    expect(metadata.orientation ?? 1).toBe(1);
    // Orientation 6 rotated the 4×2 image into 2×4.
    expect([metadata.width, metadata.height]).toEqual([2, 4]);
    expect(metadata.format).toBe("jpeg");
  });

  it("returns null for an image without metadata (bytes stay untouched)", async () => {
    const plain = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fff" },
    })
      .webp()
      .toBuffer();
    expect(await stripImageMetadata(plain)).toBeNull();
  });
});

describe("stripUploadMetadata hook", () => {
  type HookArgs = Parameters<typeof stripUploadMetadata>[0];

  const call = (operation: string, file: unknown) => {
    const req = { file, payload: { logger: { warn: vi.fn() } } };
    const args = { req };
    return stripUploadMetadata({ args, operation, req } as unknown as HookArgs);
  };

  it("replaces the request file with the clean bytes on create", async () => {
    const data = await jpegWithExif();
    const file = { data, mimetype: "image/jpeg", name: "a.jpg", size: data.length };
    await call("create", file);
    expect(file.data).not.toBe(data);
    expect(file.size).toBe(file.data.length);
    expect(hasPrivateMetadata(await sharp(file.data).metadata())).toBe(false);
  });

  it("ignores PDFs and read operations", async () => {
    const data = await jpegWithExif();
    const pdf = { data, mimetype: "application/pdf", name: "a.pdf", size: data.length };
    await call("create", pdf);
    expect(pdf.data).toBe(data);

    const jpeg = { data, mimetype: "image/jpeg", name: "a.jpg", size: data.length };
    await call("read", jpeg);
    expect(jpeg.data).toBe(data);
  });
});
