import { afterAll, describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { mustUseResult } from "../src/index.js";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts"],
      },
      tsconfigRootDir: fileURLToPath(new URL("./fixtures", import.meta.url)),
    },
  },
});

// Result is identified STRUCTURALLY (spec §2), so the corpus defines the shape
// inline — no import, no module resolution — which also proves detection does
// not depend on where `Result` comes from. Terminals return non-Result (so a
// dropped call to them is not flagged); transforms return Result (so it is).
const PRELUDE = [
  `type Ok<T> = { ok: true; value: T };`,
  `type Err<E> = { ok: false; error: E };`,
  `type Result<T, E> = Ok<T> | Err<E>;`,
  `declare function ok<T>(value: T): Ok<T>;`,
  `declare function err<E>(error: E): Err<E>;`,
  `declare function findUser(id: string): Result<{ id: string }, Error>;`,
  `declare function mapResult<T, E, U>(r: Result<T, E>, f: (t: T) => U): Result<U, E>;`,
  `declare function unwrapOr<T, E>(r: Result<T, E>, d: T): T;`,
  `declare function isOk<T, E>(r: Result<T, E>): r is Ok<T>;`,
  `declare function retry<T, E>(f: () => Result<T, E>): Result<T, E>;`,
  `declare function loadAsync(): Promise<Result<number, Error>>;`,
  `declare function use(x: unknown): void;`,
  `declare function makeNumber(): number;`,
  `declare function opaqueUnknown(): unknown;`,
  `declare function opaqueAny(): any;`,
].join("\n");

const withPrelude = (body: string) => `${PRELUDE}\n${body}`;
const drop = { messageId: "mustUse" as const };

ruleTester.run("must-use-result", mustUseResult, {
  valid: [
    // Consumed — the value flows somewhere.
    { name: "assigned to a variable", code: withPrelude(`const r = findUser("1");`) },
    { name: "returned from a function", code: withPrelude(`function h() { return findUser("1"); }`) },
    { name: "passed as an argument", code: withPrelude(`use(findUser("1"));`) },
    { name: "used in a condition via a guard", code: withPrelude(`if (isOk(findUser("1"))) {}`) },
    { name: "collapsed by a terminal (unwrapOr returns T)", code: withPrelude(`unwrapOr(findUser("1"), { id: "" });`) },
    { name: "already discarded with void", code: withPrelude(`void findUser("1");`) },
    // Not a Result at all.
    { name: "non-Result call (number)", code: withPrelude(`makeNumber();`) },
    // Carve-outs and deferrals — must NOT fire.
    { name: "case E: any is carved out", code: withPrelude(`opaqueAny();`) },
    { name: "case N: unknown is not a Result", code: withPrelude(`opaqueUnknown();`) },
    {
      name: "case G: unawaited Promise<Result> is deferred to no-floating-promises",
      code: withPrelude(`loadAsync();`),
    },
    {
      name: "case O: a foreign union with an extra field is not a Result",
      code: withPrelude(
        `declare function foreign(): { ok: true; value: number; meta: string } | { ok: false; error: Error; meta: string };\nforeign();`,
      ),
    },
  ],
  invalid: [
    {
      name: "case A: dropped direct call — autofixed with void",
      code: withPrelude(`findUser("1");`),
      output: withPrelude(`void findUser("1");`),
      errors: [drop],
    },
    {
      name: "dropped ok() (narrow Ok<T>)",
      code: withPrelude(`ok(1);`),
      output: withPrelude(`void ok(1);`),
      errors: [drop],
    },
    {
      name: "dropped err()",
      code: withPrelude(`err(new Error("x"));`),
      output: withPrelude(`void err(new Error("x"));`),
      errors: [drop],
    },
    {
      name: "case F: dropped transform (map returns Result, not consumed)",
      code: withPrelude(`mapResult(findUser("1"), (u) => u.id);`),
      output: withPrelude(`void mapResult(findUser("1"), (u) => u.id);`),
      errors: [drop],
    },
    {
      name: "case B/C: dropped call through a generic wrapper",
      code: withPrelude(`retry(() => findUser("1"));`),
      output: withPrelude(`void retry(() => findUser("1"));`),
      errors: [drop],
    },
    {
      name: "case L: Result | undefined — nullish dropped, Result remains",
      code: withPrelude(`declare function maybe(): Result<number, Error> | undefined;\nmaybe();`),
      output: withPrelude(`declare function maybe(): Result<number, Error> | undefined;\nvoid maybe();`),
      errors: [drop],
    },
    {
      name: "case K: a narrowed Ok<T> alone is still must-use",
      code: withPrelude(`declare function mkOk(): Ok<number>;\nmkOk();`),
      output: withPrelude(`declare function mkOk(): Ok<number>;\nvoid mkOk();`),
      errors: [drop],
    },
    {
      name: "case H: a hand-rolled structural Result (bare reference)",
      code: withPrelude(
        `declare const r: { ok: true; value: number } | { ok: false; error: Error };\nr;`,
      ),
      output: withPrelude(
        `declare const r: { ok: true; value: number } | { ok: false; error: Error };\nvoid r;`,
      ),
      errors: [drop],
    },
    {
      name: "case I: a consumer's local alias of Result (nominal would miss)",
      code: withPrelude(`type MyResult<T, E> = Result<T, E>;\ndeclare function aliased(): MyResult<number, Error>;\naliased();`),
      output: withPrelude(`type MyResult<T, E> = Result<T, E>;\ndeclare function aliased(): MyResult<number, Error>;\nvoid aliased();`),
      errors: [drop],
    },
    {
      name: "case D: bare type parameter resolves through its base constraint",
      code: withPrelude(`function g<R extends Result<unknown, unknown>>(f: () => R) { f(); }`),
      output: withPrelude(`function g<R extends Result<unknown, unknown>>(f: () => R) { void f(); }`),
      errors: [drop],
    },
    {
      name: "an awaited Promise<Result> whose Result is then dropped",
      code: withPrelude(`async function f() { await loadAsync(); }`),
      output: withPrelude(`async function f() { void await loadAsync(); }`),
      errors: [drop],
    },
    {
      name: "a sequence expression discards each Result element",
      code: withPrelude(`(findUser("1"), 0);`),
      output: withPrelude(`(void findUser("1"), 0);`),
      errors: [drop],
    },
    {
      name: "two dropped results flagged independently",
      code: withPrelude(`findUser("1");\nok(2);`),
      output: withPrelude(`void findUser("1");\nvoid ok(2);`),
      errors: [drop, drop],
    },
  ],
});
