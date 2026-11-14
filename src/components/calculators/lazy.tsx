"use client";

import dynamic from "next/dynamic";

/**
 * The calculators as `next/dynamic` chunks (task 39). Server-rendered as before (`ssr` stays on,
 * so the markup and the first numbers are in the HTML); the difference is in the JS: a block
 * registry route (the catch-all) statically references every block, and without the split the
 * calculators' code (domain tables, validation) shipped with every page of that route. Now it
 * loads only on pages that render a calculator.
 */
export const HolesCalculator = dynamic(() =>
  import("./holes-calculator").then((mod) => mod.HolesCalculator)
);

export const WeightCalculator = dynamic(() =>
  import("./weight-calculator").then((mod) => mod.WeightCalculator)
);
