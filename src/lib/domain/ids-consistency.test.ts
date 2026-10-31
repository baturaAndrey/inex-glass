import { describe, expect, it } from "vitest";
import {
  LEAD_FLAGS,
  LEAD_FORM_TYPES,
  LEAD_PRODUCT_TYPES,
  LEAD_ROLES,
} from "@/payload/collections/crm/constants";
import {
  QUIZ_KIND_OPTIONS,
  QUIZ_TYPE_OPTIONS,
  THICKNESS_VALUES,
} from "@/payload/fields/quiz-prefill";
import { TechParams } from "@/payload/globals/tech-params";
import { normalizePhone as payloadNormalizePhone } from "@/payload/utils/normalize";
import { normalizePhone } from "./contact-fields";
import { FORM_TYPES } from "./lead-schemas";
import { DEFAULT_TECH_LIMITS } from "./limits";
import { QUIZ_FLAGS } from "./quiz-flags";
import {
  DEFAULT_DELIVERY_CITIES,
  QUIZ_DECOR_IDS,
  QUIZ_EDGE_IDS,
  QUIZ_KIND_IDS,
  QUIZ_PACKING_IDS,
  QUIZ_ROLE_IDS,
  QUIZ_STAMP_IDS,
  QUIZ_TYPE_IDS,
  TINT_COLOR_IDS,
} from "./quiz-schema";
import { THICKNESSES } from "./types";
import { FILM_THICKNESSES } from "./weight";
import type { Field } from "payload";

/**
 * Quiz/CRM option ids have no mapping layer: the domain dictionaries (task 11), the Payload
 * select options and defaults (tasks 06–08, 10) and the quiz URLs must use the same strings.
 * This test reads the schema modules directly (no Payload boot) and fails on any drift.
 */

type Row = Record<string, unknown>;

/** Depth-first search of a named field through tabs, rows, collapsibles and groups. */
function findField(fields: readonly Field[], path: readonly string[]): Field | undefined {
  const [head, ...rest] = path;
  for (const field of fields) {
    const named = "name" in field ? field.name : undefined;
    if (named === head) {
      if (rest.length === 0) return field;
      if ("fields" in field) return findField(field.fields, rest);
      return undefined;
    }
    if (!named) {
      const children: Field[] =
        "tabs" in field
          ? field.tabs.flatMap((tab) => tab.fields)
          : "fields" in field
            ? field.fields
            : [];
      const found = findField(children, path);
      if (found) return found;
    }
  }
  return undefined;
}

function defaultRows(path: readonly string[]): Row[] {
  const field = findField(TechParams.fields, path);
  expect(field, `tech-params.${path.join(".")}`).toBeDefined();
  const value = field && "defaultValue" in field ? field.defaultValue : undefined;
  expect(Array.isArray(value), `tech-params.${path.join(".")} default`).toBe(true);
  return value as Row[];
}

const values = (options: readonly { value: string }[]) => options.map((o) => o.value);
const keys = (rows: Row[], key = "key") => rows.map((row) => row[key]);

describe("domain ids = CRM select options", () => {
  it("form types", () => expect(values(LEAD_FORM_TYPES)).toEqual([...FORM_TYPES]));
  it("roles", () => expect(values(LEAD_ROLES)).toEqual([...QUIZ_ROLE_IDS]));
  it("product types", () => expect(values(LEAD_PRODUCT_TYPES)).toEqual([...QUIZ_TYPE_IDS]));
  it("flags", () => expect(values(LEAD_FLAGS)).toEqual([...QUIZ_FLAGS]));
});

describe("domain ids = quiz prefill options", () => {
  it("types", () => expect(values(QUIZ_TYPE_OPTIONS)).toEqual([...QUIZ_TYPE_IDS]));
  it("kinds", () => expect(values(QUIZ_KIND_OPTIONS)).toEqual([...QUIZ_KIND_IDS]));
  it("thicknesses", () => expect([...THICKNESS_VALUES]).toEqual([...THICKNESSES]));
});

describe("domain ids = tech-params quizOptions defaults", () => {
  it.each([
    ["productTypes", QUIZ_TYPE_IDS],
    ["kinds", QUIZ_KIND_IDS],
    ["edges", QUIZ_EDGE_IDS],
    ["decor", QUIZ_DECOR_IDS],
    ["stamp", QUIZ_STAMP_IDS],
    ["packaging", QUIZ_PACKING_IDS],
    ["roles", QUIZ_ROLE_IDS],
  ] as const)("quizOptions.%s", (name, ids) => {
    expect(keys(defaultRows(["quizOptions", name]))).toEqual([...ids]);
  });

  it("facet edges are limited to mirrors", () => {
    const facets = defaultRows(["quizOptions", "edges"]).filter((row) =>
      String(row.key).startsWith("facet")
    );
    expect(facets.map((row) => row.onlyForTypes)).toEqual([["mirrors"], ["mirrors"]]);
  });

  it("tint colours", () => {
    expect(keys(defaultRows(["tintColors"]))).toEqual([...TINT_COLOR_IDS]);
  });

  it("thicknesses, film layers and delivery cities", () => {
    const thicknesses = findField(TechParams.fields, ["thicknesses"]);
    expect(thicknesses && "defaultValue" in thicknesses ? thicknesses.defaultValue : null).toEqual([
      ...THICKNESSES,
    ]);
    const film = findField(TechParams.fields, ["weight", "filmLayers"]);
    expect(film && "defaultValue" in film ? film.defaultValue : null).toEqual([
      ...FILM_THICKNESSES,
    ]);
    expect(keys(defaultRows(["deliveryCities"]), "name")).toEqual([...DEFAULT_DELIVERY_CITIES]);
  });

  it("bend radius ranges", () => {
    expect(defaultRows(["bent", "radius"])).toEqual(
      DEFAULT_TECH_LIMITS.bent.radiusMin.map((r) => ({
        thicknessFrom: r.thickFrom,
        thicknessTo: r.thickTo,
        minRadius: r.mm,
      }))
    );
  });
});

describe("phone normalization = src/payload/utils/normalize.ts", () => {
  it.each([
    "8 (900) 123-45-67",
    "+7 900 123 45 67",
    "9001234567",
    "79001234567",
    "+7 (351) 247-05-57",
    "3512470557",
    "900123456",
    "+1 900 123 45 67",
    "8 900 123 45 67 89",
    "",
    "abc",
  ])("%s", (input) => {
    expect(normalizePhone(input)).toBe(payloadNormalizePhone(input));
  });
});
