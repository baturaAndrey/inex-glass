import Link from "next/link";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";

/**
 * «use-cases» of a service page (Paper mockup `2560_service_facet`, «Где применяют»): H2 with
 * the sub on the right, then numbered white cards — a big pale number, a 24 px title, the text.
 *
 * Source: a `cards` block of the service layout (`heading`, `sub`, items `title` / `text`, an
 * optional `link` making the whole card a link). Layout `g3` → 3 in a row (the facet's 6 cards in
 * two rows), `g4` → 4 in a row; 2 ≤1100 px, 1 ≤599 px.
 */

export interface UseCase {
  key: string;
  title: string;
  text: string;
  href: string | null;
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

const CARD =
  "bg-surface border-hairline flex h-full w-full flex-col gap-4 rounded-xl border p-8 max-lg:p-6 max-sm:gap-3 max-sm:p-5";

/** Link cards lift on hover (DESIGN §8); the reduced-motion setting keeps them still. */
const LINK_CARD =
  "text-text ease-ig hover:shadow-card-hover focus-visible:outline-brand no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** «01», «02», … */
const number = (index: number) => String(index + 1).padStart(2, "0");

function CardBody({ item, index }: { item: UseCase; index: number }) {
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

export function UseCases({ heading, headingId, sub, items, columns, anchorId }: UseCasesProps) {
  if (items.length === 0) return null;
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
            <li key={item.key} className="flex" data-testid="processing-use-case">
              {item.href ? (
                <Link href={item.href} className={cn(CARD, LINK_CARD)}>
                  <CardBody item={item} index={index} />
                </Link>
              ) : (
                <div className={CARD}>
                  <CardBody item={item} index={index} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
