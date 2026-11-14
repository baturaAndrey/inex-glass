import { ObjectFacts } from "@/components/objects/object-facts";
import { ObjectGallery } from "@/components/objects/object-gallery";
import type { GalleryPhoto } from "@/components/objects/object-gallery";
import { ObjectSpecTable } from "@/components/objects/object-spec-table";
import { objectsClosing, ObjectsFormPanel } from "@/components/objects/objects-closing";
import { RelatedObjects } from "@/components/objects/related-objects";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { buildQuizHref } from "@/components/page/quiz-cta";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getObjectBySlug, getRelatedObjects } from "@/lib/cms/objects";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import type { QuizTypeId } from "@/lib/domain";
import { OBJECTS_BASE_PATH } from "@/lib/objects/filters";
import { joinMeta, mediaPath, specRows } from "@/lib/objects/format";
import { objectFallbackDescription, objectFallbackTitle } from "@/lib/objects/seo";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, resolveH1 } from "@/lib/seo/metadata";
import { pickOgImage, type OgImage } from "@/lib/seo/og-image";
import type { City, Media, Object as PortfolioObject, ObjectType, Product } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Object card `/obekty/<slug>/`, restyled to the Paper mockup `2560_obekt` (2026-11). One page
 * background, no white header band: crumbs, H1 + «Город · Тип · Год» under it; gallery with
 * lightbox next to the sticky facts card; «Спецификация стекла»; «Другие объекты» (listing
 * cards); the drawing-form panel in the cream block (heading / sub from the closing `cta` block
 * of `/obekty/`, source `obekty-<slug>`). Only published objects; a draft or unknown slug →
 * 404 (`redirects` first). ISR: rendered on first request, invalidated by the `objects` hooks.
 */

const TITLE_ID = "object-title";
const SPEC_HEADING_ID = "object-spec";
const FORM_HEADING_ID = "object-form-title";

type Params = Promise<{ slug: string }>;

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}
export const dynamicParams = true;
export const revalidate = 3600;

/** Product slug → quiz product type, for taxonomies without `quizType` (seed / task-26 slugs). */
const QUIZ_TYPE_BY_PRODUCT_SLUG: Readonly<Record<string, QuizTypeId>> = {
  peregorodki: "partitions",
  ograzhdeniya: "railings",
  kozyrki: "canopies",
  fasady: "facade",
  "steklyannyj-fasad": "facade",
  dushevye: "shower",
  "dushevye-peregorodki": "shower",
};

const pathOf = (slug: string) => `${OBJECTS_BASE_PATH}${slug}/`;

function populated<T extends { id: string }>(value: T | string | null | undefined): T | null {
  return typeof value === "object" && value !== null ? value : null;
}

const nameOf = (value: City | ObjectType | Product | string | null | undefined) =>
  populated(value)?.name ?? null;

/**
 * Quiz type of «Рассчитать похожий проект»: the object's own pre-fill, otherwise its first
 * product (`quizType` of the taxonomy, else the slug mapping), otherwise none.
 */
function quizTypeOf(doc: PortfolioObject): QuizTypeId | undefined {
  if (doc.quizPrefill?.type) return doc.quizPrefill.type;
  const first = populated(doc.products?.[0]);
  if (!first) return undefined;
  if (first.quizType && first.quizType !== "other") return first.quizType;
  return QUIZ_TYPE_BY_PRODUCT_SLUG[first.slug];
}

function galleryPhotos(doc: PortfolioObject): GalleryPhoto[] {
  return (doc.photos ?? []).flatMap((photo) => {
    const media = populated<Media>(photo.image);
    const src = mediaPath(media?.url);
    if (!media || !src) return [];
    return [
      {
        src,
        alt: photo.alt?.trim() || media.alt?.trim() || doc.name,
        ...(photo.caption?.trim() ? { caption: photo.caption.trim() } : {}),
        ...(media.width ? { width: media.width } : {}),
        ...(media.height ? { height: media.height } : {}),
      },
    ];
  });
}

/**
 * Share image: the SEO image, otherwise the first real gallery photo (with its own alt).
 * Generated placeholders never qualify; with none left `buildMetadata` uses the default image.
 */
function ogImageOf(doc: PortfolioObject): OgImage | null {
  const photos = (doc.photos ?? []).map((photo) => {
    const media = populated<Media>(photo.image);
    if (!media) return null;
    return {
      url: mediaPath(media.url),
      alt: photo.alt?.trim() || media.alt?.trim() || doc.name,
      isPlaceholder: media.isPlaceholder,
    };
  });
  return pickOgImage([populated<Media>(doc.seo?.ogImage), ...photos]);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getObjectBySlug(slug);
  if (!doc) return NOT_FOUND_METADATA;

  const placeholders = await getPlaceholderContext();
  const firstSpec = specRows(doc.spec)[0];
  return buildMetadata({
    seo: {
      ...doc.seo,
      title: doc.seo?.title || objectFallbackTitle(doc.name),
      description:
        doc.seo?.description ||
        objectFallbackDescription({
          name: doc.name,
          type: nameOf(doc.objectType),
          city: nameOf(doc.city),
          products: (doc.products ?? []).map((product) => nameOf(product)),
          spec: firstSpec,
        }),
    },
    path: doc.path || pathOf(slug),
    fallbackTitle: doc.name,
    placeholders,
    image: ogImageOf(doc),
  });
}

export default async function ObjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const doc = await getObjectBySlug(slug);
  if (!doc) {
    await redirectIfExists(pathOf(slug));
    return <NotFoundResponse />;
  }

  const [placeholders, related, listing] = await Promise.all([
    getPlaceholderContext(),
    getRelatedObjects(doc),
    getPageByPath(OBJECTS_BASE_PATH),
  ]);
  const path = doc.path || pathOf(slug);
  const h1 = resolveH1(doc.seo, doc.name, placeholders);
  const crumbs = buildBreadcrumbs(path, { lastLabel: doc.name });
  const city = nameOf(doc.city);
  const type = nameOf(doc.objectType);
  const products = (doc.products ?? [])
    .map((product) => nameOf(product))
    .filter((name): name is string => Boolean(name));
  const meta = joinMeta([city, type, doc.year]);
  const hasSpec = specRows(doc.spec).length > 0;
  const quizHref = buildQuizHref({ type: quizTypeOf(doc), src: path });
  const formSource = `obekty-${doc.slug}`;
  const closing = objectsClosing(listing, placeholders);

  return (
    <PageShell path={path} breadcrumbs={crumbs} showConditions={false} quiz={false}>
      <ProcessingHero title={h1} titleId={TITLE_ID} lead={meta || undefined} />

      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-16 px-(--ig-gutter) pt-8 pb-24 max-md:gap-12 max-md:pt-6 max-md:pb-[72px] max-sm:gap-10 max-sm:pt-2 max-sm:pb-12">
        <div className="grid grid-cols-1 items-start gap-8 max-sm:gap-6 md:grid-cols-[minmax(0,1fr)_400px] lg:grid-cols-[minmax(0,1fr)_460px]">
          <ObjectGallery photos={galleryPhotos(doc)} name={doc.name} />
          <ObjectFacts
            city={city}
            type={type}
            year={doc.year}
            products={products}
            task={doc.task}
            quizHref={quizHref}
            formSource={formSource}
          />
        </div>

        {hasSpec ? (
          <section
            aria-labelledby={SPEC_HEADING_ID}
            className="flex flex-col gap-7 max-sm:gap-5"
            data-object-spec=""
          >
            <h2 id={SPEC_HEADING_ID} className="ig-h2 m-0">
              Спецификация стекла
            </h2>
            <ObjectSpecTable spec={doc.spec} />
          </section>
        ) : null}

        <RelatedObjects objects={related} />
      </div>

      <ObjectsFormPanel
        closing={closing}
        headingId={FORM_HEADING_ID}
        params={{ source: formSource }}
      />
    </PageShell>
  );
}
