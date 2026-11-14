import type { CSSProperties, ReactNode } from "react";
import type { Block, FunnelData } from "@/lib/admin-dashboard/load";
import { formatNumber } from "@/lib/domain/format";
import { BlockError } from "./block-error";
import { statusBadgeColors } from "../leads/constants";

/** Card head shared by the three cards of the middle row and «Последние заявки». */
export function CardHead({
  id,
  title,
  link,
}: {
  id: string;
  title: string;
  link?: { href: string; text: string };
}) {
  return (
    <div className="iga-dash-card__head">
      <h3 id={id}>{title}</h3>
      {link ? <a href={link.href}>{link.text}</a> : null}
    </div>
  );
}

/** One labelled bar: «Квиз … 18» over an `.iga-bar` (colour through `--iga-bar-color`). */
export function Meter({
  label,
  value,
  width,
  color,
}: {
  label: ReactNode;
  value: string;
  width: number;
  color?: string;
}) {
  const fill = { width: `${Math.max(0, Math.min(100, width))}%` } as CSSProperties;
  if (color) (fill as Record<string, string>)["--iga-bar-color"] = color;
  return (
    <div className="iga-meter">
      <div className="iga-meter__row">
        <span>{label}</span>
        <span className="iga-meter__num">{value}</span>
      </div>
      <div className="iga-bar" aria-hidden="true">
        <span style={fill} />
      </div>
    </div>
  );
}

/** «Воронка заявок»: progressing statuses in order, refusals with their main reason. */
export function FunnelCard({
  block,
  reportHref,
}: {
  block: Block<FunnelData>;
  reportHref: string;
}) {
  return (
    <section className="iga-card iga-dash-card" aria-labelledby="iga-dash-funnel-h">
      <CardHead
        id="iga-dash-funnel-h"
        title="Воронка заявок"
        link={{ href: reportHref, text: "подробнее →" }}
      />
      {!block.ok ? (
        <BlockError />
      ) : !block.data.hasStatuses ? (
        <p className="iga-dash__empty">Статусы не настроены</p>
      ) : (
        <>
          {block.data.stages.map((stage, index) => (
            <Meter
              key={stage.id}
              label={stage.name}
              value={
                index === 0
                  ? formatNumber(stage.count)
                  : `${formatNumber(stage.count)} · ${Math.round(stage.share)}%`
              }
              width={stage.share}
              color={statusBadgeColors(stage.color).color}
            />
          ))}
          <RefusalRow refused={block.data.refused} />
        </>
      )}
    </section>
  );
}

function RefusalRow({ refused }: { refused: FunnelData["refused"] }) {
  if (refused.count === 0) {
    return (
      <div className="iga-funnel-refused">
        <div className="iga-meter__row">
          <span>Отказ</span>
          <span>Отказов нет</span>
        </div>
      </div>
    );
  }
  const breakdown = refused.reasons
    .map((reason) => `${reason.label}: ${formatNumber(reason.count)}`)
    .join(" · ");
  return (
    <div className="iga-funnel-refused" data-refused={refused.count}>
      <details>
        <summary className="iga-meter__row" title={breakdown}>
          <span>Отказ</span>
          <span className="iga-meter__num">
            {formatNumber(refused.count)}
            {refused.topLabel ? ` · основная причина — «${refused.topLabel}»` : ""}
          </span>
        </summary>
        <p className="iga-funnel-refused__reasons">{breakdown}</p>
      </details>
    </div>
  );
}
