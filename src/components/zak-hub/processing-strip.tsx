import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";
import { SectionLink } from "./section-link";

/**
 * «Обработка до закалки» of the tempered-glass hub and «Обработка стекла N мм» of the thickness
 * cards (Paper mockups `2560_zakalennoe-steklo` / `2560_zak_tolshchina_10mm`, frame
 * `processing`): the H2 with the «Обработка стекла →» link, an optional lead, then six photo
 * cards of the processing services (photo, light mist at the bottom, title and the main fact),
 * each a link to its service page.
 *
 * 6 columns at ≥1366 px, 3 below, 2 on phones (the cards get shorter so two fit side by side).
 */

export interface ProcessingStripCard {
  key: string;
  href: string;
  title: string;
  text: string;
  photo: { src: string; alt: string } | null;
}

export interface ProcessingStripProps {
  heading: string;
  headingId: string;
  /** Paragraph under the heading (the thickness cards: what can be done with N mm). */
  lead?: ReactNode;
  link: { href: string; label: string } | null;
  cards: readonly ProcessingStripCard[];
  /** Section id. */
  id?: string | undefined;
}

/** A sixth of the content at 1920 (≈283 px), a third ≤1365, half on phones. */
const IMAGE_SIZES =
  "(max-width: 599px) 50vw, (max-width: 1365px) 33vw, (min-width: 1920px) 300px, 17vw";

/**
 * Page-colour mist at the bottom (mockup: transparent at 35 % → 94 % at 80 %): dark text stays
 * AA on any photo.
 */
const MIST =
  "bg-[linear-gradient(180deg,transparent_35%,color-mix(in_oklab,var(--ig-bg)_94%,transparent)_80%)]";

function StripCard({ card }: { card: ProcessingStripCard }) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group/card ease-ig border-line bg-well text-text hover:shadow-card-hover focus-visible:outline-brand relative isolate flex h-[360px] w-full flex-col justify-end gap-1.5 overflow-hidden rounded-lg border p-6 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "max-lg:h-[320px] max-sm:h-[300px] max-sm:p-4"
      )}
      data-testid="zak-processing-card"
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
      <h3 className="m-0 text-[20px] leading-[1.25] font-bold text-balance max-sm:text-[17px]">
        {card.title}
      </h3>
      {card.text ? (
        <span className="text-ink-3 text-[14px] leading-[1.45] text-pretty max-sm:text-[13px]">
          {card.text}
        </span>
      ) : null}
    </Link>
  );
}

export function ProcessingStrip({
  heading,
  headingId,
  lead,
  link,
  cards,
  id,
}: ProcessingStripProps) {
  if (cards.length === 0) return null;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="processing"
    >
      <Container className="flex flex-col gap-8 max-sm:gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id={headingId} className="ig-h2 m-0 text-balance">
              {heading}
            </h2>
            {link ? <SectionLink href={link.href}>{link.label}</SectionLink> : null}
          </div>
          {lead ? (
            <div className="text-ink-3 max-w-[980px] text-[18px] leading-[1.6] max-sm:text-base [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
              {lead}
            </div>
          ) : null}
        </div>
        <ul className="m-0 grid list-none grid-cols-6 gap-4 p-0 max-lg:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-3">
          {cards.map((card) => (
            <li key={card.key} className="flex">
              <StripCard card={card} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
