/**
 * `@zireal/eslint-plugin-result-kit` — the ESLint host for the `must-use-result`
 * vocabulary.
 *
 * ESLint is the only full-fidelity host (feasibility #70): a `@typescript-eslint`
 * rule can ask the checker "does this call return a `Result`?" through wrappers,
 * aliases, and unions. Round-one status:
 *
 *   - `must-use-result` currently ships the **shared syntax-tier rule** from
 *     `rule-core` — a working baseline that catches dropped calls to package
 *     imports and to locally-annotated `Result`-returning functions.
 *   - TODO(#60): swap in a type-aware `create()` that resolves `Result`
 *     STRUCTURALLY per spec §2 (carve out `any` first; per-constituent + drop
 *     nullish; defer `Promise<Result>`/`ResultAsync` to `no-floating-promises`),
 *     reusing `mustUseResultMeta`. This lifts the two syntax-tier blind spots
 *     (inferred returns, aliased returns). See
 *     docs/research/must-use-result-linter-feasibility.md §1.
 */
import { mustUseResult } from "@zireal/result-kit-rule-core";

// The rule-core module targets the host-agnostic ESLint-v9 contract; ESLint's
// own rule types are structurally compatible. The cast is the seam between the
// minimal shared contract and this host's fuller types.
const rules = {
  "must-use-result": mustUseResult,
} as const;

const meta = {
  name: "@zireal/eslint-plugin-result-kit",
  version: "0.0.0",
} as const;

const plugin = {
  meta,
  rules,
  configs: {} as Record<string, unknown>,
};

// `recommended` flat config, defined after `plugin` so it can reference it.
plugin.configs["recommended"] = {
  plugins: { "@zireal/result-kit": plugin },
  rules: { "@zireal/result-kit/must-use-result": "error" },
};

export default plugin;
export { mustUseResult };
