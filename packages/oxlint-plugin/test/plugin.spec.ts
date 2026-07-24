import { describe, it, expect } from "vitest";
import { parse } from "@typescript-eslint/parser";
import plugin, { mustUseResult } from "../src/index.js";

/**
 * The Oxlint port is a *re-export* — so the contract to assert is twofold:
 * (1) the plugin exposes a valid Oxlint manifest, and (2) the rule it exposes is
 * the shared `rule-core` rule, unchanged, and still fires. Full behavioral depth
 * lives in rule-core's suite (same object); AST-shape parity with oxc's parser is
 * established in the parity spike.
 */

describe("plugin manifest", () => {
  it("declares the host-scoped plugin name", () => {
    expect(plugin.meta.name).toBe("@zireal/oxlint-plugin-result-kit");
  });

  it("registers must-use-result", () => {
    expect(plugin.rules["must-use-result"]).toBeDefined();
  });

  it("re-exports the shared rule-core rule unchanged (identity)", () => {
    expect(plugin.rules["must-use-result"]).toBe(mustUseResult);
  });

  it("carries the rule's meta and messages intact", () => {
    const rule = plugin.rules["must-use-result"];
    expect(rule.meta.type).toBe("problem");
    expect(rule.meta.fixable).toBe("code");
    expect(rule.meta.messages).toHaveProperty("mustUse");
  });
});

// Minimal driver over the ESLint-v9 contract — proves the re-exported rule fires.
function countReports(code: string): number {
  const ast = parse(code, { range: true }) as unknown as Record<string, unknown>;
  let count = 0;
  const context = {
    id: "must-use-result",
    options: [] as const,
    filename: "file.ts",
    sourceCode: { getText: () => code },
    report: () => {
      count += 1;
    },
  };
  const listeners = mustUseResult.create(context as never);
  const visit = (node: Record<string, unknown>): void => {
    const fn = listeners[node["type"] as string];
    if (fn) fn(node as never);
    for (const key of Object.keys(node)) {
      if (key === "parent") continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c === "object" && visit(c));
      else if (v && typeof v === "object" && "type" in v) visit(v as Record<string, unknown>);
    }
  };
  visit(ast);
  return count;
}

describe("re-exported rule behaves", () => {
  it("flags a dropped package Result call", () => {
    expect(countReports(`import { ok } from "@zireal/result-kit";\nok(1);`)).toBe(1);
  });

  it("does not flag a consumed Result", () => {
    expect(countReports(`import { ok } from "@zireal/result-kit";\nconst r = ok(1);`)).toBe(0);
  });
});
