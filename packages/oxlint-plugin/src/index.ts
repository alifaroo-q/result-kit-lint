/**
 * `@zireal/oxlint-plugin-result-kit` — the Oxlint host for `must-use-result`,
 * **syntax tier**.
 *
 * Oxlint cannot give a custom rule type information (feasibility #70), so this is
 * the syntax-tier rule: it catches dropped calls to package imports (matcher a)
 * and to locally-annotated `Result`-returning functions (matcher b), and cannot
 * see a call whose `Result` return is *inferred* or *aliased*. Measured recall
 * ~82% of dropped `Result`s on a representative corpus
 * (docs/research/must-use-result-syntax-tier-probes.md).
 *
 * Because Oxlint's alpha JS-plugin API is a deliberate ESLint-v9 clone and the
 * annotation-AST shape is identical across parsers (the parity spike), the rule
 * is **re-exported verbatim** from `rule-core` — no per-host `create()`, no AST
 * shim. Only this manifest is unique to the host.
 */
import { mustUseResult } from "@zireal/result-kit-rule-core";

const plugin = {
  meta: {
    name: "@zireal/oxlint-plugin-result-kit",
  },
  rules: {
    "must-use-result": mustUseResult,
  },
};

export default plugin;
export { mustUseResult };
