import { DLYA_MEBELI } from "./dlya-mebeli";
import { MATOVOE } from "./matovoe";
import { MOLLIROVANNOE } from "./mollirovannoe";
import { OKRASHENNOE } from "./okrashennoe";
import { OSVETLENNOE } from "./osvetlennoe";
import { RIFLENOE } from "./riflenoe";
import { TONIROVANNOE } from "./tonirovannoe";
import { TRIPLEKS } from "./tripleks";
import type { GlassTypeContent, GlassTypeSlug } from "./types";

/**
 * Content of the eight `glass-types` documents (task 24; page design of the Paper mockups
 * `2560_glass_<slug>`), one file per type (`./<slug>.ts`). Pure data: the seed slice
 * (`src/seed/slices/glass-types.ts`) turns it into Payload data, the unit test
 * (`src/seed/slices/glass-types.test.ts`) checks it without booting Payload. How a document maps
 * to the sections of the page: `./README.md`.
 *
 * Sources: teksty (`res/inex-glass-handoff/teksty/08-vidy-stekla.md` §1–§5, `16-riflenoe.md`,
 * `12-p2-konstrukcii-steklo.md` §5–§6) copied verbatim (`copy.source: "teksty"`), or the approved
 * Paper mockups (`copy.source: "paper"`). H1 / title / description — `docs/inex/17-meta.md`;
 * hub card texts — teksty/02.
 */

export * from "./shared";
export type * from "./types";

export const GLASS_TYPE_SLUGS = [
  "matovoe",
  "tonirovannoe",
  "okrashennoe",
  "osvetlennoe",
  "dlya-mebeli",
  "riflenoe",
  "mollirovannoe",
  "tripleks",
] as const satisfies readonly GlassTypeSlug[];

/** The eight documents, in hub order of `order`. */
export const GLASS_TYPES_CONTENT: readonly GlassTypeContent[] = [
  OSVETLENNOE,
  MATOVOE,
  TONIROVANNOE,
  OKRASHENNOE,
  RIFLENOE,
  MOLLIROVANNOE,
  DLYA_MEBELI,
  TRIPLEKS,
];
