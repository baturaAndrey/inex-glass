import { CalculatorStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 25 (hole calculator, GOST 30698-2014).
 * Keep the export name and the `BlockProps<"holesCalculator">` props.
 */
export function HolesCalculatorBlock({ block, ctx, section }: BlockProps<"holesCalculator">) {
  return <CalculatorStub block={block} ctx={ctx} section={section} />;
}
