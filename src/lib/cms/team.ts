import { collectionTag } from "@/lib/cache-tags";
import type { Team } from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";

/**
 * Public team of «О компании» / «Команда» (task 29).
 *
 * The `team` collection is read AS AN ANONYMOUS VISITOR (`overrideAccess: false`): collection
 * access hides members marked «Скрыть на сайте», field access strips the internal e-mail and
 * phone. The loader also drops those fields itself, so a future access change cannot leak them
 * into the page payload.
 *
 * Cached under `collection:team` (+ `collection:media` for the photos); the collection hooks
 * invalidate it on every change, so the team section and the page's robots follow the CMS.
 */

/** Fields the site shows: photo, name, role, area of responsibility (+ sort key). */
export type TeamMember = Pick<Team, "id" | "name" | "role" | "area" | "photo" | "order">;

/** Upper bound of one query: the team is a few dozen people at most. */
const TEAM_LIMIT = 200;
/** Photos are populated (one level: `photo` → `media`). */
const TEAM_DEPTH = 1;

const byName = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

/**
 * Display order: `order` ascending (members without a number go last), then name. Pure, so the
 * order is the same whatever the database returns.
 */
export function sortTeamMembers<T extends Pick<Team, "name" | "order">>(
  members: readonly T[]
): T[] {
  const rank = (order: number | null | undefined) =>
    typeof order === "number" && Number.isFinite(order) ? order : Number.POSITIVE_INFINITY;
  return [...members].sort((a, b) => {
    const diff = rank(a.order) - rank(b.order);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return byName.compare(a.name, b.name);
  });
}

/** Public projection of a member (private contact fields never leave the loader). */
function toTeamMember(doc: Team): TeamMember {
  return {
    id: doc.id,
    name: doc.name,
    role: doc.role ?? null,
    area: doc.area ?? null,
    photo: doc.photo ?? null,
    order: doc.order ?? null,
  };
}

const loadTeamMembers = cached(
  async (): Promise<TeamMember[]> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "team",
      // Explicit as well as enforced by the collection access (see the file header).
      where: { hidden: { not_equals: true } },
      depth: TEAM_DEPTH,
      limit: TEAM_LIMIT,
      pagination: false,
      overrideAccess: false,
    });
    return sortTeamMembers(docs.filter((doc) => doc.name?.trim()).map(toTeamMember));
  },
  ["cms", "team", "members"],
  { tags: [collectionTag("team"), collectionTag("media")] }
);

/** Visible team members in display order; `[]` while the team is empty. */
export function getTeamMembers(): Promise<TeamMember[]> {
  return loadTeamMembers();
}

/**
 * `/o-kompanii/sotrudniki/` is indexable only with at least one visible member: an empty team
 * page answers 200 with `noindex, follow` and is left out of the sitemap (task 36).
 */
export async function isTeamIndexable(): Promise<boolean> {
  return (await getTeamMembers()).length > 0;
}
