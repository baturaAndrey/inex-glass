import { Card } from "@/components/ig/card";
import { Chip } from "@/components/ig/chip";
import { TextLink } from "@/components/ig/text-link";
import { listPublished } from "@/lib/cms/queries";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Object as PortfolioObject } from "@/payload-types";
import { BlockImage, BlockSection, CARD_GRID, CARD_IMAGE_SIZES, asMedia, fill } from "./shared";
import type { BlockOf, BlockProps } from "./types";
import type { Where } from "payload";

const DEFAULT_LIMIT = 4;
const OBJECTS_PATH = "/obekty/";
const DEFAULT_ALL_LABEL = "Все объекты";

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** Objects of the feed: hand-picked (published only), by product tag or featured. */
async function loadObjects(
  block: BlockOf<"objectsFeed">,
  limit: number
): Promise<PortfolioObject[]> {
  if (block.mode === "manual") {
    return (block.objects ?? [])
      .filter((doc): doc is PortfolioObject => typeof doc === "object" && doc !== null)
      .filter((doc) => doc._status !== "draft")
      .slice(0, limit);
  }
  const productId = block.mode === "byProduct" ? relationId(block.product) : null;
  if (block.mode === "byProduct" && !productId) return [];
  const where: Where = productId
    ? { products: { contains: productId } }
    : { featured: { equals: true } };
  const result = await listPublished("objects", { where, limit, sort: "-sortDate" });
  return result.docs as PortfolioObject[];
}

/** «Челябинск · 2024» from the populated city and the year. */
function objectMeta(doc: PortfolioObject): string {
  const city = typeof doc.city === "object" && doc.city !== null ? doc.city.name : null;
  return [city, doc.year ? String(doc.year) : null].filter(Boolean).join(" · ");
}

/**
 * Portfolio feed with simplified object cards (photo, name, city · year, chips). Full object
 * cards and the listing are built by tasks 30/31.
 */
export async function ObjectsFeedBlock({ block, ctx, section }: BlockProps<"objectsFeed">) {
  const limit = block.limit ?? DEFAULT_LIMIT;
  const objects = await loadObjects(block, limit);
  const cards = objects.flatMap((doc) => {
    const href = docUrl("objects", doc);
    return href ? [{ doc, href }] : [];
  });
  if (cards.length === 0) return null;
  const columns = limit % 3 === 0 ? 3 : 4;
  const allLabel = fill(block.allLinkLabel, ctx) || DEFAULT_ALL_LABEL;

  return (
    <BlockSection
      block={block}
      section={section}
      ctx={ctx}
      action={
        block.showAllLink !== false ? (
          <TextLink href={OBJECTS_PATH} variant="arrow">
            {allLabel}
          </TextLink>
        ) : undefined
      }
    >
      <ul className={cn(CARD_GRID[columns], "m-0 list-none p-0")}>
        {cards.map(({ doc, href }) => {
          const photo = doc.photos?.[0];
          const media = photo ? asMedia(photo.image) : null;
          const meta = objectMeta(doc);
          const chips = (doc.chips ?? []).slice(0, 3);
          return (
            <li key={doc.id} className="flex">
              <Card
                className="w-full"
                href={href}
                title={doc.name}
                sub={meta || undefined}
                image={
                  media ? (
                    <BlockImage
                      media={media}
                      alt={photo?.alt}
                      size="card"
                      sizes={CARD_IMAGE_SIZES[columns]}
                    />
                  ) : undefined
                }
              >
                {chips.length > 0 ? (
                  <div className="ig-chips mt-1">
                    {chips.map((chip, index) => (
                      <Chip key={chip.id ?? index} static>
                        {chip.text}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
