import type { ReactNode } from "react";
import { WeightCalculator } from "@/components/calculators/lazy";
import type { CarryHintItem } from "@/components/calculators/weight-calculator";
import { WEIGHT_PAGE_COPY, type CopyParagraph } from "@/components/calculators/weight-copy";
import { WeightTable } from "@/components/calculators/weight-table";
import { Section } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { buildQuizHref } from "@/components/page/quiz-cta";
import { WEIGHT_CALCULATOR_PATH } from "@/lib/blog/weight-quiz";
import { getTechParams } from "@/lib/cms/globals";
import { cn } from "@/lib/utils";
import { BlockHead, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * Glass weight calculator (prototype `Weight`, teksty/10 §1).
 *
 * 1. The calculator itself (client component). On a page without a hero (the tool page: the
 *    route renders the crumbs and a plain H1 above) the first section keeps the prototype's
 *    tight top (`.wc-top`: 40 / 80 px) instead of the full 96 px rhythm.
 * 2. `showTable` / `showFormula`: the two-column section «Сколько весит 1 м² стекла» (table from
 *    `WEIGHT_TABLE`) + «Как посчитать вручную» / «Зачем знать вес» (copy of the calculator).
 *
 * Carry hints come from the `tech-params` global (domain defaults when it is empty).
 */
export async function WeightCalculatorBlock({
  block,
  ctx,
  section,
  page,
}: BlockProps<"weightCalculator">) {
  const tech = await getTechParams();
  const carryHints: CarryHintItem[] = (tech?.carryHints ?? [])
    .filter((hint) => hasText(hint.text))
    .map((hint) => ({
      upToKg: typeof hint.upToKg === "number" ? hint.upToKg : null,
      text: hint.text.trim(),
    }));
  const src = page?.path ?? WEIGHT_CALCULATOR_PATH;
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  const isFirst = section.index === 0;
  const showTable = block.showTable !== false;
  const showFormula = block.showFormula !== false;

  return (
    <>
      <Section
        variant={section.variant}
        id={hasText(block.anchorId) ? block.anchorId : undefined}
        aria-labelledby={heading ? section.headingId : undefined}
        aria-label={heading ? undefined : "Калькулятор веса стекла"}
        className={cn(
          "scroll-mt-24",
          isFirst && "pt-7 pb-20 max-md:pt-7 max-md:pb-16 max-sm:pt-5 max-sm:pb-10"
        )}
      >
        {heading ? (
          <BlockHead
            title={heading}
            sub={sub || undefined}
            level={block.headingLevel}
            id={section.headingId}
          />
        ) : null}
        <WeightCalculator
          defaultMode={block.defaultMode ?? "single"}
          carryHints={carryHints}
          src={src}
        />
      </Section>

      {showTable || showFormula ? (
        <Section variant={section.variant === "sf" ? "bg" : "sf"}>
          <div
            className={cn(
              "grid items-start gap-16 max-md:grid-cols-1 max-md:gap-12",
              showTable && showFormula ? "grid-cols-2" : "max-w-[900px] grid-cols-1"
            )}
          >
            {showTable ? <TableColumn /> : null}
            {showFormula ? <FormulaColumn src={src} /> : null}
          </div>
        </Section>
      ) : null}
    </>
  );
}

const COLUMN = "flex min-w-0 flex-col gap-5";

function Segments({ paragraph }: { paragraph: CopyParagraph }): ReactNode {
  return paragraph.map((segment, index) =>
    segment.bold ? <b key={index}>{segment.text}</b> : segment.text
  );
}

function TableColumn() {
  const copy = WEIGHT_PAGE_COPY.table;
  return (
    <div className={COLUMN}>
      <h2 className="ig-h2">{copy.heading}</h2>
      <WeightTable />
      <p className="ig-body ig-muted">{copy.note}</p>
    </div>
  );
}

function FormulaColumn({ src }: { src: string }) {
  const { manual, why, links } = WEIGHT_PAGE_COPY;
  return (
    <div className={COLUMN}>
      <h2 className="ig-h2">{manual.heading}</h2>
      <p className="ig-body">
        <Segments paragraph={manual.intro} />
      </p>
      <p className="bg-primary-light text-primary-dark m-0 rounded-lg px-[22px] py-[18px] text-lg leading-[1.4] font-semibold">
        {manual.formula}
      </p>
      {manual.examples.map((example, index) => (
        <p key={index} className="ig-body">
          <Segments paragraph={example} />
        </p>
      ))}
      <h2 className="ig-h2 mt-6">{why.heading}</h2>
      <ul className="ig-body marker:text-brand m-0 flex list-disc flex-col gap-2 pl-[22px]">
        {why.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <TextLink href={links.tempered.href} variant="arrow">
          {links.tempered.label}
        </TextLink>
        <TextLink href={buildQuizHref({ type: "tempered", src })} variant="arrow" data-quiz-cta="">
          {links.quiz.label}
        </TextLink>
      </div>
    </div>
  );
}
