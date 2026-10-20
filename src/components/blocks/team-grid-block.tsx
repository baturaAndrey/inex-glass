import { NeutralStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 29 (wrapper over `src/components/company/*`: the `team`
 * collection). Keep the export name and the props.
 */
export function TeamGridBlock({ block, ctx, section }: BlockProps<"teamGrid">) {
  return <NeutralStub block={block} ctx={ctx} section={section} />;
}
