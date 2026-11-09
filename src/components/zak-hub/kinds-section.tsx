import Link from "next/link";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { HubCard, resolveCard } from "@/components/constructions/hub-cards";
import { Container } from "@/components/ig/container";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/**
 * «Виды закалённого стекла» (`#vidy`, Paper mockup `2560_zakalennoe-steklo`, frame `kinds`):
 * photo cards of the glass types (`cards` block: title, text, link, image — the card of the
 * constructions hub; «Прозрачное» has no page and is a plain card) and, as the last cell
 * spanning two columns, the dark «Рядом» panel built from the companion `richText` block
 * (`vidy-bridge`: «Рядом: [Триплекс](…) · [Обработка стекла](…) · …»): the words before the
 * colon are the panel title, the links are listed below it.
 *
 * 3 columns; ≤1100 px 2 (the panel then takes one cell); ≤599 px 1.
 */

export const KINDS_ANCHOR = "vidy";

export interface KindsSectionProps {
  block: BlockOf<"cards">;
  bridge?: BlockOf<"richText"> | undefined;
  ctx: PlaceholderContext;
  headingId: string;
}

type LexicalNode = { type?: unknown; children?: unknown; fields?: unknown; text?: unknown };

const childrenOf = (node: unknown): LexicalNode[] => {
  const children = (node as { children?: unknown } | null)?.children;
  return Array.isArray(children) ? (children as LexicalNode[]) : [];
};

const textOf = (node: LexicalNode): string =>
  typeof node.text === "string" ? node.text : childrenOf(node).map(textOf).join("");

/** Custom-URL links of a rich text, in order (internal links fall back to the rich text). */
function linksOf(data: unknown): Array<{ label: string; href: string }> {
  const found: Array<{ label: string; href: string }> = [];
  const walk = (node: LexicalNode) => {
    if (node.type === "link") {
      const fields = (node.fields ?? {}) as { linkType?: unknown; url?: unknown };
      const label = textOf(node).trim();
      if (fields.linkType !== "internal" && typeof fields.url === "string" && label) {
        found.push({ label, href: fields.url.trim() });
      }
      return;
    }
    childrenOf(node).forEach(walk);
  };
  walk((data as { root?: unknown } | null)?.root as LexicalNode);
  return found.filter((link) => link.href.startsWith("/"));
}

function NearbyPanel({ bridge, ctx }: { bridge: BlockOf<"richText">; ctx: PlaceholderContext }) {
  const plain = fill(lexicalToPlainText(bridge.content), ctx).trim();
  const colon = plain.indexOf(":");
  const title = colon > 0 ? plain.slice(0, colon).trim() : "";
  const links = linksOf(bridge.content);
  const headingId = "zak-nearby-title";

  return (
    <div
      role="group"
      {...(title ? { "aria-labelledby": headingId } : {})}
      className="bg-primary-dark text-on-navy flex h-full min-h-[440px] w-full flex-col justify-center gap-5 rounded-xl p-[clamp(24px,3.34vw,64px)] max-lg:min-h-[400px] max-sm:min-h-0"
      data-kinds-bridge=""
    >
      {title && links.length > 0 ? (
        <>
          <h3 id={headingId} className="ig-h2 text-on-navy m-0">
            {title}
          </h3>
          <ul className="text-on-navy-2 m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[22px] leading-[1.7] max-sm:flex-col max-sm:items-start max-sm:text-[18px]">
            {links.map((link, index) => (
              <li key={link.href} className="flex items-center gap-4">
                {index > 0 ? (
                  <span aria-hidden="true" className="max-sm:hidden">
                    ·
                  </span>
                ) : null}
                <Link
                  href={link.href}
                  className="text-on-navy hover:text-on-navy focus-visible:outline-on-navy inline-flex min-h-11 items-center rounded-sm font-medium underline decoration-1 underline-offset-[5px] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <RichText
          data={bridge.content}
          ctx={ctx}
          className="text-on-navy [&_a]:text-on-navy text-[22px] [&_p]:m-0"
        />
      )}
    </div>
  );
}

export function KindsSection({ block, bridge, ctx, headingId }: KindsSectionProps) {
  const cards = (block.items ?? []).flatMap((item, index) => {
    const card = resolveCard(item, index, ctx);
    return card ? [card] : [];
  });
  if (cards.length === 0) return null;
  const showBridge = Boolean(bridge?.content);

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : KINDS_ANCHOR}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="kinds"
    >
      <Container className="flex flex-col gap-6">
        <h2 id={headingId} className="ig-h2 m-0 pb-4 text-balance max-sm:pb-0">
          {fill(block.heading, ctx)}
        </h2>
        <ul
          className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4"
          data-kinds-cards=""
        >
          {cards.map((card) => (
            <li key={card.key} className="flex">
              <HubCard card={card} testId="kind-card" />
            </li>
          ))}
          {showBridge && bridge ? (
            <li className="col-span-2 flex max-md:col-span-1">
              <NearbyPanel bridge={bridge} ctx={ctx} />
            </li>
          ) : null}
        </ul>
      </Container>
    </section>
  );
}
