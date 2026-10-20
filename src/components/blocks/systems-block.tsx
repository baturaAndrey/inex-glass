import { DataTable, type DataTableColumn } from "@/components/ig/data-table";
import { cn } from "@/lib/utils";
import { sanitizeSvg } from "./sanitize-svg";
import { BlockImage, BlockSection, CARD_GRID, asMedia, fill, hasText } from "./shared";
import type { BlockProps, SystemItem } from "./types";

/** Facts of a system, in the order of the prototype («Какую систему выбрать»). */
const FACTS = [
  { key: "whereFits", label: "Где уместна" },
  { key: "howHeld", label: "Как держится стекло" },
  { key: "requiresInGlass", label: "Что нужно в стекле" },
  { key: "important", label: "Что важно знать" },
] as const satisfies readonly { key: keyof SystemItem; label: string }[];

function SystemCard({ system, ctx }: { system: SystemItem; ctx: Parameters<typeof fill>[1] }) {
  const media = asMedia(system.image);
  const svg = media ? null : sanitizeSvg(system.schemeSvg);
  return (
    <article className="bg-surface shadow-card flex flex-col overflow-hidden rounded-lg">
      {media ? (
        <BlockImage
          media={media}
          size="card"
          sizes="(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
      ) : svg ? (
        <div
          className="bg-well flex aspect-[4/3] items-center justify-center p-6 [&_svg]:h-full [&_svg]:w-full"
          // Editor SVG passed through the allowlist sanitizer above.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}
      <div className="flex flex-col gap-4 p-6 max-sm:p-5">
        <div className="flex flex-col gap-1">
          <h3 className="ig-h4">{fill(system.name, ctx)}</h3>
          {hasText(system.subtitle) ? (
            <p className="text-small text-text-2 m-0">{fill(system.subtitle, ctx)}</p>
          ) : null}
        </div>
        <dl className="m-0 flex flex-col gap-3">
          {FACTS.map(({ key, label }) => {
            const value = fill(system[key], ctx);
            return value ? (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="text-micro text-text-2">{label}</dt>
                <dd className="ig-body m-0">{value}</dd>
              </div>
            ) : null;
          })}
        </dl>
      </div>
    </article>
  );
}

/** «Какую систему выбрать»: systems of the document (`page.systems`) or the block's own. */
export function SystemsBlock({ block, ctx, section, page }: BlockProps<"systems">) {
  const systems = (block.source === "inline" ? block.items : page?.systems) ?? [];
  if (systems.length === 0) return null;

  if (block.layout === "table") {
    const columns: DataTableColumn[] = [
      { key: "name", label: "Система" },
      ...FACTS.map(({ key, label }) => ({ key, label })),
    ];
    const rows = systems.map((system) => ({
      name: fill(system.name, ctx),
      ...Object.fromEntries(FACTS.map(({ key }) => [key, fill(system[key], ctx)])),
    }));
    return (
      <BlockSection block={block} section={section} ctx={ctx}>
        <DataTable columns={columns} rows={rows} />
      </BlockSection>
    );
  }

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className={cn(CARD_GRID[3])}>
        {systems.map((system, index) => (
          <SystemCard key={system.id ?? index} system={system} ctx={ctx} />
        ))}
      </div>
    </BlockSection>
  );
}
