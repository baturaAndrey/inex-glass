import type { Block } from "@/lib/admin-dashboard/load";
import type { SourceBar } from "@/lib/admin-dashboard/sources";
import { formatNumber } from "@/lib/domain/format";
import { BlockError } from "./block-error";
import { CardHead, Meter } from "./funnel-card";

/** «Источники»: leads of the period by form, the biggest source first. */
export function SourcesCard({
  block,
  reportHref,
}: {
  block: Block<SourceBar[]>;
  reportHref: string;
}) {
  return (
    <section className="iga-card iga-dash-card" aria-labelledby="iga-dash-sources-h">
      <CardHead
        id="iga-dash-sources-h"
        title="Источники"
        link={{ href: reportHref, text: "подробнее →" }}
      />
      {!block.ok ? (
        <BlockError />
      ) : block.data.length === 0 ? (
        <p className="iga-dash__empty">Заявок за период нет</p>
      ) : (
        block.data.map((source) => (
          <Meter
            key={source.formType}
            label={source.label}
            value={formatNumber(source.count)}
            width={source.width}
          />
        ))
      )}
    </section>
  );
}
