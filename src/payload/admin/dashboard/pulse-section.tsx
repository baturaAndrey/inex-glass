import type { Block, PulseData } from "@/lib/admin-dashboard/load";
import {
  DASHBOARD_COMPARISON_LABELS,
  DASHBOARD_PERIOD_LABELS,
  DASHBOARD_PERIODS,
} from "@/lib/admin-dashboard/period";
import type { DashboardPeriod } from "@/lib/admin-dashboard/period";
import type { PulseKpi } from "@/lib/admin-dashboard/pulse";
import { BlockError } from "./block-error";
import { Sparkline } from "./sparkline";

/** Dashboard URL of a period (the switch is plain links: no client component). */
export const dashboardPeriodHref = (period: DashboardPeriod) => `/admin/?period=${period}`;

const DELTA_CLASS: Readonly<Record<PulseKpi["delta"]["direction"], string>> = {
  up: "up",
  new: "up",
  down: "down",
  flat: "flat",
};

function KpiCard({ kpi }: { kpi: PulseKpi }) {
  const { delta } = kpi;
  return (
    <div className="iga-card iga-kpi" data-kpi={kpi.key}>
      <span className="iga-kpi__label">{kpi.label}</span>
      <div>
        <span className="iga-kpi__value">{kpi.value}</span>
        {kpi.unit ? <span className="iga-kpi__unit">{` ${kpi.unit}`}</span> : null}
      </div>
      <div className="iga-kpi__delta">
        <span
          className={`iga-kpi__change iga-kpi__change--${DELTA_CLASS[delta.direction]}`}
          aria-hidden="true"
        >
          {delta.text}
        </span>{" "}
        <span className="iga-kpi__muted" aria-hidden="true">
          к пред. периоду
        </span>
        <span className="iga-sr-only">{delta.srText}</span>
      </div>
      <Sparkline values={kpi.series} tone={delta.direction === "down" ? "danger" : "primary"} />
    </div>
  );
}

/** «Пульс»: period switch, comparison caption and four KPIs with sparklines. */
export function PulseSection({
  period,
  block,
}: {
  period: DashboardPeriod;
  block: Block<PulseData>;
}) {
  return (
    <section className="iga-dash__sec" aria-labelledby="iga-dash-pulse-h">
      <div className="iga-section-head">
        <h2 id="iga-dash-pulse-h">Пульс</h2>
        <span className="iga-section-head__sub">{DASHBOARD_COMPARISON_LABELS[period]}</span>
        <nav className="iga-seg iga-section-head__action" aria-label="Период">
          {DASHBOARD_PERIODS.map((value) => (
            <a
              key={value}
              href={dashboardPeriodHref(value)}
              aria-current={value === period ? "page" : undefined}
            >
              {DASHBOARD_PERIOD_LABELS[value]}
            </a>
          ))}
        </nav>
      </div>
      {block.ok ? (
        <>
          {block.data.truncated ? (
            <p className="iga-dash__warning" role="status">
              Числа неполные, сузьте период.
            </p>
          ) : null}
          <div className="iga-kpi-grid">
            {block.data.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </div>
        </>
      ) : (
        <BlockError />
      )}
    </section>
  );
}
