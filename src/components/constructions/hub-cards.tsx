import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import { asMedia, fill, hasText, mediaSrc, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { Container } from "@/components/ig/container";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * «Конструкции» of the hub `/steklyannye-konstrukcii/` (Paper mockup
 * `2560_steklyannye-konstrukcii`, section `constructions`): photo cards from the document's
 * `cards` block (title, text, link, image) and, as the last cell spanning two columns, the dark
 * «Монтаж» panel from its `cta` block (`tone: primaryDark`).
 *
 * 3 columns; ≤1100 px 2 (the panel then takes one cell, next to the seventh card); ≤599 px 1.
 * Cards keep the mockup height (440 px at 1920) and shrink a little on narrower screens.
 */

export interface HubCardsProps {
  cards: BlockOf<"cards"> | null;
  montage: BlockOf<"cta"> | null;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

const HEADING_ID = "construction-cards-title";
const DEFAULT_HEADING = "Конструкции";

/** A third of the content (577 px at 1920), half ≤1100, the full width ≤599. */
const IMAGE_SIZES =
  "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (min-width: 1920px) 600px, 33vw";

/** Mockup padding: 48 px for the cards, 64 px for the panel at 1920; never below 24 px. */
const CARD_PADDING = "p-[clamp(24px,2.5vw,48px)]";
const PANEL_PADDING = "p-[clamp(24px,3.34vw,64px)]";

/** Card height: 440 px in the mockup; less on narrower screens, where the cards get narrower too. */
const CARD_HEIGHT = "min-h-[440px] max-lg:min-h-[400px] max-sm:min-h-[340px]";

/**
 * Light page-colour mist at the bottom of the photo (mockup: transparent at 30–40 % → 85–92 %).
 * One gradient for every card — the strongest of the mockup — so the text stays AA on any photo.
 */
const MIST =
  "bg-[linear-gradient(180deg,transparent_30%,color-mix(in_oklab,var(--ig-bg)_88%,transparent)_78%,color-mix(in_oklab,var(--ig-bg)_92%,transparent)_100%)]";

type CardItem = NonNullable<BlockOf<"cards">["items"]>[number];

interface ResolvedCard {
  key: string;
  href: string;
  title: string;
  text: string;
  photo: { src: string; alt: string } | null;
}

function resolveCard(item: CardItem, index: number, ctx: PlaceholderContext): ResolvedCard | null {
  const link = resolveLink(item.link);
  const title = fill(item.title, ctx);
  if (!link || !title) return null;
  const media = asMedia(item.image);
  const src = media ? mediaSrc(media) : null;
  return {
    key: item.id ?? String(index),
    href: link.href,
    title,
    text: fill(item.text, ctx),
    photo: media && src ? { src, alt: media.alt?.trim() ?? "" } : null,
  };
}

function HubCard({ card }: { card: ResolvedCard }) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group/card ease-ig border-line bg-well text-text hover:shadow-card-hover focus-visible:outline-brand relative isolate flex w-full items-end overflow-hidden rounded-xl border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        CARD_HEIGHT,
        CARD_PADDING
      )}
      data-testid="construction-card"
    >
      {card.photo ? (
        <Image
          src={card.photo.src}
          alt={card.photo.alt}
          fill
          sizes={IMAGE_SIZES}
          className="-z-20 object-cover"
        />
      ) : null}
      <span aria-hidden="true" className={cn("absolute inset-0 -z-10", MIST)} />
      <span className="flex w-full flex-col gap-3">
        <h3 className="text-h3 max-xl:text-h4 max-md:text-h3 m-0 max-w-[420px] text-balance">
          {card.title}
        </h3>
        <span className="flex items-center justify-between gap-6 max-sm:gap-4">
          {card.text ? (
            <span className="text-text-2 max-w-[340px] text-[16px] leading-[1.45] text-pretty">
              {card.text}
            </span>
          ) : (
            <span />
          )}
          <span
            aria-hidden="true"
            className="bg-primary group-hover/card:bg-primary-hover flex size-16 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-200 max-sm:size-12"
          >
            <ArrowUpRight strokeWidth={2} className="size-7 max-sm:size-6" />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** The dark «Монтаж» panel: title, text and the buttons of the `cta` block. */
function MontagePanel({
  block,
  ctx,
  page,
}: {
  block: BlockOf<"cta">;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  const title = fill(block.title, ctx);
  const headingId = "construction-montage-title";
  return (
    <div
      className={cn(
        "bg-primary-dark text-on-navy flex h-full w-full flex-col justify-between gap-8 rounded-xl",
        CARD_HEIGHT,
        PANEL_PADDING
      )}
      role="group"
      {...(title ? { "aria-labelledby": headingId } : {})}
      data-testid="construction-montage"
    >
      <div className="flex flex-col gap-5">
        {title ? (
          <h3 id={headingId} className="ig-h2 text-on-navy m-0">
            {title}
          </h3>
        ) : null}
        {block.body ? (
          <div className="text-on-navy-2 text-lead-m max-w-[600px] [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
            <RichText data={block.body} ctx={ctx} disableContainer />
          </div>
        ) : null}
      </div>
      <CtaButtons buttons={block.buttons} ctx={ctx} page={page} onDark />
    </div>
  );
}

export function HubCards({ cards, montage, ctx, page }: HubCardsProps) {
  const items = (cards?.items ?? []).flatMap((item, index) => {
    const card = resolveCard(item, index, ctx);
    return card ? [card] : [];
  });
  const showMontage = Boolean(
    montage && (hasText(montage.title) || (montage.buttons ?? []).length > 0)
  );
  if (items.length === 0 && !showMontage) return null;
  const heading = fill(cards?.heading, ctx) || DEFAULT_HEADING;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="construction-cards"
    >
      <Container className="flex flex-col gap-6">
        <h2 id={HEADING_ID} className="ig-h2 m-0 pb-4 max-sm:pb-0">
          {heading}
        </h2>
        <ul className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4">
          {items.map((card) => (
            <li key={card.key} className="flex">
              <HubCard card={card} />
            </li>
          ))}
          {showMontage && montage ? (
            <li className="col-span-2 flex max-md:col-span-1">
              <MontagePanel block={montage} ctx={ctx} page={page} />
            </li>
          ) : null}
        </ul>
      </Container>
    </section>
  );
}
