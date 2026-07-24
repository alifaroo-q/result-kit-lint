import { noThrowInResultFn } from "../src/no-throw-in-result-fn.js";
import { makeRuleTester, withPrelude } from "./tester.js";

const ruleTester = makeRuleTester();
const throwErr = { messageId: "noThrow" as const };

ruleTester.run("no-throw-in-result-fn", noThrowInResultFn, {
  valid: [
    {
      name: "throw in a function that does not return Result",
      code: withPrelude(`function f(): number { throw new Error("x"); }`),
    },
    {
      name: "throw in a void function",
      code: withPrelude(`function f(): void { throw new Error("x"); }`),
    },
    {
      name: "a function that only throws (inferred never return)",
      code: withPrelude(`function f() { throw new Error("x"); }`),
    },
    {
      name: "throw caught locally by a try/catch that returns err",
      code: withPrelude(
        `function f(): Result<number, Error> { try { throw new Error("x"); } catch { return err(new Error("y")); } }`,
      ),
    },
    {
      name: "throw in a nested non-Result function inside a Result function",
      code: withPrelude(
        `function f(): Result<number, Error> { const cb = (): number => { throw new Error("x"); }; return ok(cb()); }`,
      ),
    },
    {
      name: "throw at module top level (no enclosing function)",
      code: withPrelude(`throw new Error("top");`),
    },
    {
      name: "a Result-returning function that returns err instead of throwing",
      code: withPrelude(
        `function f(): Result<number, Error> { if (cond) return err(new Error("x")); return ok(1); }`,
      ),
    },
  ],
  invalid: [
    {
      name: "throw in a sync Result-returning function declaration",
      code: withPrelude(`function f(): Result<number, Error> { throw new Error("x"); }`),
      errors: [throwErr],
    },
    {
      name: "throw in a Result-returning arrow",
      code: withPrelude(`const g = (): Result<number, Error> => { throw new Error("x"); };`),
      errors: [throwErr],
    },
    {
      name: "throw in a Result-returning function expression",
      code: withPrelude(`const k = function (): Result<number, Error> { throw new Error("x"); };`),
      errors: [throwErr],
    },
    {
      name: "throw in an async Promise<Result>-returning function",
      code: withPrelude(
        `async function h(): Promise<Result<number, Error>> { throw new Error("x"); }`,
      ),
      errors: [throwErr],
    },
    {
      name: "throw nested in control flow still escapes",
      code: withPrelude(
        `function f(): Result<number, Error> { if (cond) throw new Error("x"); return ok(1); }`,
      ),
      errors: [throwErr],
    },
    {
      name: "throw in a catch block escapes the Result function",
      code: withPrelude(
        `function f(): Result<number, Error> { try { return ok(1); } catch { throw new Error("x"); } }`,
      ),
      errors: [throwErr],
    },
    {
      name: "inferred Result return is still covered (the typed advantage)",
      code: withPrelude(
        `function f() { if (cond) return ok(1); throw new Error("x"); }`,
      ),
      errors: [throwErr],
    },
    {
      name: "Result | undefined return type",
      code: withPrelude(
        `function f(): Result<number, Error> | undefined { throw new Error("x"); }`,
      ),
      errors: [throwErr],
    },
    {
      name: "two escaping throws flagged independently",
      code: withPrelude(
        `function f(): Result<number, Error> { if (cond) throw new Error("a"); throw new Error("b"); }`,
      ),
      errors: [throwErr, throwErr],
    },
  ],
});
