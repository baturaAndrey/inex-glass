import Link from "next/link";
import { fill, hasText, isExternalHref } from "@/components/blocks/shared";
import { safeExternalHref } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Construction } from "@/payload-types";

export type ProfileSystem = NonNullable<Construction["profileSystems"]>[number];

/** `.p5-brand`: 48 px plate, white with a hairline border, 16/600 text. */
const PLATE_CLASS =
  "border-line bg-surface text-text inline-flex h-12 items-center gap-2 rounded-[12px] border px-[22px] text-[16px] leading-none font-semibold";

const LINK_CLASS =
  "transition-colors duration-(--ig-dur-base) hover:border-brand hover:text-primary-pressed";

function Plate({ system, ctx }: { system: ProfileSystem; ctx: PlaceholderContext }) {
  const name = fill(system.name, ctx);
  const note = fill(system.note, ctx);
  const content = (
    <>
      {name}
      {note ? <span className="text-text-2 text-[14px] font-normal">{note}</span> : null}
    </>
  );
  const href = hasText(system.url) ? safeExternalHref(system.url) : null;
  if (!href) return <span className={PLATE_CLASS}>{content}</span>;
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(PLATE_CLASS, LINK_CLASS)}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(PLATE_CLASS, LINK_CLASS)}>
      {content}
    </Link>
  );
}

/** Profile system brands (Алютех, СИАЛ…): plates, a plate with `url` becomes a link. */
export function ProfilePlates({
  systems,
  ctx,
  className,
}: {
  systems: ProfileSystem[];
  ctx: PlaceholderContext;
  className?: string | undefined;
}) {
  const visible = systems.filter((system) => hasText(system.name));
  if (visible.length === 0) return null;
  return (
    <ul
      className={cn("m-0 flex list-none flex-wrap gap-2.5 p-0", className)}
      data-profile-plates=""
    >
      {visible.map((system, index) => (
        <li key={system.id ?? index}>
          <Plate system={system} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}
