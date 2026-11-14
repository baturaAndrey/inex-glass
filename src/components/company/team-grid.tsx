import { CARD_GRID } from "@/components/blocks/shared";
import type { TeamMember } from "@/lib/cms/team";
import { cn } from "@/lib/utils";
import { TeamCard } from "./team-card";

export interface TeamGridProps {
  members: TeamMember[];
  headingLevel?: "h2" | "h3" | undefined;
  className?: string | undefined;
}

/**
 * Team cards: 4 / 3 / 2 / 1 columns at ≥1366 / 1101–1365 / 600–1100 / ≤599 (`CARD_GRID[4]`).
 * Members come pre-sorted (`order`, then name) from `getTeamMembers`.
 */
export function TeamGrid({ members, headingLevel = "h2", className }: TeamGridProps) {
  if (members.length === 0) return null;
  return (
    <ul className={cn(CARD_GRID[4], "m-0 list-none p-0", className)} data-testid="team-grid">
      {members.map((member) => (
        <li key={member.id}>
          <TeamCard member={member} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
