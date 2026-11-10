import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";

/**
 * «use-cases» of a service page (Paper mockup `2560_service_facet`, «Где применяют»): H2 with
 * the sub on the right, then numbered cards.
 *
 * Source: a `cards` block of the service layout (`heading`, `sub`, items `title` / `text` /
 * `image`, an optional `link` making the whole card a link). Layout `g3` → 3 in a row (the
 * facet's 6 cards in two rows), `g4` → 4 in a row (2 ≤1365 px); 2 ≤1100 px, 1 ≤599 px.
 *
 * Two looks, chosen per block:
 * - **photo cards** (any item has an `image`; processing services, client request 2026-11-10):
 *   the photo covers the card like the cards of the constructions hub (`HubCard`, mockup
 *   `2560_steklyannye-konstrukcii`) — a page-colour mist from the bottom, the title and the text
 *   on it, the number on a white chip in the top-left corner (reads on any photo);
 * - **plain cards** (no images; glass types): white cards with a big pale number.
 */

export interface UseCase {
  key: string;
  title: string;
  text: string;
  href: string | null;
  /** Background photo of the card; `null` — no photo (plain card, or the well colour). */
  photo?: { src: string; alt: string } | null | undefined;
}

export interface UseCasesProps {
  heading: string;
  headingId: string;
  sub?: string | undefined;
  items: readonly UseCase[];
  columns: 3 | 4;
  anchorId?: string | undefined;
}

const COLUMNS = {
  3: "grid-cols-3",
  4: "grid-cols-4 max-lg:grid-cols-2",
} as const;

/** Photo width per column count (mirrors `COLUMNS`; content is 1780 px wide at 1920). */
const PHOTO_SIZES = {
  3: "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (min-width: 1920px) 600px, 33vw",
  4: "(max-width: 599px) 100vw, (max-width: 1365px) 50vw, (min-width: 1920px) 450px, 25vw",
} as const;

const PLAIN_CARD =
  "bg-surface border-hairline flex h-full w-full flex-col gap-4 rounded-xl border p-8 max-lg:p-6 max-sm:gap-3 max-sm:p-5";

/**
 * Photo card: the constructions-hub card (24 px radius, 1 px line border, text at the bottom),
 * 440 px tall at desktop like there, a little lower on narrower screens.
 */
const PHOTO_CARD =
  "border-line bg-well text-text relative isolate flex h-full min-h-[440px] w-full flex-col justify-between gap-6 overflow-hidden rounded-xl border p-[clamp(20px,1.67vw,32px)] max-lg:min-h-[400px] max-sm:min-h-[360px]";

/**
 * Page-colour mist over the lower part of the photo (constructions hub: transparent at 30–40 %
 * → ~90 %). The texts here run to three lines, so the mist is dense from 62 % on: the title and
 * the text sit on ≥90 % page colour and stay AA on any photo.
 */
const MIST =
  "bg-[linear-gradient(180deg,transparent_30%,color-mix(in_oklab,var(--ig-bg)_90%,transparent)_62%,color-mix(in_oklab,var(--ig-bg)_96%,transparent)_100%)]";

/** Link cards lift on hover (DESIGN §8); the reduced-motion setting keeps them still. */
const LINK_CARD =
  "text-text ease-ig hover:shadow-card-hover focus-visible:outline-brand no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** «01», «02», … */
const number = (index: number) => String(index + 1).padStart(2, "0");

function PlainCardBody({ item, index }: { item: UseCase; index: number }) {
  return (
    <>
      {/* The list already tells the order; the pale number is decoration. */}
      <span aria-hidden="true" className="text-stat text-line-teal font-bold tabular-nums">
        {number(index)}
      </span>
      <h3 className="text-h4 text-text m-0 text-balance">{item.title}</h3>
      {item.text ? <p className="text-body text-text-2 m-0 text-pretty">{item.text}</p> : null}
    </>
  );
}

function PhotoCardBody({ item, index, sizes }: { item: UseCase; index: number; sizes: string }) {
  return (
    <>
      {item.photo ? (
        <Image
          src={item.photo.src}
          alt={item.photo.alt}
          fill
          sizes={sizes}
          className="-z-20 object-cover"
        />
      ) : null}
      <span aria-hidden="true" className={cn("absolute inset-0 -z-10", MIST)} />
      {/* The list already tells the order; the number is decoration. */}
      <span
        aria-hidden="true"
        className="bg-surface text-primary-dark shadow-card text-small self-start rounded-full px-3 py-1 font-semibold tabular-nums"
      >
        {number(index)}
      </span>
      <span className="flex flex-col gap-3 max-sm:gap-2">
        <h3 className="text-h4 text-text m-0 text-balance">{item.title}</h3>
        {item.text ? (
          <span className="text-body text-ink-2 max-w-[420px] text-pretty">{item.text}</span>
        ) : null}
      </span>
    </>
  );
}

export function UseCases({ heading, headingId, sub, items, columns, anchorId }: UseCasesProps) {
  if (items.length === 0) return null;
  const withPhotos = items.some((item) => item.photo);
  const cardClass = withPhotos ? PHOTO_CARD : PLAIN_CARD;
  const body = (item: UseCase, index: number) =>
    withPhotos ? (
      <PhotoCardBody item={item} index={index} sizes={PHOTO_SIZES[columns]} />
    ) : (
      <PlainCardBody item={item} index={index} />
    );

  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="processing-use-cases"
    >
      <Container className="flex flex-col gap-10 max-sm:gap-6">
        <div className="flex items-end justify-between gap-16 max-md:flex-col max-md:items-start max-md:gap-4">
          <h2 id={headingId} className="ig-h2 text-primary-dark m-0 text-balance">
            {heading}
          </h2>
          {sub ? <p className="text-lead text-ink-3 m-0 max-w-[560px] text-pretty">{sub}</p> : null}
        </div>
        <ol
          className={cn(
            "m-0 grid list-none gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3",
            COLUMNS[columns]
          )}
        >
          {items.map((item, index) => (
            <li
              key={item.key}
              className="flex"
              data-testid="processing-use-case"
              data-photo={withPhotos && item.photo ? "" : undefined}
            >
              {item.href ? (
                <Link href={item.href} className={cn(cardClass, LINK_CARD)}>
                  {body(item, index)}
                </Link>
              ) : (
                <div className={cardClass}>{body(item, index)}</div>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
