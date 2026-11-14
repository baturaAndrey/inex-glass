import { Calculator } from "lucide-react";
import type { PlaceholderContext } from "@/lib/domain";
import { BlockSection, type SectionChrome } from "./shared";
import type { BlockSectionInfo } from "./types";

/**
 * Shared bodies of the Wave-4 stub blocks (calculators, prices table, contacts, requisites,
 * team). Wave-5 tasks replace the stub files themselves; this module then becomes unused.
 * No invented data: the section heading plus the project's «missing copy» marker.
 */

interface StubProps {
  block: SectionChrome & { background?: unknown };
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
}

/** Marker for copy that is not written yet (AGENTS.md: never invent missing text). */
const MISSING_TEXT = "[…]";
const CALCULATOR_PENDING = "Калькулятор подключается отдельной задачей";

/** Section heading + neutral marker. */
export function NeutralStub({ block, ctx, section }: StubProps) {
  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <p className="ig-body text-text-2 m-0">{MISSING_TEXT}</p>
    </BlockSection>
  );
}

/** Card «Калькулятор подключается отдельной задачей». */
export function CalculatorStub({ block, ctx, section }: StubProps) {
  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="bg-surface shadow-card text-text-2 flex max-w-[720px] items-center gap-4 rounded-lg p-6 max-sm:p-5">
        <Calculator aria-hidden="true" strokeWidth={2} className="text-brand size-6 flex-none" />
        <p className="ig-body m-0">{CALCULATOR_PENDING}</p>
      </div>
    </BlockSection>
  );
}
