import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlockImage, mediaSrc } from "@/components/blocks/shared";
import { Placeholder } from "@/components/ig/placeholder";
import type { ArticleSummary } from "@/lib/blog/articles";
import { cn } from "@/lib/utils";

/**
 * Article cards of the blog (Paper mockup `2560_blog`, frames `GFA-0` / `GNS-0`): the whole card
 * is one link. Used by the listing and by «Читать также» of the article page.
 */

/** `sizes` of the grid card image: 3 / 2 / 1 columns at ≥1101 / 600–1100 / ≤599. */
const CARD_IMAGE_SIZES = "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 33vw";

/** The featured photo takes ≈60 % of the 1920 frame (1060 of 1780); ≤1100 it spans the card. */
const FEATURED_IMAGE_SIZES = "(max-width: 1100px) 100vw, (min-width: 1920px) 1060px, 60vw";

/** Card grid of the blog: 3 columns ≥1101 (gap 24), 2 at 600–1100, 1 at ≤599. */
export const ARTICLE_GRID_CLASS =
  "m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4";

/** White card with a hairline frame; lifts on hover (`DESIGN.md` §8), not with reduced motion. */
const CARD_FRAME =
  "bg-surface border-hairline text-text hover:shadow-card-hover focus-visible:outline-brand flex overflow-hidden border no-underline transition-[transform,box-shadow] duration-(--ig-dur-base) ease-ig hover:-translate-y-0.5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/**
 * «Статья · 2 мин»: the reading time sits in its own span (`reading-time`), so it can be read
 * without the label.
 */
function Kicker({ minutes, className }: { minutes: number | null; className: string }) {
  return (
    <span className={cn("font-medium uppercase", className)}>
      Статья
      {minutes ? (
        <>
          {" · "}
          <span className="sr-only">время чтения </span>
          <span data-testid="reading-time">{minutes} мин</span>
        </>
      ) : null}
    </span>
  );
}

export interface ArticleCardProps {
  article: ArticleSummary;
  /** `h2` in the listing (under the page H1), `h3` under a section heading. */
  titleAs?: "h2" | "h3";
  className?: string | undefined;
}

/**
 * Grid card: 16:9 photo (or a neutral placeholder), «СТАТЬЯ · N МИН», the title, a hairline and
 * the teaser.
 */
export function ArticleCard({ article, titleAs: Title = "h2", className }: ArticleCardProps) {
  return (
    <Link
      href={article.path}
      className={cn(CARD_FRAME, "h-full flex-col rounded-lg", className)}
      data-testid="article-card"
    >
      {article.image ? (
        <BlockImage
          media={article.image}
          alt=""
          size="card"
          sizes={CARD_IMAGE_SIZES}
          frameClassName="aspect-video bg-well shrink-0"
        />
      ) : (
        <Placeholder ratio="16/9" label="" />
      )}
      <div className="flex flex-1 flex-col gap-2.5 px-6 pt-6 pb-7 max-sm:px-5 max-sm:pt-5 max-sm:pb-6">
        <Kicker
          minutes={article.readingTimeMinutes}
          className="text-text-2 text-[13px] leading-4"
        />
        <Title className="m-0 text-[20px] leading-[1.3] font-semibold text-balance">
          {article.title}
        </Title>
        {article.description ? (
          <p
            className="border-hairline text-text-2 m-0 border-t pt-3 text-[15px] leading-normal"
            data-testid="article-excerpt"
          >
            {article.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * The first article of `/blog/` (mockup frame `GNS-0`): photo on the left (1060 of 1780 px),
 * kicker, 40 px title, teaser and «Читать статью →» on the right. ≤1100 px the photo goes on top.
 */
export function ArticleFeaturedCard({ article, className }: Omit<ArticleCardProps, "titleAs">) {
  const src = article.image ? mediaSrc(article.image, "hero") : null;
  return (
    <Link
      href={article.path}
      className={cn(
        CARD_FRAME,
        "rounded-xl max-md:flex-col max-sm:rounded-lg md:grid md:min-h-[440px] md:grid-cols-[minmax(0,1060fr)_minmax(0,720fr)] xl:min-h-[520px]",
        className
      )}
      data-testid="article-featured"
    >
      <div className="bg-well relative shrink-0 max-md:aspect-video">
        {src ? (
          <Image src={src} alt="" fill sizes={FEATURED_IMAGE_SIZES} className="object-cover" />
        ) : (
          <Placeholder label="" className="absolute inset-0 aspect-auto" />
        )}
      </div>
      <div className="flex flex-col justify-between gap-8 p-14 max-lg:p-10 max-md:gap-6 max-sm:p-5">
        <div className="flex flex-col gap-5 max-sm:gap-3">
          <Kicker
            minutes={article.readingTimeMinutes}
            className="text-primary-pressed text-xs leading-4 tracking-[0.08em]"
          />
          <h2 className="m-0 text-[40px] leading-[1.15] font-bold text-balance max-lg:text-[32px] max-sm:text-2xl max-sm:leading-[1.2]">
            {article.title}
          </h2>
          {article.description ? (
            <p
              className="text-ink-3 m-0 text-lg leading-[1.55] text-pretty max-sm:text-base"
              data-testid="article-excerpt"
            >
              {article.description}
            </p>
          ) : null}
        </div>
        <span className="text-primary-pressed inline-flex items-center gap-2.5 text-[17px] leading-[22px] font-medium">
          <span className="underline decoration-1 underline-offset-4">Читать статью</span>
          <ArrowRight aria-hidden="true" strokeWidth={2} className="size-5 shrink-0" />
        </span>
      </div>
    </Link>
  );
}
