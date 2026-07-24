/**
 * `@zireal/result-kit-rule-core` — private, unpublished, bundled into each host
 * plugin at build time (ADR 0014 §3). Zero dependencies, zero peers.
 */
export { mustUseResult, mustUseResultMeta } from "./must-use-result.js";
export { collectImportedNames, collectResultAnnotatedFns } from "./matchers.js";
export type {
  AstNode,
  RuleContext,
  RuleListener,
  RuleMeta,
  RuleModule,
  ReportDescriptor,
  RuleFixer,
  SourceCode,
} from "./types.js";
