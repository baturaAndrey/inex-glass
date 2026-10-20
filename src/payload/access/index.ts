import type { Access, FieldAccess, Where } from "payload";

export type Role = "admin" | "manager";

const ROLES: readonly Role[] = ["admin", "manager"];

/**
 * Reads the role from `req.user` without relying on generated types, so the helpers keep
 * type-checking while collections are added in parallel before `payload-types.ts` is regenerated.
 */
export function getRole(user: unknown): Role | null {
  if (typeof user !== "object" || user === null) return null;
  const role = (user as { role?: unknown }).role;
  return ROLES.includes(role as Role) ? (role as Role) : null;
}

export const isAdmin: Access = ({ req: { user } }) => getRole(user) === "admin";

export const isAdminOrManager: Access = ({ req: { user } }) => getRole(user) !== null;

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user);

export const isAnyone: Access = () => true;

/** Admin sees everything; a manager only their own document. */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  const role = getRole(user);
  if (role === "admin") return true;
  if (role === "manager" && user) return { id: { equals: user.id } } satisfies Where;
  return false;
};

/** Logged-in users see drafts; anonymous visitors only published documents. */
export const publishedOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true;
  return { _status: { equals: "published" } } satisfies Where;
};

export const adminFieldAccess: FieldAccess = ({ req: { user } }) => getRole(user) === "admin";

export const adminOrManagerFieldAccess: FieldAccess = ({ req: { user } }) => getRole(user) !== null;
