import type { FieldAccess } from "payload";

const deny: FieldAccess = () => false;

/**
 * Field access of computed/system fields: nobody sets them through REST, GraphQL or the admin.
 *
 * Payload applies field access in the field-level `beforeValidate` pass, which strips the
 * incoming value (update keeps the stored one, create falls back to `defaultValue`). Collection
 * `beforeValidate`/`beforeChange` hooks run *after* that pass, so the hooks that compute these
 * fields still set them; internal writers (tasks 17/18/33) use the Local API, whose
 * `overrideAccess: true` default skips field access entirely.
 */
export const systemOnly = { create: deny, update: deny } as const;

/** Secrets: never readable through any API, not even by admins (Local API reads still work). */
export const neverReadable = { read: deny, ...systemOnly } as const;
