import { FormTrigger } from "@/components/forms/form-trigger";
import { cn } from "@/lib/utils";
import type { ContactsData } from "./nav-defaults";

export interface PhoneBlockProps {
  contacts: Pick<ContactsData, "phone" | "callPrompt">;
  callbackLabel: string;
  className?: string | undefined;
}

/**
 * Header phone block (≥1366 px only): «● Звоните Пн–Пт 9–18», the main number as a `tel:`
 * link and the dashed «Заказать звонок» that opens the callback form.
 */
export function PhoneBlock({ contacts, callbackLabel, className }: PhoneBlockProps) {
  return (
    <div className={cn("flex flex-none flex-col items-start gap-0.5", className)}>
      <span className="text-text-2 flex items-center gap-1.5 text-[12px] leading-[1.3]">
        <span aria-hidden="true" className="bg-success-text size-[7px] rounded-full" />
        {contacts.callPrompt}
      </span>
      <a
        href={contacts.phone.href}
        className="text-text hover:text-primary-hover text-[16px] leading-[1.3] font-semibold whitespace-nowrap no-underline"
      >
        {contacts.phone.display}
      </a>
      <FormTrigger formKey="callback" asChild>
        <button type="button" className="ig-link ig-link--dashed text-[12px]">
          {callbackLabel}
        </button>
      </FormTrigger>
    </div>
  );
}
