import { Check } from "lucide-react";
import { Section, type SectionVariant } from "@/components/ig/section";
import { telHref } from "@/components/layout/nav-data";
import { cn } from "@/lib/utils";
import { FORM_TEXTS } from "./form-texts";
import { getServerFormsConfig } from "./forms-config-server";
import { InlineForm } from "./registry";
import type { FormKey, FormParams } from "./form-dialog-provider";

/**
 * Server section with an embedded site form (task 21), used by the `form` block and directly by
 * the pages of tasks 22/23.
 *
 * - `full` / `contacts` with `variant: 'page'` (their default): the «Отправьте чертёж» section of
 *   Home.dc.html / Contacts.dc.html — primary-light background, left column (heading, bullets or
 *   sub, contacts from the `contacts` global; sticky on ≥1101) and the form card on the right.
 * - every other combination (`card` / `inline`, or the `drawing` / `callback` / `sample` / `load`
 *   forms): the optional heading plus the form card only.
 *
 * CMS texts (thank-you, error, phone, hours) are read here and handed to the client form, so
 * inline forms make no `/api/forms-config/` request.
 */

export type FormSectionVariant = "card" | "inline" | "page";

export interface FormSectionProps {
  formKey: FormKey;
  heading?: string | undefined;
  sub?: string | undefined;
  bullets?: string[] | undefined;
  showContacts?: boolean | undefined;
  submitLabel?: string | undefined;
  fileLabel?: string | undefined;
  /** Caption the lead arrives with (`sourceLabel`); overrides `params.label`. */
  sourceLabel?: string | undefined;
  params?: Record<string, unknown> | undefined;
  /** `page` — section with the left column; `card` / `inline` — the form card only. */
  variant?: FormSectionVariant | undefined;
  /** Place id sent as `params.source`; default — the page path (+ `#anchorId`) on the client. */
  source?: string | undefined;
  anchorId?: string | undefined;
  /** Block background (`auto` | `bg` | `sf` | `dark` | `primaryDark`); `page` sections stay light. */
  background?: string | undefined;
  className?: string | undefined;
  /** Id of the heading (`aria-labelledby` of the section). */
  headingId?: string | undefined;
  headingLevel?: "h2" | "h3" | undefined;
}

/** Forms that own a full «page» section with the left column. */
const SECTION_FORMS: ReadonlySet<FormKey> = new Set(["full", "contacts"]);

const BACKGROUNDS: Readonly<Record<string, SectionVariant>> = {
  bg: "bg",
  sf: "sf",
  dark: "dark",
  primaryDark: "primary-dark",
  "primary-dark": "primary-dark",
};

const nonEmpty = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim() !== "";

/** Section heading/sub/bullets defaults of the `full` and `contacts` sections (teksty/01, 06). */
function sectionDefaults(formKey: FormKey): {
  heading: string;
  sub?: string;
  bullets: readonly string[];
  showContacts: boolean;
} {
  if (formKey === "contacts") {
    return {
      heading: FORM_TEXTS.section.contactsHeading,
      sub: FORM_TEXTS.section.contactsSub,
      bullets: [],
      showContacts: false,
    };
  }
  return {
    heading: FORM_TEXTS.section.fullHeading,
    bullets: FORM_TEXTS.section.fullBullets,
    showContacts: true,
  };
}

/** Parameters for the client form: UI overrides and the place id merged into `params`. */
function formParams(props: FormSectionProps): FormParams {
  const params: FormParams = { ...(props.params ?? {}) };
  if (nonEmpty(props.sourceLabel)) params.label = props.sourceLabel.trim();
  if (nonEmpty(props.submitLabel)) params.submitLabel = props.submitLabel.trim();
  if (nonEmpty(props.fileLabel)) params.fileLabel = props.fileLabel.trim();
  if (nonEmpty(props.source)) params.source = props.source.trim();
  return params;
}

export async function FormSection(props: FormSectionProps) {
  const { formKey, anchorId, className, headingLevel } = props;
  const config = await getServerFormsConfig();
  const params = formParams(props);
  const layout = props.variant ?? (SECTION_FORMS.has(formKey) ? "page" : "card");
  const Heading = headingLevel === "h3" ? "h3" : "h2";
  const headingId = props.headingId ?? `${anchorId || formKey}-form-title`;
  const anchor = nonEmpty(anchorId) ? anchorId.trim() : undefined;

  const form = (
    <InlineForm
      formKey={formKey}
      params={params}
      config={{
        phone: config.phone,
        workHours: config.workHours,
        thankYouTitle: config.thankYouTitle,
        thankYouText: config.thankYouText,
        submitErrorText: config.submitErrorText,
      }}
    />
  );

  if (layout === "page" && SECTION_FORMS.has(formKey)) {
    const defaults = sectionDefaults(formKey);
    const heading = nonEmpty(props.heading) ? props.heading : defaults.heading;
    const bullets = props.bullets?.filter(nonEmpty) ?? [];
    const shownBullets = bullets.length > 0 ? bullets : nonEmpty(props.sub) ? [] : defaults.bullets;
    const sub = nonEmpty(props.sub)
      ? props.sub
      : shownBullets.length > 0
        ? undefined
        : defaults.sub;
    const showContacts = props.showContacts ?? defaults.showContacts;
    const light = props.background === "bg" || props.background === "sf";

    return (
      <Section
        id={anchor}
        variant={light ? (props.background as SectionVariant) : "bg"}
        aria-labelledby={headingId}
        data-form-section={formKey}
        className={cn("scroll-mt-24", !light && "bg-primary-light", className)}
      >
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,560px)_minmax(0,1fr)] md:gap-16">
          <div className="flex flex-col gap-6 md:sticky md:top-[calc(var(--ig-header-compact-h)+24px)]">
            <Heading id={headingId} className="ig-h2 text-primary-dark m-0 text-balance">
              {heading}
            </Heading>
            {shownBullets.length > 0 ? (
              <ul className="text-body m-0 flex list-none flex-col gap-3 p-0 font-medium">
                {shownBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <Check
                      aria-hidden="true"
                      strokeWidth={2.5}
                      className="text-brand mt-0.5 size-5 flex-none"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {sub ? <p className="ig-body text-text-2 m-0">{sub}</p> : null}
            {showContacts && (config.workHours || config.phone || config.email) ? (
              <div className="flex flex-col gap-1">
                {config.workHours ? (
                  <span className="ig-small text-text-2">{config.workHours}</span>
                ) : null}
                {config.phone ? (
                  <a
                    href={telHref(config.phone)}
                    className="text-primary-dark text-[22px] leading-[1.3] font-semibold no-underline"
                  >
                    {config.phone}
                  </a>
                ) : null}
                {config.email ? (
                  <a href={`mailto:${config.email}`} className="ig-link self-start font-medium">
                    {config.email}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="bg-surface shadow-card rounded-xl p-10 max-sm:p-5">{form}</div>
        </div>
      </Section>
    );
  }

  const heading = nonEmpty(props.heading) ? props.heading : undefined;
  const sub = nonEmpty(props.sub) ? props.sub : undefined;
  const variant = BACKGROUNDS[props.background ?? ""] ?? "bg";

  return (
    <Section
      id={anchor}
      variant={variant}
      aria-labelledby={heading ? headingId : undefined}
      data-form-section={formKey}
      className={cn("scroll-mt-24", className)}
    >
      <div className="flex max-w-[760px] flex-col gap-6">
        {heading ? (
          <Heading id={headingId} className={cn(Heading === "h3" ? "ig-h3" : "ig-h2", "m-0")}>
            {heading}
          </Heading>
        ) : null}
        {sub ? (
          <p className="m-0 text-(length:--ig-lead-size) leading-normal text-(color:--ig-section-sub)">
            {sub}
          </p>
        ) : null}
        <div
          className={cn(
            layout === "inline"
              ? "text-text"
              : "bg-surface text-text shadow-card rounded-xl p-10 max-sm:p-5"
          )}
        >
          {form}
        </div>
      </div>
    </Section>
  );
}
