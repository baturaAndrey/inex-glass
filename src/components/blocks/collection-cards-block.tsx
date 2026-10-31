import { Card } from "@/components/ig/card";
import { listPublished } from "@/lib/cms/queries";
import {
  formatNumber,
  resolvePrice,
  weightPerM2Single,
  type PlaceholderContext,
} from "@/lib/domain";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import { BlockSection, CARD_GRID, CardMedia, fill } from "./shared";
import type { BlockOf, BlockProps } from "./types";
import type { Where } from "payload";

type Source = BlockOf<"collectionCards">["source"];
type SourceCollection =
  "glass-types" | "processing-services" | "constructions" | "thicknesses" | "articles";

const SOURCE_COLLECTION: Record<Source, SourceCollection> = {
  glassTypes: "glass-types",
  processingServices: "processing-services",
  constructions: "constructions",
  thicknesses: "thicknesses",
  articles: "articles",
};

/** Hub order of each source. */
const SOURCE_SORT: Record<SourceCollection, string> = {
  "glass-types": "order",
  "processing-services": "order",
  constructions: "order",
  thicknesses: "n",
  articles: "-datePublished",
};

/** Upper bound for «all» mode: hubs list a handful of documents. */
const MAX_CARDS = 48;

/** Fields read from any card-like document (all optional across collections). */
interface CardDoc {
  id?: string;
  title?: string | null;
  n?: number | null;
  slug?: string | null;
  path?: string | null;
  urlBase?: string | null;
  isHome?: boolean | null;
  _status?: string | null;
  card?: {
    title?: string | null;
    text?: string | null;
    image?: unknown;
    icon?: string | null;
    priceHint?: string | null;
  } | null;
  heroImage?: unknown;
}

function baseWhere(
  collection: SourceCollection,
  block: BlockOf<"collectionCards">
): Where | undefined {
  if (block.mode === "group" && collection === "constructions" && block.group) {
    return { group: { equals: block.group } };
  }
  // `showInHub` may be unset on older rows: only an explicit `false` hides a type.
  if (collection === "glass-types") {
    return { or: [{ showInHub: { equals: true } }, { showInHub: { exists: false } }] };
  }
  return undefined;
}

/** Documents of the block: hand-picked (published only) or queried. */
async function loadDocs(
  block: BlockOf<"collectionCards">
): Promise<{ collection: SourceCollection; doc: CardDoc }[]> {
  const collection = SOURCE_COLLECTION[block.source];
  if (block.mode === "manual") {
    return (block.items ?? []).flatMap((item) => {
      const doc = item.value;
      // Unpopulated ids and drafts are skipped: a card must never point at a 404.
      if (typeof doc !== "object" || doc === null) return [];
      const cardDoc = doc as CardDoc;
      if (cardDoc._status === "draft") return [];
      return [{ collection: item.relationTo, doc: cardDoc }];
    });
  }
  const where = baseWhere(collection, block);
  const result = await listPublished(collection, {
    limit: MAX_CARDS,
    sort: SOURCE_SORT[collection],
    ...(where ? { where } : {}),
  });
  return result.docs.map((doc) => ({ collection, doc: doc as CardDoc }));
}

/** «от 1 400 ₽/м² · 25 кг/м²» for thickness cards (price only while fresh, 45-day rule). */
function thicknessHint(n: number, ctx: PlaceholderContext): string {
  const { label } = resolvePrice(n, ctx.prices, ctx.now);
  return `${label} · ${formatNumber(weightPerM2Single(n))} кг/м²`;
}

/** Cards generated from a catalog collection (hubs, «Читать также»). */
export async function CollectionCardsBlock({ block, ctx, section }: BlockProps<"collectionCards">) {
  const docs = await loadDocs(block);
  const columns = block.columns === "4" ? 4 : 3;
  const cards = docs.flatMap(({ collection, doc }) => {
    const href = docUrl(collection, doc);
    if (!href) return [];
    const isThickness = collection === "thicknesses" && typeof doc.n === "number";
    const title =
      fill(doc.card?.title, ctx) || fill(doc.title, ctx) || (isThickness ? `${doc.n} мм` : "");
    if (!title) return [];
    const hint =
      block.showPrices && isThickness && typeof doc.n === "number"
        ? thicknessHint(doc.n, ctx)
        : fill(doc.card?.priceHint, ctx);
    return [{ key: doc.id ?? href, href, title, doc, hint }];
  });
  if (cards.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[columns], "m-0 list-none p-0")}>
        {cards.map(({ key, href, title, doc, hint }) => (
          <li key={key} className="flex">
            <Card
              className="w-full"
              href={href}
              title={title}
              sub={fill(doc.card?.text, ctx) || undefined}
              image={
                <CardMedia
                  image={doc.card?.image ?? doc.heroImage}
                  icon={doc.card?.icon}
                  columns={columns}
                />
              }
              footer={
                hint ? (
                  <span className="text-primary-dark font-semibold tabular-nums">{hint}</span>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </BlockSection>
  );
}
