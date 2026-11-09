import Link from "next/link";
import { CircleArrowRight } from "lucide-react";
import { Container } from "@/components/ig/container";
import { ZAK_TEMPLATE_COPY } from "@/components/zak-hub/copy";
import type { PricesInput } from "@/lib/domain";
import { priceTile, type NeighborColumn, type ThicknessView } from "@/lib/thickness-view";
import { cn } from "@/lib/utils";

/**
 * «Соседние толщины» (Paper mockup `2560_zak_tolshchina_10mm`, frame `neighbors`): one card per
 * thickness N− / N / N+ (4 and 19 mm have one neighbour) with the price «from» (45-day rule,
 * «по запросу» for 15 / 19 mm) and the weight of 1 m². The neighbours link to their cards; the
 * current one is the dark card with «Эта страница» (`aria-current="page"`, not a link).
 * 3 columns; one ≤599 px.
 */

const PRICE_CAPTION = "Цена от, ₽/м²";
const WEIGHT_CAPTION = "Вес, кг/м²";

export interface NeighborsProps {
  view: ThicknessView;
  prices: PricesInput;
  now: Date;
  heading: string;
  headingId: string;
}

function Figures({
  column,
  prices,
  now,
  dark,
}: {
  column: NeighborColumn;
  prices: PricesInput;
  now: Date;
  dark: boolean;
}) {
  const tile = priceTile(column.n, prices, now);
  const caption = cn("text-[14px] leading-[1.3]", dark ? "text-on-navy-2" : "text-text-2");
  return (
    <dl className="m-0 flex gap-8">
      <div className="flex flex-col gap-0.5">
        <dt className={caption}>{tile.state === "price" ? PRICE_CAPTION : "Цена"}</dt>
        <dd
          className="m-0 text-[22px] leading-7 font-bold tabular-nums"
          data-price-state={tile.state}
          data-neighbor-price=""
        >
          {tile.value}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className={caption}>{WEIGHT_CAPTION}</dt>
        <dd className="m-0 text-[22px] leading-7 font-bold tabular-nums">{column.weight}</dd>
      </div>
    </dl>
  );
}

function Title({ n, dark }: { n: number; dark: boolean }) {
  return (
    <span className="text-[48px] leading-none font-bold tabular-nums max-sm:text-[40px]">
      {n}{" "}
      <span className={cn("text-[22px] font-medium", dark ? "text-on-navy-2" : "text-text-2")}>
        мм
      </span>
    </span>
  );
}

const CARD = "flex h-full w-full flex-col gap-6 rounded-xl p-8 max-sm:rounded-lg max-sm:p-5";

export function Neighbors({ view, prices, now, heading, headingId }: NeighborsProps) {
  const columns = view.neighborsTable;
  return (
    <section
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="neighbors"
    >
      <Container className="flex flex-col gap-8 max-sm:gap-5">
        <h2 id={headingId} className="ig-h2 m-0">
          {heading}
        </h2>
        <ul
          className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-sm:grid-cols-1 max-sm:gap-3"
          data-neighbors=""
        >
          {columns.map((column) => (
            <li key={column.n} className="flex" data-thickness={column.n}>
              {column.current ? (
                <div
                  aria-current="page"
                  className={cn(CARD, "bg-primary-dark text-on-navy")}
                  data-neighbor-current=""
                >
                  <span className="flex items-center justify-between gap-4">
                    <Title n={column.n} dark />
                    <span className="text-on-navy bg-on-navy/15 rounded-sm px-3 py-1.5 text-[13px] leading-4 font-medium">
                      {ZAK_TEMPLATE_COPY.currentPage}
                    </span>
                  </span>
                  <Figures column={column} prices={prices} now={now} dark />
                </div>
              ) : (
                <Link
                  href={column.href}
                  className={cn(
                    CARD,
                    "group/card ease-ig bg-surface border-hairline text-text hover:shadow-card-hover focus-visible:outline-brand border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  )}
                >
                  <span className="flex items-center justify-between gap-4">
                    <Title n={column.n} dark={false} />
                    <CircleArrowRight
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="text-brand size-11 shrink-0"
                    />
                  </span>
                  <Figures column={column} prices={prices} now={now} dark={false} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
