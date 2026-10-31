import { describe, expect, it } from "vitest";
import { scopedDbName } from "./db-name";

const nameFor = (suffix: string, tableName: string) => {
  const dbName = scopedDbName(suffix);
  return typeof dbName === "function" ? dbName({ tableName }) : dbName;
};

describe("scopedDbName", () => {
  it("prefixes the parent table of a regular collection", () => {
    expect(nameFor("blk_hero", "pages")).toBe("pages_blk_hero");
    expect(nameFor("cells", "glass_types_tables_rows")).toBe("glass_types_tables_rows_cells");
  });

  it("strips version-table decorations (Payload re-wraps the result as _<name>_v)", () => {
    expect(nameFor("blk_hero", "_pages_v")).toBe("pages_blk_hero");
    expect(nameFor("rows", "_glass_types_v_version_tables")).toBe("glass_types_tables_rows");
    expect(nameFor("buttons", "_pages_blk_hero_v")).toBe("pages_blk_hero_buttons");
  });
});
