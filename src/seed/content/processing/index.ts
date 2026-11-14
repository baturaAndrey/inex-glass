import { FACET } from "./facet";
import { KROMKA } from "./kromka";
import { MATIROVANIE } from "./matirovanie";
import { HOLES } from "./otverstiya-i-vyrezy";
import { PECHAT } from "./pechat";
import { PLENKI } from "./plenki";
import type { ServiceSeed } from "./types";

/**
 * Content of the «Обработка стекла» section: the hub `/obrabotka-stekla/` (a `pages` document,
 * `./hub.ts`) and six `processing-services`, one file per service (`./<slug>.ts`). Pure data (no
 * Payload): the seed slice converts the markdown strings to Lexical, the slice test checks them.
 * How a service entry maps to the sections of the service page: `./README.md`.
 *
 * Sources: teksty (`res/inex-glass-handoff/teksty/07-…`, `12-…` §7–8, `17-…` §1) copied verbatim
 * (`copy.source: "teksty"`), or the approved Paper mockups `2560_service_*` (`copy.source:
 * "paper"`). H1 / title / description — `docs/inex/17-meta.md`. Placeholders `{условия}` stay
 * in the data and are resolved at render time.
 */

export * from "./hub";
export * from "./shared";
export type * from "./types";

/** In hub order (`order` 1…6). */
export const SERVICES: readonly ServiceSeed[] = [KROMKA, HOLES, FACET, MATIROVANIE, PECHAT, PLENKI];
