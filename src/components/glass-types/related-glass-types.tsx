import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";
import { Swatch, type SwatchData } from "./swatch";

/**
 * «Другие виды стекла» of a glass-type page (Paper mockup `2560_glass_matovoe`, section
 * «related»): H2 with «Все виды стекла →» to the hub, then three white text cards — the type
 * name, its card text, colour swatches when the type has colour variants (тонированное) and a
 * round primary arrow button. The whole card links to the type. 3 columns, 1 ≤1100 px (the
 * cards are short: a column of three reads better than a 2 + 1 grid).
 */

export interface RelatedGlassTypeCard {
  key: string;
  href: string;
  title: string;
  text: string;
  /** Colour swatches (only `color` variants, at most `MAX_SWATCHES`). */
  swatches: readonly SwatchData[];
}

export interface RelatedGlassTypesProps {
  cards: readonly RelatedGlassTypeCard[];
  hubPath: string;
}

const HEADING = "Другие виды стекла";
const HEADING_ID = "glass-related-title";
const ALL_TYPES = "Все виды стекла";

/** Swatches shown on a card; more would crowd the arrow button. */
export const MAX_SWATCHES = 5;

/** Link cards lift on hover (DESIGN §8); the reduced-motion setting keeps them still. */
const CARD =
  "group/card bg-surface border-hairline text-text ease-ig hover:shadow-card-hover focus-visible:outline-brand flex min-h-70 w-full flex-col justify-between gap-8 rounded-xl border p-10 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 max-lg:p-8 max-md:min-h-0 max-sm:gap-6 max-sm:p-5";

function Card({ card }: { card: RelatedGlassTypeCard }) {
  return (
    <Link href={card.href} className={CARD} data-testid="glass-related-card">
      <span className="flex flex-col gap-3">
        <h3 className="text-h3 m-0 text-balance">{card.title}</h3>
        {card.text ? <span className="text-body text-text-2 text-pretty">{card.text}</span> : null}
      </span>
      <span className="flex items-end justify-between gap-6">
        {card.swatches.length > 0 ? (
          <span className="flex gap-2" data-testid="glass-related-swatches">
            {card.swatches.map((swatch, index) => (
              <Swatch key={index} swatch={swatch} className="size-10 rounded-full" sizes="40px" />
            ))}
          </span>
        ) : (
          <span />
        )}
        <span
          aria-hidden="true"
          className="bg-primary group-hover/card:bg-primary-hover flex size-16 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-200 max-sm:size-12"
        >
          <ArrowUpRight strokeWidth={2.5} className="size-6" />
        </span>
      </span>
    </Link>
  );
}

export function RelatedGlassTypes({ cards, hubPath }: RelatedGlassTypesProps) {
  if (cards.length === 0) return null;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="glass-related"
    >
      <Container className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-6 pb-4 max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:pb-2">
          <h2 id={HEADING_ID} className="ig-h2 text-primary-dark m-0">
            {HEADING}
          </h2>
          <Link
            href={hubPath}
            className={cn(
              "text-primary-dark group/all inline-flex min-h-11 items-center gap-1.5 font-semibold no-underline",
              "focus-visible:outline-brand rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            )}
          >
            {ALL_TYPES}
            <ArrowRight
              aria-hidden="true"
              strokeWidth={2}
              className="ease-ig size-[18px] transition-transform duration-200 group-hover/all:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-1 max-sm:gap-4">
          {cards.map((card) => (
            <li key={card.key} className="flex">
              <Card card={card} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
