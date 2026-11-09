import Link from "next/link";
import {
  Calculator,
  ClipboardCheck,
  Factory,
  PenLine,
  Truck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";
import { HOW_TO_ORDER_TEMPLATE_COPY } from "./copy";

/**
 * The six steps of the «Как заказать» hub (Paper mockup `2560_kak-zakazat`, frame `steps`): a row
 * of numbered circles joined by a line, under each a white card with an icon, the title, the text
 * and the arrow links at the bottom. The last circle is primary-dark (the order ships).
 *
 * 6 columns ≥1536 px, 3 columns below (the line stops at the end of each row), a vertical
 * timeline ≤599 px (circle and line on the left, the card on the right). No heading above the
 * steps (mockup): the list is named for assistive tech.
 */

export interface OrderStepLink {
  label: string;
  href: string;
  /** Link to the quiz: marked for the quiz-start analytics like every quiz CTA. */
  quiz?: boolean | undefined;
}

export interface OrderStep {
  title: string;
  text?: string | undefined;
  links: OrderStepLink[];
}

/**
 * Icons of the steps in the mockup order: send the file, approve the specification, get the
 * quote, sign the contract, production, packing and shipping. The steps block has no icon
 * field, so the template assigns them by position; extra steps get no icon.
 */
const STEP_ICONS: readonly LucideIcon[] = [
  Upload,
  ClipboardCheck,
  Calculator,
  PenLine,
  Factory,
  Truck,
];

/** The step title of teksty ends with a period (it introduces the text); the card shows none. */
const cardTitle = (title: string) => title.trim().replace(/\.$/u, "");

const LINK =
  "text-primary-pressed hover:text-primary-dark focus-visible:outline-brand self-start rounded-sm text-[15px] leading-[18px] font-medium underline decoration-1 underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center";

export function OrderSteps({ steps }: { steps: readonly OrderStep[] }) {
  if (steps.length === 0) return null;
  const last = steps.length - 1;

  return (
    <section
      aria-label={HOW_TO_ORDER_TEMPLATE_COPY.steps}
      className="mx-auto w-full max-w-[1920px] pt-16 pb-20 max-md:pt-12 max-md:pb-16 max-sm:pt-8 max-sm:pb-12"
    >
      <Container>
        <ol
          className="m-0 grid list-none grid-cols-6 gap-4 p-0 max-xl:grid-cols-3 max-xl:gap-y-8 max-sm:grid-cols-1 max-sm:gap-y-0"
          data-testid="order-steps"
        >
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            const isLast = index === last;
            return (
              <li
                key={index}
                className={cn(
                  "flex flex-col gap-5",
                  // Phones: circle + line on the left, the card on the right.
                  "max-sm:grid max-sm:grid-cols-[48px_minmax(0,1fr)] max-sm:gap-4",
                  !isLast && "max-sm:pb-4"
                )}
              >
                <div aria-hidden="true" className="flex items-center gap-3 max-sm:flex-col">
                  <span
                    data-step-circle=""
                    className={cn(
                      "grid size-14 shrink-0 place-items-center rounded-full text-[22px] leading-7 font-bold text-white max-sm:size-12 max-sm:text-xl",
                      isLast ? "bg-primary-dark" : "bg-primary"
                    )}
                  >
                    {index + 1}
                  </span>
                  {isLast ? null : (
                    <span
                      className={cn(
                        "bg-line-teal h-0.5 flex-1",
                        // 3 columns: the line ends with the row.
                        "sm:max-xl:[li:nth-child(3n)_&]:hidden",
                        "max-sm:block max-sm:h-auto max-sm:w-0.5"
                      )}
                    />
                  )}
                </div>
                <div className="bg-surface border-hairline flex flex-1 flex-col gap-3 rounded-lg border p-6 max-sm:p-5">
                  {Icon ? (
                    <Icon aria-hidden="true" strokeWidth={2} className="text-brand size-6" />
                  ) : null}
                  <h2 className="m-0 text-xl leading-[1.3] font-semibold text-balance">
                    {cardTitle(step.title)}
                  </h2>
                  {step.text ? (
                    <p className="text-ink-3 m-0 text-[15px] leading-[1.55]">{step.text}</p>
                  ) : null}
                  {step.links.length > 0 ? (
                    <div className="mt-auto flex flex-col gap-2 pt-2 max-sm:gap-0">
                      {step.links.map((link) => (
                        <Link
                          key={`${link.href}-${link.label}`}
                          href={link.href}
                          className={LINK}
                          {...(link.quiz ? { "data-quiz-cta": "" } : {})}
                        >
                          {link.label}
                          {/* The arrow stays with the last word when the label wraps. */}
                          <span aria-hidden="true">{"\u00a0→"}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
