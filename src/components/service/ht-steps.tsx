import { TextLink } from "@/components/ig/text-link";
import { cn } from "@/lib/utils";

export interface HtStepLink {
  label: string;
  href: string;
  /** Link to the quiz: marked for the quiz-start analytics like every quiz CTA. */
  quiz?: boolean;
}

export interface HtStep {
  title: string;
  text?: string | undefined;
  links: HtStepLink[];
}

/**
 * Dashed connector between the step circles (`.ht-step::before`): 2 px wide, 6 px dash / 6 px
 * gap, centred under the circle (72 px, 48 px on phones) and starting 8 px below it. The
 * colour #B9CDC8 is the prototype's: `--ig-line-teal` is too faint for a 2 px dash on `bg`.
 */
const CONNECTOR =
  "before:absolute before:top-20 before:bottom-2 before:left-[35px] before:w-0.5 before:bg-[repeating-linear-gradient(180deg,#b9cdc8_0_6px,transparent_6px_12px)] before:content-[''] max-sm:before:top-14 max-sm:before:left-[23px]";

/**
 * Vertical timeline of the «Как заказать» hub (`.ht-steps` of `HowTo.dc.html`): numbered
 * circles joined by a dashed line, the step title, its text and arrow links. The last step has
 * no connector. Numbers come from the order (`ol`), the circle digits are decorative.
 */
export function HtSteps({ steps }: { steps: HtStep[] }) {
  if (steps.length === 0) return null;
  const last = steps.length - 1;
  return (
    <ol className="m-0 flex max-w-[960px] list-none flex-col p-0" data-testid="ht-steps">
      {steps.map((step, index) => (
        <li
          key={index}
          className={cn(
            "relative grid grid-cols-[72px_minmax(0,1fr)] gap-7 max-sm:grid-cols-[48px_minmax(0,1fr)] max-sm:gap-4",
            index === last ? "pb-0" : cn("pb-11 max-sm:pb-7", CONNECTOR)
          )}
        >
          <span
            aria-hidden="true"
            data-step-circle=""
            className="bg-surface border-brand text-primary-dark shadow-card grid size-[72px] place-items-center rounded-full border-2 text-[30px] leading-none font-bold max-sm:size-12 max-sm:text-xl"
          >
            {index + 1}
          </span>
          <div className="flex flex-col gap-2.5 pt-3 max-sm:gap-2 max-sm:pt-2">
            <h2 className="m-0 text-2xl leading-[1.3] font-semibold max-sm:text-[19px]">
              {step.title}
            </h2>
            {step.text ? (
              <p className="text-ink-3 m-0 max-w-[720px] text-[17px] leading-[1.6] max-sm:text-[15px]">
                {step.text}
              </p>
            ) : null}
            {step.links.length > 0 ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {step.links.map((link) => (
                  <TextLink
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    variant="arrow"
                    {...(link.quiz ? { "data-quiz-cta": "" } : {})}
                  >
                    {link.label}
                  </TextLink>
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
