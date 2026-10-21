import {
  BlockImage,
  hasText,
  CARD_GRID,
  CARD_IMAGE_SIZES,
  asMedia,
  fill,
} from "@/components/blocks/shared";
import type { BlockOf, BlockProps } from "@/components/blocks/types";
import { Card } from "@/components/ig/card";
import { Placeholder } from "@/components/ig/placeholder";
import { Section } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { listPublished } from "@/lib/cms/queries";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Object as PortfolioObject } from "@/payload-types";

const OBJECTS_PATH = "/obekty/";
const DEFAULT_LIMIT = 8;
const DEFAULT_ALL_LABEL = "Все объекты";

/** Light cards of the strip (`background: bg`, no shadow), as in the prototype. */
const OBJECT_CARD_CLASS =
  "w-full bg-bg shadow-none [&_.ig-card__body]:px-5 [&_.ig-card__body]:pt-4 [&_.ig-card__body]:pb-5 [&_.ig-card__title]:text-lg";

export interface HomeObjectsStripProps extends BlockProps<"objectsFeed"> {
  /** `objects-fallback` cards block: object names shown while no featured object is published. */
  fallback?: BlockOf<"cards"> | undefined;
}

/** Featured published objects, newest first (`sortDate`), at most `limit`. */
async function loadFeatured(limit: number): Promise<PortfolioObject[]> {
  const result = await listPublished("objects", {
    where: { featured: { equals: true } },
    limit,
    sort: "-sortDate",
  });
  return result.docs as PortfolioObject[];
}

/** «Челябинск» from the populated city relation. */
function objectCity(doc: PortfolioObject): string | null {
  return typeof doc.city === "object" && doc.city !== null ? doc.city.name : null;
}

/**
 * Block 8 — «Объекты»: featured objects of the portfolio (photo, name, city), or — while none is
 * published — the inactive fallback cards with placeholders and names only, so the page never
 * shows fictitious published objects. Decided on the server; «Все объекты →» on the right.
 */
export async function HomeObjectsStrip({ block, ctx, section, fallback }: HomeObjectsStripProps) {
  const limit = block.limit ?? DEFAULT_LIMIT;
  const featured = (await loadFeatured(limit)).flatMap((doc) => {
    const href = docUrl("objects", doc);
    return href ? [{ doc, href }] : [];
  });
  const fallbackNames = (fallback?.items ?? [])
    .map((item) => fill(item.title, ctx))
    .filter(Boolean);
  if (featured.length === 0 && fallbackNames.length === 0) return null;
  const allLabel = fill(block.allLinkLabel, ctx) || DEFAULT_ALL_LABEL;
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);

  return (
    <Section
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={heading ? section.headingId : undefined}
      className="scroll-mt-24"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-4 max-sm:mb-6">
        <div className="flex max-w-[900px] flex-col gap-3">
          {heading ? (
            <h2 id={section.headingId} className="ig-h2">
              {heading}
            </h2>
          ) : null}
          {sub ? (
            <p className="text-lead m-0 max-w-[620px] text-pretty text-(color:--ig-section-sub)">
              {sub}
            </p>
          ) : null}
        </div>
        {block.showAllLink !== false ? (
          <TextLink href={OBJECTS_PATH} variant="arrow">
            {allLabel}
          </TextLink>
        ) : null}
      </div>
      <ul
        className={cn(CARD_GRID[4], "m-0 list-none p-0")}
        data-objects={featured.length > 0 ? "featured" : "fallback"}
      >
        {featured.length > 0
          ? featured.map(({ doc, href }) => {
              const photo = doc.photos?.[0];
              const media = photo ? asMedia(photo.image) : null;
              return (
                <li key={doc.id} className="flex">
                  <Card
                    className={OBJECT_CARD_CLASS}
                    href={href}
                    arrow={false}
                    title={doc.name}
                    sub={objectCity(doc) ?? undefined}
                    image={
                      media ? (
                        <BlockImage
                          media={media}
                          alt={photo?.alt}
                          size="card"
                          sizes={CARD_IMAGE_SIZES[4]}
                        />
                      ) : (
                        <Placeholder />
                      )
                    }
                  />
                </li>
              );
            })
          : fallbackNames.map((name, index) => (
              <li key={index} className="flex">
                <Card className={OBJECT_CARD_CLASS} title={name} image={<Placeholder />} />
              </li>
            ))}
      </ul>
    </Section>
  );
}
