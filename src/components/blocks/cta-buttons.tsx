import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { FormKey, FormParams } from "@/components/forms/form-dialog-provider";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { QuizLink } from "@/components/page/quiz-cta";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { NamedIcon, asMedia, fill, hasText, isExternalHref, mediaSrc, resolveLink } from "./shared";
import type { BlockOf, BlockPageContext } from "./types";

/** One button of `ctaFields()` (hero, steps, cta). */
export type CtaButtonValue = NonNullable<BlockOf<"cta">["buttons"]>[number];

/** Keys of `FormParams` the CMS JSON may carry under the editor-facing names. */
const KNOWN_PARAM_KEYS = new Set(["label", "source", "sourceLabel", "accept", "title"]);

/**
 * The CMS stores form parameters as free JSON in the editor's words
 * (`{ "label", "sourceLabel", "accept": ".dwg,.pdf", "title" }`); the form registry expects
 * `FormParams` (`source`, `accept: string[]`). Other keys are passed through unchanged.
 */
export function toFormParams(value: unknown, fallbackSource?: string): FormParams {
  const params: FormParams = {};
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(raw)) {
      if (!KNOWN_PARAM_KEYS.has(key)) params[key] = item;
    }
    if (typeof raw.label === "string") params.label = raw.label;
    if (typeof raw.title === "string") params.title = raw.title;
    const source = raw.source ?? raw.sourceLabel;
    if (typeof source === "string") params.source = source;
    const accept = typeof raw.accept === "string" ? raw.accept.split(",") : raw.accept;
    if (Array.isArray(accept)) {
      params.accept = accept
        .filter((ext): ext is string => typeof ext === "string")
        .map((ext) => ext.trim())
        .filter(Boolean);
    }
  }
  if (params.source === undefined && fallbackSource) params.source = fallbackSource;
  return params;
}

export interface CtaButtonsProps {
  buttons: CtaButtonValue[] | null | undefined;
  ctx: PlaceholderContext;
  page?: BlockPageContext | undefined;
  /** Buttons on a dark section: secondary/ghost switch to the on-dark style. */
  onDark?: boolean | undefined;
  size?: "l" | "m" | undefined;
  className?: string | undefined;
}

/** Row of up to three CMS buttons: quiz link, form modal, link or file download. */
export function CtaButtons({ buttons, ctx, page, onDark, size = "l", className }: CtaButtonsProps) {
  const items = (buttons ?? []).filter((button) => hasText(button.label));
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap gap-3 max-sm:flex-col max-sm:self-stretch max-sm:[&_.ig-btn]:w-full",
        className
      )}
    >
      {items.map((button, index) => (
        <CtaButton
          key={button.id ?? index}
          button={button}
          ctx={ctx}
          page={page}
          onDark={onDark}
          size={size}
        />
      ))}
    </div>
  );
}

interface CtaButtonProps {
  button: CtaButtonValue;
  ctx: PlaceholderContext;
  page: BlockPageContext | undefined;
  onDark: boolean | undefined;
  size: "l" | "m";
}

function CtaButton({ button, ctx, page, onDark, size }: CtaButtonProps) {
  const label = fill(button.label, ctx);
  const tone = button.variant ?? "primary";
  const variant = onDark && tone !== "primary" ? "onDark" : tone;

  switch (button.kind ?? "quiz") {
    case "quiz":
      // Pre-fill and `src` come from the page when `RenderBlocks` receives it.
      return (
        <QuizLink prefill={page?.quizPrefill} src={page?.path} variant={variant} size={size}>
          {label}
        </QuizLink>
      );

    case "form": {
      const formKey: FormKey = button.formKey ?? "callback";
      return (
        <FormTrigger formKey={formKey} params={toFormParams(button.formParams, page?.path)} asChild>
          <Button
            size={size}
            variant={variant}
            leftIcon={
              <NamedIcon
                name={button.icon}
                fallback={formKey === "drawing" ? <FileText aria-hidden="true" /> : null}
              />
            }
          >
            {label}
          </Button>
        </FormTrigger>
      );
    }

    case "link": {
      const link = resolveLink(button.link);
      if (!link) return null;
      const external = isExternalHref(link.href);
      const target = link.newTab ? "_blank" : undefined;
      const rel = external || link.newTab ? "noopener noreferrer" : undefined;
      return (
        <Button asChild size={size} variant={variant} leftIcon={<NamedIcon name={button.icon} />}>
          {external ? (
            <a href={link.href} target={target} rel={rel}>
              {label}
            </a>
          ) : (
            <Link href={link.href} target={target} rel={rel}>
              {label}
            </Link>
          )}
        </Button>
      );
    }

    case "download": {
      const media = asMedia(button.file);
      const href = media ? mediaSrc(media) : null;
      if (!href) return null;
      return (
        <Button
          asChild
          size={size}
          variant={variant}
          leftIcon={<NamedIcon name={button.icon} fallback={<Download aria-hidden="true" />} />}
        >
          <a href={href} download rel="noopener">
            {label}
          </a>
        </Button>
      );
    }
  }
}
