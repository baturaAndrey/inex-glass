import { TextLink } from "@/components/ig/text-link";
import { CtParagraph } from "@/components/zak-hub/ct-cards-section";
import type { TechLimits } from "@/lib/domain";
import type { ThicknessView } from "@/lib/thickness-view";

/**
 * «Отверстия в стекле N мм — по ГОСТ 30698-2014» (`.th-holes`): minimum distances from a hole
 * to the edge, between holes and to a corner (2N / 2N / 6N from `holeRules`), the diameter range
 * from the technological limits and a link to the holes calculator.
 */

export const HOLES_CALCULATOR_HREF = "/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator";

export interface HolesRulesProps {
  view: ThicknessView;
  holes: TechLimits["holes"];
}

export function HolesRules({ view, holes }: HolesRulesProps) {
  const { edge, between, corner, minDiameter } = view.holeRules;
  const cards: Array<[string, number]> = [
    ["до кромки стекла — не менее", edge],
    ["между отверстиями — не менее", between],
    ["до угла — не менее", corner],
  ];

  return (
    <>
      <ul className="m-0 grid max-w-[900px] list-none grid-cols-3 gap-4 p-0 max-sm:grid-cols-1">
        {cards.map(([label, value]) => (
          <li
            key={label}
            data-hole-rule=""
            className="bg-surface shadow-card flex flex-col gap-1.5 rounded-lg p-6 max-sm:p-5"
          >
            <span className="text-ink-2 text-[15px] leading-[1.45]">{label}</span>
            <b className="text-primary-dark text-[40px] leading-none font-bold tabular-nums max-sm:text-[32px]">
              {value}&nbsp;мм
            </b>
          </li>
        ))}
      </ul>
      <CtParagraph className="mt-4">
        диаметр — от {holes.dMin} до {holes.dMax} мм; меньше {minDiameter} мм — по согласованию
      </CtParagraph>
      <p className="m-0">
        <TextLink href={HOLES_CALCULATOR_HREF} variant="arrow">
          Калькулятор расстояний
        </TextLink>
      </p>
    </>
  );
}
