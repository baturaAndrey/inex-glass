import type { ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { Placeholder } from "@/components/ig/placeholder";
import { cn } from "@/lib/utils";

/**
 * First screen of the «Обработка стекла» section (hub and service pages, Paper mockup
 * `2560_obrabotka-stekla`): the photo covers the whole hero inside the 1920 px frame, a white
 * fade from the left keeps the text readable. H1 from the gutter; lead and the vertical terms
 * checklist indented by one more gutter (like the home hero); buttons at the bottom, aligned
 * with the H1.
 *
 * ≤1100 px the indent goes and the fade turns almost opaque (text runs over the whole photo);
 * ≤599 px the photo becomes a band above the text, so nothing sits on top of it.
 */

export interface ProcessingHeroProps {
  /** The only `<h1>` of the page. */
  title: ReactNode;
  titleId?: string | undefined;
  /** Lead text (plain or rich); rendered in a `div`, so block content is fine. */
  lead?: ReactNode;
  /** Short terms (from the `conditions` global), shown as a vertical checklist. */
  terms?: readonly string[] | undefined;
  /** Buttons (primary + secondary). */
  actions?: ReactNode;
  /** Background photo; the hero is the LCP element, so the image is preloaded. */
  media?: { src: string; alt: string } | null | undefined;
  /**
   * Caption of the photo placeholder (`.ig-ph`) drawn on the right half when there is no
   * `media` yet (glass types before their photos are uploaded). Decorative, desktop only:
   * ≤1100 px the text runs over the whole hero and a placeholder would only push it down.
   */
  placeholder?: string | undefined;
  /**
   * Buttons indented like the lead (hub of «Стеклянные конструкции», mockup
   * `2560_steklyannye-konstrukcii`); by default they align with the H1.
   */
  indentActions?: boolean | undefined;
}

const DEFAULT_TITLE_ID = "page-title";

/** Lead and terms sit one gutter further in on desktop (`.ind` of the home hero). */
const INDENT = "ml-(--ig-gutter) max-md:ml-0";

/**
 * White fade over the photo (mockup: 90% → 78% at 24% → 35% at 50% → transparent), built from
 * the surface token. ≤1100 the text spans the whole width, so the fade stays strong to the end.
 */
const FADE =
  "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--ig-surface)_90%,transparent)_0%,color-mix(in_oklab,var(--ig-surface)_78%,transparent)_24%,color-mix(in_oklab,var(--ig-surface)_35%,transparent)_50%,transparent_100%)] max-md:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--ig-surface)_92%,transparent)_0%,color-mix(in_oklab,var(--ig-surface)_82%,transparent)_60%,color-mix(in_oklab,var(--ig-surface)_60%,transparent)_100%)]";

/** The photo spans the 1920 px frame; on phones it is a full-width band. */
const MEDIA_SIZES = "(min-width: 1920px) 1920px, 100vw";

/** Buttons row: wraps on desktop, full-width column on phones (same as `PageHero`). */
const ACTIONS_CLASS =
  "flex flex-wrap gap-3 max-sm:flex-col max-sm:self-stretch max-sm:[&_.ig-btn]:w-full";

export function ProcessingHero({
  title,
  titleId = DEFAULT_TITLE_ID,
  lead,
  terms,
  actions,
  media,
  placeholder,
  indentActions = false,
}: ProcessingHeroProps) {
  return (
    <section
      aria-labelledby={titleId}
      className="bg-bg relative mx-auto w-full max-w-[1920px] overflow-hidden"
      data-testid="processing-hero"
    >
      {media ? (
        <>
          <div className="absolute inset-0 max-sm:relative max-sm:inset-auto max-sm:aspect-[16/9]">
            <Image
              src={media.src}
              alt={media.alt}
              fill
              // LCP element: preloaded with high priority; 60 is the large-hero quality of
              // next.config `images.qualities`.
              preload
              fetchPriority="high"
              quality={60}
              sizes={MEDIA_SIZES}
              className="object-cover"
            />
          </div>
          <div aria-hidden="true" className={cn("absolute inset-0 max-sm:hidden", FADE)} />
        </>
      ) : placeholder ? (
        // The photo slot: the placeholder fades in from the middle (mask), so its edge never
        // cuts across the text; the label sits in the visible part.
        <Placeholder
          label={placeholder}
          className="absolute inset-y-0 right-0 aspect-auto w-[60%] [mask-image:linear-gradient(90deg,transparent_0%,black_35%)] max-md:hidden"
        />
      ) : null}
      {/* Mockup: 136 px above the buttons at 1920; below 1536 px less, so «Рассчитать стоимость»
          stays on the first screen of a 1366 × 768 laptop even with a long intro. */}
      <div className="relative flex flex-col gap-[136px] px-(--ig-gutter) pt-8 pb-16 max-xl:gap-16 max-md:gap-10 max-sm:gap-6 max-sm:pt-6 max-sm:pb-10">
        <div className="flex flex-col items-start gap-6 max-sm:gap-4">
          <h1 id={titleId} className="ig-h1 m-0 max-w-[1100px] text-balance">
            {title}
          </h1>
          {lead ? (
            <div
              className={cn(
                // Rich-text paragraphs (`.ig-body`) take the lead size and colour of the wrapper.
                "text-ink-3 text-lead-m max-w-[640px] text-pretty [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_p+p]:mt-3",
                INDENT
              )}
            >
              {lead}
            </div>
          ) : null}
          {terms && terms.length > 0 ? (
            <ul
              className={cn("m-0 flex list-none flex-col gap-2 p-0", INDENT)}
              aria-label="Условия"
            >
              {terms.map((term, index) => (
                <li
                  key={index}
                  className="text-text text-small flex items-center gap-2 font-medium"
                >
                  <Check
                    aria-hidden="true"
                    strokeWidth={2.5}
                    className="text-primary-pressed size-4 shrink-0"
                  />
                  {term}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {actions ? (
          <div className={cn(ACTIONS_CLASS, indentActions && INDENT)}>{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
