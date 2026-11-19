import Image from "next/image";
import { Container } from "@/components/ig/container";
import { Section, SectionHead } from "@/components/ig/section";
import { cn } from "@/lib/utils";

const HEADING = "Наши клиенты";
const HEADING_ID = "home-clients-title";
const LOGO_DIR = "/images/clients";

/** Rendered logo height (px): desktop / ≤599. Keep in sync with `LOGO_CLASS`. */
const LOGO_HEIGHT = 65;
const LOGO_HEIGHT_MOBILE = 44;
const LOGO_CLASS = "h-[65px] w-auto max-w-none object-contain max-sm:h-[44px]";

interface ClientLogo {
  /** File name in `public/images/clients/` without the `logo-` prefix and `.png`. */
  slug: string;
  alt: string;
  /** Intrinsic size of the PNG: aspect ratio for `next/image` and the `sizes` hint. */
  width: number;
  height: number;
}

/** Client logos in the order of the «Наши клиенты» carousel on inex.su. */
const CLIENTS: readonly ClientLogo[] = [
  { slug: "sberbank", alt: "Сбербанк", width: 838, height: 201 },
  { slug: "trk-kuba", alt: "ТРК „Куба“", width: 355, height: 215 },
  { slug: "trk-gorki", alt: "ТРК „Горки“", width: 209, height: 44 },
  { slug: "lesnoi-ostrov", alt: "Клубный посёлок „Лесной остров“", width: 180, height: 71 },
  { slug: "mts", alt: "МТС", width: 520, height: 270 },
  { slug: "kinomax", alt: "Кинотеатр „Киномакс“", width: 530, height: 139 },
  { slug: "mcdonalds", alt: "McDonald’s", width: 595, height: 336 },
  { slug: "trk-rodnik", alt: "ТРК „Родник“", width: 321, height: 66 },
  { slug: "mitsubishi-motors", alt: "Mitsubishi Motors", width: 440, height: 153 },
  { slug: "la-traktor", alt: "ХК „Трактор“", width: 310, height: 72 },
  { slug: "trc-fokus", alt: "ТРЦ „Фокус“", width: 185, height: 50 },
  { slug: "kd", alt: "KD Двери", width: 459, height: 143 },
  { slug: "arkaim-plaza", alt: "ТРК „Аркаим Плаза“", width: 226, height: 116 },
  { slug: "audi", alt: "Audi", width: 500, height: 329 },
  { slug: "bovid", alt: "БоВид", width: 620, height: 205 },
  { slug: "tc-festival-city", alt: "ТЦ „Festival City“", width: 200, height: 62 },
  { slug: "so-zhaso", alt: "Страховое общество „ЖАСО“", width: 213, height: 172 },
  { slug: "trk-ural", alt: "ТРК „Урал“", width: 236, height: 60 },
  { slug: "snezhnaya-koroleva", alt: "Снежная Королева", width: 443, height: 88 },
  { slug: "tk-kolco", alt: "ТК „Кольцо“", width: 195, height: 90 },
  { slug: "castorama", alt: "Castorama", width: 261, height: 38 },
];

/** Rendered width at a given height, so the optimizer picks a source no wider than needed. */
function renderedWidth(logo: ClientLogo, height: number): number {
  return Math.ceil((logo.width / logo.height) * height);
}

function logoSizes(logo: ClientLogo): string {
  return `(max-width: 599px) ${renderedWidth(logo, LOGO_HEIGHT_MOBILE)}px, ${renderedWidth(logo, LOGO_HEIGHT)}px`;
}

/**
 * Spacing as right padding of every item (not `gap`): both halves of the track are then exactly
 * equal, so -50% loops seamlessly. With reduced motion the list wraps and `gap` takes over.
 */
const LIST_CLASS =
  "m-0 flex flex-none list-none items-center p-0 motion-reduce:flex-1 motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-12 motion-reduce:gap-y-8 motion-reduce:px-(--ig-gutter) max-sm:motion-reduce:gap-x-8 max-sm:motion-reduce:gap-y-6";
const ITEM_CLASS = "flex flex-none pr-16 max-sm:pr-10 motion-reduce:pr-0";

function LogoList({ copy = false }: { copy?: boolean }) {
  return (
    <ul
      className={cn(LIST_CLASS, copy && "motion-reduce:hidden")}
      aria-hidden={copy || undefined}
      data-clients-copy={copy ? "" : undefined}
    >
      {CLIENTS.map((logo) => (
        <li key={logo.slug} className={ITEM_CLASS}>
          <Image
            src={`${LOGO_DIR}/logo-${logo.slug}.png`}
            // The copy is purely visual: its images must not be announced a second time.
            alt={copy ? "" : logo.alt}
            width={logo.width}
            height={logo.height}
            sizes={logoSizes(logo)}
            // Not `lazy`: Chrome lazy-loads an image only once it intersects the clipped strip,
            // so every logo popped in blank at the edge as the track moved. 21 small files
            // (shared by both copies), fetched at low priority after the critical resources.
            loading="eager"
            fetchPriority="low"
            className={LOGO_CLASS}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * «Наши клиенты» on the home page (customer request 2026-11-19, as the strip on inex.su): client
 * logos in full colour in an endless horizontal marquee across the 1920 px frame, edges faded.
 * The endless motion is the second approved exception to DESIGN.md §8: it pauses on hover and
 * while the strip has keyboard focus (the viewport is focusable for that reason), and
 * `prefers-reduced-motion` shows the logos statically, wrapped into rows. Static data — the
 * schema is frozen, so the list is not editable in the CMS.
 */
export function HomeClientsMarquee() {
  return (
    <Section contained={false} aria-labelledby={HEADING_ID}>
      <Container>
        <SectionHead title={HEADING} headingId={HEADING_ID} />
      </Container>
      <div
        // The edge fade is dropped while focused, otherwise it would also fade the focus outline.
        className="group/clients focus-visible:outline-brand overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] py-2 focus-visible:[mask-image:none] focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:[mask-image:none]"
        // Focus pauses the marquee (WCAG 2.2.2): logos are not links, so the strip itself is a stop.
        tabIndex={0}
        role="group"
        aria-label={HEADING}
      >
        <div className="animate-clients-marquee flex w-max will-change-transform group-focus-within/clients:[animation-play-state:paused] group-hover/clients:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
          <LogoList />
          <LogoList copy />
        </div>
      </div>
    </Section>
  );
}
