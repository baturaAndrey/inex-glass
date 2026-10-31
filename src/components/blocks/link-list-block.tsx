import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Chip } from "@/components/ig/chip";
import { TextLink } from "@/components/ig/text-link";
import { cn } from "@/lib/utils";
import {
  BlockSection,
  fill,
  hasText,
  isExternalHref,
  resolveLink,
  type ResolvedLink,
} from "./shared";
import type { BlockProps } from "./types";

interface Item {
  key: string;
  link: ResolvedLink;
  label: string;
  description: string;
}

/** `rel` for links that leave the site or open a new tab. */
const relFor = (link: ResolvedLink) =>
  isExternalHref(link.href) || link.newTab ? "noopener noreferrer" : undefined;

const targetProps = (link: ResolvedLink) => (link.newTab ? { target: "_blank" } : {});

/**
 * Links as chips («Рядом: 8 мм · 12 мм»), buttons, or a «bridge» to other sections
 * (cards with a description and an arrow).
 */
export function LinkListBlock({ block, ctx, section }: BlockProps<"linkList">) {
  const items: Item[] = (block.items ?? []).flatMap((item, index) => {
    const link = resolveLink(item.link);
    const label = link ? fill(link.label, ctx) : "";
    return link && label
      ? [{ key: item.id ?? String(index), link, label, description: fill(item.description, ctx) }]
      : [];
  });
  if (items.length === 0) return null;
  const caption = fill(block.label, ctx);
  const variant = block.variant ?? "chips";

  if (variant === "bridge") {
    return (
      <BlockSection block={block} section={section} ctx={ctx}>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 md:grid-cols-3">
          {items.map(({ key, link, label, description }) => (
            <li
              key={key}
              className="bg-surface shadow-card flex flex-col gap-2 rounded-lg p-6 max-sm:p-5"
            >
              <TextLink
                href={link.href}
                variant="arrow"
                className="font-semibold"
                rel={relFor(link)}
                {...targetProps(link)}
              >
                {label}
              </TextLink>
              {hasText(description) ? (
                <p className="text-small text-text-2 m-0">{description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </BlockSection>
    );
  }

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {caption ? <span className="text-small text-text-2 font-medium">{caption}</span> : null}
        <ul
          className={cn("m-0 flex list-none flex-wrap gap-2 p-0", variant === "buttons" && "gap-3")}
        >
          {items.map(({ key, link, label }) => (
            <li key={key}>
              {variant === "buttons" ? (
                <Button asChild variant="secondary" rightIcon={<ArrowRight aria-hidden="true" />}>
                  {isExternalHref(link.href) ? (
                    <a href={link.href} rel={relFor(link)} {...targetProps(link)}>
                      {label}
                    </a>
                  ) : (
                    <Link href={link.href} {...targetProps(link)}>
                      {label}
                    </Link>
                  )}
                </Button>
              ) : (
                <Chip href={link.href} rel={relFor(link)} {...targetProps(link)}>
                  {label}
                </Chip>
              )}
            </li>
          ))}
        </ul>
      </div>
    </BlockSection>
  );
}
