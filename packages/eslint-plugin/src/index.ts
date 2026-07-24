/**
 * `@zireal/eslint-plugin-result-kit` — the ESLint host, and the only
 * full-fidelity host (feasibility #70). All three rules are **type-aware** and
 * require typed linting — configure `parserOptions.project` / `projectService`,
 * exactly as `@typescript-eslint`'s own type-aware rules do.
 *
 * - `must-use-result` — a produced `Result` whose value is dropped is an error.
 * - `no-throw-in-result-fn` — a Result-returning function should not `throw`.
 */
import { mustUseResult } from "./must-use-result.js";
import { noThrowInResultFn } from "./no-throw-in-result-fn.js";

const plugin = {
  meta: {
    name: "@zireal/eslint-plugin-result-kit",
    version: "0.0.0",
  },
  rules: {
    "must-use-result": mustUseResult,
    "no-throw-in-result-fn": noThrowInResultFn,
  },
  configs: {} as Record<string, unknown>,
};

// `recommended` flat config, defined after `plugin` so it can reference it.
plugin.configs["recommended"] = {
  plugins: { "@zireal/result-kit": plugin },
  rules: {
    "@zireal/result-kit/must-use-result": "error",
    "@zireal/result-kit/no-throw-in-result-fn": "error",
  },
};

export default plugin;
export { mustUseResult, noThrowInResultFn };
