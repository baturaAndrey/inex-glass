import { CalculatorStub } from "./stub";
import type { BlockProps } from "./types";

/**
 * STUB — replaced as a whole by task 31 (glass weight calculator).
 * Keep the export name and the `BlockProps<"weightCalculator">` props.
 */
export function WeightCalculatorBlock({ block, ctx, section }: BlockProps<"weightCalculator">) {
  return <CalculatorStub block={block} ctx={ctx} section={section} />;
}
