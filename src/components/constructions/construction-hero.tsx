import { FileText } from "lucide-react";
import { fill } from "@/components/blocks/shared";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Breadcrumbs, type Crumb } from "@/components/ig/breadcrumbs";
import { Button } from "@/components/ig/button";
import { PageHero, PageHeroTerm } from "@/components/ig/page-hero";
import { QUIZ_CTA_LABEL, QuizLink } from "@/components/page/quiz-cta";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";

export const DEFAULT_SECONDARY_LABEL = "Отправить проект";

type ActionsDoc = Pick<
  Construction,
  "slug" | "ctaPrimaryLabel" | "ctaSecondaryLabel" | "secondaryFormKey" | "quizPrefill"
>;

export interface SecondaryAction {
  formKey: "drawing" | "load";
  label: string;
}

/**
 * Secondary CTA of a construction: `secondaryFormKey` (`drawing` | `load`, `none` hides it),
 * falling back to the quiz pre-fill (`secondaryForm` / `secondaryLabel`), then to «drawing».
 */
export function secondaryAction(doc: ActionsDoc, ctx: PlaceholderContext): SecondaryAction | null {
  const prefill = doc.quizPrefill;
  const fromPrefill =
    prefill?.secondaryForm === "drawing" || prefill?.secondaryForm === "load"
      ? prefill.secondaryForm
      : prefill?.secondaryForm === "none"
        ? "none"
        : null;
  const key = doc.secondaryFormKey ?? fromPrefill ?? "drawing";
  if (key === "none") return null;
  const label =
    fill(doc.ctaSecondaryLabel, ctx) ||
    fill(prefill?.secondaryLabel, ctx) ||
    DEFAULT_SECONDARY_LABEL;
  return { formKey: key, label };
}

/** Primary label: `ctaPrimaryLabel` → `quizPrefill.ctaLabel` → «Рассчитать стоимость». */
export function primaryLabel(doc: ActionsDoc, ctx: PlaceholderContext): string {
  return fill(doc.ctaPrimaryLabel, ctx) || fill(doc.quizPrefill?.ctaLabel, ctx) || QUIZ_CTA_LABEL;
}

/**
 * «Рассчитать …» (quiz link with the document pre-fill, calculator icon) + the optional
 * secondary form button. Used by the hero and by the closing CTA of the page.
 */
export async function ConstructionActions({
  doc,
  path,
  ctx,
  className,
}: {
  doc: ActionsDoc;
  path: string;
  ctx: PlaceholderContext;
  className?: string | undefined;
}) {
  const secondary = secondaryAction(doc, ctx);
  const prefill = doc.quizPrefill;
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <QuizLink
        prefill={{
          type: prefill?.type ?? null,
          thickness: prefill?.thickness ?? null,
          kind: prefill?.kind ?? null,
        }}
        src={path}
        size="l"
        ctx={ctx}
      >
        {primaryLabel(doc, ctx)}
      </QuizLink>
      {secondary ? (
        <FormTrigger
          formKey={secondary.formKey}
          params={{ label: secondary.label, title: secondary.label, source: doc.slug }}
          asChild
        >
          <Button
            variant="secondary"
            size="l"
            leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
          >
            {secondary.label}
          </Button>
        </FormTrigger>
      ) : null}
    </div>
  );
}

export interface ConstructionHeroProps {
  doc: Construction;
  title: string;
  crumbs: Crumb[];
  path: string;
  ctx: PlaceholderContext;
  /** «КП в среднем за 2–3 рабочих дня» (`conditions.kpText`). */
  kpText?: string | null | undefined;
}

/** First screen (`.p5-top`): crumbs, H1, intro, CTAs, one-item terms strip. */
export function ConstructionHero({ doc, title, crumbs, path, ctx, kpText }: ConstructionHeroProps) {
  const term = kpText?.trim();
  return (
    <PageHero
      variant="p5-top"
      title={title}
      breadcrumbs={<Breadcrumbs items={crumbs} />}
      actions={<ConstructionActions doc={doc} path={path} ctx={ctx} className="contents" />}
      terms={term ? <PageHeroTerm>{term}</PageHeroTerm> : undefined}
    >
      {doc.intro ? (
        <div className="[&_p]:text-lead-m [&_p]:text-ink-3 max-w-[900px] [&_p]:max-w-none max-sm:[&_p]:text-[16px]">
          <RichText data={doc.intro} ctx={ctx} />
        </div>
      ) : null}
    </PageHero>
  );
}
