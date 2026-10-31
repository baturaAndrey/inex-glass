import { NavHamburger, NavWrapper } from "@payloadcms/next/client";
import { getTranslation } from "@payloadcms/translations";
import { getRole } from "@/payload/access";
import type { Role } from "@/payload/access";
import { DocTabsCurrent } from "../doc-tabs-current";
import { buildNav } from "./build-nav";
import { NavClient } from "./nav-client";
import { NAV_GROUPS } from "./nav-config";
import { getNavCounters } from "./nav-counters";
import type { NavGroup, NavInput } from "./build-nav";
import type { NavUser } from "./nav-client";
import type { NavEntityRef } from "./nav-config";
import type { NavCounters } from "./nav-counters";
import type { I18nClient } from "@payloadcms/translations";
import type { SanitizedPermissions, ServerProps, VisibleEntities } from "payload";

/**
 * Admin sidebar (`admin.components.Nav`; the export name and path are a contract with
 * `payload.config.ts`). Mockup: `res/admin-mockup/Main.dc.html`, `<aside class="sb">`.
 *
 * Keeps Payload's shell (`NavWrapper` → `nav__wrap` → `nav__header` with `NavHamburger`), so the
 * open/close state, animation and the mobile overlay keep working; the content is ours:
 * groups and items from `nav-config.ts`, filtered per user by `buildNav` with the same rule as
 * Payload's default nav (`visibleEntities` + `permissions.*.read`), plus the counters.
 *
 * `DefaultTemplate` passes the server props and the client props (`visibleEntities`) in one
 * object.
 */

type InexNavProps = ServerProps & { visibleEntities?: VisibleEntities };

const ROLE_LABELS: Record<Role, string> = { admin: "Администратор", manager: "Менеджер" };
const NO_COUNTERS: NavCounters = { newLeads: null, activeOrders: null };

/** `canRead` of `buildNav`: the sanitized read flags of the current user. */
function readChecker(permissions: SanitizedPermissions | undefined): NavInput["canRead"] {
  return (ref: NavEntityRef) =>
    ref.kind === "collection"
      ? permissions?.collections?.[ref.slug]?.read === true
      : permissions?.globals?.[ref.slug]?.read === true;
}

/** slug → label of every collection (plural) and global, translated like Payload's nav. */
function configLabels(payload: ServerProps["payload"], i18n: I18nClient): NavInput["labels"] {
  const text = (label: unknown, slug: string): string => {
    if (!label) return slug;
    const translated = getTranslation(label as Parameters<typeof getTranslation>[0], i18n);
    return typeof translated === "string" && translated.trim() ? translated : slug;
  };
  return {
    collections: Object.fromEntries(
      payload.config.collections.map((c) => [c.slug, text(c.labels?.plural, c.slug)])
    ),
    globals: Object.fromEntries(payload.config.globals.map((g) => [g.slug, text(g.label, g.slug)])),
  };
}

/** «СМ» from «Сергей Морозов»; without a name the first letter of the e-mail. */
export function userInitials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");
  return (letters || email.trim().charAt(0) || "?").toUpperCase();
}

function navUser(user: ServerProps["user"], role: Role | null): NavUser | null {
  if (!user) return null;
  const record = user as unknown as { name?: unknown; email?: unknown };
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email : "";
  return {
    name: name || email,
    initials: userInitials(name, email),
    roleLabel: role ? ROLE_LABELS[role] : "",
  };
}

const hasItem = (groups: NavGroup[], id: string) =>
  groups.some((group) => group.items.some((item) => item.id === id));

export async function InexNav(props: InexNavProps) {
  const { i18n, payload, permissions, user, visibleEntities } = props;
  if (!payload?.config) return null;

  const role = getRole(user);
  const groups = buildNav({
    groups: NAV_GROUPS,
    visibleEntities: visibleEntities ?? { collections: [], globals: [] },
    canRead: readChecker(permissions),
    labels: configLabels(payload, i18n),
    isStaff: role !== null,
  });

  // Counters only for visible items: no query for what the user cannot open.
  const needNewLeads = hasItem(groups, "leads");
  const needActiveOrders = hasItem(groups, "orders");
  const counters =
    user && role && (needNewLeads || needActiveOrders)
      ? await getNavCounters(String(user.id), role, needNewLeads, needActiveOrders).catch(
          (error: unknown) => {
            // Per-counter failures are handled inside; this is the cache / Payload init itself.
            const reason = error instanceof Error ? error.name : "unknown error";
            console.error(`admin-nav: counters unavailable (${reason})`);
            return NO_COUNTERS;
          }
        )
      : NO_COUNTERS;

  return (
    <NavWrapper baseClass="nav">
      <NavClient groups={groups} counters={counters} user={navUser(user, role)} />
      {/* Current document tab: Payload marks none with `trailingSlash: true`. */}
      <DocTabsCurrent />
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  );
}

export default InexNav;
