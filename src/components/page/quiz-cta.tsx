import type { ReactNode } from "react";
import Link from "next/link";
import { Calculator, FileText } from "lucide-react";
import type { FormKey } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { quizSrc, replacePlaceholders } from "@/lib/domain";
import type { PlaceholderContext, QuizKindId, QuizTypeId } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * «Рассчитать стоимость» — link to the quiz page with the context of the current page
 * (`?type=…&thick=…&vid=…&src=…`), plus the optional secondary «Отправить чертёж» modal.
 * Select values of the CMS (`quizPrefill`) equal the domain ids (`QuizTypeId` / `QuizKindId`)
 * and are put into the URL as is; the quiz parser (task 34) reads the same dictionary.
 */

export const QUIZ_PATH = "/raschet-stoimosti/";
export const QUIZ_CTA_LABEL = "Рассчитать стоимость";
export const DRAWING_CTA_LABEL = "Отправить чертёж";

export interface QuizHrefParams {
  type?: QuizTypeId | null | undefined;
  thick?: number | null | undefined;
  vid?: QuizKindId | null | undefined;
  /** Page the visitor came from (path). */
  src?: string | null | undefined;
  /** Calculators: width, height (mm), quantity, triplex layers t1/t2 (mm), film layers. */
  w?: number | null | undefined;
  h?: number | null | undefined;
  q?: number | null | undefined;
  t1?: number | null | undefined;
  t2?: number | null | undefined;
  film?: number | null | undefined;
  /** Continue the saved draft («Мой расчёт»). */
  resume?: boolean | null | undefined;
}

/** Fixed key order: the same input always gives the same URL (cache keys, tests, analytics). */
const QUIZ_PARAM_ORDER = [
  "type",
  "thick",
  "vid",
  "src",
  "w",
  "h",
  "q",
  "t1",
  "t2",
  "film",
  "resume",
] as const satisfies ReadonlyArray<keyof QuizHrefParams>;

function paramValue(value: QuizHrefParams[keyof QuizHrefParams]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? "1" : null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  const text = value.trim();
  return text === "" ? null : text;
}

/**
 * `/raschet-stoimosti/?type=tempered&thick=10&vid=clear&src=%2Fzakalennoe-steklo%2F10-mm%2F`.
 * `src` goes through `quizSrc`: a secret path (`/zakaz/<token>/`) becomes `/zakaz/`.
 */
export function buildQuizHref(params: QuizHrefParams = {}): string {
  const search = new URLSearchParams();
  for (const key of QUIZ_PARAM_ORDER) {
    const raw = paramValue(params[key]);
    // Every quiz link masks `src` (also `params.src` of calculators that bypass the pre-fill).
    const value = key === "src" && raw !== null ? quizSrc(raw) : raw;
    if (value !== null) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${QUIZ_PATH}?${query}` : QUIZ_PATH;
}

/**
 * Quiz pre-fill of a document (`quizPrefill` group, or `prefill` of the `quizCta` block).
 * URL-style aliases `thick` / `vid` are accepted too and win over `thickness` / `kind`.
 */
export interface QuizPrefill {
  type?: QuizTypeId | null | undefined;
  /** Select value of the CMS: `'10'`. */
  thickness?: string | number | null | undefined;
  kind?: QuizKindId | null | undefined;
  thick?: number | null | undefined;
  vid?: QuizKindId | null | undefined;
  ctaLabel?: string | null | undefined;
  secondaryForm?: "drawing" | "load" | "sample" | "none" | null | undefined;
  secondaryLabel?: string | null | undefined;
}

function toThickness(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Quiz URL parameters from a pre-fill and the page path. `src` is masked with `quizSrc`
 * (`/zakaz/<token>/` → `/zakaz/`): server-rendered quiz links must not leak the order token
 * either (the order page, task-33, renders them too).
 */
export function prefillToQuizParams(
  prefill: QuizPrefill | null | undefined,
  src?: string | null
): QuizHrefParams {
  return {
    type: prefill?.type ?? undefined,
    thick: toThickness(prefill?.thick ?? prefill?.thickness),
    vid: prefill?.vid ?? prefill?.kind ?? undefined,
    src: src ? quizSrc(src) : undefined,
  };
}

/**
 * CMS label (`ctaLabel`, `secondaryLabel`) with placeholders (`{цена_10мм}`, …) substituted.
 * Empty / blank → `""`. Without a context the text is returned trimmed, unchanged.
 */
export function fillLabel(
  text: string | null | undefined,
  ctx: PlaceholderContext | null | undefined
): string {
  const value = text?.trim() ?? "";
  if (!value || !ctx) return value;
  return replacePlaceholders(value, ctx).trim();
}

/**
 * Placeholder context for the labels: the caller's, otherwise loaded from the (cached) globals —
 * only when a label actually contains a placeholder. The dynamic import keeps the Payload client
 * out of this module graph (unit tests import the pure helpers of this file).
 */
async function labelContext(
  ctx: PlaceholderContext | undefined,
  labels: ReadonlyArray<string | null | undefined>
): Promise<PlaceholderContext | null> {
  if (ctx) return ctx;
  if (!labels.some((label) => label?.includes("{"))) return null;
  const { getPlaceholderContext } = await import("@/lib/cms/globals");
  return getPlaceholderContext();
}

type ButtonSize = "l" | "m" | "s";
type ButtonVariant = "primary" | "secondary" | "ghost" | "onDark";

export interface QuizLinkProps {
  prefill?: QuizPrefill | null | undefined;
  /** Page path, sent as `src`. */
  src?: string | null | undefined;
  /** Extra parameters (calculators): override the pre-fill. */
  params?: QuizHrefParams | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Show the calculator icon (default `true`). */
  icon?: boolean | undefined;
  className?: string | undefined;
  /** Placeholder context for `prefill.ctaLabel`; loaded from the globals when omitted. */
  ctx?: PlaceholderContext | undefined;
  children?: ReactNode;
}

/** Button-styled link to the quiz for other components (hero, blocks, calculators). */
export async function QuizLink({
  prefill,
  src,
  params,
  variant = "primary",
  size = "l",
  icon = true,
  className,
  ctx,
  children,
}: QuizLinkProps) {
  const label =
    children ??
    (fillLabel(prefill?.ctaLabel, await labelContext(ctx, [prefill?.ctaLabel])) || QUIZ_CTA_LABEL);
  const href = buildQuizHref({ ...prefillToQuizParams(prefill, src), ...params });
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      leftIcon={icon ? <Calculator aria-hidden="true" strokeWidth={2} /> : undefined}
    >
      <Link href={href} data-quiz-cta="">
        {label}
      </Link>
    </Button>
  );
}

export interface QuizCtaProps {
  prefill?: QuizPrefill | null | undefined;
  /** Page path, sent as `src` and as the form source. */
  src: string;
  /** Primary label; defaults to `prefill.ctaLabel` or «Рассчитать стоимость». */
  label?: string | undefined;
  /** Secondary «Отправить чертёж» button (form from `prefill.secondaryForm`), `true` by default. */
  secondary?: boolean | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
  /** Placeholder context for the CMS labels; loaded from the globals when omitted. */
  ctx?: PlaceholderContext | undefined;
}

/** Primary «Рассчитать стоимость» + optional secondary form button. */
export async function QuizCta({
  prefill,
  src,
  label,
  secondary = true,
  size = "l",
  className,
  ctx,
}: QuizCtaProps) {
  const placeholders = await labelContext(ctx, [label, prefill?.ctaLabel, prefill?.secondaryLabel]);
  const primaryLabel =
    fillLabel(label, placeholders) || fillLabel(prefill?.ctaLabel, placeholders) || QUIZ_CTA_LABEL;
  const secondaryForm = prefill?.secondaryForm ?? "drawing";
  const showSecondary = secondary && secondaryForm !== "none";
  const secondaryLabel = fillLabel(prefill?.secondaryLabel, placeholders) || DRAWING_CTA_LABEL;
  const formKey: FormKey = secondaryForm === "none" ? "drawing" : secondaryForm;

  return (
    <div className={cn("flex flex-wrap gap-3 max-sm:flex-col max-sm:items-stretch", className)}>
      <QuizLink prefill={prefill} src={src} size={size} ctx={placeholders ?? undefined}>
        {primaryLabel}
      </QuizLink>
      {showSecondary ? (
        <FormTrigger formKey={formKey} params={{ label: secondaryLabel, source: src }} asChild>
          <Button
            variant="secondary"
            size={size}
            leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
          >
            {secondaryLabel}
          </Button>
        </FormTrigger>
      ) : null}
    </div>
  );
}
