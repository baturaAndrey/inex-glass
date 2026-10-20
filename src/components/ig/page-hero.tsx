import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "./container";

export type PageHeroVariant = "ct-hero" | "p5-top" | "home";

export type PageHeroProps = {
  /**
   * - `ct-hero` — catalog pages (ZakHub, Thick10, Osvetl): crumbs on top, 2 columns with `aside`,
   *   terms strip under the first screen;
   * - `p5-top` — processing/constructions (Holes, Constr, Partitions): one column, crumbs inside;
   * - `home` — Home `.hero`: full-width photo, eyebrow, caps H1, glass stats.
   */
  variant: PageHeroVariant;
  /** The only `<h1>` of the page. */
  title: ReactNode;
  /** `id` of the `<h1>` (the hero section is labelled by it). */
  titleId?: string | undefined;
  breadcrumbs?: ReactNode;
  /** `home`: short facts separated by bullets. */
  eyebrow?: ReactNode[];
  lead?: ReactNode;
  /** `ct-hero`: facts line under the H1. */
  facts?: ReactNode;
  /** `ct-hero`: emphasized sentence (deep teal, semibold). */
  strong?: ReactNode;
  /** Buttons; stacked full-width on phones. */
  actions?: ReactNode;
  /** Terms strip items, usually `PageHeroTerm` elements. */
  terms?: ReactNode;
  /** `ct-hero`: right column (thickness passport, photos). */
  aside?: ReactNode;
  /** `home`: background photo (LCP image, preloaded). */
  media?: { src: string; alt: string };
  /** `home`: `PageHeroStat` tiles inside the frosted-glass panel. */
  stats?: ReactNode;
  /** Extra content right after the title (e.g. the big thickness figure on Thick10). */
  children?: ReactNode;
  className?: string | undefined;
};

const DEFAULT_TITLE_ID = "page-title";

/** Buttons row: wraps on desktop, full-width column on phones (≤599). */
const ACTIONS_CLASS =
  "flex flex-wrap gap-3 max-sm:flex-col max-sm:self-stretch max-sm:[&_.ig-btn]:w-full";

/** One item of the terms strip with a check icon (`.ig-terms__item`). */
export function PageHeroTerm({ children }: { children: ReactNode }) {
  return (
    <span className="ig-terms__item">
      <Check strokeWidth={2.5} aria-hidden="true" />
      {children}
    </span>
  );
}

/** One tile of the `home` glass stats panel (`.ig-stat-tile`). */
export function PageHeroStat({ value, text }: { value: ReactNode; text: ReactNode }) {
  return (
    <div className="ig-stat-tile max-sm:not-first:border-hairline max-sm:flex-row max-sm:items-center max-sm:gap-4 max-sm:px-[18px] max-sm:py-4 max-sm:not-first:border-t max-sm:not-first:border-l-0">
      <span className="ig-stat text-hero-stat whitespace-nowrap max-sm:w-[118px] max-sm:flex-none">
        {value}
      </span>
      <p className="ig-stat-tile__text text-small">{text}</p>
    </div>
  );
}

/** First screen of a page: the single H1, primary CTA and terms. Three layouts from the prototypes. */
export function PageHero(props: PageHeroProps) {
  switch (props.variant) {
    case "home":
      return <HomeHero {...props} />;
    case "p5-top":
      return <P5Hero {...props} />;
    case "ct-hero":
      return <CatalogHero {...props} />;
  }
}

function Facts({ children }: { children: ReactNode }) {
  return <p className="text-ink-2 text-lead m-0 max-w-[820px]">{children}</p>;
}

function Strong({ children }: { children: ReactNode }) {
  return <p className="text-primary-dark text-h5 m-0 leading-normal">{children}</p>;
}

/** Catalog pages (`.ct-top` + `.ct-hero`): crumbs, 2 columns, terms strip. */
function CatalogHero({
  title,
  titleId = DEFAULT_TITLE_ID,
  breadcrumbs,
  lead,
  facts,
  strong,
  actions,
  terms,
  aside,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "bg-bg pb-[72px] max-sm:pb-10",
        breadcrumbs ? "pt-7" : "pt-6 max-sm:pt-4",
        className
      )}
    >
      <Container>
        {breadcrumbs ? <div className="mb-6 max-sm:mb-4">{breadcrumbs}</div> : null}
        <div
          className={cn(
            aside &&
              "grid grid-cols-[minmax(0,1fr)_minmax(0,520px)] items-start gap-14 max-md:grid-cols-1 max-md:gap-8"
          )}
        >
          <div className="flex max-w-[900px] flex-col gap-5">
            <h1 id={titleId} className="ig-h1">
              {title}
            </h1>
            {children}
            {lead ? <Facts>{lead}</Facts> : null}
            {facts ? <Facts>{facts}</Facts> : null}
            {strong ? <Strong>{strong}</Strong> : null}
            {actions ? <div className={ACTIONS_CLASS}>{actions}</div> : null}
          </div>
          {aside}
        </div>
        {terms ? <div className="ig-terms mt-8">{terms}</div> : null}
      </Container>
    </section>
  );
}

/** Processing / constructions pages (`.p5-top`): one column, crumbs inside. */
function P5Hero({
  title,
  titleId = DEFAULT_TITLE_ID,
  breadcrumbs,
  lead,
  facts,
  strong,
  actions,
  terms,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("bg-bg pt-8 pb-16 max-sm:pt-5 max-sm:pb-10", className)}
    >
      <Container className="flex flex-col items-start gap-5 max-sm:gap-4">
        {breadcrumbs}
        <h1 id={titleId} className="ig-h1 max-w-[1100px]">
          {title}
        </h1>
        {children}
        {lead ? (
          <p className="text-ink-3 text-lead-m m-0 max-w-[900px] text-pretty">{lead}</p>
        ) : null}
        {facts ? <Facts>{facts}</Facts> : null}
        {strong ? <Strong>{strong}</Strong> : null}
        {actions ? <div className={ACTIONS_CLASS}>{actions}</div> : null}
        {terms ? <div className="ig-terms bg-surface">{terms}</div> : null}
      </Container>
    </section>
  );
}

/** `sizes` shared by both copies of the photo so the browser downloads one file. */
const HOME_MEDIA_SIZES = "(max-width: 599px) 100vw, 58vw";

/**
 * Indent of the hero content under the H1 (`.ind`): the gutter on desktop, none ≤1100.
 * Appended with template strings, not `cn()`: plain tailwind-merge does not know the custom
 * type-scale utilities (`text-lead-l`, `text-small`, …) and would drop the text colour class.
 */
const HOME_INDENT = "ml-(--ig-gutter) max-md:ml-0";

/** Home first screen (`.hero`): photo with a soft fade, caps H1, glass stats. */
function HomeHero({
  title,
  titleId = DEFAULT_TITLE_ID,
  eyebrow,
  lead,
  actions,
  terms,
  media,
  stats,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("bg-tint-green relative overflow-hidden", className)}
    >
      {media ? (
        <>
          {/* Blurred backdrop that tints the area under the text (desktop/tablet only). */}
          <div
            className="absolute -inset-10 blur-[28px] saturate-[1.05] max-sm:hidden"
            aria-hidden="true"
          >
            <Image
              src={media.src}
              alt=""
              fill
              sizes={HOME_MEDIA_SIZES}
              className="object-cover object-right"
            />
          </div>
          <div className="absolute top-0 right-0 h-full w-[58%] [mask-image:linear-gradient(90deg,transparent_0%,black_32%)] max-sm:relative max-sm:h-[240px] max-sm:w-full max-sm:[mask-image:none]">
            <Image
              src={media.src}
              alt={media.alt}
              fill
              preload
              sizes={HOME_MEDIA_SIZES}
              className="object-cover"
            />
          </div>
          <div aria-hidden="true" className="ig-hero-fade absolute inset-0 max-sm:hidden" />
        </>
      ) : null}
      <div className="relative mx-auto box-border flex min-h-[760px] max-w-[1920px] items-center px-(--ig-gutter) pt-[72px] pb-20 max-sm:min-h-0 max-sm:pt-6 max-sm:pb-8">
        <div className="flex max-w-[960px] flex-col gap-6 max-sm:gap-4">
          {eyebrow && eyebrow.length > 0 ? (
            <p
              className={`text-ink-2 text-small max-sm:text-caption m-0 flex flex-wrap gap-x-2.5 gap-y-1 font-medium ${HOME_INDENT}`}
            >
              {eyebrow.map((item, index) => (
                <Fragment key={index}>
                  {index > 0 ? (
                    <i aria-hidden="true" className="text-brand not-italic">
                      •
                    </i>
                  ) : null}
                  <span>{item}</span>
                </Fragment>
              ))}
            </p>
          ) : null}
          <h1 id={titleId} className="ig-h1 ig-h1--caps max-sm:tracking-normal max-sm:normal-case">
            {title}
          </h1>
          {children}
          {lead ? (
            <p className={`text-ink-3 text-lead-l m-0 max-w-[640px] text-pretty ${HOME_INDENT}`}>
              {lead}
            </p>
          ) : null}
          {stats ? (
            <div
              className={cn(
                "ig-stats ig-stats--glass max-sm:border-hairline max-sm:bg-surface max-w-[760px] max-sm:grid-cols-1 max-sm:[backdrop-filter:none] max-sm:[-webkit-backdrop-filter:none]",
                HOME_INDENT
              )}
            >
              {stats}
            </div>
          ) : null}
          {terms ? (
            <div
              // Smaller items than the `.ig-terms` strip: 8 px gap, 16 px icons.
              className={`text-text text-micro [&_svg]:text-primary-pressed flex flex-wrap gap-x-5 gap-y-1.5 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-2.5 [&_svg]:size-4 [&>*]:gap-2 ${HOME_INDENT}`}
            >
              {terms}
            </div>
          ) : null}
          {actions ? <div className={cn(ACTIONS_CLASS, HOME_INDENT)}>{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
