import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ThickCardSpec {
  label: string;
  value: string;
}

export interface ThickCardProps {
  /** Thickness in millimetres: the big figure. */
  mm: number;
  href?: string;
  /** Ready-made price line: «от 1 400 ₽/м²» or «Цена по расчёту» — chosen by the caller. */
  priceLabel: string;
  /** Note under the price: «ориентировочная цена на 15.10.2026» / «пришлём в КП за 2–3 рабочих дня». */
  note?: string;
  specs?: ThickCardSpec[];
  className?: string | undefined;
}

/**
 * Thickness card (`Cards.dc.html`, `.ig-card.ig-thick`). Purely presentational: it knows
 * nothing about prices or the 45-day rule — the caller passes the final labels.
 */
export function ThickCard({ mm, href, priceLabel, note, specs, className }: ThickCardProps) {
  const body = (
    <>
      <span className="ig-thick__mm">
        {mm}
        <small>мм</small>
      </span>
      <span className="flex flex-col gap-1">
        <span className="ig-price-m tabular-nums">{priceLabel}</span>
        {note ? <span className="ig-thick__note">{note}</span> : null}
      </span>
      {specs && specs.length > 0 ? (
        <dl className="ig-thick__specs mt-auto">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt>{spec.label}</dt>
              <dd className="text-right tabular-nums">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );

  const classes = cn("ig-card ig-thick", className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
