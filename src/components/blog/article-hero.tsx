import Image from "next/image";
import { Clock } from "lucide-react";
import { mediaSrc } from "@/components/blocks/shared";
import type { Media } from "@/payload-types";

/**
 * First screen of an article (Paper mockup `2560_blog_statya`, frames `hero` / `cover`): on the
 * page background (no white band), the H1 up to 1200 px, the meta row indented by one more
 * gutter («СТАТЬЯ» chip + reading time), then the cover photo (1780 × 620 at 1920, 24 px radius),
 * the page's LCP element. Crumbs come from `PageShell`.
 */

export const ARTICLE_TITLE_ID = "page-title";

/** The cover spans the content width of the 1920 frame. */
const COVER_SIZES = "(min-width: 1920px) 1780px, 100vw";

export interface ArticleHeroProps {
  title: string;
  readingTimeMinutes: number | null | undefined;
  /** Cover (hero image of the article); without one the hero ends with the meta row. */
  cover: Media | null;
}

export function ArticleHero({ title, readingTimeMinutes, cover }: ArticleHeroProps) {
  const src = cover ? mediaSrc(cover) : null;
  return (
    <section
      aria-labelledby={ARTICLE_TITLE_ID}
      className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-(--ig-gutter) pt-8 max-sm:gap-4 max-sm:pt-6"
      data-testid="article-hero"
    >
      <h1 id={ARTICLE_TITLE_ID} className="ig-h1 m-0 max-w-[1200px] text-balance">
        {title}
      </h1>
      <div className="ml-(--ig-gutter) flex flex-wrap items-center gap-4 max-md:ml-0">
        <span className="bg-primary-light text-primary-pressed rounded-full px-3.5 py-1.5 text-[13px] leading-4 font-medium tracking-[0.06em] uppercase">
          Статья
        </span>
        {readingTimeMinutes ? (
          <span className="text-text-2 flex items-center gap-2 text-base leading-5">
            <Clock aria-hidden="true" strokeWidth={2} className="size-[18px] shrink-0" />
            <span data-testid="article-reading-time">{readingTimeMinutes} мин чтения</span>
          </span>
        ) : null}
      </div>
      {src && cover ? (
        <div className="bg-well relative mt-16 aspect-[1780/620] overflow-hidden rounded-xl max-lg:aspect-[16/7] max-md:mt-6 max-sm:mt-2 max-sm:aspect-video max-sm:rounded-lg">
          <Image
            src={src}
            alt={cover.alt ?? ""}
            fill
            // LCP element: preloaded with high priority; 60 is the large-hero quality of
            // next.config `images.qualities`.
            preload
            fetchPriority="high"
            quality={60}
            sizes={COVER_SIZES}
            className="object-cover"
          />
        </div>
      ) : null}
    </section>
  );
}
