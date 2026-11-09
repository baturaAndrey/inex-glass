import { Container } from "@/components/ig/container";
import { TextLink } from "@/components/ig/text-link";
import type { TechLimits } from "@/lib/domain";
import type { ThicknessView } from "@/lib/thickness-view";

/**
 * «Отверстия в стекле N мм — по ГОСТ 30698-2014» (Paper mockup `2560_zak_tolshchina_10mm`, frame
 * `holes`): a scheme of a glass corner with two holes on the left, and the minimum distances as
 * big-number rows on the right — to the edge, between holes and to a corner (2N / 2N / 6N from
 * `holeRules`), then the diameter range of the technological limits — plus the link to the
 * holes calculator. Stacks ≤1100 px.
 *
 * The scheme is decorative (`aria-hidden`): the rows carry the same numbers as text. Phones get
 * a narrower drawing, so its labels stay readable at 375 px.
 */

export const HOLES_CALCULATOR_HREF = "/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator";
const CALCULATOR_LABEL = "Калькулятор расстояний";

export interface HolesRulesProps {
  view: ThicknessView;
  holes: TechLimits["holes"];
  heading: string;
  headingId: string;
}

interface SchemeLabels {
  edge: string;
  between: string;
  corner: string;
  caption: string;
}

const GLASS = "fill-primary-light stroke-brand";
const HOLE = "fill-surface stroke-brand";
const DIM = "stroke-primary-pressed";
const DIM_TEXT = "fill-primary-pressed font-semibold";
const NOTE_TEXT = "fill-text-2";

/** Mockup drawing (680 × 400) for ≥600 px. */
function WideScheme({ labels }: { labels: SchemeLabels }) {
  return (
    <svg viewBox="0 0 680 400" className="h-auto w-full max-sm:hidden" aria-hidden="true">
      <rect x="60" y="60" width="618" height="338" className={GLASS} strokeWidth="2" />
      <circle cx="330" cy="140" r="40" className={HOLE} strokeWidth="2" />
      <circle cx="470" cy="140" r="40" className={HOLE} strokeWidth="2" />
      <line
        x1="330"
        y1="60"
        x2="330"
        y2="100"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line x1="315" y1="60" x2="345" y2="60" className={DIM} strokeWidth="1.5" />
      <line x1="315" y1="100" x2="345" y2="100" className={DIM} strokeWidth="1.5" />
      <text x="352" y="86" fontSize="16" className={DIM_TEXT}>
        {labels.edge}
      </text>
      <line
        x1="60"
        y1="220"
        x2="290"
        y2="220"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line x1="290" y1="140" x2="290" y2="230" className="stroke-slate-blue" />
      <line x1="60" y1="210" x2="60" y2="230" className={DIM} strokeWidth="1.5" />
      <text x="120" y="250" fontSize="16" className={DIM_TEXT}>
        {labels.corner}
      </text>
      <line
        x1="370"
        y1="140"
        x2="430"
        y2="140"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text x="362" y="200" fontSize="16" className={DIM_TEXT}>
        {labels.between}
      </text>
      <text x="300" y="30" fontSize="14" className={NOTE_TEXT}>
        кромка стекла
      </text>
      <text x="8" y="40" fontSize="14" className={NOTE_TEXT}>
        угол
      </text>
      <path d="M28 46 L58 58" fill="none" className="stroke-text-2" />
      <text x="300" y="360" fontSize="14" className={NOTE_TEXT}>
        {labels.caption}
      </text>
    </svg>
  );
}

/** Narrow drawing (340 × 290) for phones: the same scheme, labels larger relative to it. */
function NarrowScheme({ labels }: { labels: SchemeLabels }) {
  return (
    <svg viewBox="0 0 340 290" className="hidden h-auto w-full max-sm:block" aria-hidden="true">
      <rect x="30" y="40" width="309" height="249" className={GLASS} strokeWidth="2" />
      <circle cx="160" cy="92" r="24" className={HOLE} strokeWidth="2" />
      <circle cx="262" cy="92" r="24" className={HOLE} strokeWidth="2" />
      <line
        x1="160"
        y1="40"
        x2="160"
        y2="68"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <line x1="150" y1="68" x2="170" y2="68" className={DIM} strokeWidth="1.5" />
      <text x="176" y="62" fontSize="15" className={DIM_TEXT}>
        {labels.edge}
      </text>
      <line
        x1="184"
        y1="92"
        x2="238"
        y2="92"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <text x="178" y="138" fontSize="15" className={DIM_TEXT}>
        {labels.between}
      </text>
      <line
        x1="30"
        y1="170"
        x2="136"
        y2="170"
        className={DIM}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <line x1="136" y1="92" x2="136" y2="178" className="stroke-slate-blue" />
      <line x1="30" y1="162" x2="30" y2="178" className={DIM} strokeWidth="1.5" />
      <text x="40" y="198" fontSize="15" className={DIM_TEXT}>
        {labels.corner}
      </text>
      <text x="150" y="26" fontSize="13" className={NOTE_TEXT}>
        кромка стекла
      </text>
      <text x="2" y="22" fontSize="13" className={NOTE_TEXT}>
        угол
      </text>
      <path d="M14 27 L29 39" fill="none" className="stroke-text-2" />
      <text x="184" y="266" fontSize="13" textAnchor="middle" className={NOTE_TEXT}>
        {labels.caption}
      </text>
    </svg>
  );
}

export function HolesRules({ view, holes, heading, headingId }: HolesRulesProps) {
  const { n } = view;
  const { edge, between, corner, minDiameter } = view.holeRules;
  const range = `${holes.dMin}–${holes.dMax}`;
  const labels: SchemeLabels = {
    edge: `≥ ${edge} мм`,
    between: `≥ ${between} мм`,
    corner: `≥ ${corner} мм до угла`,
    caption: `стекло ${n} мм, отверстия Ø ${range} мм`,
  };
  const rules: Array<[number, string]> = [
    [edge, "до кромки стекла — не менее"],
    [between, "между отверстиями — не менее"],
    [corner, "до угла — не менее"],
  ];
  const ROW =
    "border-line flex items-baseline gap-6 border-b py-3.5 max-sm:flex-col max-sm:gap-1 max-sm:py-3";
  const VALUE =
    "text-primary-pressed w-[150px] shrink-0 text-[30px] leading-9 font-bold tabular-nums max-sm:w-auto max-sm:text-[26px] max-sm:leading-8";
  const TEXT = "text-[18px] leading-[1.3] max-sm:text-base";

  return (
    <section
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="holes"
    >
      <Container className="flex items-center gap-16 max-lg:gap-10 max-md:flex-col max-md:items-stretch max-md:gap-8">
        <div className="bg-surface border-hairline flex w-[760px] shrink-0 justify-center rounded-xl border p-8 max-lg:w-[520px] max-lg:p-6 max-md:w-full max-md:max-w-[760px] max-sm:rounded-lg max-sm:p-4">
          <WideScheme labels={labels} />
          <NarrowScheme labels={labels} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-7 max-sm:gap-4">
          <h2 id={headingId} className="ig-h2 m-0 text-balance">
            {heading}
          </h2>
          <div className="flex flex-col gap-1">
            {rules.map(([value, label]) => (
              <p key={label} className={`${ROW} m-0`} data-hole-rule="">
                <b className={VALUE}>{value}&nbsp;мм</b>
                <span className={TEXT}>{label}</span>
              </p>
            ))}
            <p className={`${ROW} m-0 border-b-0`} data-hole-diameter="">
              <b className={VALUE}>Ø&nbsp;{range}</b>
              <span className={TEXT}>диаметр, мм; меньше {minDiameter} мм — по согласованию</span>
            </p>
          </div>
          <p className="m-0">
            <TextLink href={HOLES_CALCULATOR_HREF} variant="arrow">
              {CALCULATOR_LABEL}
            </TextLink>
          </p>
        </div>
      </Container>
    </section>
  );
}
