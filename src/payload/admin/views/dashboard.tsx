import { loadDashboard } from "@/lib/admin-dashboard/load";
import { parseDashboardPeriod } from "@/lib/admin-dashboard/period";
import { getRole } from "@/payload/access";
import { AttentionCards } from "../dashboard/attention-cards";
import { FunnelCard } from "../dashboard/funnel-card";
import { LatestLeads } from "../dashboard/latest-leads";
import { OrdersCard } from "../dashboard/orders-card";
import { DashboardPageHead } from "../dashboard/page-head";
import { PulseSection } from "../dashboard/pulse-section";
import { SourcesCard } from "../dashboard/sources-card";
import { LEADS_REPORT_PATH } from "../leads/constants";
import type { DashboardViewServerProps } from "@payloadcms/next/views";

/**
 * Admin dashboard (`/admin/`, `admin.components.views.dashboard`; the export name and path are
 * a contract with `payload.config.ts`). Payload already wraps it in `DefaultTemplate` (menu,
 * header). Sections follow the approved mockup `res/admin-mockup/Main.dc.html`: «Требует
 * внимания», «Пульс», funnel / sources / orders, latest leads. Staff only; every query runs
 * with the viewer's access (`src/lib/admin-dashboard/load.ts`).
 */
export async function InexDashboard(props: DashboardViewServerProps) {
  const { initPageResult, searchParams } = props;
  const user = props.user ?? initPageResult.req.user;

  if (!user || getRole(user) === null) {
    return (
      <div className="iga-dash">
        <div className="iga-card">
          <p className="iga-dash__empty">Недостаточно прав для просмотра дашборда</p>
        </div>
      </div>
    );
  }

  const period = parseDashboardPeriod(searchParams?.period);
  const permissions = props.permissions ?? initPageResult.permissions;
  const canReadOrders = permissions?.collections?.orders?.read === true;
  const data = await loadDashboard(initPageResult.req.payload, user, period, new Date(), {
    canReadOrders,
  });
  const reportHref = `${LEADS_REPORT_PATH}?period=${period}`;

  return (
    <div className="iga-dash-page">
      <DashboardPageHead />
      <div className="iga-dash">
        <AttentionCards block={data.attention} />
        <PulseSection period={period} block={data.pulse} />
        <section className="iga-dash__row" aria-label="Воронка, источники и заказы">
          <FunnelCard block={data.funnel} reportHref={reportHref} />
          <SourcesCard block={data.sources} reportHref={reportHref} />
          {data.orders ? <OrdersCard block={data.orders} /> : null}
        </section>
        <LatestLeads block={data.latest} />
      </div>
    </div>
  );
}
