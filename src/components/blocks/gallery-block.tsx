import { GalleryGrid, type GalleryImage } from "./gallery-grid";
import { BlockSection, asMedia, fill, mediaSrc } from "./shared";
import type { BlockProps } from "./types";

/** Photo gallery (grid or slider) with a full-screen viewer. */
export function GalleryBlock({ block, ctx, section }: BlockProps<"gallery">) {
  const images: GalleryImage[] = (block.images ?? []).flatMap((item) => {
    const media = asMedia(item.image);
    const src = media ? mediaSrc(media) : null;
    if (!media || !src) return [];
    const caption = fill(item.caption, ctx);
    return [
      {
        src,
        thumb: mediaSrc(media, "card") ?? src,
        alt: fill(item.alt, ctx) || media.alt || "",
        ...(caption ? { caption } : {}),
        ...(media.width ? { width: media.width } : {}),
        ...(media.height ? { height: media.height } : {}),
      },
    ];
  });
  if (images.length === 0) return null;
  const heading = fill(block.heading, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <GalleryGrid
        images={images}
        layout={block.layout === "slider" ? "slider" : "grid"}
        title={heading || undefined}
      />
    </BlockSection>
  );
}
