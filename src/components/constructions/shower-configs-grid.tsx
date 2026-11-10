import { BlockImage, asMedia } from "@/components/blocks/shared";
import { PANEL_HEADING, WHITE_PANEL } from "@/components/company/company-pieces";
import { Chip } from "@/components/ig/chip";
import { Placeholder } from "@/components/ig/placeholder";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import type { ShowerConfig } from "@/payload-types";

export const SHOWER_CONFIGS_HEADING = "Конфигурации";

/**
 * Configuration names of teksty/12 §2 shown until the shower catalog (~20 cards) is imported
 * from inex.su (task-37). Temporary: the section switches to cards as soon as published
 * `shower-configs` of the construction exist.
 */
export const SHOWER_CONFIG_FALLBACK = [
  "Прямая с распашной дверью",
  "угловая",
  "трапециевидная",
  "на штанге (walk-in)",
  "с раздвижной дверью",
] as const;

/** 4 / 3 / 2 / 1 columns at ≥1366 / ≥1101 / ≥600 / <600. */
const GRID_CLASS =
  "m-0 grid list-none grid-cols-4 gap-6 p-0 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4";

const IMAGE_SIZES =
  "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (max-width: 1365px) 33vw, 25vw";

function ConfigCard({ config }: { config: ShowerConfig }) {
  const media = asMedia(config.image);
  return (
    <li className="flex">
      <article className="ig-card w-full">
        {media ? (
          <BlockImage media={media} size="card" sizes={IMAGE_SIZES} />
        ) : (
          <Placeholder label="фото конфигурации" />
        )}
        <div className="ig-card__body">
          <h3 className="ig-card__title">{config.name}</h3>
          {config.description ? <p className="ig-card__sub">{config.description}</p> : null}
        </div>
      </article>
    </li>
  );
}

/** «Конфигурации» of shower partitions: CMS cards, or the five names as chips until import. */
export function ShowerConfigsGrid({
  configs,
  variant,
  bare = false,
}: {
  configs: ShowerConfig[];
  variant: SectionVariant;
  /**
   * Inside the page container of the Paper layout (construction pages): a white panel with the
   * H2 instead of a full-width section.
   */
  bare?: boolean | undefined;
}) {
  const headingId = "construction-shower-configs-title";
  const content =
    configs.length > 0 ? (
      <ul className={GRID_CLASS}>
        {configs.map((config) => (
          <ConfigCard key={config.id} config={config} />
        ))}
      </ul>
    ) : (
      <ul className="ig-chips m-0 list-none p-0" data-shower-fallback="">
        {SHOWER_CONFIG_FALLBACK.map((name) => (
          <li key={name}>
            <Chip static>{name}</Chip>
          </li>
        ))}
      </ul>
    );
  if (bare) {
    return (
      <section aria-labelledby={headingId} className={WHITE_PANEL} data-section="shower-configs">
        <h2 id={headingId} className={PANEL_HEADING}>
          {SHOWER_CONFIGS_HEADING}
        </h2>
        {content}
      </section>
    );
  }
  return (
    <Section variant={variant} aria-labelledby={headingId} data-section="shower-configs">
      <SectionHead title={SHOWER_CONFIGS_HEADING} headingId={headingId} />
      {content}
    </Section>
  );
}
