import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { getTeamMembers } from "@/lib/cms/team";

/** URL of the team page. */
export const TEAM_PATH = "/o-kompanii/sotrudniki/";

/* teksty/06 §1, «## Команда»: «[Сотрудники →] — конструкторы и менеджеры, которые ведут ваши заказы.» */
const TEAM_TITLE = "Команда";
const TEAM_LINK_LABEL = "Сотрудники";
const TEAM_TEXT = "— конструкторы и менеджеры, которые ведут ваши заказы.";

export interface TeamTeaserProps {
  variant?: SectionVariant | undefined;
}

/**
 * «Команда» section of `/o-kompanii/`. Rendered only while the team has visible members: with
 * an empty team the site has no link to the (noindex) team page at all.
 */
export async function TeamTeaser({ variant = "bg" }: TeamTeaserProps) {
  const members = await getTeamMembers();
  if (members.length === 0) return null;
  const headingId = "company-team-title";
  return (
    <Section variant={variant} aria-labelledby={headingId} data-testid="team-teaser">
      <SectionHead title={TEAM_TITLE} headingId={headingId} className="mb-6" />
      <p className="ig-body m-0">
        <TextLink href={TEAM_PATH} variant="arrow">
          {TEAM_LINK_LABEL}
        </TextLink>{" "}
        {TEAM_TEXT}
      </p>
    </Section>
  );
}
