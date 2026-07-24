/**
 * Minimal, host-agnostic slice of the ESLint v9 rule contract.
 *
 * `rule-core` carries **zero** dependencies and **zero** peers (ADR 0014 §3),
 * so it must not import `@typescript-eslint/utils` or `eslint` for their types.
 * Oxlint's JS-plugin API is a deliberate ESLint-v9 clone, so the same module
 * runs on both hosts against exactly this contract — the parts each host
 * guarantees behave identically ("differences are bugs").
 */

export type Range = [number, number];

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

/** An ESTree-compatible node. Deliberately open — matchers reach into TS nodes. */
export interface AstNode {
  type: string;
  range?: Range;
  loc?: SourceLocation | null;
  parent?: AstNode;
  [key: string]: unknown;
}

export interface RuleFixer {
  insertTextBefore(node: AstNode, text: string): unknown;
}

export interface ReportDescriptor {
  node: AstNode;
  messageId: string;
  data?: Record<string, string>;
  fix?: (fixer: RuleFixer) => unknown;
}

export interface SourceCode {
  getText(node?: AstNode): string;
}

export interface RuleContext {
  id: string;
  options: readonly unknown[];
  sourceCode: SourceCode;
  filename: string;
  report(descriptor: ReportDescriptor): void;
}

export interface RuleMeta {
  type: "problem" | "suggestion" | "layout";
  docs: {
    description: string;
    recommended?: boolean;
    url?: string;
  };
  messages: Record<string, string>;
  fixable?: "code" | "whitespace";
  schema: readonly unknown[];
}

export type RuleListener = Record<string, (node: AstNode) => void>;

export interface RuleModule {
  meta: RuleMeta;
  create(context: RuleContext): RuleListener;
}
