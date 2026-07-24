import { describe, it, expect } from "vitest";
import { parseSync } from "oxc-parser";
import { parse as parseTsEstree } from "@typescript-eslint/parser";
import { collectImportedNames, collectResultAnnotatedFns } from "../src/matchers.js";
import type { AstNode } from "../src/types.js";

/**
 * Parity regression guard. `rule-core` is shared verbatim between the ESLint host
 * (parses with `@typescript-eslint/parser`) and the Oxlint host (parses with
 * oxc's own parser). The syntax-tier probe measured these two ASTs identical for
 * matcher (b) — this bakes that measurement into the permanent suite so a future
 * oxc/tsestree divergence turns a test red instead of silently skewing recall.
 *
 * One real divergence is covered explicitly: a parenthesized return type
 * `(Result<…>)` is a `TSParenthesizedType` on oxc but stripped to `TSTypeReference`
 * on typescript-estree. `annotationMentionsResult` unwraps it, so both agree.
 */

const oxcProgram = (code: string): AstNode =>
  parseSync("case.ts", code, { lang: "ts" }).program as unknown as AstNode;
const tsProgram = (code: string): AstNode =>
  parseTsEstree(code, { range: true }) as unknown as AstNode;

const PKG = "@zireal/result-kit";

describe("collectImportedNames — identical on oxc and typescript-estree", () => {
  it.each([
    `import { ok, err } from "${PKG}";`,
    `import { ok as success } from "${PKG}";`,
    `import def from "${PKG}";`,
    `import { map } from "${PKG}/fluent";`,
    `import { ok } from "neverthrow";`,
  ])("agrees for: %s", (code) => {
    const oxc = [...collectImportedNames(oxcProgram(code), PKG)].sort();
    const tse = [...collectImportedNames(tsProgram(code), PKG)].sort();
    expect(oxc).toEqual(tse);
  });
});

describe("collectResultAnnotatedFns — identical on oxc and typescript-estree", () => {
  it.each([
    `function f(): Result<number, E> { return x; }`,
    `const g = (): Result<number, E> => x;`,
    `function u(): Result<number, E> | undefined { return x; }`,
    `function k(): MyResult<number, E> { return x; }`,
    `function m() { return x; }`,
    `function w(): Array<Result<number, E>> { return []; }`,
    `class C { q(): Result<number, E> { return x; } }`,
    // The known divergence — TSParenthesizedType (oxc) vs TSTypeReference (tsestree).
    `function p(): (Result<number, E>) { return x; }`,
    `function pu(): (Result<number, E> | undefined) { return x; }`,
  ])("agrees for: %s", (code) => {
    const oxc = [...collectResultAnnotatedFns(oxcProgram(code))].sort();
    const tse = [...collectResultAnnotatedFns(tsProgram(code))].sort();
    expect(oxc).toEqual(tse);
  });

  it("matches the parenthesized Result return on oxc's TSParenthesizedType shape", () => {
    // Directly asserts the oxc branch: this is a TSParenthesizedType on oxc.
    expect(collectResultAnnotatedFns(oxcProgram(`function p(): (Result<number, E>) { return x; }`)).has("p")).toBe(true);
  });
});
