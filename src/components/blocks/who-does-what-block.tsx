import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ig/button";
import { cn } from "@/lib/utils";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

const DEFAULT_LEFT = "Inex Glass";
const DEFAULT_RIGHT = "Ваша бригада";

function Column({ title, items, accent }: { title: string; items: string[]; accent: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl p-8 max-sm:p-5",
        accent ? "bg-primary-light" : "bg-surface shadow-card"
      )}
    >
      <p className="ig-h4 m-0">{title}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((text, index) => (
          <li key={index} className="ig-body flex items-start gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={2.5}
              className="text-brand mt-0.5 size-5 flex-none"
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * «Кто что делает»: Inex Glass supplies the glass, the client's crew installs it. The optional
 * strip leads to inex.su for turnkey installation (Inex Glass itself does not install).
 */
export function WhoDoesWhatBlock({ block, ctx, section }: BlockProps<"whoDoesWhat">) {
  const left = (block.leftItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  const right = (block.rightItems ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  if (left.length === 0 && right.length === 0) return null;
  const strip = block.strip;
  const showStrip = Boolean(strip?.enabled) && hasText(strip?.url);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <Column title={fill(block.leftTitle, ctx) || DEFAULT_LEFT} items={left} accent />
        <Column title={fill(block.rightTitle, ctx) || DEFAULT_RIGHT} items={right} accent={false} />
      </div>
      {showStrip && strip?.url ? (
        <div className="border-line mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6 max-sm:p-5">
          <div className="flex min-w-0 flex-col gap-1">
            {hasText(strip.title) ? <p className="ig-h5 m-0">{fill(strip.title, ctx)}</p> : null}
            {hasText(strip.text) ? (
              <p className="ig-body text-text-2 m-0">{fill(strip.text, ctx)}</p>
            ) : null}
          </div>
          <Button asChild variant="secondary" rightIcon={<ArrowUpRight aria-hidden="true" />}>
            <a href={strip.url} rel="noopener noreferrer">
              {fill(strip.buttonLabel, ctx) || strip.url.replace(/^https?:\/\//, "")}
            </a>
          </Button>
        </div>
      ) : null}
    </BlockSection>
  );
}
