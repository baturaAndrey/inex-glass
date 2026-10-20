/**
 * Seed CLI stub: `pnpm seed [--minimal | --full] [--only=<slice,...>]`.
 * Runs via `payload run`. Task 16 replaces this file with the real implementation.
 */

type SeedMode = "minimal" | "full";

type SeedArgs = {
  mode: SeedMode;
  only: string[];
};

function parseArgs(argv: readonly string[]): SeedArgs {
  let mode: SeedMode = "minimal";
  let only: string[] = [];

  for (const arg of argv) {
    if (arg === "--minimal") mode = "minimal";
    else if (arg === "--full") mode = "full";
    else if (arg.startsWith("--only=")) {
      only = arg
        .slice("--only=".length)
        .split(",")
        .map((slice) => slice.trim())
        .filter(Boolean);
    }
  }

  return { mode, only };
}

const args = parseArgs(process.argv.slice(2));
const scope = args.only.length > 0 ? ` (only: ${args.only.join(", ")})` : "";
console.warn(`seed not implemented yet: mode=${args.mode}${scope}`);
process.exit(0);
