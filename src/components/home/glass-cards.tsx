import Link from "next/link";
import {
  BlockImage,
  BlockSection,
  CARD_GRID,
  CARD_IMAGE_SIZES,
  asMedia,
  fill,
  resolveLink,
} from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import { buildQuizHref } from "@/components/page/quiz-cta";
import { getPrices } from "@/lib/cms/globals";
import { resolvePrice } from "@/lib/domain";
import type { QuizTypeId } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { homePriceFootnote } from "./price-footnote";

/** Label of the quiz link on every catalog card (UI microcopy, `13-homepage.md` §3). */
const CALC_LABEL = "Рассчитать";

/**
 * `.ig-card` whose root is not a link: the hover lift and shadow of `a.ig-card` are repeated
 * here (200 ms, none with reduced motion).
 */
const CARD_CLASS =
  "ig-card relative w-full hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:hover:translate-y-0";

/** `{цена_4мм}` in a price hint → the thickness whose price the card shows. */
const PRICE_PLACEHOLDER = /\{цена_(\d+)мм\}/u;

/** Catalog sections that pre-select another quiz product than the page's one. */
const QUIZ_TYPE_BY_PATH: ReadonlyArray<readonly [prefix: string, type: QuizTypeId]> = [
  ["/tripleks/", "triplex"],
];

type CardItem = NonNullable<BlockProps<"cards">["block"]["items"]>[number];

/** Quiz product of a card: triplex for the triplex section, otherwise the page pre-fill. */
function quizTypeFor(href: string | null, fallback: QuizTypeId | null | undefined) {
  const match = href ? QUIZ_TYPE_BY_PATH.find(([prefix]) => href.startsWith(prefix)) : undefined;
  return match ? match[1] : (fallback ?? undefined);
}

/**
 * Price of a card from the CMS price list, or `null`. The hint keeps the teksty wording
 * («от {цена_4мм} ₽/м²*»); the shown value is `resolvePrice` of that thickness (with NBSP) plus
 * the footnote mark, and nothing at all when the price list is stale or has no price.
 */
function cardPrice(item: CardItem, ctx: BlockProps<"cards">["ctx"]): string | null {
  const match = item.priceHint ? PRICE_PLACEHOLDER.exec(item.priceHint) : null;
  if (!match) return null;
  const price = resolvePrice(Number(match[1]), ctx.prices, ctx.now);
  return price.state === "price" ? `${price.label}*` : null;
}

/**
 * Block 3 — «Закалённое стекло и триплекс под ваш размер»: 4 catalog cards. The card is not a
 * link itself: the title link stretches over the card (`::after`) and the separate «Рассчитать»
 * quiz link sits above it (`z-10`), so there are no nested `<a>`. The price footnote under the
 * grid is the `prices.caption` global (ТЗ §11 wording, see `homePriceFootnote`), shown only while
 * a price is displayed; the block `sub` is the ordinary section subtitle.
 */
export async function HomeGlassCards({ block, ctx, section, page }: BlockProps<"cards">) {
  const items = block.items ?? [];
  if (items.length === 0) return null;
  const cards = items.map((item) => ({
    item,
    link: resolveLink(item.link),
    price: cardPrice(item, ctx),
  }));
  const showFootnote = cards.some((card) => card.price !== null);
  const footnote = showFootnote ? homePriceFootnote((await getPrices())?.caption, ctx) : null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[4], "m-0 list-none p-0")}>
        {cards.map(({ item, link, price }, index) => {
          const media = asMedia(item.image);
          const quizHref = buildQuizHref({
            type: quizTypeFor(link?.href ?? null, page?.quizPrefill?.type),
            src: page?.path ?? "/",
          });
          return (
            <li key={item.id ?? index} className="flex">
              <article className={CARD_CLASS}>
                {media ? (
                  <BlockImage media={media} size="card" sizes={CARD_IMAGE_SIZES[4]} />
                ) : (
                  <Placeholder label="фото" />
                )}
                <div className="ig-card__body">
                  <h3 className="ig-card__title">
                    {link ? (
                      <Link
                        href={link.href}
                        className="text-inherit no-underline after:absolute after:inset-0 after:content-['']"
                      >
                        {fill(item.title, ctx)}
                      </Link>
                    ) : (
                      fill(item.title, ctx)
                    )}
                  </h3>
                  {item.text ? <p className="ig-card__sub">{fill(item.text, ctx)}</p> : null}
                  <div className="ig-card__foot">
                    {price ? (
                      <span className="ig-price-m text-primary-dark tabular-nums">{price}</span>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={quizHref}
                      className="ig-link ig-link--arrow relative z-10 text-sm font-medium"
                      data-quiz-cta=""
                    >
                      {CALC_LABEL}
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      {footnote ? <p className="text-small text-text-2 mt-5 mb-0">{footnote}</p> : null}
    </BlockSection>
  );
}
