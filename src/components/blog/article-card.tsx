import Link from "next/link";
import { Clock } from "lucide-react";
import { BlockImage } from "@/components/blocks/shared";
import { Placeholder } from "@/components/ig/placeholder";
import type { ArticleSummary } from "@/lib/blog/articles";
import { cn } from "@/lib/utils";

/** `sizes` of the card image: 3 / 2 / 1 columns at ≥1101 / 600–1100 / ≤599. */
const CARD_IMAGE_SIZES = "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 33vw";

/** Card grid of the blog: 3 columns ≥1101 (gap 24), 2 at 600–1100, 1 at ≤599. */
export const ARTICLE_GRID_CLASS =
  "m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4";

export interface ArticleCardProps {
  article: ArticleSummary;
  /** `h2` in the listing (under the page H1), `h3` under a section heading. */
  titleAs?: "h2" | "h3";
  /** Teaser and reading time (listing); «Читать также» shows the title only, as in the prototype. */
  details?: boolean;
  className?: string | undefined;
}

/**
 * Article card (`.ig-card`, the whole card is one link): 16:9 image or a neutral placeholder,
 * the «Статья» label, the title, a two-line teaser and the reading time.
 */
export function ArticleCard({
  article,
  titleAs: Title = "h2",
  details = true,
  className,
}: ArticleCardProps) {
  const minutes = article.readingTimeMinutes;
  return (
    <Link href={article.path} className={cn("ig-card h-full", className)}>
      {article.image ? (
        <BlockImage
          media={article.image}
          alt=""
          size="card"
          sizes={CARD_IMAGE_SIZES}
          frameClassName="aspect-video"
        />
      ) : (
        <Placeholder ratio="16/9" label="" />
      )}
      <div className="ig-card__body">
        <span className="ig-label">Статья</span>
        <Title className="ig-card__title text-[19px] leading-snug font-semibold">
          {article.title}
        </Title>
        {details && article.description ? (
          <p className="ig-card__sub line-clamp-2">{article.description}</p>
        ) : null}
        {details && minutes ? (
          <p className="text-small text-text-2 m-0 mt-auto flex items-center gap-1.5 pt-2">
            <Clock aria-hidden="true" strokeWidth={2} className="size-4 flex-none" />
            <span className="sr-only">Время чтения:</span>
            <span data-testid="reading-time">{minutes} мин</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
