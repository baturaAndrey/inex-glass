import { formatThickness, specRows } from "@/lib/objects/format";
import type { SpecRow } from "@/lib/objects/format";

export interface ObjectSpecTableProps {
  spec: readonly SpecRow[] | null | undefined;
}

const EMPTY = "—";

/**
 * «Спецификация стекла» (prototype `ObjectPage.dc.html`): a table «Изделие | Толщина | Вид |
 * Триплекс | Обработка» from 600 px, `.ig-mcard` cards with a `dl` on phones. Empty cells show
 * «—». Renders nothing without filled rows.
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
      <div className="ig-table-wrap max-sm:hidden">
        <table className="ig-table">
          <thead>
            <tr>
              <th scope="col">Изделие</th>
              <th scope="col">Толщина</th>
              <th scope="col">Вид</th>
              <th scope="col">Триплекс</th>
              <th scope="col">Обработка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <th scope="row" className="text-left font-semibold">
                  {row.product}
                </th>
                <td className="ig-num tabular-nums">{row.thickness}</td>
                <td>{row.kind}</td>
                <td className="tabular-nums">{row.triplex}</td>
                <td>{row.processing}</td>
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
                <dt>Толщина</dt>
                <dd className="tabular-nums">{row.thickness}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>Вид</dt>
                <dd>{row.kind}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>Триплекс</dt>
                <dd className="tabular-nums">{row.triplex}</dd>
              </div>
              <div className="ig-mcard__row">
                <dt>Обработка</dt>
                <dd>{row.processing}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
