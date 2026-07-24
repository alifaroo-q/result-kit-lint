/**
 * A minimal host-agnostic harness: parse TypeScript to an ESTree AST and drive a
 * `rule-core` rule against the bare `RuleContext` contract — no ESLint, no
 * Oxlint. What passes here is exactly what both hosts guarantee, so a green
 * suite here is the proof the Oxlint re-export is safe (the ESLint host gets its
 * own RuleTester suite in the eslint-plugin package).
 */
import { parse } from "@typescript-eslint/parser";
import type { AstNode, ReportDescriptor, RuleModule } from "../src/types.js";

export function parseProgram(code: string): AstNode {
  return parse(code, { range: true, loc: true }) as unknown as AstNode;
}

function isNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as AstNode).type === "string";
}

function forEachChild(node: AstNode, visit: (child: AstNode) => void): void {
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) visit(item);
    } else if (isNode(value)) {
      visit(value);
    }
  }
}

export interface CapturedReport {
  messageId: string;
  data: Record<string, string> | undefined;
  /** The message with `{{placeholders}}` interpolated from `data`. */
  message: string;
  /** The text the rule's fix would insert before the node, if any. */
  fixText: string | null;
  /** `[start, end]` the fix inserts at, if any. */
  fixRange: [number, number] | null;
}

/** Run a rule over `code` and return every report, in visit order. */
export function runRule(
  rule: RuleModule,
  code: string,
  options: readonly unknown[] = [],
): CapturedReport[] {
  const ast = parseProgram(code);
  const reports: CapturedReport[] = [];

  const context = {
    id: "must-use-result",
    options,
    filename: "file.ts",
    sourceCode: {
      getText: (node?: AstNode): string =>
        node && node.range ? code.slice(node.range[0], node.range[1]) : code,
    },
    report: (descriptor: ReportDescriptor): void => {
      const template = rule.meta.messages[descriptor.messageId] ?? descriptor.messageId;
      const message = template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) =>
        descriptor.data && key in descriptor.data ? descriptor.data[key]! : `{{${key}}}`,
      );
      let fixText: string | null = null;
      let fixRange: [number, number] | null = null;
      if (descriptor.fix) {
        const fixer = {
          insertTextBefore(node: AstNode, text: string) {
            fixText = text;
            fixRange = node.range ? [node.range[0], node.range[0]] : null;
            return { text, range: fixRange };
          },
        };
        descriptor.fix(fixer);
      }
      reports.push({ messageId: descriptor.messageId, data: descriptor.data, message, fixText, fixRange });
    },
  };

  const listeners = rule.create(context);
  const visit = (node: AstNode): void => {
    const listener = listeners[node.type];
    if (listener) listener(node);
    forEachChild(node, visit);
  };
  visit(ast);
  return reports;
}
