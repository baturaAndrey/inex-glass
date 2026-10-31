import { ArrowRight } from "lucide-react";
import { fill, hasText } from "@/components/blocks/shared";
import { Button } from "@/components/ig/button";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";

type InexSuBridge = NonNullable<Construction["inexSuBridge"]>;

export const INEX_SU_DEFAULT_LABEL = "inex.su";
export const INEX_SU_DEFAULT_URL = "https://inex.su/";

/** Only absolute http(s) URLs: the strip always leads to another site. */
function bridgeUrl(url: string | null | undefined): string {
  const value = url?.trim() ?? "";
  return /^https?:\/\/[^\s/]+/i.test(value) ? value : INEX_SU_DEFAULT_URL;
}

/** `true` when the document enables the bridge and it has something to say. */
export function hasInexSuBridge(bridge: InexSuBridge | null | undefined): bridge is InexSuBridge {
  return Boolean(bridge?.enabled) && (hasText(bridge?.title) || hasText(bridge?.text));
}

/**
 * «Нужен монтаж «под ключ»?» (`.p5-strip`): Inex Glass does not install — turnkey projects with
 * installation go to the engineering company Inex on inex.su. The only place where «под ключ»
 * may appear on the site (ТЗ §11).
 */
export function InexSuStrip({
  bridge,
  ctx,
  className,
}: {
  bridge: InexSuBridge;
  ctx: PlaceholderContext;
  className?: string | undefined;
}) {
  const title = fill(bridge.title, ctx);
  const text = fill(bridge.text, ctx);
  const label = fill(bridge.buttonLabel, ctx) || INEX_SU_DEFAULT_LABEL;
  return (
    <aside
      aria-label={title || label}
      data-inex-su-strip=""
      className={cn(
        "border-line bg-surface flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-lg border px-7 py-5 max-sm:p-4",
        className
      )}
    >
      <div className="min-w-0 flex-1 basis-[420px] max-sm:basis-full">
        {title ? <p className="m-0 text-[17px] leading-[1.4] font-semibold">{title}</p> : null}
        {text ? <p className="text-text-2 mt-1 mb-0 text-[15px] leading-normal">{text}</p> : null}
      </div>
      <Button
        asChild
        variant="secondary"
        rightIcon={<ArrowRight aria-hidden="true" strokeWidth={2} />}
        className="max-sm:w-full"
      >
        <a href={bridgeUrl(bridge.url)} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      </Button>
    </aside>
  );
}
