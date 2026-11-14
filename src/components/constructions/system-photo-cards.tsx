import Image from "next/image";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { SystemItem } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import type { PlaceholderContext } from "@/lib/domain";
import { sanitizeSvg } from "@/lib/svg-sanitize";
import { cn } from "@/lib/utils";
import { SYSTEM_FACTS } from "./system-card";

/**
 * «Какую систему выбрать» / «Схемы крепления» / «Типы систем» of the construction pages (Paper
 * mockup `2560_steklyannye-peregorodki`, frame `FCQ-0`): white cards with the system photo on
 * top (300 px), the name with its subtitle, then the facts — the first one as the key line
 * («Где уместна»: 18 px medium), the others under a hairline with the label in brand teal
 * («Что важно знать»).
 *
 * The cards of a row share their rows (CSS subgrid), so names, labels and hairlines line up
 * whatever the text length. A system without a photo shows its scheme (SVG of the seed), else a
 * placeholder. 4 / 3 columns by the number of systems (≥1366), 2 below, 1 on phones.
 *
 * `factLabels` renames the fact labels for a page whose facts mean something else (the
 * «Что поставляем» cards of `/furnitura/`: `whereFits` is the teksty column «Для чего»).
 */

export interface SystemPhotoCardsProps {
  systems: readonly SystemItem[];
  ctx: PlaceholderContext;
  /** Labels replacing the default ones of `SYSTEM_FACTS`, by fact key. */
  factLabels?: Partial<Record<FactKey, string>> | undefined;
}

/** A quarter / third of the 1780 px content at 1920, half ≤1365, the full width ≤599. */
const IMAGE_SIZES =
  "(max-width: 599px) 100vw, (max-width: 1365px) 50vw, (min-width: 1920px) 430px, 25vw";

/** Desktop columns by the number of systems (static strings for Tailwind). */
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/** Rows a card spans: photo + name + one per fact (static strings for Tailwind). */
const ROW_SPAN: Record<number, string> = {
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
};

type FactKey = (typeof SYSTEM_FACTS)[number]["key"];

function SystemPicture({ system }: { system: SystemItem }) {
  const media = asMedia(system.image);
  const src = media ? mediaSrc(media) : null;
  if (media && src) {
    return (
      <Image
        src={src}
        alt={media.alt?.trim() ?? ""}
        fill
        sizes={IMAGE_SIZES}
        className="object-cover"
      />
    );
  }
  const svg = sanitizeSvg(system.schemeSvg);
  if (svg) {
    return (
      <div
        className="text-primary-pressed absolute inset-0 grid place-items-center p-8 [&_svg]:h-full [&_svg]:max-h-[200px] [&_svg]:w-auto [&_svg]:max-w-full"
        // Editor SVG passed through the allow-list sanitizer (`@/lib/svg-sanitize`).
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  return <Placeholder label="фото" className="absolute inset-0 aspect-auto rounded-none" />;
}

export function SystemPhotoCards({ systems, ctx, factLabels }: SystemPhotoCardsProps) {
  // Only facts some system has, in the fixed order: every card gets the same rows.
  const factKeys: FactKey[] = SYSTEM_FACTS.map((fact) => fact.key).filter((key) =>
    systems.some((system) => hasText(system[key]))
  );
  const count = Math.min(systems.length, 4);
  const rows = 2 + factKeys.length;

  return (
    <ul
      className={cn(
        "m-0 grid list-none gap-x-6 p-0 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-x-4",
        COLUMNS[count] ?? "grid-cols-4"
      )}
      data-testid="system-cards"
    >
      {systems.map((system, index) => {
        const subtitle = fill(system.subtitle, ctx);
        return (
          <li
            key={system.id ?? index}
            className={cn(
              "bg-surface border-line mb-6 grid grid-rows-subgrid gap-y-6 overflow-hidden rounded-xl border max-sm:mb-4",
              ROW_SPAN[rows]
            )}
            data-testid="system-card"
          >
            <div className="bg-well relative h-[300px] max-lg:h-[260px] max-sm:h-[220px]">
              <SystemPicture system={system} />
            </div>
            <h3 className="m-0 flex flex-col px-8 pt-2 text-[26px] leading-[1.2] font-bold max-lg:text-[22px] max-sm:px-5">
              {fill(system.name, ctx)}
              {subtitle ? (
                <span className="text-text-2 mt-1 text-[15px] leading-[1.45] font-normal">
                  {subtitle}
                </span>
              ) : null}
            </h3>
            {factKeys.map((key, factIndex) => {
              const label =
                factLabels?.[key] ?? SYSTEM_FACTS.find((fact) => fact.key === key)?.label ?? "";
              const value = hasText(system[key]) ? fill(system[key], ctx) : "";
              const first = factIndex === 0;
              const last = factIndex === factKeys.length - 1;
              return (
                <dl
                  key={key}
                  className={cn(
                    "m-0 flex flex-col gap-2 px-8 max-sm:px-5",
                    // Hairline above the further facts (none when this system lacks the fact).
                    !first && "mx-8 px-0 pt-5 max-sm:mx-5 max-sm:px-0",
                    !first && value && "border-hairline border-t",
                    last && "pb-9 max-sm:pb-6"
                  )}
                >
                  {value ? (
                    <>
                      <dt
                        className={cn(
                          "text-micro font-medium tracking-[0.08em] uppercase",
                          first ? "text-text-2" : "text-primary-pressed"
                        )}
                      >
                        {label}
                      </dt>
                      <dd
                        className={cn(
                          "m-0",
                          first
                            ? "text-text text-[18px] leading-[1.4] font-medium max-sm:text-base"
                            : "text-ink-3 text-base leading-normal"
                        )}
                      >
                        {value}
                      </dd>
                    </>
                  ) : null}
                </dl>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}
