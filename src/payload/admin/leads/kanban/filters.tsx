import { formatNumber } from "@/lib/domain/format";
import {
  FORM_TYPE_LABELS,
  LEAD_FORM_TYPE_VALUES,
  LEADS_KANBAN_PATH,
} from "@/payload/admin/leads/constants";
import { AutoSubmitSelect } from "./auto-submit-select";
import {
  DEFAULT_KANBAN_QUERY,
  KANBAN_FILTER_LABELS,
  KANBAN_FILTERS,
  KANBAN_PERIOD_LABELS,
  KANBAN_PERIODS,
  kanbanHref,
} from "./query";
import { ViewToggle } from "./view-toggle";
import type { KanbanFilter, KanbanQuery } from "./query";

/**
 * Filter row of the kanban (mockup «Фильтры»): view switch, quick-filter chips (links, so the
 * state lives in the URL) and a GET form with the source and period selects.
 */
export function KanbanFilters({
  query,
  counts,
}: {
  query: KanbanQuery;
  counts: Partial<Record<KanbanFilter, number>>;
}) {
  return (
    <section className="iga-kanban__filters" aria-label="Фильтры">
      <ViewToggle active="kanban" />
      <span className="iga-kanban__divider" aria-hidden="true" />
      <div className="iga-kanban__chips" role="group" aria-label="Быстрые фильтры">
        {KANBAN_FILTERS.map((filter) => {
          const active = query.filter === filter;
          const count = counts[filter];
          return (
            <a
              key={filter}
              className="iga-chip"
              href={kanbanHref(query, { filter, expand: null })}
              aria-current={active ? "true" : undefined}
              data-kanban-filter={filter}
            >
              {KANBAN_FILTER_LABELS[filter]}
              {count !== undefined ? <b>{formatNumber(count)}</b> : null}
            </a>
          );
        })}
      </div>
      <form method="get" action={LEADS_KANBAN_PATH} className="iga-kanban__selects">
        {query.filter !== DEFAULT_KANBAN_QUERY.filter ? (
          <input type="hidden" name="filter" value={query.filter} />
        ) : null}
        {query.search ? <input type="hidden" name="search" value={query.search} /> : null}
        <AutoSubmitSelect
          className="iga-select"
          name="source"
          aria-label="Источник"
          defaultValue={query.source ?? ""}
        >
          <option value="">Все источники</option>
          {LEAD_FORM_TYPE_VALUES.map((formType) => (
            <option key={formType} value={formType}>
              {FORM_TYPE_LABELS[formType]}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          className="iga-select"
          name="period"
          aria-label="Период"
          defaultValue={query.period}
        >
          {KANBAN_PERIODS.map((period) => (
            <option key={period} value={period}>
              {KANBAN_PERIOD_LABELS[period]}
            </option>
          ))}
        </AutoSubmitSelect>
        <noscript>
          <button type="submit" className="iga-btn iga-btn--ghost iga-btn--sm">
            Применить
          </button>
        </noscript>
      </form>
    </section>
  );
}
