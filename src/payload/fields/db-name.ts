import type { DBIdentifierName } from "payload";

/**
 * Strips the version-table decorations from a parent table name: `_pages_v` → `pages`,
 * `_glass_types_v_version_tables` → `glass_types_tables`, `_pages_blk_hero_v` → `pages_blk_hero`.
 * Payload re-wraps custom names of version tables as `_<name>_v` on its own.
 */
function baseTableName(parent: string): string {
  if (!parent.startsWith("_")) return parent;
  return parent
    .slice(1)
    .replace(/_v_version(?=_|$)/, "")
    .replace(/_v(?=_|$)/, "");
}

/**
 * Short, collection-scoped Postgres table name for a block or nested array.
 *
 * A *string* `dbName` is used verbatim as the full table name, so a block shared by several
 * collections (`pages`, `glass-types`, …) would end up in one table with a foreign key to only
 * one of them. The function form receives the parent table name and keeps the tables separate:
 * `pages` → `pages_blk_hero`, its version table → `_pages_blk_hero_v` (instead of
 * `__pages_v_blk_hero_v`).
 */
export const scopedDbName =
  (suffix: string): DBIdentifierName =>
  ({ tableName }) =>
    `${baseTableName(tableName ?? "")}_${suffix}`;
