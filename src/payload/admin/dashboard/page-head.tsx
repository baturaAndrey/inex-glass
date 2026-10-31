import { ExternalLink, Search } from "lucide-react";
import { getEnv } from "@/lib/env";

/** Payload's leads list: its `?search=` runs over `listSearchableFields` of `leads`. */
const LEADS_SEARCH_ACTION = "/admin/collections/leads/";

/**
 * Head of the dashboard (mockup `.top`): eyebrow «Работа», «Дашборд», the leads search (a plain
 * GET form into the Payload list) and «На сайт».
 */
export function DashboardPageHead() {
  return (
    <header className="iga-page-head iga-dash-head">
      <div>
        <span className="iga-page-head__eyebrow">Работа</span>
        <h1 className="iga-page-head__title">Дашборд</h1>
      </div>
      <div className="iga-page-head__actions iga-dash-head__actions">
        <form className="iga-dash-search" method="get" action={LEADS_SEARCH_ACTION} role="search">
          <Search aria-hidden="true" />
          <input
            type="search"
            name="search"
            placeholder="Компания, телефон, ИНН, № заказа"
            aria-label="Поиск по заявкам"
          />
        </form>
        <a
          className="iga-btn iga-btn--ghost"
          href={getEnv().SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink aria-hidden="true" />
          На сайт
        </a>
      </div>
    </header>
  );
}
