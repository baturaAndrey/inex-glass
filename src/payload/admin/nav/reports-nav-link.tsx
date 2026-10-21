"use client";

import { usePathname } from "next/navigation";
import { LEADS_REPORT_PATH } from "../leads/constants";

/**
 * `afterNavLinks`: «Отчёт по заявкам» in the admin sidebar, styled like Payload's own nav links
 * (`nav__link`, active indicator). A plain `<a>` (admin links never use `next/link` here).
 */
export function ReportsNavLink() {
  const pathname = usePathname();
  const isActive = pathname.replace(/\/?$/, "/") === LEADS_REPORT_PATH;
  return (
    <a
      className="nav__link"
      href={LEADS_REPORT_PATH}
      id="nav-leads-report"
      aria-current={isActive ? "page" : undefined}
    >
      {isActive ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">Отчёт по заявкам</span>
    </a>
  );
}
