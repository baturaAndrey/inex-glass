import { Clock, ImageIcon, LinkIcon, TriangleAlert, UserRound } from "lucide-react";
import type { AttentionCard, AttentionKey } from "@/lib/admin-dashboard/attention";
import type { Block } from "@/lib/admin-dashboard/load";
import { formatNumber } from "@/lib/domain/format";
import { BlockError } from "./block-error";
import type { LucideIcon } from "lucide-react";

const ICONS: Readonly<Record<AttentionKey, LucideIcon>> = {
  unassigned: UserRound,
  "stale-new": Clock,
  "no-photos": ImageIcon,
  "expiring-links": LinkIcon,
  prices: TriangleAlert,
};

/** «Требует внимания»: every card is a link to the filtered list, the global or the order. */
export function AttentionCards({ block }: { block: Block<AttentionCard[]> }) {
  return (
    <section className="iga-dash__sec" aria-labelledby="iga-dash-att-h">
      <div className="iga-section-head">
        <h2 id="iga-dash-att-h">Требует внимания</h2>
        <span className="iga-section-head__sub">то, что ждёт действия прямо сейчас</span>
      </div>
      {block.ok ? (
        <div className="iga-att-grid">
          {block.data.map((card) => {
            const Icon = ICONS[card.key];
            return (
              <a
                key={card.key}
                className={`iga-att iga-att--${card.tone}`}
                href={card.href}
                data-attention={card.key}
              >
                <span className="iga-att__top">
                  <Icon className="iga-att__icon" aria-hidden="true" />
                  <span className="iga-att__value" data-value>
                    {card.value === null ? "—" : formatNumber(card.value)}
                  </span>
                </span>
                <span className="iga-att__text">
                  <span className="iga-att__label">{card.label}</span>
                  <span className="iga-att__sub">{card.sub}</span>
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <BlockError />
      )}
    </section>
  );
}
