import Link from "next/link";
import { ArrowRight, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { docToHref, type InternalDocRef } from "@/components/rich-text/internal-links";
import { RichText, safeExternalHref, type RichTextData } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * «tempered-callout» of a service page (Paper mockup `2560_service_facet`, «А на закалённом
 * стекле?»): a warning plaque — icon, title, text and a secondary pill button with an arrow.
 *
 * Source: the service's `callouts[]` (tone, title, body), one plaque each. A last paragraph of
 * the body made only of one link (optionally with an arrow: `→ [Обработка кромки](/…/)`) is the
 * button; it is not repeated in the text. Tone `info` swaps the colours and the icon.
 *
 * ≤1100 px the button goes under the text, ≤599 px the icon too and the button spans the width.
 */

export interface ServiceCallout {
  key: string;
  tone: "warning" | "info";
  title: string;
  body: RichTextData | null | undefined;
}

export interface ServiceCalloutsProps {
  callouts: readonly ServiceCallout[];
  ctx: PlaceholderContext;
}

type LexicalNode = {
  type?: unknown;
  text?: unknown;
  children?: unknown;
  fields?: { linkType?: unknown; url?: unknown; doc?: unknown };
};

interface CalloutButton {
  href: string;
  label: string;
}

const TONE = {
  warning: {
    box: "bg-warning-bg border-warning",
    icon: TriangleAlert,
    iconClass: "text-warning-text",
  },
  info: { box: "bg-info-bg border-info", icon: Info, iconClass: "text-info-text" },
} as const;

/** Arrow characters an editor may put before the link (`→ [Label](…)`). */
const ARROWS = /^[\s→›>»-]*$/;

const childrenOf = (node: unknown): LexicalNode[] => {
  const children = (node as { children?: unknown } | null)?.children;
  return Array.isArray(children) ? (children as LexicalNode[]) : [];
};

const plainText = (nodes: readonly LexicalNode[]): string =>
  nodes
    .map((node) => (typeof node.text === "string" ? node.text : plainText(childrenOf(node))))
    .join("");

function linkHref(link: LexicalNode): string | null {
  const fields = link.fields ?? {};
  if (fields.linkType === "internal") return docToHref((fields.doc as InternalDocRef) ?? null);
  return safeExternalHref(typeof fields.url === "string" ? fields.url : null);
}

/** The trailing «link only» paragraph as the button; the rest stays the text. */
export function splitButton(data: RichTextData | null | undefined): {
  body: RichTextData | null;
  button: CalloutButton | null;
} {
  if (!data || typeof data.root !== "object" || data.root === null) {
    return { body: null, button: null };
  }
  const nodes = childrenOf(data.root);
  const last = nodes.at(-1);
  const inline = last?.type === "paragraph" ? childrenOf(last) : [];
  const links = inline.filter((node) => node.type === "link" || node.type === "autolink");
  const rest = inline.filter((node) => !links.includes(node));
  const link = links.length === 1 && ARROWS.test(plainText(rest)) ? links[0]! : null;
  const href = link ? linkHref(link) : null;
  const label = link ? plainText(childrenOf(link)).trim() : "";
  if (!href || !label) return { body: nodes.length > 0 ? data : null, button: null };
  const remaining = nodes.slice(0, -1);
  return {
    body: remaining.length > 0 ? { ...data, root: { ...data.root, children: remaining } } : null,
    button: { href, label },
  };
}

function Plaque({ callout, ctx }: { callout: ServiceCallout; ctx: PlaceholderContext }) {
  const { body, button } = splitButton(callout.body);
  const tone = TONE[callout.tone];
  const Icon = tone.icon;
  const titleId = `processing-callout-${callout.key}-title`;
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-8 gap-y-6 rounded-xl border px-12 py-10",
        "max-md:grid-cols-[auto_minmax(0,1fr)] max-md:px-8 max-md:py-8",
        "max-sm:grid-cols-1 max-sm:gap-4 max-sm:px-5 max-sm:py-6",
        tone.box
      )}
      data-testid="processing-callout"
    >
      <Icon
        aria-hidden="true"
        strokeWidth={2}
        className={cn("size-12 max-sm:size-9", tone.iconClass)}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id={titleId} className="text-h4 text-text m-0 font-bold text-balance">
          {callout.title}
        </h2>
        {body ? (
          <div className="[&_p]:text-lead [&_p]:text-ink-3 flex flex-col gap-2 [&_p]:max-w-none [&_strong]:font-semibold">
            <RichText data={body} ctx={ctx} disableContainer />
          </div>
        ) : null}
      </div>
      {button ? (
        <Button
          asChild
          variant="secondary"
          size="l"
          rightIcon={<ArrowRight aria-hidden="true" strokeWidth={2} />}
          className="bg-surface max-md:col-start-2 max-md:justify-self-start max-sm:col-start-1 max-sm:w-full"
        >
          <Link href={button.href}>{button.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function ServiceCallouts({ callouts, ctx }: ServiceCalloutsProps) {
  if (callouts.length === 0) return null;
  return (
    <section className="pt-8 pb-16 max-md:pb-12 max-sm:pt-4 max-sm:pb-8">
      <Container className="flex flex-col gap-6">
        {callouts.map((callout) => (
          <Plaque key={callout.key} callout={callout} ctx={ctx} />
        ))}
      </Container>
    </section>
  );
}
