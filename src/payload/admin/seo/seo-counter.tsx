"use client";

import { useFieldPath, useFormFields } from "@payloadcms/ui";
import { counterState } from "./snippet";

/**
 * Live length counter of an SEO text field (`afterInput` of `seo.title` / `seo.description`,
 * task 07): «58 / 70», over the soft limit «78 / 70 · длиннее рекомендованного». A hint only:
 * it never validates and never blocks saving.
 *
 * The value is read with `useFormFields` (a selector on the form state) rather than `useField`:
 * `useField` also wires validation and change handlers of the field, which an `afterInput`
 * widget must not duplicate.
 */

export interface SeoCounterProps {
  /** Soft limit, `SEO_TITLE_SOFT_LIMIT` / `SEO_DESCRIPTION_SOFT_LIMIT`. */
  limit: number;
  /** Path of the field (`seo.title`); Payload passes it to `afterInput` components. */
  path?: string | undefined;
}

export function SeoCounter({ limit, path: pathFromProps }: SeoCounterProps) {
  const pathFromContext = useFieldPath();
  const path = pathFromProps ?? pathFromContext ?? "";
  const value = useFormFields(([fields]) => fields[path]?.value);
  const { length, state } = counterState(value, limit);

  return (
    <span className="iga-seo-counter" data-state={state} aria-live="polite">
      {length} / {limit}
      {state === "over" ? " · длиннее рекомендованного" : null}
    </span>
  );
}
