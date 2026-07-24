/**
 * `@zireal/eslint-plugin-result-kit` — the ESLint host for the `must-use-result`
 * vocabulary, and the only full-fidelity host (feasibility #70).
 *
 * `must-use-result` is **type-aware**: it resolves "does this expression's type
 * mean an unconsumed `Result`?" through wrappers, aliases, and unions, catching
 * the two shapes the syntax tier cannot (inferred and aliased returns). It
 * requires typed linting — configure `parserOptions.project` / `projectService`,
 * exactly as `@typescript-eslint`'s own type-aware rules do.
 */
import { mustUseResult } from "./must-use-result.js";

const plugin = {
  meta: {
    name: "@zireal/eslint-plugin-result-kit",
    version: "0.0.0",
  },
  rules: {
    "must-use-result": mustUseResult,
  },
  configs: {} as Record<string, unknown>,
};

// `recommended` flat config, defined after `plugin` so it can reference it.
plugin.configs["recommended"] = {
  plugins: { "@zireal/result-kit": plugin },
  rules: { "@zireal/result-kit/must-use-result": "error" },
};

export default plugin;
export { mustUseResult };
