import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { asMedia, mediaSrc } from "@/components/blocks/shared";
import { Container } from "@/components/ig/container";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ProcessingService } from "@/payload-types";

/**
 * Photo cards of processing services (Paper mockups `2560_obrabotka-stekla` and
 * `2560_service_*`): the card photo (`serviceCardMedia`), title, main limit
 * (`keyLimit`) and a round arrow button; the whole card links to the service page. 3 columns,
 * 2 ≤1100 px, 1 ≤599 px (the cards carry big text, so phones get one column, still square so
 * the text sits on the light bottom of the photo).
 *
 * - `ServiceCards` — «Что делаем» of the hub: every published service; the mockup has no
 *   visible heading, the section keeps an `sr-only` h2.
 * - `RelatedServices` — «Другая обработка» of a service page: three other services under a
 *   visible H2 with the «Все виды обработки →» link to the hub.
 */

export type ServiceCardDoc = Pick<
  ProcessingService,
  "id" | "title" | "card" | "keyLimit" | "path" | "heroImage"
>;

export interface ServiceCardsProps {
  services: readonly ServiceCardDoc[];
  ctx: PlaceholderContext;
}

export interface RelatedServicesProps extends ServiceCardsProps {
  /** Path of the hub for «Все виды обработки». */
  hubPath: string;
}

const HUB_HEADING = "Что делаем";
const HUB_HEADING_ID = "processing-operations-title";
const RELATED_HEADING = "Другая обработка";
const RELATED_HEADING_ID = "processing-related-title";
const ALL_SERVICES = "Все виды обработки";

/** Card width: a third of the content (577 px at 1920), half ≤1100, the full width ≤599. */
const IMAGE_SIZES =
  "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (min-width: 1920px) 600px, 33vw";

/**
 * Mockup padding is 64 px at 1920 (3.33vw); it scales down with the card and never drops
 * below 24 px.
 */
const CARD_PADDING = "p-[clamp(24px,3.34vw,64px)]";

const text = (value: string | null | undefined, ctx: PlaceholderContext) =>
  value?.trim() ? replacePlaceholders(value.trim(), ctx) : "";

/**
 * Photo of a service card: the card's own photo (`card.image`, the square mockup photos of the
 * hub, client request 2026-11-10), else the hero photo of the service page. A generated
 * placeholder in `card.image` gives way to a real hero photo.
 */
export function serviceCardMedia(service: Pick<ServiceCardDoc, "card" | "heroImage">) {
  const card = asMedia(service.card?.image);
  const hero = asMedia(service.heroImage);
  if (card && !card.isPlaceholder) return card;
  return hero ?? card;
}

function photoOf(service: ServiceCardDoc): { src: string; alt: string } | null {
  const media = serviceCardMedia(service);
  const src = media ? mediaSrc(media) : null;
  // The title next to the photo names the card: the image itself is decorative here.
  return media && src ? { src, alt: "" } : null;
}

function ServiceCard({ service, ctx }: { service: ServiceCardDoc; ctx: PlaceholderContext }) {
  const title = text(service.card?.title, ctx) || text(service.title, ctx);
  const limit = text(service.keyLimit, ctx);
  const photo = photoOf(service);
  return (
    <Link
      href={service.path!}
      className={`group/card ease-ig border-brand/30 bg-well text-text hover:shadow-card-hover focus-visible:outline-brand relative isolate flex aspect-square w-full items-end overflow-hidden rounded-xl border-2 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${CARD_PADDING}`}
      data-testid="processing-card"
    >
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={IMAGE_SIZES}
          className="-z-20 object-cover"
        />
      ) : null}
      {/* The photos fade to a light mist at the bottom; this keeps dark text AA on any of them. */}
      <span
        aria-hidden="true"
        className="from-surface/85 via-surface/40 max-sm:from-surface/90 max-sm:via-surface/60 absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-linear-to-t to-transparent max-md:h-2/3"
      />
      <span className="flex w-full flex-col gap-3">
        <h3 className="text-h3 max-xl:text-h4 max-md:text-h3 m-0 text-balance">{title}</h3>
        <span className="flex items-center justify-between gap-6 max-sm:gap-4">
          {limit ? <span className="text-body max-w-[320px] text-pretty">{limit}</span> : <span />}
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

function CardGrid({ services, ctx }: ServiceCardsProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4">
      {services.map((service) => (
        <li key={service.id} className="flex">
          <ServiceCard service={service} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}

const linked = (services: readonly ServiceCardDoc[]) =>
  services.filter((service) => Boolean(service.path));

export function ServiceCards({ services, ctx }: ServiceCardsProps) {
  const cards = linked(services);
  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby={HUB_HEADING_ID}
      className="bg-bg py-16 max-md:py-12 max-sm:py-8"
      data-testid="processing-operations"
    >
      <Container>
        <h2 id={HUB_HEADING_ID} className="sr-only">
          {HUB_HEADING}
        </h2>
        <CardGrid services={cards} ctx={ctx} />
      </Container>
    </section>
  );
}

export function RelatedServices({ services, ctx, hubPath }: RelatedServicesProps) {
  const cards = linked(services);
  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby={RELATED_HEADING_ID}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="processing-related"
    >
      <Container className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-6 pb-4 max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:pb-2">
          <h2 id={RELATED_HEADING_ID} className="ig-h2 text-primary-dark m-0">
            {RELATED_HEADING}
          </h2>
          <Link
            href={hubPath}
            className={cn(
              "text-primary-dark group/all inline-flex min-h-11 items-center gap-1.5 font-semibold no-underline",
              "focus-visible:outline-brand rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            )}
          >
            {ALL_SERVICES}
            <ArrowRight
              aria-hidden="true"
              strokeWidth={2}
              className="ease-ig size-[18px] transition-transform duration-200 group-hover/all:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>
        <CardGrid services={cards} ctx={ctx} />
      </Container>
    </section>
  );
}
