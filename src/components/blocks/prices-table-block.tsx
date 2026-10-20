import { NeutralStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 23 (wrapper over `PricesTableSection`, prices from the
 * `prices` global with the 45-day rule). Keep the export name and the props.
 */
export function PricesTableBlock({ block, ctx, section }: BlockProps<"pricesTable">) {
  return <NeutralStub block={block} ctx={ctx} section={section} />;
}
