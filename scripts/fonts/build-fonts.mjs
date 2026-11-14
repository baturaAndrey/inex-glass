/**
 * Rubik TTF -> WOFF2 (subset latin + cyrillic) for `next/font/local`.
 *
 * The project intentionally has no font tooling in its dependencies, so `subset-font` is
 * installed into a throwaway folder OUTSIDE the repository and this script is run from there:
 *
 *   mkdir /tmp/ig-fonts && cd /tmp/ig-fonts
 *   npm init -y && npm i subset-font
 *   node <repo>/scripts/fonts/build-fonts.mjs
 *
 * `subset-font` is resolved relative to the current working directory (the throwaway folder),
 * sources are read from `res/inex-glass-handoff/fonts/` and results are written to
 * `src/app/fonts/` (both relative to the repository root, i.e. independent of the cwd).
 * The output is committed; re-run only when the source fonts or the glyph set change.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceDir = path.join(repoRoot, "res/inex-glass-handoff/fonts");
const outputDir = path.join(repoRoot, "src/app/fonts");

/**
 * Only the weights the design system uses (Light 300, Black/ExtraBold and italics are not used —
 * keep in sync with `src/app/(site)/fonts.ts`, which loads exactly these files).
 */
const WEIGHTS = ["Regular", "Medium", "SemiBold", "Bold"];

/** Inclusive code point ranges kept in the subset. */
const RANGES = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1 Supplement (nbsp, «», °, ×, ²…)
  [0x0400, 0x04ff], // Cyrillic
  [0x0500, 0x052f], // Cyrillic Supplement (just in case)
  [0x2010, 0x2027], // dashes, quotes, bullet, ellipsis
  [0x2030, 0x203a], // per mille, primes, single guillemets
  [0x20ac, 0x20ac], // €
  [0x20bd, 0x20bd], // ₽
  [0x2116, 0x2116], // №
  [0x2122, 0x2122], // ™
  [0x2190, 0x2193], // arrows
  [0x2212, 0x2212], // minus sign
];

function buildGlyphText() {
  let text = "";
  for (const [from, to] of RANGES) {
    for (let codePoint = from; codePoint <= to; codePoint += 1) {
      text += String.fromCodePoint(codePoint);
    }
  }
  return text;
}

async function loadSubsetFont() {
  const require = createRequire(path.join(process.cwd(), "noop.js"));
  try {
    const resolved = require.resolve("subset-font");
    const mod = await import(pathToFileURL(resolved).href);
    return mod.default ?? mod;
  } catch {
    throw new Error(
      "subset-font не найден в текущей папке. Установите его во временную папку вне репозитория " +
        "(npm i subset-font) и запустите скрипт оттуда."
    );
  }
}

async function main() {
  const subsetFont = await loadSubsetFont();
  const text = buildGlyphText();
  await mkdir(outputDir, { recursive: true });

  for (const weight of WEIGHTS) {
    const source = await readFile(path.join(sourceDir, `Rubik-${weight}.ttf`));
    const woff2 = await subsetFont(source, text, {
      targetFormat: "woff2",
      // Keep kerning and standard ligatures; everything else not needed by the UI is dropped.
      preserveFeatures: ["kern", "liga"],
    });
    const target = path.join(outputDir, `Rubik-${weight}.woff2`);
    await writeFile(target, woff2);
    console.log(`${path.relative(repoRoot, target)}: ${(woff2.length / 1024).toFixed(1)} KB`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
