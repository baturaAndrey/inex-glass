import { ArticleBody } from "@/components/blog/article-body";
import { ArticleCtaCard, ArticleEndCta } from "@/components/blog/article-cta-card";
import { ArticleToc } from "@/components/blog/article-toc";
import { BlogPageTop } from "@/components/blog/blog-page-top";
import { RelatedArticles } from "@/components/blog/related-articles";
import { Container } from "@/components/ig/container";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { RichText } from "@/components/rich-text/rich-text";
import { extractToc } from "@/lib/blog/toc";
import { getArticleBySlug, getRelatedArticles } from "@/lib/cms/articles";
import { getConditions, getPlaceholderContext } from "@/lib/cms/globals";
import { redirectIfExists } from "@/lib/cms/queries";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { articleLd, JsonLd } from "@/lib/seo/jsonld";
import { buildMetadata, resolveH1, SITE_NAME } from "@/lib/seo/metadata";
import { pickOgImage, type OgImage } from "@/lib/seo/og-image";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Article, Team } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Article `/blog/<slug>/` (prototype Article.dc.html): crumbs + H1, the text column with the
 * «Коротко» lead, the aside (sticky «Содержание» + CTA card), «Читать также» + conditions strip.
 * JSON-LD: Article + BreadcrumbList. The page shell's own conditions / quiz blocks are off —
 * the article has its own CTA and conditions strip.
 *
 * `/blog/page/` never reaches an article: `page` is not a valid article slug (see
 * `@/lib/blog/pagination`), so it resolves to nothing → 404.
 */

type Params = Promise<{ slug: string }>;

/** No DB at build time: articles render on first request, then ISR. */
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}
export const dynamicParams = true;
/** Lead / body may contain date-dependent placeholders. */
export const revalidate = 3600;

const pathOf = (article: Article) => article.path ?? `/blog/${article.slug}/`;

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Share / JSON-LD image: SEO image, hero, card; generated placeholders never qualify. */
function imageOf(article: Article): OgImage | null {
  return pickOgImage([article.seo?.ogImage, article.heroImage, article.card?.image]);
}

/** Author name for JSON-LD: the team member, otherwise `authorName` unless it is the brand. */
function authorNameOf(article: Article): string | null {
  const member =
    article.author && typeof article.author === "object" ? (article.author as Team) : null;
  const name = member?.name?.trim() || article.authorName?.trim() || "";
  return name && name !== SITE_NAME ? name : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(decodeSlug(slug));
  if (!article) return NOT_FOUND_METADATA;
  const placeholders = await getPlaceholderContext();
  const image = imageOf(article);
  return buildMetadata({
    seo: article.seo,
    path: pathOf(article),
    fallbackTitle: article.seo?.h1 || article.title,
    placeholders,
    type: "article",
    image,
  });
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(decodeSlug(slug));
  if (!article) {
    await redirectIfExists(`/blog/${slug}/`);
    return <NotFoundResponse />;
  }

  const [placeholders, conditions, related] = await Promise.all([
    getPlaceholderContext(),
    getConditions(),
    getRelatedArticles(article),
  ]);
  const path = pathOf(article);
  const h1 = resolveH1(article.seo, article.title, placeholders);
  const crumbs = buildBreadcrumbs(path, { lastLabel: h1 });
  const toc = extractToc(article.body);
  const hasLead = lexicalToPlainText(article.lead).trim() !== "";
  const image = imageOf(article);

  return (
    <PageShell path={path} breadcrumbs={crumbs} hideBreadcrumbs showConditions={false} quiz={false}>
      <JsonLd
        data={articleLd({
          headline: h1,
          url: path,
          description: article.seo?.description ?? null,
          datePublished: article.datePublished ?? null,
          dateModified: article.dateModified ?? null,
          author: authorNameOf(article),
          image: image?.url ?? null,
        })}
      />

      <BlogPageTop crumbs={crumbs} title={h1} />

      <section className="bg-surface pt-14 pb-24 max-md:pb-[72px] max-sm:pt-8 max-sm:pb-12">
        <Container className="grid grid-cols-[minmax(0,760px)_360px] items-start justify-between gap-16 max-md:grid-cols-1 max-md:gap-10">
          <aside className="flex flex-col gap-5 max-md:contents md:sticky md:top-[88px] md:col-start-2 md:row-start-1">
            <ArticleToc items={toc} className="max-md:order-1" />
            <div className="max-md:order-3">
              <ArticleCtaCard article={article} conditions={conditions} />
            </div>
          </aside>
          <article className="min-w-0 max-md:order-2 md:col-start-1 md:row-start-1">
            {hasLead ? (
              <div
                data-testid="article-lead"
                className="bg-primary-light text-primary-dark mb-8 rounded-lg px-7 py-6 max-sm:mb-6 max-sm:px-5 max-sm:py-[18px] [&_p]:max-w-none [&_p]:text-[20px] [&_p]:leading-[1.55] max-sm:[&_p]:text-[17px]"
              >
                <RichText data={article.lead} ctx={placeholders} />
              </div>
            ) : null}
            <ArticleBody body={article.body} ctx={placeholders} />
            <ArticleEndCta article={article} />
          </article>
        </Container>
      </section>

      <RelatedArticles articles={related} conditions={conditions} />
    </PageShell>
  );
}
