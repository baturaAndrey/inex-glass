/**
 * Seed CLI stub: `pnpm seed [--minimal | --full] [--only=<slice,...>]`.
 * Runs via `payload run`. Task 16 replaces this file with the real implementation.
 *
 * Argument passing: `payload run` parses its argv with minimist and forwards only the
 * positional entries (`args._`) to the script; a bare `--full` would become `{ full: true }`
 * and be dropped. The package.json script is therefore `payload run src/seed/index.ts --`:
 * the trailing `--` makes minimist keep every following flag as a positional, so plain
 * `pnpm seed --full` works (`pnpm seed -- --full` and bare tokens like
 * `pnpm seed full only=a,b` are accepted as well).
 */

type SeedMode = "minimal" | "full";

type SeedArgs = {
  mode: SeedMode;
  only: string[];
  unknown: string[];
};

const ONLY_PREFIX = "only=";

/** Strips the leading dashes so `--full`, `-full` and `full` mean the same thing. */
function normalizeToken(arg: string): string {
  return arg.replace(/^-+/, "");
}

function parseSeedArgs(argv: readonly string[]): SeedArgs {
  let mode: SeedMode = "minimal";
  let only: string[] = [];
  const unknown: string[] = [];

  for (const arg of argv) {
    // `--` is the end-of-options marker that carries the flags through minimist.
    if (arg === "--") continue;

    const token = normalizeToken(arg);
    if (token === "minimal" || token === "full") {
      mode = token;
    } else if (token.startsWith(ONLY_PREFIX)) {
      only = token
        .slice(ONLY_PREFIX.length)
        .split(",")
        .map((slice) => slice.trim())
        .filter(Boolean);
    } else {
      unknown.push(arg);
    }
  }

  return { mode, only, unknown };
}

// `payload run` rewrites process.argv to [node, bin, ...positionals]; skip the first two.
const args = parseSeedArgs(process.argv.slice(2));
if (args.unknown.length > 0) {
  console.warn(`seed: ignoring unknown arguments: ${args.unknown.join(" ")}`);
}
const scope = args.only.length > 0 ? ` (only: ${args.only.join(", ")})` : "";
console.warn(`seed not implemented yet: mode=${args.mode}${scope}`);
process.exit(0);
