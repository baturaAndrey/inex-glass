import { Callout } from "@/components/ig/callout";

/**
 * «Комментарий менеджера» under the timeline (e.g. a postponed date). Plain text: React escapes
 * it, line breaks are kept by `white-space: pre-line`; never rendered as HTML.
 */
export function ClientComment({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Callout variant="info" title="Комментарий менеджера" className="px-5 py-[18px]">
      <p className="m-0 [overflow-wrap:anywhere] whitespace-pre-line">{text}</p>
    </Callout>
  );
}
