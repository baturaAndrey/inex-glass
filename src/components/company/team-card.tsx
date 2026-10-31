import Image from "next/image";
import { asMedia, CARD_IMAGE_SIZES, mediaSrc } from "@/components/blocks/shared";
import type { TeamMember } from "@/lib/cms/team";

export interface TeamCardProps {
  member: TeamMember;
  /** `h2` on the team page (under the H1), `h3` under a block heading. */
  headingLevel?: "h2" | "h3" | undefined;
}

/**
 * Team member card: 4:5 photo (`alt` = name; without a photo — a neutral `.ig-ph` plate with no
 * caption), name, role and area of responsibility. Private contacts are never part of the data.
 */
export function TeamCard({ member, headingLevel = "h2" }: TeamCardProps) {
  const Heading = headingLevel;
  const photo = asMedia(member.photo);
  const src = photo ? mediaSrc(photo, "card") : null;
  const role = member.role?.trim();
  const area = member.area?.trim();

  return (
    <article className="bg-surface shadow-card flex h-full flex-col overflow-hidden rounded-lg">
      {src ? (
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image
            src={src}
            alt={member.name}
            fill
            sizes={CARD_IMAGE_SIZES[4]}
            className="object-cover"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="ig-ph aspect-[4/5]" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-6 max-sm:p-5">
        <Heading className="m-0 text-xl leading-snug font-semibold">{member.name}</Heading>
        {role ? <p className="ig-body m-0">{role}</p> : null}
        {area ? <p className="text-small text-text-2 m-0 whitespace-pre-line">{area}</p> : null}
      </div>
    </article>
  );
}
