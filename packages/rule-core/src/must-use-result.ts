/**
 * `must-use-result` — syntax tier.
 *
 * The shared `{ meta, create }` module. Re-exported verbatim by the Oxlint
 * plugin, and shipped by the ESLint plugin until its full type-aware `create`
 * lands (which reuses this `meta`). Fires on a `Result`-returning call whose
 * value is dropped in statement position, where the callee is recognised by
 * matcher (a) import-provenance or matcher (b) return-type annotation.
 */
import type { AstNode, RuleContext, RuleListener, RuleMeta, RuleModule } from "./types.js";
import { collectImportedNames, collectResultAnnotatedFns } from "./matchers.js";

const DEFAULT_PACKAGE = "@zireal/result-kit";

interface Options {
  /** The package whose imports are treated as `Result`-returning. */
  packageName?: string;
}

/** Shared across the syntax rule and (later) the ESLint type-aware rule. */
export const mustUseResultMeta: RuleMeta = {
  type: "problem",
  docs: {
    description: "Require the value of a Result-returning call to be used.",
    recommended: true,
    url: "https://github.com/alifaroo-q/result-kit-lint/blob/main/docs/rules/must-use-result.md",
  },
  messages: {
    mustUse:
      "The Result from `{{callee}}` is dropped. Handle it (match / unwrapOr / isOk / return it) " +
      "or discard it explicitly with `void`.",
  },
  fixable: "code",
  schema: [
    {
      type: "object",
      properties: { packageName: { type: "string" } },
      additionalProperties: false,
    },
  ],
};

export const mustUseResult: RuleModule = {
  meta: mustUseResultMeta,
  create(context: RuleContext): RuleListener {
    const options = (context.options[0] ?? {}) as Options;
    const packageName = options.packageName ?? DEFAULT_PACKAGE;

    let importedNames = new Set<string>();
    let annotatedFns = new Set<string>();

    return {
      Program(node: AstNode): void {
        importedNames = collectImportedNames(node, packageName);
        annotatedFns = collectResultAnnotatedFns(node);
      },

      ExpressionStatement(node: AstNode): void {
        const expr = node.expression;
        if (typeof expr !== "object" || expr === null) return;
        const call = expr as AstNode;
        if (call.type !== "CallExpression") return;

        const callee = call.callee;
        if (typeof callee !== "object" || callee === null) return;
        const calleeNode = callee as AstNode;
        if (calleeNode.type !== "Identifier" || typeof calleeNode.name !== "string") return;

        const name = calleeNode.name;
        if (!importedNames.has(name) && !annotatedFns.has(name)) return;

        context.report({
          node: call,
          messageId: "mustUse",
          data: { callee: name },
          fix: (fixer) => fixer.insertTextBefore(call, "void "),
        });
      },
    };
  },
};
