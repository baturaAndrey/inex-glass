import { NeutralStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 29 (wrapper over `src/components/company/*`: the
 * `requisites` global). Keep the export name and the props.
 */
export function RequisitesBlock({ block, ctx, section }: BlockProps<"requisites">) {
  return <NeutralStub block={block} ctx={ctx} section={section} />;
}
