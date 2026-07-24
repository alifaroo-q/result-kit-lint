/**
 * `no-throw-in-result-fn` — a function declared to return a `Result` (or
 * `Promise<Result>`) should not `throw`. Throwing routes failure through the
 * exception channel the `Result` contract exists to replace: a caller who sees
 * `(): Result<T, E>` will branch on `ok`, never wrap the call in try/catch, so a
 * throw is an error the type system promised could not happen.
 *
 * Only throws that ESCAPE the function are flagged — a throw inside a
 * `try` whose `catch` handles it locally (the common `try { … } catch { return
 * err(…) }` shape) never breaks the external contract, so it is left alone.
 *
 * No autofix: converting `throw x` to `return err(x)` needs the function's `E`
 * shape and the project's `err` import, neither of which the rule can invent.
 */
import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { isResultReturnContract } from "./result-type.js";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

/** The nearest function a `throw` would propagate out of. */
function enclosingFunction(node: TSESTree.Node): FunctionNode | null {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (isFunctionNode(current)) return current;
    current = current.parent;
  }
  return null;
}

/**
 * Is the throw caught within the function before it could escape? True when the
 * path from the throw up to `fn` passes through the `block` of a `try` that has
 * a `catch` handler (a throw in the `catch`/`finally` itself is not caught here).
 */
function isCaughtBefore(node: TSESTree.Node, fn: FunctionNode): boolean {
  let child: TSESTree.Node = node;
  let current: TSESTree.Node | undefined = node.parent;
  while (current && current !== fn) {
    if (current.type === "TryStatement" && current.block === child && current.handler) {
      return true;
    }
    child = current;
    current = current.parent;
  }
  return false;
}

export const noThrowInResultFn = ESLintUtils.RuleCreator(
  (name) => `https://github.com/alifaroo-q/result-kit-lint/blob/main/docs/rules/${name}.md`,
)({
  name: "no-throw-in-result-fn",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `throw` inside a function declared to return a Result.",
    },
    messages: {
      noThrow:
        "Throwing inside a Result-returning function breaks the errors-as-values contract. " +
        "Return `err(...)` instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    return {
      ThrowStatement(node): void {
        const fn = enclosingFunction(node);
        if (!fn) return;
        if (isCaughtBefore(node, fn)) return;

        const fnTsNode = services.esTreeNodeToTSNodeMap.get(fn);
        const signature = checker.getTypeAtLocation(fnTsNode).getCallSignatures()[0];
        if (!signature) return;
        const returnType = signature.getReturnType();

        if (isResultReturnContract(returnType, checker, fnTsNode)) {
          context.report({ node, messageId: "noThrow" });
        }
      },
    };
  },
});
