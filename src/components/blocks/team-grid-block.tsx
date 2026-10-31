import { TeamGrid } from "@/components/company/team-grid";
import { getTeamMembers } from "@/lib/cms/team";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/**
 * «Сотрудники» on any `pages` document: cards of the visible `team` members (`limit` first ones).
 * Empty team: `emptyBehavior: hide` (default) renders nothing; `message` keeps the section with
 * the editor's heading (and sub-heading) as the message — no copy is invented here.
 */
export async function TeamGridBlock({ block, ctx, section }: BlockProps<"teamGrid">) {
  const all = await getTeamMembers();
  const limit = typeof block.limit === "number" && block.limit > 0 ? block.limit : undefined;
  const members = limit ? all.slice(0, limit) : all;

  if (members.length === 0) {
    // The section header shows `sub` only under a heading, so the heading is what makes a message.
    const hasMessage = hasText(fill(block.heading, ctx));
    if (block.emptyBehavior !== "message" || !hasMessage) return null;
    return (
      <BlockSection block={block} section={section} ctx={ctx}>
        {null}
      </BlockSection>
    );
  }

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <TeamGrid members={members} headingLevel={hasText(block.heading) ? "h3" : "h2"} />
    </BlockSection>
  );
}
