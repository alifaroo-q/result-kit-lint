import { describe, it, expect } from "vitest";
import { collectImportedNames, collectResultAnnotatedFns } from "../src/matchers.js";
import { parseProgram } from "./harness.js";

const PKG = "@zireal/result-kit";
const importsFrom = (code: string, pkg = PKG) => collectImportedNames(parseProgram(code), pkg);
const annotatedFns = (code: string) => collectResultAnnotatedFns(parseProgram(code));

describe("collectImportedNames — matcher (a) import provenance", () => {
  it("collects named value imports from the package", () => {
    expect([...importsFrom(`import { ok, err, map } from "${PKG}";`)].sort()).toEqual([
      "err",
      "map",
      "ok",
    ]);
  });

  it("uses the LOCAL name for a renamed import", () => {
    const names = importsFrom(`import { ok as success } from "${PKG}";`);
    expect(names.has("success")).toBe(true);
    expect(names.has("ok")).toBe(false);
  });

  it("collects a default import binding", () => {
    expect(importsFrom(`import rk from "${PKG}";`).has("rk")).toBe(true);
  });

  it("collects imports from a package subpath", () => {
    expect(importsFrom(`import { ResultChain } from "${PKG}/fluent";`).has("ResultChain")).toBe(true);
  });

  it("merges bindings across multiple import declarations", () => {
    const code = `import { ok } from "${PKG}";\nimport { err } from "${PKG}/fluent";`;
    expect([...importsFrom(code)].sort()).toEqual(["err", "ok"]);
  });

  it("ignores imports from unrelated packages", () => {
    expect(importsFrom(`import { ok } from "neverthrow";`).size).toBe(0);
  });

  it("does not match a package whose name merely shares the prefix", () => {
    // "@zireal/result-kit-lint" is neither equal to nor a subpath of the package.
    expect(importsFrom(`import { ok } from "${PKG}-lint";`).size).toBe(0);
  });

  it("excludes a whole `import type { … }` declaration", () => {
    expect(importsFrom(`import type { Result } from "${PKG}";`).size).toBe(0);
  });

  it("excludes an inline `type` specifier but keeps the value one", () => {
    const names = importsFrom(`import { ok, type Result } from "${PKG}";`);
    expect(names.has("ok")).toBe(true);
    expect(names.has("Result")).toBe(false);
  });

  it("honors a custom package name", () => {
    expect(importsFrom(`import { ok } from "@acme/res";`, "@acme/res").has("ok")).toBe(true);
  });

  it("returns an empty set when there are no imports", () => {
    expect(importsFrom(`const x = 1;`).size).toBe(0);
  });
});

describe("collectResultAnnotatedFns — matcher (b) return-type annotation", () => {
  it("matches a function declaration whose return type is Result", () => {
    expect(annotatedFns(`function f(): Result<number, E> { return ok(1); }`).has("f")).toBe(true);
  });

  it("matches an arrow initializer annotated with Result", () => {
    expect(annotatedFns(`const g = (): Result<number, E> => ok(1);`).has("g")).toBe(true);
  });

  it("matches a function-expression initializer annotated with Result", () => {
    expect(annotatedFns(`const h = function (): Result<number, E> { return ok(1); };`).has("h")).toBe(
      true,
    );
  });

  it("matches when Result is one member of a top-level union", () => {
    expect(annotatedFns(`function u(): Result<number, E> | undefined { return ok(1); }`).has("u")).toBe(
      true,
    );
  });

  it("matches a qualified `ns.Result` reference", () => {
    expect(annotatedFns(`function q(): rk.Result<number, E> { return rk.ok(1); }`).has("q")).toBe(true);
  });

  it("matches a generic wrapper whose annotation is Result", () => {
    const code = `function retry<T, E>(f: () => Result<T, E>): Result<T, E> { return f(); }`;
    expect(annotatedFns(code).has("retry")).toBe(true);
  });

  it("matches a parenthesized Result return type", () => {
    expect(annotatedFns(`function f(): (Result<number, E>) { return ok(1); }`).has("f")).toBe(true);
  });

  it("matches a parenthesized union whose member is Result", () => {
    const code = `function f(): (Result<number, E> | undefined) { return ok(1); }`;
    expect(annotatedFns(code).has("f")).toBe(true);
  });

  it("collects a nested function declaration", () => {
    const code = `function outer() { function inner(): Result<number, E> { return ok(1); } }`;
    expect(annotatedFns(code).has("inner")).toBe(true);
  });

  it("does NOT match a return type that aliases Result behind another name", () => {
    // The syntax tier's documented blind spot #2.
    expect(annotatedFns(`function k(): MyResult<number, E> { return ok(1); }`).has("k")).toBe(false);
  });

  it("does NOT match an unannotated function (inferred return)", () => {
    // The syntax tier's documented blind spot #1.
    expect(annotatedFns(`function m() { return ok(1); }`).size).toBe(0);
  });

  it("does NOT match when Result is only nested inside another type", () => {
    // A call to this returns an Array, not a droppable Result — avoid the false positive.
    expect(annotatedFns(`function w(): Array<Result<number, E>> { return []; }`).size).toBe(0);
  });

  it("does NOT match a Promise<Result> return (deferred to no-floating-promises)", () => {
    expect(annotatedFns(`function p(): Promise<Result<number, E>> { return x; }`).size).toBe(0);
  });

  it("does NOT match an unrelated return type", () => {
    expect(annotatedFns(`function n(): Promise<number> { return x; }`).size).toBe(0);
  });

  it("returns an empty set when there are no functions", () => {
    expect(annotatedFns(`const x = 1;`).size).toBe(0);
  });
});
