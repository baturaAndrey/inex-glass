import { estimateReadingMinutes } from "@/lib/blog/reading-time";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Article, Page } from "@/payload-types";
import {
  ARTICLES,
  articleMarkdown,
  articlePath,
  BLOG_LISTING,
  BLOG_PATH,
  quizHref,
  WEIGHT_TOOL_PAGE,
  WEIGHT_TOOL_PATH,
  type ArticleSeed,
} from "../content/blog";
import {
  mayOverwrite,
  rememberSeedWrite,
  SEED_REQUEST_CONTEXT,
  seedDate,
  upsertByField,
  upsertByPath,
} from "../context";
import { markdown, paragraphs } from "../lexical";
import type { SeedContext } from "../context";

/**
 * Seed slice «blog» (task 31): the listing page `/blog/`, the weight calculator page
 * `/instrumenty/kalkulyator-vesa-stekla/` and six published articles.
 *
 * Idempotent by `path` / `slug`. Existing documents are skipped unless `--force` or unchanged
 * since the seed's last write (`mayOverwrite` in `../context.ts`, seed markers — e.g. the
 * mini-seed article `mozhno-li-rezat-zakalennoe-steklo` with its `[…]` body), so editor changes
 * survive a re-run.
 * «Читать также» needs the ids of all articles, so it is written in a second pass.
 */

type LayoutBlock = NonNullable<Page["layout"]>[number];

/**
 * `dateModified` the article hook keeps. On every published UPDATE the hook sets
 * `dateModified = now` unless the incoming value differs from the stored one («edited by hand»).
 * The stored form of a date is `…T12:00:00.000Z` (`seedDate`); the seed sends the same instant
 * without milliseconds, so a forced re-run and the «Читать также» pass keep the placeholder date.
 */
function seedDateModified(day: string): string {
  return seedDate(day).replace(".000Z", "Z");
}

const customLink = (url: string) => ({ type: "custom" as const, url });

async function seedListing(ctx: SeedContext): Promise<void> {
  const layout: LayoutBlock[] = [
    {
      blockType: "richText",
      anchorId: "intro",
      content: paragraphs(BLOG_LISTING.intro),
      width: "narrow",
    },
    {
      blockType: "linkList",
      anchorId: "instrumenty",
      variant: "bridge",
      label: BLOG_LISTING.toolsLabel,
      items: BLOG_LISTING.tools.map((tool) => ({
        link: { ...customLink(tool.url), label: tool.label },
      })),
    },
  ];
  await upsertByPath(
    ctx,
    "pages",
    BLOG_PATH,
    {
      title: BLOG_LISTING.title,
      slug: BLOG_LISTING.slug,
      template: "listing",
      pathPrefix: "/",
      _status: "published",
      seo: { ...BLOG_LISTING.seo },
      layout,
    },
    { overwrite: await mayOverwrite(ctx, "pages", { path: { equals: BLOG_PATH } }, BLOG_PATH) }
  );
}

async function seedWeightTool(ctx: SeedContext): Promise<void> {
  await upsertByPath(
    ctx,
    "pages",
    WEIGHT_TOOL_PATH,
    {
      title: WEIGHT_TOOL_PAGE.title,
      slug: WEIGHT_TOOL_PAGE.slug,
      template: "tool",
      // No `/instrumenty/` page exists: the path comes from the prefix, the crumb is plain text.
      pathPrefix: WEIGHT_TOOL_PAGE.pathPrefix,
      _status: "published",
      seo: { ...WEIGHT_TOOL_PAGE.seo },
      // «Первый экран — сам калькулятор, без вступления»: no hero block — the page renders the
      // plain H1 and the calculator, which has its own quiz button (no extra CTA / conditions).
      hideConditions: true,
      hideQuizCta: true,
      quizPrefill: { type: "tempered" },
      layout: [
        {
          blockType: "weightCalculator",
          defaultMode: "single",
          showTable: true,
          showFormula: true,
        },
      ],
    },
    {
      overwrite: await mayOverwrite(
        ctx,
        "pages",
        { path: { equals: WEIGHT_TOOL_PATH } },
        WEIGHT_TOOL_PATH
      ),
    }
  );
}

/** `commercialLink` of an article: the quiz button at the end of the text, or empty. */
function commercialLink(article: ArticleSeed): NonNullable<Article["commercialLink"]> {
  if (!article.commercialLabel) return { label: null, link: { type: "custom", url: null } };
  return {
    label: article.commercialLabel,
    link: customLink(quizHref({ type: article.quizType, src: articlePath(article.slug) })),
  };
}

/** `ctaCard` of an article: the form (drawing) or the label of the aside card. */
function ctaCard(article: ArticleSeed): NonNullable<Article["ctaCard"]> {
  if (article.form) {
    return {
      title: article.form.title,
      buttonLabel: article.form.buttonLabel,
      formKey: article.form.formKey,
      text: null,
    };
  }
  const label = article.asideTitle ?? article.commercialLabel;
  return { title: label, buttonLabel: label, formKey: null, text: null };
}

async function seedArticle(ctx: SeedContext, article: ArticleSeed): Promise<Article | null> {
  const text = articleMarkdown(article);
  const lead = text.lead === null ? null : await markdown(ctx, text.lead);
  const body = await markdown(ctx, text.body);
  const plain = [lexicalToPlainText(lead), lexicalToPlainText(body)].join("\n");
  const date = seedDate(article.date);
  const where = { slug: { equals: article.slug } };
  const overwrite = await mayOverwrite(ctx, "articles", where, article.slug);

  const { doc, action } = await upsertByField(
    ctx,
    "articles",
    where,
    {
      title: article.title,
      slug: article.slug,
      _status: "published",
      datePublished: date,
      dateModified: seedDateModified(article.date),
      readingTimeMinutes: estimateReadingMinutes(plain),
      seo: { ...article.seo },
      lead,
      body,
      commercialLink: commercialLink(article),
      ctaCard: ctaCard(article),
      quizPrefill: { type: article.quizType },
    },
    { overwrite, label: article.slug }
  );
  return action === "skipped" ? null : doc;
}

/** Second pass: «Читать также» by slug → id (`dateModified` re-sent, see `seedDateModified`). */
async function linkRelated(ctx: SeedContext, written: ReadonlyMap<string, Article>) {
  if (written.size === 0) return;
  const { docs } = await ctx.payload.find({
    collection: "articles",
    where: { slug: { in: ARTICLES.flatMap((article) => article.related) } },
    limit: 100,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const idBySlug = new Map(docs.map((doc) => [doc.slug, doc.id]));

  for (const article of ARTICLES) {
    const doc = written.get(article.slug);
    if (!doc) continue;
    const related = article.related
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is string => typeof id === "string");
    await ctx.payload.update({
      collection: "articles",
      id: doc.id,
      data: { related, dateModified: seedDateModified(article.date) },
      depth: 0,
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    await rememberSeedWrite(ctx, "articles", doc.id);
  }
  ctx.log(`articles: «Читать также» связаны (${written.size})`);
}

export async function seed(ctx: SeedContext): Promise<void> {
  await seedListing(ctx);
  await seedWeightTool(ctx);

  const written = new Map<string, Article>();
  for (const article of ARTICLES) {
    const doc = await seedArticle(ctx, article);
    if (doc) written.set(article.slug, doc);
  }
  await linkRelated(ctx, written);
}
