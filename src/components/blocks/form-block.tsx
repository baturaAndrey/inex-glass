import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { TextLink } from "@/components/ig/text-link";
import { toFormParams } from "./cta-buttons";
import { BlockSection, fill } from "./shared";
import type { BlockProps } from "./types";

/** Button labels per form until task 21 renders the forms inline. */
const OPEN_LABEL = {
  drawing: "Отправить чертёж",
  callback: "Заказать звонок",
  sample: "Заказать образец",
  load: "Подобрать под нагрузку",
  contacts: "Отправить заявку",
  full: "Отправить заявку",
} as const;

const CONTACTS_PATH = "/kontakty/";

/**
 * STUB — replaced as a whole by task 21 (inline forms from the form registry).
 * Keep the export name and the `BlockProps<"form">` props.
 * For now: the section heading and a button that opens the form in the site-wide modal;
 * without JavaScript the contacts page stays reachable.
 */
export function FormBlock({ block, ctx, section, page }: BlockProps<"form">) {
  const label = fill(block.submitLabel, ctx) || OPEN_LABEL[block.formKey];
  const params = toFormParams(block.params, fill(block.sourceLabel, ctx) || page?.path);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <FormTrigger formKey={block.formKey} params={params} asChild>
        <Button size="l">{label}</Button>
      </FormTrigger>
      <noscript>
        <p className="ig-body mt-4 mb-0">
          <TextLink href={CONTACTS_PATH}>Контакты</TextLink>
        </p>
      </noscript>
    </BlockSection>
  );
}
