import { splitPayer, type Payer } from "@/lib/service/page-compose";
import { cn } from "@/lib/utils";

export interface WhoPaysTableProps {
  /** Header labels: «Ситуация», «Кто оплачивает переделку». */
  columns: [string, string];
  /** Rows «situation → who pays»; a payer cell may continue after the badge. */
  rows: Array<[string, string]>;
}

/** Badge colours of `.ht-pay--f` (factory, green) and `.ht-pay--c` (customer, amber). */
const BADGE_CLASS: Record<Payer, string> = {
  factory: "bg-primary-light text-primary-dark",
  customer: "bg-warning-bg text-warning-text border border-warning",
};

function PayerValue({ value }: { value: string }) {
  const { payer, badge, rest } = splitPayer(value);
  if (!payer) return <>{rest}</>;
  return (
    <>
      <span
        data-payer={payer}
        className={cn(
          "inline-flex h-7 items-center rounded-sm px-3 text-sm leading-none font-semibold",
          BADGE_CLASS[payer]
        )}
      >
        {badge}
      </span>
      {rest}
    </>
  );
}

/**
 * «Кто за что отвечает» of the hub (`HowTo.dc.html`): a two-column table whose answer cells start
 * with a «Завод» / «Заказчик» badge. ≤599 px: `.ig-mcard` cards — the situation as a small muted
 * caption, then the badge with the rest of the answer. Both views are in the HTML (CSS switch).
 */
export function WhoPaysTable({ columns, rows }: WhoPaysTableProps) {
  if (rows.length === 0) return null;
  return (
    <div className="max-w-[1000px]">
      <div className="ig-table-wrap max-sm:hidden">
        <table className="ig-table">
          <thead>
            <tr>
              <th scope="col" className="w-1/2 text-left text-sm">
                {columns[0]}
              </th>
              <th scope="col" className="text-left text-sm">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([situation, value], index) => (
              <tr key={index}>
                <td>{situation}</td>
                <td>
                  <PayerValue value={value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 hidden list-none flex-col gap-3 p-0 max-sm:flex">
        {rows.map(([situation, value], index) => (
          <li key={index} className="ig-mcard">
            <span className="text-small text-text-2">{situation}</span>
            <span>
              <PayerValue value={value} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
