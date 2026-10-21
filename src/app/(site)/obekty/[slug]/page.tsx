import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { Section, SectionHead } from "@/components/ig/section";
import { ObjectFacts } from "@/components/objects/object-facts";
import { ObjectGallery } from "@/components/objects/object-gallery";
import type { GalleryPhoto } from "@/components/objects/object-gallery";
import { ObjectSpecTable } from "@/components/objects/object-spec-table";
import { RelatedObjects } from "@/components/objects/related-objects";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { buildQuizHref } from "@/components/page/quiz-cta";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getObjectBySlug, getRelatedObjects } from "@/lib/cms/objects";
import { redirectIfExists } from "@/lib/cms/queries";
import type { QuizTypeId } from "@/lib/domain";
import { OBJECTS_BASE_PATH } from "@/lib/objects/filters";
import { joinMeta, mediaPath, specRows } from "@/lib/objects/format";
import { objectFallbackDescription, objectFallbackTitle } from "@/lib/objects/seo";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { buildMetadata, resolveH1 } from "@/lib/seo/metadata";
import type { City, Media, Object as PortfolioObject, ObjectType, Product } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Object card `/obekty/<slug>/` (prototype `ObjectPage.dc.html`): crumbs, H1 + «Город · Тип ·
 * Год», gallery with lightbox and the sticky side panel, «Спецификация стекла», «Другие
 * объекты». Only published objects; a draft or unknown slug → 404 (`redirects` first).
 * ISR: rendered on first request, invalidated by the `objects` hooks.
 */

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

function ogImageOf(doc: PortfolioObject): { url: string; alt?: string | null } | null {
  const seoImage = populated<Media>(doc.seo?.ogImage);
  if (seoImage?.url) return { url: seoImage.url, alt: seoImage.alt ?? null };
  const photo = galleryPhotos(doc)[0];
  return photo ? { url: photo.src, alt: photo.alt } : null;
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

  const [placeholders, related] = await Promise.all([
    getPlaceholderContext(),
    getRelatedObjects(doc),
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

  return (
    <PageShell path={path} breadcrumbs={crumbs} hideBreadcrumbs showConditions={false} quiz={false}>
      <section
        aria-labelledby="object-title"
        className="bg-surface pt-10 pb-20 max-md:pb-16 max-sm:pt-6 max-sm:pb-10"
      >
        <Container>
          <Breadcrumbs items={crumbs} />
          <div className="mt-6 mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 max-sm:mt-4 max-sm:mb-5">
            <h1 id="object-title" className="ig-h1 m-0">
              {h1}
            </h1>
            {meta ? (
              <p className="text-text-2 m-0 text-[18px] leading-[1.4] max-sm:text-[15px]">{meta}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,1fr)_420px]">
            <ObjectGallery photos={galleryPhotos(doc)} name={doc.name} />
            <ObjectFacts
              city={city}
              type={type}
              year={doc.year}
              products={products}
              task={doc.task}
              quizHref={quizHref}
              formSource={`obekty-${doc.slug}`}
            />
          </div>
        </Container>
      </section>

      {hasSpec ? (
        <Section variant="bg" aria-labelledby="object-spec" data-object-spec="">
          <SectionHead title="Спецификация стекла" headingId="object-spec" />
          <ObjectSpecTable spec={doc.spec} />
        </Section>
      ) : null}

      <RelatedObjects objects={related} />
    </PageShell>
  );
}
