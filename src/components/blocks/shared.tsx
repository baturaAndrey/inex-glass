import { createElement, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Info,
  Layers,
  Mail,
  MessageCircle,
  Phone,
  Ruler,
  Scissors,
  Send,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Upload,
  Users,
  Wrench,
  type LucideProps,
} from "lucide-react";
import { Section, type SectionVariant } from "@/components/ig/section";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Media } from "@/payload-types";
import type { BlockBackground, BlockSectionInfo, BlockOf } from "./types";

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

/** CMS string with placeholders substituted; `""` for empty values. */
export function fill(text: string | null | undefined, ctx: PlaceholderContext): string {
  return text ? replacePlaceholders(text, ctx) : "";
}

/** `true` for a non-empty string after trimming. */
export const hasText = (text: string | null | undefined): text is string =>
  typeof text === "string" && text.trim() !== "";

// ---------------------------------------------------------------------------------------------
// Section chrome
// ---------------------------------------------------------------------------------------------

const BACKGROUND_VARIANT: Record<Exclude<BlockBackground, "auto">, SectionVariant> = {
  bg: "bg",
  sf: "sf",
  dark: "dark",
  primaryDark: "primary-dark",
};

/**
 * Section background of the block at `index`: the editor's explicit choice, otherwise the
 * `bg` ↔ `sf` rhythm. The first block (usually the hero, always on `bg`) is even, so the next
 * section starts on `sf`.
 */
export function sectionVariant(
  background: BlockBackground | null | undefined,
  index: number
): SectionVariant {
  if (background && background !== "auto") return BACKGROUND_VARIANT[background];
  return index % 2 === 0 ? "bg" : "sf";
}

export const isDarkVariant = (variant: SectionVariant) =>
  variant === "dark" || variant === "primary-dark";

/** Section fields shared by all blocks except `hero` (`sectionFields()` of the schema). */
export interface SectionChrome {
  heading?: string | null;
  headingLevel?: "h2" | "h3" | null;
  sub?: string | null;
  anchorId?: string | null;
}

export interface BlockHeadProps {
  title: ReactNode;
  sub?: ReactNode;
  level?: "h2" | "h3" | null | undefined;
  id?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
}

/**
 * Block header with a configurable level (`SectionHead` of task 05 is always `<h2>`):
 * heading + optional sub and action, same layout and spacing.
 */
export function BlockHead({ title, sub, level, id, action, className }: BlockHeadProps) {
  const Heading = level === "h3" ? "h3" : "h2";
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-4 max-sm:mb-6",
        className
      )}
    >
      <Heading id={id} className={cn(Heading === "h3" ? "ig-h3" : "ig-h2", "max-w-[900px]")}>
        {title}
      </Heading>
      {sub ? (
        <p className="m-0 max-w-[620px] text-(length:--ig-lead-size) leading-normal text-pretty text-(color:--ig-section-sub)">
          {sub}
        </p>
      ) : null}
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

export interface BlockSectionProps {
  block: SectionChrome;
  section: BlockSectionInfo;
  ctx: PlaceholderContext;
  children: ReactNode;
  /** Overrides the computed background (e.g. a dark call-to-action). */
  variant?: SectionVariant | undefined;
  /** Right side of the header (e.g. «Все объекты →»). */
  action?: ReactNode;
  className?: string | undefined;
  containerClassName?: string | undefined;
}

/**
 * Standard block wrapper: full-width `Section` (rhythm 96 / 72 / 48 px, background from
 * `RenderBlocks`), anchor `id`, header from `heading` / `sub` with placeholders substituted.
 */
export function BlockSection({
  block,
  section,
  ctx,
  children,
  variant,
  action,
  className,
  containerClassName,
}: BlockSectionProps) {
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  const anchor = hasText(block.anchorId) ? block.anchorId : undefined;
  return (
    <Section
      variant={variant ?? section.variant}
      id={anchor}
      aria-labelledby={heading ? section.headingId : undefined}
      className={cn("scroll-mt-24", className)}
      containerClassName={containerClassName}
    >
      {heading ? (
        <BlockHead
          title={heading}
          sub={sub || undefined}
          level={block.headingLevel}
          id={section.headingId}
          action={action}
        />
      ) : null}
      {children}
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/** `linkField()` group of the schema (`link`, `footLink`, …). */
export type LinkValue = NonNullable<BlockOf<"cards">["items"]>[number]["link"];

export interface ResolvedLink {
  href: string;
  /** Explicit label or the target document's title. */
  label: string | null;
  newTab: boolean;
}

/** Title of a populated linked document (`title` / `name`, thickness → «10 мм»). */
function docTitle(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const doc = value as { title?: unknown; name?: unknown; n?: unknown };
  if (typeof doc.title === "string" && doc.title) return doc.title;
  if (typeof doc.name === "string" && doc.name) return doc.name;
  if (typeof doc.n === "number") return `${doc.n} мм`;
  return null;
}

/** Href of a `linkField()` value via `docUrl`; `null` when the target is empty or unpublished. */
export function resolveLink(link: LinkValue | null | undefined): ResolvedLink | null {
  if (!link) return null;
  const label = "label" in link && hasText(link.label) ? link.label : null;
  const newTab = Boolean(link.newTab);
  if (link.type === "custom") {
    return hasText(link.url) ? { href: link.url.trim(), label, newTab } : null;
  }
  const target = link.doc;
  if (!target) return null;
  const href = docUrl(target.relationTo, target.value);
  return href ? { href, label: label ?? docTitle(target.value), newTab } : null;
}

/** External (other origin) URL: gets `rel="noopener noreferrer"`. */
export const isExternalHref = (href: string) => /^(https?:)?\/\//i.test(href);

// ---------------------------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------------------------

/** A populated `media` document (uploads come back as ids when `depth` is too small). */
export function asMedia(value: unknown): Media | null {
  if (typeof value !== "object" || value === null) return null;
  const media = value as Media;
  return typeof media.url === "string" && media.url !== "" ? media : null;
}

/**
 * Site-relative URL of a media file (`images.localPatterns` allows `/api/media/file/**`):
 * Payload may return absolute URLs when `serverURL` is set.
 */
export function mediaSrc(media: Media, size?: "card" | "hero" | "thumbnail"): string | null {
  const url = (size ? media.sizes?.[size]?.url : null) ?? media.url;
  if (!url) return null;
  try {
    const parsed = new URL(url, "http://local");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export interface BlockImageProps {
  media: Media;
  /** `alt` override (gallery items carry their own); otherwise the media `alt`. */
  alt?: string | null | undefined;
  sizes: string;
  size?: "card" | "hero" | "thumbnail";
  className?: string | undefined;
  /** Aspect-ratio box classes of the wrapper. */
  frameClassName?: string | undefined;
}

/** `next/image` in a ratio box (`fill` + `sizes`); `alt` comes from the media document. */
export function BlockImage({
  media,
  alt,
  sizes,
  size,
  className,
  frameClassName,
}: BlockImageProps) {
  const src = mediaSrc(media, size);
  if (!src) return null;
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden", frameClassName)}>
      <Image
        src={src}
        alt={alt ?? media.alt ?? ""}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------------------------

/**
 * Lucide icons an editor may name in `icon` fields («Calculator», «file-text», …). A fixed map
 * (not `lucide-react`'s full `icons` object) keeps the server bundle small; unknown names
 * render no icon.
 */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  arrowright: ArrowRight,
  building2: Building2,
  building: Building2,
  calculator: Calculator,
  check: Check,
  clipboardlist: ClipboardList,
  clock: Clock,
  download: Download,
  filetext: FileText,
  info: Info,
  layers: Layers,
  mail: Mail,
  messagecircle: MessageCircle,
  phone: Phone,
  ruler: Ruler,
  scissors: Scissors,
  send: Send,
  shieldcheck: ShieldCheck,
  trianglealert: TriangleAlert,
  truck: Truck,
  upload: Upload,
  users: Users,
  wrench: Wrench,
};

/** Icon component by a Lucide name in any case / separator style, or `null`. */
export function iconByName(name: string | null | undefined): ComponentType<LucideProps> | null {
  if (!name) return null;
  return ICONS[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}

/**
 * Decorative icon element by name, or `null`. `createElement` with a component picked from the
 * static map above (no component is defined during render).
 */
export function renderIcon(name: string | null | undefined, props: LucideProps = {}): ReactNode {
  const icon = iconByName(name);
  return icon ? createElement(icon, { "aria-hidden": true, strokeWidth: 2, ...props }) : null;
}

/** Rendered icon (decorative) by name, or `fallback`. */
export function NamedIcon({
  name,
  fallback = null,
  className,
}: {
  name: string | null | undefined;
  fallback?: ReactNode;
  className?: string | undefined;
}) {
  return renderIcon(name, className ? { className } : {}) ?? fallback;
}

// ---------------------------------------------------------------------------------------------
// Card grids
// ---------------------------------------------------------------------------------------------

/** Card grid columns: 4 / 3 / 2 / 1 at ≥1366 / ≥1101 / ≥600 / <600 (`g4`), or 3 / 3 / 2 / 1. */
export const CARD_GRID = {
  4: "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-sm:gap-4",
  3: "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 max-sm:gap-4",
} as const;

/** `sizes` matching `CARD_GRID`. */
export const CARD_IMAGE_SIZES = {
  4: "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, (max-width: 1365px) 33vw, 25vw",
  3: "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 33vw",
} as const;

/** Card media: the image, or a soft icon tile when there is only an icon. */
export function CardMedia({
  image,
  icon,
  columns,
}: {
  image: unknown;
  icon?: string | null | undefined;
  columns: 3 | 4;
}) {
  const media = asMedia(image);
  if (media) {
    return <BlockImage media={media} size="card" sizes={CARD_IMAGE_SIZES[columns]} />;
  }
  const element = renderIcon(icon);
  if (!element) return null;
  return (
    <span
      aria-hidden="true"
      className="bg-primary-light text-primary-pressed mx-6 mt-6 grid size-12 place-items-center rounded-md max-sm:mx-4 max-sm:mt-4 [&_svg]:size-6"
    >
      {element}
    </span>
  );
}
