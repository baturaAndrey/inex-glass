import type { CSSProperties } from "react";
import type { Block, LatestLead } from "@/lib/admin-dashboard/load";
import { LEADS_KANBAN_PATH, leadSummaryPath } from "@/payload/admin/leads/constants";
import { BlockError } from "./block-error";
import { CardHead } from "./funnel-card";

/** «Последние заявки»: five newest leads; the table scrolls inside the card on phones. */
export function LatestLeads({ block }: { block: Block<LatestLead[]> }) {
  return (
    <section className="iga-card iga-dash-card iga-latest" aria-labelledby="iga-dash-latest-h">
      <CardHead
        id="iga-dash-latest-h"
        title="Последние заявки"
        link={{ href: LEADS_KANBAN_PATH, text: "все заявки →" }}
      />
      {!block.ok ? (
        <div className="iga-latest__pad">
          <BlockError />
        </div>
      ) : block.data.length === 0 ? (
        <p className="iga-dash__empty iga-latest__pad">Заявок пока нет</p>
      ) : (
        <div className="iga-latest__scroll">
          <table className="iga-latest__table">
            <thead>
              <tr>
                <th scope="col">Когда</th>
                <th scope="col">Компания</th>
                <th scope="col">Изделие</th>
                <th scope="col">Площадь</th>
                <th scope="col">Источник</th>
                <th scope="col">Статус</th>
                <th scope="col">Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {block.data.map((lead) => (
                <tr key={lead.id} data-lead={lead.id}>
                  <td className="iga-dash__muted iga-latest__num" title={lead.when.title}>
                    {lead.when.text}
                  </td>
                  <td>
                    <a className="iga-latest__company" href={leadSummaryPath(lead.id)}>
                      {lead.title}
                    </a>
                  </td>
                  <td>{lead.product}</td>
                  <td className="iga-latest__num">{lead.area ?? "—"}</td>
                  <td>{lead.source}</td>
                  <td>
                    {lead.status ? (
                      <span
                        className="iga-badge"
                        style={{ "--iga-badge-color": lead.status.color } as CSSProperties}
                      >
                        {lead.status.name}
                      </span>
                    ) : (
                      <span className="iga-dash__muted">—</span>
                    )}
                  </td>
                  <td className={lead.assignee ? undefined : "iga-dash__muted"}>
                    {lead.assignee ?? "не назначен"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
