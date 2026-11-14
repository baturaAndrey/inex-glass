import { TextLink } from "@/components/ig/text-link";
import { RichText } from "@/components/rich-text/rich-text";
import { cn } from "@/lib/utils";
import { CtaButtons } from "./cta-buttons";
import { BlockSection, fill, hasText, isDarkVariant, isExternalHref, resolveLink } from "./shared";
import type { BlockProps } from "./types";

/**
 * Call to action: `buttons` (row of buttons), `banner` (framed card), `strip` (one line with a
 * link, e.g. to inex.su), `split` (text left, a card with the button right — «Расчёт под снег»).
 * `tone: primaryDark` puts the block on the deep-teal accent background.
 */
export function CtaBlock({ block, ctx, section, page }: BlockProps<"cta">) {
  const variant = block.tone === "primaryDark" ? "primary-dark" : section.variant;
  const dark = isDarkVariant(variant);
  const title = fill(block.title, ctx);
  const buttons = <CtaButtons buttons={block.buttons} ctx={ctx} page={page} onDark={dark} />;
  const body = block.body ? (
    <RichText data={block.body} ctx={ctx} className={cn(dark && "[&_a]:text-on-navy")} />
  ) : null;
  const heading = title ? <p className="ig-h3 m-0">{title}</p> : null;

  if (block.variant === "strip") {
    const link = resolveLink(block.link);
    return (
      <BlockSection block={block} section={section} ctx={ctx} variant={variant}>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="flex min-w-0 flex-col gap-2">
            {heading}
            {body}
          </div>
          {link ? (
            <TextLink
              href={link.href}
              variant="arrow"
              className={cn(dark && "text-on-navy")}
              {...(isExternalHref(link.href) ? { rel: "noopener noreferrer" } : {})}
              {...(link.newTab ? { target: "_blank" } : {})}
            >
              {link.label ?? link.href}
            </TextLink>
          ) : null}
          {buttons}
        </div>
      </BlockSection>
    );
  }

  if (block.variant === "split") {
    const side = fill(block.sideText, ctx);
    return (
      <BlockSection block={block} section={section} ctx={ctx} variant={variant}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,440px)] items-start gap-12 max-md:grid-cols-1 max-md:gap-8">
          <div className="flex flex-col gap-4">
            {heading}
            {body}
          </div>
          <div className="bg-surface text-text shadow-card flex flex-col gap-5 rounded-xl p-8 max-sm:p-6">
            {hasText(side) ? <p className="ig-body m-0">{side}</p> : null}
            <CtaButtons buttons={block.buttons} ctx={ctx} page={page} />
          </div>
        </div>
      </BlockSection>
    );
  }

  if (block.variant === "banner") {
    return (
      <BlockSection block={block} section={section} ctx={ctx} variant={variant}>
        <div
          className={cn(
            "flex flex-col gap-6 rounded-xl p-10 max-sm:p-6",
            dark ? "bg-white/5" : "bg-surface shadow-card"
          )}
        >
          {heading}
          {body}
          {buttons}
        </div>
      </BlockSection>
    );
  }

  return (
    <BlockSection block={block} section={section} ctx={ctx} variant={variant}>
      <div className="flex max-w-[900px] flex-col gap-6">
        {heading}
        {body}
        {buttons}
      </div>
    </BlockSection>
  );
}
