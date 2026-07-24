/**
 * `must-use-result` — ESLint, full type-aware tier.
 *
 * Fires on a `Result`-typed expression whose value is discarded in statement
 * position. Consumption is *emergent from the types*, not a hardcoded list: a
 * terminal like `unwrapOr` / `match` returns a non-`Result`, so a dropped call to
 * it is simply not `Result`-typed and never flagged; a transform like `map` /
 * `andThen` returns another `Result`, so a dropped call to it is. This sidesteps
 * the ancestor-walking flow analysis the prior art gets wrong (feasibility §1.4)
 * — the only positions checked are the ones where a value is provably dropped.
 *
 * `Result` is identified STRUCTURALLY (spec §2) via {@link isResultType}, so a
 * consumer's local alias and hand-rolled `{ ok, value }` are caught too.
 */
import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { mustUseResultMeta } from "@zireal/result-kit-rule-core";
import { isResultType } from "./result-type.js";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/alifaroo-q/result-kit-lint/blob/main/docs/rules/${name}.md`,
);

export const mustUseResult = createRule({
  name: "must-use-result",
  meta: {
    type: "problem",
    docs: {
      description: mustUseResultMeta.docs.description,
    },
    messages: mustUseResultMeta.messages,
    fixable: "code",
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function checkDiscarded(expr: TSESTree.Expression): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(expr);
      const type = checker.getTypeAtLocation(tsNode);
      if (!isResultType(type, checker, tsNode)) return;
      context.report({
        node: expr,
        messageId: "mustUse",
        fix: (fixer) => fixer.insertTextBefore(expr, "void "),
      });
    }

    return {
      ExpressionStatement(node): void {
        const expr = node.expression;
        // A top-level sequence discards every one of its expressions.
        if (expr.type === "SequenceExpression") {
          for (const element of expr.expressions) checkDiscarded(element);
        } else {
          checkDiscarded(expr);
        }
      },
    };
  },
});
