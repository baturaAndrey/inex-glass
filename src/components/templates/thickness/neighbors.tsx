import { Chip } from "@/components/ig/chip";
import type { ThicknessView } from "@/lib/thickness-view";
import { cn } from "@/lib/utils";

/**
 * «Соседние толщины»: chip links (the current one active, `aria-current="page"`) and the
 * «N− / N / N+» table of prices and weights (current column highlighted; 4 and 19 mm have two
 * columns). Prices follow the 45-day rule (`tablePriceLabel`). ≤599: one card per thickness.
 */

const PRICE_ROW = "Цена от, ₽/м²";
const WEIGHT_ROW = "Вес, кг/м²";

export function Neighbors({ view }: { view: ThicknessView }) {
  const columns = view.neighborsTable;

  return (
    <>
      <div
        role="group"
        aria-label="Толщина"
        className="mb-6 flex flex-wrap gap-2"
        data-neighbor-chips=""
      >
        {columns.map((column) => (
          <Chip
            key={column.n}
            href={column.href}
            active={column.current}
            {...(column.current ? { "aria-current": "page" as const } : {})}
          >
            {column.label}
          </Chip>
        ))}
      </div>

      <div className="ig-table-wrap max-w-[760px] max-sm:hidden" data-neighbors-table="">
        <table className="ig-table">
          <thead>
            <tr>
              <th aria-hidden="true" />
              {columns.map((column) => (
                <th
                  key={column.n}
                  scope="col"
                  data-thickness={column.n}
                  className={cn(
                    column.current && "bg-primary-light text-primary-dark font-semibold"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{PRICE_ROW}</td>
              {columns.map((column) => (
                <td
                  key={column.n}
                  data-price-state={column.priceState}
                  className={cn("ig-num", column.current && "bg-primary-light font-semibold")}
                >
                  {column.priceLabel}
                </td>
              ))}
            </tr>
            <tr>
              <td>{WEIGHT_ROW}</td>
              {columns.map((column) => (
                <td
                  key={column.n}
                  className={cn("ig-num", column.current && "bg-primary-light font-semibold")}
                >
                  {column.weight}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex" data-neighbors-cards="">
        {columns.map((column) => (
          <li
            key={column.n}
            className={cn("ig-mcard", column.current && "border-brand bg-primary-light")}
          >
            <p className="m-0 text-lg leading-snug font-semibold">{column.label}</p>
            <dl className="m-0 flex flex-col gap-1.5">
              <div className="ig-mcard__row">
                <dt>{PRICE_ROW}</dt>
                <dd className="tabular-nums">{column.priceLabel}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>{WEIGHT_ROW}</dt>
                <dd className="tabular-nums">{column.weight}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
