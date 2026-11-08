import { Container } from "@/components/ig/container";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { DiagramZoom } from "./diagram-zoom";

/**
 * «about» of a service page (Paper mockup `2560_service_facet`, «Что такое фацет»): H2, lead
 * paragraphs and a list with teal dots on the left; a white panel with the diagram on the right
 * (micro caps caption above the image). Without a figure the text keeps its measure.
 *
 * Source: a `richText` block (heading + text) and — for the figure — the one-image `gallery`
 * block right after it (`alt` and `caption` of the gallery item). ≤1100 px the panel goes
 * under the text; ≤599 px the diagram fits the panel width and opens full size on tap
 * (`DiagramZoom`).
 */

export interface AboutFigure {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export interface ServiceAboutProps {
  heading: string;
  headingId: string;
  body: RichTextData;
  ctx: PlaceholderContext;
  figure?: AboutFigure | null | undefined;
  anchorId?: string | undefined;
}

/** The figure column: 962 of 1780 px at 1920, half of the content below; full width ≤1100. */
const FIGURE_SIZES = "(max-width: 599px) 600px, (max-width: 1100px) 100vw, 50vw";

/**
 * Text typography over the `RichText` output: paragraphs 18 px, lists 16 px with 8 px teal dots
 * instead of the markers (mockup), links follow the size of their text.
 */
const TEXT = cn(
  "flex flex-col gap-6 max-sm:gap-4",
  "[&_p]:text-lead [&_p]:text-ink-3 [&_p]:max-w-none",
  "[&_ul]:mt-2 [&_ul]:max-w-none [&_ul]:list-none [&_ul]:gap-3 [&_ul]:pl-0",
  "[&_ul>li]:text-body [&_ul>li]:text-text [&_ul>li]:relative [&_ul>li]:pl-5",
  "[&_ul>li]:before:bg-brand [&_ul>li]:before:absolute [&_ul>li]:before:top-[0.55em] [&_ul>li]:before:left-0 [&_ul>li]:before:size-2 [&_ul>li]:before:rounded-full",
  "[&_a]:text-[length:inherit] [&_a]:leading-[inherit]"
);

function Figure({ figure }: { figure: AboutFigure }) {
  return (
    <figure className="bg-surface border-hairline m-0 flex min-w-0 flex-col gap-4 rounded-xl border p-10 max-lg:p-8 max-sm:p-5">
      <figcaption className="text-micro text-text-2 tracking-[0.06em] uppercase">
        {figure.caption}
      </figcaption>
      <DiagramZoom
        src={figure.src}
        alt={figure.alt}
        caption={figure.caption}
        width={figure.width}
        height={figure.height}
        sizes={FIGURE_SIZES}
      />
    </figure>
  );
}

export function ServiceAbout({
  heading,
  headingId,
  body,
  ctx,
  figure,
  anchorId,
}: ServiceAboutProps) {
  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="processing-about"
    >
      <Container
        className={cn(
          "grid items-center gap-16 max-md:grid-cols-1 max-md:gap-8",
          figure ? "grid-cols-[minmax(0,760fr)_minmax(0,956fr)]" : "grid-cols-1"
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-6", !figure && "max-w-[900px]")}>
          <h2 id={headingId} className="ig-h2 text-primary-dark m-0 text-balance">
            {heading}
          </h2>
          <div className={TEXT}>
            <RichText data={body} ctx={ctx} disableContainer />
          </div>
        </div>
        {figure ? <Figure figure={figure} /> : null}
      </Container>
    </section>
  );
}
