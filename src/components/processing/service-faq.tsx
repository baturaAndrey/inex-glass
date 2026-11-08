import { Accordion } from "@/components/ig/accordion";
import { Container } from "@/components/ig/container";
import { RichText, type RichTextData } from "@/components/rich-text/rich-text";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { JsonLd, faqLd } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * «Частые вопросы» of the Paper mockups `2560_glass_*`: the H2 on the left (520 px column), the
 * accordion in a white card on the right; the first answer is open. Emits the page's
 * `FAQPage` JSON-LD (unless the page already has one).
 *
 * The site accordion (`.ig-acc`) is restyled here, not changed: 20 px questions, hairlines
 * between the items (none above the first / below the last), the sign is a bare «+» that turns
 * into «−» when open (the vertical stroke of the Lucide `Plus` is hidden) instead of the
 * rotating circle. ≤1100 px the heading goes above the card.
 */

export interface ServiceFaqItem {
  key: string;
  question: string;
  answer: RichTextData | null | undefined;
}

export interface ServiceFaqProps {
  heading: string;
  headingId: string;
  items: readonly ServiceFaqItem[];
  ctx: PlaceholderContext;
  /** Emit `FAQPage` JSON-LD (off when another block of the page already does). */
  jsonLd: boolean;
}

/** `\_` keeps the BEM underscores literal in the arbitrary variants (an `_` means a space). */
const ACCORDION = cn(
  "border-t-0",
  String.raw`[&_.ig-acc\_\_item]:border-hairline [&_.ig-acc\_\_item:last-child]:border-b-0`,
  String.raw`[&_.ig-acc\_\_btn]:py-6 [&_.ig-acc\_\_btn]:text-[20px] [&_.ig-acc\_\_btn]:leading-[1.3] max-sm:[&_.ig-acc\_\_btn]:text-[18px]`,
  String.raw`[&_.ig-acc\_\_sign]:text-primary-pressed [&_.ig-acc\_\_sign]:bg-transparent [&_.ig-acc\_\_sign]:[transform:none]`,
  String.raw`[&_.ig-acc\_\_sign_svg]:size-6 [&_.is-open_.ig-acc\_\_sign_path:last-child]:hidden`,
  String.raw`[&_.ig-acc\_\_panel]:text-ink-3 [&_.ig-acc\_\_panel]:pr-0 [&_.ig-acc\_\_panel_p]:max-w-[900px]`
);

export function ServiceFaq({ heading, headingId, items, ctx, jsonLd }: ServiceFaqProps) {
  const questions = items.filter((item) => item.question.trim() !== "");
  if (questions.length === 0) return null;
  const text = (value: string) => replacePlaceholders(value, ctx);

  return (
    <section
      aria-labelledby={headingId}
      className="py-16 max-md:py-12 max-sm:py-8"
      data-testid="service-faq"
    >
      <Container className="flex items-start gap-16 max-md:flex-col max-md:gap-6">
        <h2
          id={headingId}
          className="ig-h2 text-primary-dark m-0 w-[520px] shrink-0 text-balance max-lg:w-[360px] max-md:w-auto"
        >
          {heading}
        </h2>
        <div className="bg-surface border-hairline w-full min-w-0 rounded-xl border px-8 py-2 max-sm:px-5">
          <Accordion
            type="multiple"
            defaultOpen={["faq-0"]}
            headingLevel={3}
            className={ACCORDION}
            items={questions.map((item, index) => ({
              id: `faq-${index}`,
              title: text(item.question),
              content: <RichText data={item.answer} ctx={ctx} />,
            }))}
          />
        </div>
      </Container>
      {jsonLd ? (
        <JsonLd
          data={faqLd(
            questions.map((item) => ({
              question: text(item.question),
              answer: text(lexicalToPlainText(item.answer)),
            }))
          )}
        />
      ) : null}
    </section>
  );
}
