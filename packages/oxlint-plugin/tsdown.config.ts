import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Inline the private rule-core so the published plugin is self-contained.
  noExternal: ["@zireal/result-kit-rule-core"],
});
