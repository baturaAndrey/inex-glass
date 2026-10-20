import { Download } from "lucide-react";
import { formatNumber } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Media } from "@/payload-types";
import { BlockSection, asMedia, fill, hasText, mediaSrc } from "./shared";
import type { BlockProps } from "./types";

const KB = 1024;
const MB = KB * KB;
const FILE_COMING = "Файл будет добавлен";

/** «340 КБ» / «1,2 МБ». */
function formatSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < MB) return `${formatNumber(Math.max(1, Math.round(bytes / KB)))} КБ`;
  return `${formatNumber(bytes / MB, { decimals: 1 })} МБ`;
}

/** «PDF», «DWG»… from the file name (mime types of CAD files are unreliable). */
function extension(media: Media): string | null {
  const match = /\.([a-z0-9]{1,5})$/i.exec(media.filename ?? "");
  return match?.[1] ? match[1].toUpperCase() : null;
}

/** Downloadable documents: card per file with type, size and a direct link to the media file. */
export function DownloadBlock({ block, ctx, section }: BlockProps<"download">) {
  const items = block.items ?? [];
  if (items.length === 0) return null;
  const asCards = block.variant === "card";

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul
        className={cn(
          "m-0 list-none p-0",
          asCards
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
            : "flex max-w-[900px] flex-col gap-3"
        )}
      >
        {items.map((item, index) => {
          const media = item.fileMissing ? null : asMedia(item.file);
          const href = media ? mediaSrc(media) : null;
          const title = fill(item.title, ctx);
          const description = fill(item.description, ctx);
          const meta = media
            ? [extension(media), formatSize(media.filesize)].filter(Boolean).join(" · ")
            : null;
          return (
            <li key={item.id ?? index} className="ig-file items-start">
              <span className="ig-file__ext" aria-hidden="true">
                {media ? (
                  (extension(media) ?? <Download className="size-5" />)
                ) : (
                  <Download className="size-5" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {href ? (
                  <a href={href} download rel="noopener" className="ig-link font-medium">
                    {title}
                  </a>
                ) : (
                  <span className="font-medium">{title}</span>
                )}
                {hasText(description) ? (
                  <p className="text-small text-text-2 m-0">{description}</p>
                ) : null}
                <span className="text-small text-text-2">{href ? meta : FILE_COMING}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
