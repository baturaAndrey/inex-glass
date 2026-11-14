import { getTeamMembers } from "@/lib/cms/team";
import { TeamPanel } from "./company-pieces";

/** URL of the team page. */
export const TEAM_PATH = "/o-kompanii/sotrudniki/";

/*
 * teksty/06 §1, «## Команда»: «[Сотрудники →] — конструкторы и менеджеры, которые ведут ваши
 * заказы.» The Paper mockup `2560_o-kompanii` (2026-11) splits it into the text and the button.
 */
const TEAM_TITLE = "Команда";
const TEAM_LINK_LABEL = "Сотрудники";
const TEAM_TEXT = "Конструкторы и менеджеры, которые ведут ваши заказы.";

export interface TeamTeaserProps {
  headingId?: string | undefined;
  className?: string | undefined;
}

/**
 * «Команда» panel of `/o-kompanii/`. Rendered only while the team has visible members: with an
 * empty team the site has no link to the (noindex) team page at all.
 */
export async function TeamTeaser({ headingId = "company-team-title", className }: TeamTeaserProps) {
  const members = await getTeamMembers();
  if (members.length === 0) return null;
  return (
    <TeamPanel
      title={TEAM_TITLE}
      text={TEAM_TEXT}
      linkLabel={TEAM_LINK_LABEL}
      href={TEAM_PATH}
      headingId={headingId}
      className={className}
    />
  );
}
