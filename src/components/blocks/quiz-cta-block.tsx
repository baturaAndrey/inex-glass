import { QuizCta } from "@/components/page/quiz-cta";
import { BlockSection, fill } from "./shared";
import type { BlockProps } from "./types";

/**
 * Quiz call to action with the block's own pre-fill (overrides the document's `quizPrefill`
 * field by field); `src` is the page path when `RenderBlocks` knows it.
 */
export function QuizCtaBlock({ block, ctx, section, page }: BlockProps<"quizCta">) {
  const prefill = { ...page?.quizPrefill, ...stripEmpty(block.prefill) };
  const text = fill(block.text, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="flex max-w-[900px] flex-col gap-6">
        {text ? <p className="ig-body text-lead m-0 text-pretty">{text}</p> : null}
        <QuizCta
          prefill={prefill}
          src={page?.path ?? ""}
          label={fill(block.buttonLabel, ctx) || undefined}
        />
      </div>
    </BlockSection>
  );
}

/** Drops empty values so they do not override the document pre-fill. */
function stripEmpty<T extends object>(value: T | null | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== "")
  ) as Partial<T>;
}
