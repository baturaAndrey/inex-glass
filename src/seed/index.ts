/**
 * Seed CLI: `pnpm seed [--minimal | --full] [--only=<name,...>] [--force] [--reset-slices]`.
 *
 * - `--minimal` (default): globals + reference data + one record per template (`minimal.ts`).
 * - `--full`: globals + reference data + every slice in `SLICES` order, then the template
 *   records as a fallback for templates no slice has filled yet (existing paths/slugs are
 *   skipped, the draft object is not created).
 * - `--only=a,b`: just the named parts, in canonical order: `globals` (9 globals),
 *   `reference` (lead statuses, thicknesses, object taxonomies) and slice names. For the first
 *   fill of staging/prod: `--only=globals,reference`.
 * - `--force`: overwrite existing documents and globals (by default they are skipped, so editor
 *   changes survive a re-run).
 * - `--reset-slices`: accepted for CLI compatibility; currently a no-op (logged).
 *
 * Runs via `payload run` (env and config are loaded by Payload). `payload run` forwards only
 * minimist positionals, hence the package.json script ends with `--`: plain `pnpm seed --full`
 * works, as do `pnpm seed -- --full` and bare tokens (`pnpm seed full only=globals`).
 * The script must use top-level `await` and end the process itself.
 *
 * At the end the seed expires the cache of the running site (`SITE_URL`) through the signed
 * `POST /api/revalidate/` (`revalidateSite` in `./context.ts`); if the site is unreachable it
 * prints how to purge the cache instead (docs/deploy.md, «Кэш Next»).
 */
import { getSeedContext, revalidateSite } from "./context";
import { seedGlobals } from "./globals";
import { seedReferenceData, seedTemplateRecords } from "./minimal";
import { seed as seedBlog } from "./slices/blog";
import { seed as seedConstructions } from "./slices/constructions";
import { seed as seedGlassTypes } from "./slices/glass-types";
import { seed as seedGlazingMirrors } from "./slices/glazing-mirrors";
import { seed as seedHome } from "./slices/home";
import { seed as seedHowToOrder } from "./slices/how-to-order";
import { seed as seedKlientamCompany } from "./slices/klientam-company";
import { seed as seedLegal } from "./slices/legal";
import { seed as seedObjects } from "./slices/objects";
import { seed as seedProcessing } from "./slices/processing";
import { seed as seedThicknesses } from "./slices/thicknesses";
import { seed as seedZakHub } from "./slices/zak-hub";
import type { SeedContext } from "./context";

type SeedStep = (ctx: SeedContext) => Promise<void>;

/** Wave-5 slices in execution order. */
const SLICES: ReadonlyArray<readonly [string, SeedStep]> = [
  ["home", seedHome],
  ["zak-hub", seedZakHub],
  ["thicknesses", seedThicknesses],
  ["glass-types", seedGlassTypes],
  ["processing", seedProcessing],
  ["constructions", seedConstructions],
  ["glazing-mirrors", seedGlazingMirrors],
  ["how-to-order", seedHowToOrder],
  ["klientam-company", seedKlientamCompany],
  ["objects", seedObjects],
  ["blog", seedBlog],
  ["legal", seedLegal],
];

/** Every name accepted by `--only`, in canonical execution order. */
const PARTS: ReadonlyArray<readonly [string, SeedStep]> = [
  ["globals", seedGlobals],
  ["reference", seedReferenceData],
  ...SLICES,
];

type SeedMode = "minimal" | "full";

type SeedArgs = {
  mode: SeedMode;
  only: string[];
  force: boolean;
  resetSlices: boolean;
  unknown: string[];
};

const ONLY_PREFIX = "only=";

/** Strips the leading dashes so `--full`, `-full` and `full` mean the same thing. */
function normalizeToken(arg: string): string {
  return arg.replace(/^-+/, "");
}

function parseSeedArgs(argv: readonly string[]): SeedArgs {
  const args: SeedArgs = {
    mode: "minimal",
    only: [],
    force: false,
    resetSlices: false,
    unknown: [],
  };

  for (const arg of argv) {
    // `--` is the end-of-options marker that carries the flags through minimist.
    if (arg === "--") continue;

    const token = normalizeToken(arg);
    if (token === "minimal" || token === "full") {
      args.mode = token;
    } else if (token === "force") {
      args.force = true;
    } else if (token === "reset-slices") {
      args.resetSlices = true;
    } else if (token.startsWith(ONLY_PREFIX)) {
      args.only = token
        .slice(ONLY_PREFIX.length)
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    } else {
      args.unknown.push(arg);
    }
  }

  return args;
}

async function runSteps(ctx: SeedContext, steps: ReadonlyArray<readonly [string, SeedStep]>) {
  for (const [name, step] of steps) {
    ctx.log(`── ${name}`);
    await step(ctx);
  }
}

async function main(args: SeedArgs): Promise<void> {
  const knownParts = new Set(PARTS.map(([name]) => name));
  const unknownParts = args.only.filter((name) => !knownParts.has(name));
  if (unknownParts.length > 0) {
    throw new Error(
      `неизвестные части в --only: ${unknownParts.join(", ")}. Допустимо: ${[...knownParts].join(", ")}`
    );
  }

  const ctx = await getSeedContext({ force: args.force, minimal: args.mode === "minimal" });
  const scope = args.only.length > 0 ? `only=${args.only.join(",")}` : `mode=${args.mode}`;
  ctx.log(`старт: ${scope}${args.force ? ", force" : ""}`);
  if (args.resetSlices) ctx.log("--reset-slices: пока не поддерживается, флаг пропущен");

  if (args.only.length > 0) {
    const selected = new Set(args.only);
    await runSteps(
      ctx,
      PARTS.filter(([name]) => selected.has(name))
    );
  } else {
    await runSteps(ctx, [
      ["globals", seedGlobals],
      ["reference", seedReferenceData],
    ]);
    if (args.mode === "full") {
      await runSteps(ctx, SLICES);
      await runSteps(ctx, [
        ["templates", (c) => seedTemplateRecords(c, { includeObjectDraft: false })],
      ]);
    } else {
      await runSteps(ctx, [
        ["templates", (c) => seedTemplateRecords(c, { includeObjectDraft: true })],
      ]);
    }
  }

  await revalidateSite(ctx);
  ctx.log("готово");
}

// `payload run` rewrites process.argv to [node, bin, ...positionals]; skip the first two.
const args = parseSeedArgs(process.argv.slice(2));
if (args.unknown.length > 0) {
  console.warn(`seed: неизвестные аргументы пропущены: ${args.unknown.join(" ")}`);
}

try {
  await main(args);
  process.exit(0);
} catch (error) {
  console.error("seed: ошибка —", error instanceof Error ? error.message : error);
  // Payload ValidationError carries the per-field details.
  const data = (error as { data?: unknown } | null)?.data;
  if (data) console.error(JSON.stringify(data, null, 2));
  if (error instanceof Error && error.stack) console.error(error.stack);
  process.exit(1);
}
