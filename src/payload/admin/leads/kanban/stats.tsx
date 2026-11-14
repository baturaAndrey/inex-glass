import type { KanbanStat } from "./data";

/**
 * Summary tiles above the kanban (mockup `.stat`). The kanban filters do not apply to them: they
 * describe the whole pipeline.
 */
export function KanbanStats({ stats }: { stats: KanbanStat[] }) {
  return (
    <section className="iga-kanban__stats" aria-label="Сводка">
      {stats.map((stat) => (
        <div key={stat.key} className="iga-card iga-kanban__stat" data-stat={stat.key}>
          <span className="iga-kanban__stat-label">{stat.label}</span>
          <span className="iga-kanban__stat-value" data-tone={stat.tone ?? undefined}>
            {stat.value}
          </span>
          {stat.sub ? <span className="iga-kanban__stat-sub">{stat.sub}</span> : null}
        </div>
      ))}
    </section>
  );
}
