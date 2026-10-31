import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest: two projects sharing the root config (`extends: true`).
 * - `unit` (node): pure domain logic, `src/**\/*.test.ts` (incl. `src/lib/domain/*.test.ts`).
 * - `dom` (jsdom): React components, `src/**\/*.test.tsx` and `src/**\/*.dom.test.ts`.
 *
 * Tests must not boot Payload (`getPayload`, the Local API, a database): domain functions are
 * pure. Importing schema modules (`src/payload/**` field/collection configs, their validators)
 * without running Payload is allowed. The `@payload-config` alias exists only for rare
 * integration cases.
 * `passWithNoTests` is intentionally off: `src/lib/sanity.test.ts` must always run.
 */
const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  "@payload-config": path.resolve(import.meta.dirname, "src/payload.config.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          // `*.dom.test.ts` also matches the glob above; it belongs to the jsdom project only.
          exclude: ["src/**/*.dom.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "src/**/*.dom.test.ts"],
          setupFiles: ["./vitest.setup.dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**"],
      exclude: ["**/*.test.*"],
    },
  },
});
