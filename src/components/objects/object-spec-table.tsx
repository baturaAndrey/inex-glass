import { formatThickness, specRows } from "@/lib/objects/format";
import type { SpecRow } from "@/lib/objects/format";

export interface ObjectSpecTableProps {
  spec: readonly SpecRow[] | null | undefined;
}

const EMPTY = "—";

/** Column captions of the Paper mockup `2560_obekt` (frame `spec`). */
const COLUMNS = {
  product: "Изделие",
  thickness: "Толщина",
  kind: "Вид стекла",
  triplex: "Формула триплекса",
  processing: "Обработка",
} as const;

const HEAD_CELL =
  "text-text-2 px-0 py-4 text-left text-[13px] leading-4 font-medium tracking-[0.06em] uppercase first:pl-7 last:pr-7";
const CELL = "text-text px-0 py-4.5 pr-6 text-base leading-5 align-top first:pl-7 last:pr-7";

/**
 * «Спецификация стекла» (Paper mockup `2560_obekt`): a white table with a tinted header row and
 * the product in the first column (semibold) from 600 px; `.ig-mcard` cards with a `dl` on
 * phones. Empty cells show «—». Renders nothing without filled rows.
 */
export function ObjectSpecTable({ spec }: ObjectSpecTableProps) {
  const rows = specRows(spec).map((row) => ({
    product: row.product || EMPTY,
    thickness: formatThickness(row.thickness) || EMPTY,
    kind: row.kind || EMPTY,
    triplex: row.triplexFormula || EMPTY,
    processing: row.processing || EMPTY,
  }));
  if (rows.length === 0) return null;

  return (
    <>
      <div className="bg-surface border-hairline overflow-x-auto rounded-lg border max-sm:hidden">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="bg-tint-green">
            <tr>
              <th scope="col" className={`${HEAD_CELL} w-[20%]`}>
                {COLUMNS.product}
              </th>
              <th scope="col" className={`${HEAD_CELL} w-[13%]`}>
                {COLUMNS.thickness}
              </th>
              <th scope="col" className={`${HEAD_CELL} w-[20%]`}>
                {COLUMNS.kind}
              </th>
              <th scope="col" className={`${HEAD_CELL} w-[17%]`}>
                {COLUMNS.triplex}
              </th>
              <th scope="col" className={HEAD_CELL}>
                {COLUMNS.processing}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-hairline border-b last:border-b-0">
                <th scope="row" className={`${CELL} text-left font-semibold`}>
                  {row.product}
                </th>
                <td className={`${CELL} tabular-nums`}>{row.thickness}</td>
                <td className={CELL}>{row.kind}</td>
                <td className={`${CELL} tabular-nums`}>{row.triplex}</td>
                <td className={CELL}>{row.processing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex" data-spec-cards="">
        {rows.map((row, index) => (
          <li key={index} className="ig-mcard">
            <span className="ig-h6">{row.product}</span>
            <dl className="m-0 flex flex-col gap-1.5">
              <div className="ig-mcard__row">
                <dt>{COLUMNS.thickness}</dt>
                <dd className="tabular-nums">{row.thickness}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>{COLUMNS.kind}</dt>
                <dd>{row.kind}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>{COLUMNS.triplex}</dt>
                <dd className="tabular-nums">{row.triplex}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>{COLUMNS.processing}</dt>
                <dd>{row.processing}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
