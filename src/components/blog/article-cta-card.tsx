import Link from "next/link";
import { Calculator, FileText } from "lucide-react";
import { resolveLink } from "@/components/blocks/shared";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import {
  buildQuizHref,
  prefillToQuizParams,
  QUIZ_CTA_LABEL,
  QUIZ_PATH,
} from "@/components/page/quiz-cta";
import type { Article, Condition } from "@/payload-types";

/**
 * Calls to action of an article (Article.dc.html): the button(s) after the text and the dark
 * card under «Содержание».
 *
 * Data (seed, task 31):
 * - `ctaCard.formKey` — a form (drawing): a form button after the text (label = `ctaCard.title`)
 *   and the aside card opens the same form (`ctaCard.buttonLabel`);
 * - `commercialLink` — a link button after the text (the quiz, `Рассчитать стоимость`); links to
 *   the quiz path get the article's `quizPrefill` and the article as `src`;
 * - neither — the aside card leads to the quiz with the article's pre-fill.
 *
 * `ctaCard` has no field for the lead `source`, so it is mapped here by slug (task-31 table);
 * other articles send `blog-<slug>`.
 */
const FORM_SOURCE_BY_SLUG: Readonly<Record<string, string>> = {
  "mozhno-li-rezat-zakalennoe-steklo": "blog-mozhno-li-rezat",
  "tripleks-ili-zakalennoe-dlya-ograzhdenij": "blog-tripleks-ograzhdeniya",
};

type ArticleCtaSource = Pick<
  Article,
  "slug" | "path" | "commercialLink" | "ctaCard" | "quizPrefill"
>;

interface FormAction {
  kind: "form";
  formKey: FormKey;
  label: string;
  params: { label: string; source: string };
}

interface LinkAction {
  kind: "link";
  href: string;
  label: string;
  quiz: boolean;
}

type CtaAction = FormAction | LinkAction;

const articlePathOf = (article: ArticleCtaSource) => article.path ?? `/blog/${article.slug}/`;

function quizHref(article: ArticleCtaSource): string {
  return buildQuizHref(prefillToQuizParams(article.quizPrefill, articlePathOf(article)));
}

function formAction(article: ArticleCtaSource, label: string): FormAction | null {
  const formKey = article.ctaCard?.formKey;
  if (!formKey) return null;
  const source = FORM_SOURCE_BY_SLUG[article.slug] ?? `blog-${article.slug}`;
  return { kind: "form", formKey, label, params: { label, source } };
}

/** `commercialLink` as a link action; quiz links get the article pre-fill and `src`. */
function commercialAction(article: ArticleCtaSource): LinkAction | null {
  const link = article.commercialLink;
  const label = link?.label?.trim();
  const resolved = resolveLink(link?.link ?? null);
  if (!label || !resolved) return null;
  const quiz = resolved.href.startsWith(QUIZ_PATH);
  return { kind: "link", href: quiz ? quizHref(article) : resolved.href, label, quiz };
}

/** Buttons after the article text: the form first (as in teksty), then the link. */
export function endActions(article: ArticleCtaSource): CtaAction[] {
  const title = article.ctaCard?.title?.trim();
  const form = title ? formAction(article, title) : null;
  const link = commercialAction(article);
  return [form, link].filter((action): action is CtaAction => action !== null);
}

/** Action and texts of the aside card. */
export function asideCard(article: ArticleCtaSource): { title: string; action: CtaAction } {
  const card = article.ctaCard;
  const link = commercialAction(article);
  const title = card?.title?.trim() || link?.label || QUIZ_CTA_LABEL;
  const buttonLabel = card?.buttonLabel?.trim() || title;
  const action: CtaAction = formAction(article, buttonLabel) ??
    (link ? { ...link, label: buttonLabel } : null) ?? {
      kind: "link",
      href: quizHref(article),
      label: buttonLabel,
      quiz: true,
    };
  return { title, action };
}

/**
 * «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².» from the `conditions`
 * global; the sentence parts whose values are missing are dropped.
 */
export function asideDescription(conditions: Condition | null): string {
  const parts: string[] = [];
  const { kpDaysMin, kpDaysMax, minOrderM2 } = conditions ?? {};
  if (typeof kpDaysMin === "number" && typeof kpDaysMax === "number") {
    parts.push(`КП — в среднем за ${kpDaysMin}–${kpDaysMax} рабочих дня.`);
  }
  if (typeof minOrderM2 === "number") parts.push(`Работаем с заказами от ${minOrderM2} м².`);
  return parts.join(" ");
}

function ActionButton({
  action,
  size,
  block = false,
  variant = "primary",
}: {
  action: CtaAction;
  size: "l" | "m";
  block?: boolean;
  variant?: "primary" | "secondary";
}) {
  const Icon = action.kind === "form" ? FileText : Calculator;
  const icon = size === "l" ? <Icon aria-hidden="true" strokeWidth={2} /> : undefined;
  if (action.kind === "form") {
    return (
      <FormTrigger formKey={action.formKey} params={action.params} asChild>
        <Button variant={variant} size={size} block={block} leftIcon={icon}>
          {action.label}
        </Button>
      </FormTrigger>
    );
  }
  return (
    <Button asChild variant={variant} size={size} block={block} leftIcon={icon}>
      <Link href={action.href} {...(action.quiz ? { "data-quiz-cta": "" } : {})}>
        {action.label}
      </Link>
    </Button>
  );
}

/** Primary L button(s) after the text; on phones full width. */
export function ArticleEndCta({ article }: { article: ArticleCtaSource }) {
  const actions = endActions(article);
  if (actions.length === 0) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3 max-sm:flex-col max-sm:[&_.ig-btn]:w-full">
      {actions.map((action, index) => (
        <ActionButton
          key={`${action.kind}-${action.label}`}
          action={action}
          size="l"
          variant={index === 0 ? "primary" : "secondary"}
        />
      ))}
    </div>
  );
}

/** Dark card of the aside (`.ar-cta`): icon, title, conditions line, block button. */
export function ArticleCtaCard({
  article,
  conditions,
}: {
  article: ArticleCtaSource;
  conditions: Condition | null;
}) {
  const { title, action } = asideCard(article);
  const description = article.ctaCard?.text?.trim() || asideDescription(conditions);
  const Icon = action.kind === "form" ? FileText : Calculator;
  return (
    <div className="bg-primary-dark text-on-navy flex flex-col gap-3 rounded-lg p-6 max-sm:p-5">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-[12px] bg-white/12 [&_svg]:size-[22px]"
      >
        <Icon strokeWidth={2} />
      </span>
      <p className="m-0 text-xl leading-[1.3] font-semibold">{title}</p>
      {description ? (
        <p className="text-on-navy-2 m-0 text-sm leading-normal">{description}</p>
      ) : null}
      <ActionButton action={action} size="m" block />
    </div>
  );
}
