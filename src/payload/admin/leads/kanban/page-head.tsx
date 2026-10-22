import { Download, Search } from "lucide-react";
import { LEADS_KANBAN_PATH } from "@/payload/admin/leads/constants";
import { DEFAULT_KANBAN_QUERY, KANBAN_SEARCH_MAX_LENGTH } from "./query";
import type { KanbanQuery } from "./query";

/**
 * Head of the kanban (mockup `Leads.dc.html`, `.top`): eyebrow and title, the search (a GET form
 * that keeps the other filters in hidden fields) and «Экспорт» of the filter's period.
 */
export function KanbanPageHead({ query, exportHref }: { query: KanbanQuery; exportHref: string }) {
  return (
    <header className="iga-page-head iga-kanban__head">
      <div className="iga-kanban__title">
        <span className="iga-page-head__eyebrow">Работа</span>
        <h1 className="iga-page-head__title">Заявки</h1>
      </div>
      <form method="get" action={LEADS_KANBAN_PATH} role="search" className="iga-kanban__search">
        <Search aria-hidden="true" />
        <input
          type="search"
          name="search"
          defaultValue={query.search}
          maxLength={KANBAN_SEARCH_MAX_LENGTH}
          placeholder="Компания, имя, телефон, ИНН"
          aria-label="Поиск по заявкам"
          autoComplete="off"
        />
        {query.filter !== DEFAULT_KANBAN_QUERY.filter ? (
          <input type="hidden" name="filter" value={query.filter} />
        ) : null}
        {query.source ? <input type="hidden" name="source" value={query.source} /> : null}
        {query.period !== DEFAULT_KANBAN_QUERY.period ? (
          <input type="hidden" name="period" value={query.period} />
        ) : null}
      </form>
      <a className="iga-btn iga-btn--ghost" href={exportHref}>
        <Download aria-hidden="true" />
        Экспорт
      </a>
    </header>
  );
}
