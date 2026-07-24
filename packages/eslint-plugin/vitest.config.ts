import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve the private rule-core from source in dev/test; the production
      // build inlines it from dist via tsdown's `noExternal`.
      "@zireal/result-kit-rule-core": fileURLToPath(
        new URL("../rule-core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts"],
  },
});
