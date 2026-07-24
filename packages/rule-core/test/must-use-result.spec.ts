import { describe, it, expect } from "vitest";
import { mustUseResult } from "../src/must-use-result.js";
import { runRule } from "./harness.js";

const IMPORT = `import { ok, err, map, andThen, combine } from "@zireal/result-kit";\n`;
const run = (body: string, options?: readonly unknown[]) => runRule(mustUseResult, IMPORT + body, options);

describe("must-use-result — flags a dropped Result (matcher a: import provenance)", () => {
  it("flags a dropped `ok(...)` call in statement position", () => {
    const reports = run(`ok(1);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.messageId).toBe("mustUse");
    expect(reports[0]!.data).toEqual({ callee: "ok" });
  });

  it("flags a dropped `err(...)` call", () => {
    expect(run(`err({ type: "X", message: "m" });`)).toHaveLength(1);
  });

  it.each(["map", "andThen", "combine"])("flags a dropped `%s(...)` transform/collection call", (fn) => {
    const reports = run(`${fn}(ok(1));`);
    // The outer dropped call is flagged; the nested `ok(1)` is consumed as an argument.
    expect(reports).toHaveLength(1);
    expect(reports[0]!.data).toEqual({ callee: fn });
  });

  it("uses the local name when the import is renamed", () => {
    const reports = runRule(mustUseResult, `import { ok as success } from "@zireal/result-kit";\nsuccess(1);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.data).toEqual({ callee: "success" });
  });

  it("interpolates the callee name into the message", () => {
    expect(run(`ok(1);`)[0]!.message).toContain("`ok`");
  });

  it("flags every dropped Result in a file independently", () => {
    expect(run(`ok(1);\nerr("e");\nmap(ok(1));`)).toHaveLength(3);
  });
});

describe("must-use-result — flags a dropped Result (matcher b: return annotation)", () => {
  const decl = `function findUser(id: string): Result<{ id: string }, E> { return ok({ id }); }\n`;

  it("flags a dropped call to a locally-declared Result-returning function", () => {
    const reports = runRule(mustUseResult, decl + `findUser("1");`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.data).toEqual({ callee: "findUser" });
  });

  it("flags a dropped call to a Result-annotated arrow", () => {
    const code = `const load = (): Result<number, E> => ok(1);\nload();`;
    expect(runRule(mustUseResult, code)).toHaveLength(1);
  });

  it("flags a dropped call through a generic wrapper annotated as Result", () => {
    const code =
      `function retry<T, E>(f: () => Result<T, E>): Result<T, E> { return f(); }\n` +
      `retry(() => ok(1));`;
    const reports = runRule(mustUseResult, code);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.data).toEqual({ callee: "retry" });
  });
});

describe("must-use-result — does not flag a consumed or invisible Result", () => {
  it("does not flag a Result returned from a function", () => {
    expect(run(`function f() { return ok(1); }`)).toHaveLength(0);
  });

  it("does not flag a Result assigned to a variable", () => {
    expect(run(`const r = ok(1);`)).toHaveLength(0);
  });

  it("does not flag a Result passed as an argument", () => {
    expect(run(`console.log(ok(1));`)).toHaveLength(0);
  });

  it("does not flag a Result used in a condition", () => {
    expect(run(`if (ok(1).ok) {}`)).toHaveLength(0);
  });

  it("does not flag a call already discarded with `void`", () => {
    // `void ok(1)` — the statement's expression is a UnaryExpression, not the call.
    expect(run(`void ok(1);`)).toHaveLength(0);
  });

  it("does not flag a call to an unrelated (non-Result) identifier", () => {
    expect(run(`doThing();`)).toHaveLength(0);
  });

  it("does not flag a member call (syntax tier cannot resolve method returns)", () => {
    expect(run(`chain.map(fn);`)).toHaveLength(0);
  });

  it("blind spot #1: does not flag a dropped call whose Result return is inferred", () => {
    const code = `function m() { return ok(1); }\nm();`;
    expect(runRule(mustUseResult, code)).toHaveLength(0);
  });

  it("blind spot #2: does not flag a dropped call whose return type aliases Result", () => {
    const code = `type MyResult<T, E> = Result<T, E>;\nfunction k(): MyResult<number, E> { return ok(1); }\nk();`;
    expect(runRule(mustUseResult, code)).toHaveLength(0);
  });

  it("does not flag a dropped Result nested in an array literal (out-of-scope drop position)", () => {
    // Documented boundary: only statement-position drops are flagged in round one.
    expect(run(`[ok(1)];`)).toHaveLength(0);
  });
});

describe("must-use-result — autofix", () => {
  it("inserts `void ` immediately before the dropped call", () => {
    const report = run(`ok(1);`)[0]!;
    expect(report.fixText).toBe("void ");
    // Range collapses to the call's start offset (an insertion).
    expect(report.fixRange).not.toBeNull();
    expect(report.fixRange![0]).toBe(report.fixRange![1]);
  });

  it("anchors the fix at the call, not the enclosing statement", () => {
    const code = IMPORT + `   ok(1);`;
    const report = runRule(mustUseResult, code)[0]!;
    // The offset points at `ok`, past the leading whitespace.
    expect(code.slice(report.fixRange![0], report.fixRange![0] + 2)).toBe("ok");
  });
});

describe("must-use-result — options", () => {
  it("respects a custom `packageName`", () => {
    const code = `import { ok } from "@acme/res";\nok(1);`;
    expect(runRule(mustUseResult, code, [{ packageName: "@acme/res" }])).toHaveLength(1);
  });

  it("does not flag the default package when a custom one is configured", () => {
    const code = `import { ok } from "@zireal/result-kit";\nok(1);`;
    expect(runRule(mustUseResult, code, [{ packageName: "@acme/res" }])).toHaveLength(0);
  });
});
