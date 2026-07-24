import { afterAll, describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { mustUseResult } from "../src/index.js";

// Wire @typescript-eslint/rule-tester's Mocha-style hooks to vitest.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

const IMPORT = `import { ok, err, map, andThen, combine } from "@zireal/result-kit";`;

// The rule-core module implements the host-agnostic ESLint-v9 contract; ESLint's
// fuller RuleModule type is structurally compatible at runtime.
type EslintRule = Parameters<typeof ruleTester.run>[1];

ruleTester.run("must-use-result", mustUseResult as unknown as EslintRule, {
  valid: [
    // Consumed: assigned, returned, passed, used in a condition.
    { name: "assigned to a variable", code: `${IMPORT}\nconst r = ok(1);` },
    { name: "returned from a function", code: `${IMPORT}\nfunction f() { return ok(1); }` },
    { name: "passed as an argument", code: `${IMPORT}\nconsole.log(ok(1));` },
    { name: "used in a condition", code: `${IMPORT}\nif (ok(1).ok) {}` },
    { name: "already discarded with void", code: `${IMPORT}\nvoid ok(1);` },
    // Not a Result the syntax tier can see.
    { name: "unrelated identifier call", code: `doThing();` },
    { name: "member/method call", code: `chain.map((x) => x);` },
    { name: "call to non-package import", code: `import { ok } from "neverthrow";\nok(1);` },
    // Documented blind spots — must NOT flag (no false positives).
    {
      name: "blind spot: inferred Result return",
      code: `${IMPORT}\nfunction m() { return ok(1); }\nm();`,
    },
    {
      name: "blind spot: aliased Result return",
      code: `${IMPORT}\ntype MyResult<T, E> = Result<T, E>;\nfunction k(): MyResult<number, Error> { return ok(1); }\nk();`,
    },
    // Wrong package when a custom one is configured.
    {
      name: "custom package configured, default package not flagged",
      code: `${IMPORT}\nok(1);`,
      options: [{ packageName: "@acme/res" }],
    },
  ],
  invalid: [
    {
      name: "dropped ok() — autofixed with void",
      code: `${IMPORT}\nok(1);`,
      output: `${IMPORT}\nvoid ok(1);`,
      errors: [{ messageId: "mustUse", data: { callee: "ok" } }],
    },
    {
      name: "dropped err()",
      code: `${IMPORT}\nerr("boom");`,
      output: `${IMPORT}\nvoid err("boom");`,
      errors: [{ messageId: "mustUse", data: { callee: "err" } }],
    },
    {
      name: "dropped transform map()",
      code: `${IMPORT}\nmap(ok(1), (x) => x);`,
      output: `${IMPORT}\nvoid map(ok(1), (x) => x);`,
      errors: [{ messageId: "mustUse", data: { callee: "map" } }],
    },
    {
      name: "renamed import uses local name",
      code: `import { ok as success } from "@zireal/result-kit";\nsuccess(1);`,
      output: `import { ok as success } from "@zireal/result-kit";\nvoid success(1);`,
      errors: [{ messageId: "mustUse", data: { callee: "success" } }],
    },
    {
      name: "locally-declared Result-annotated function (matcher b)",
      code: `function findUser(id: string): Result<{ id: string }, Error> { return ok({ id }); }\nfindUser("1");`,
      output: `function findUser(id: string): Result<{ id: string }, Error> { return ok({ id }); }\nvoid findUser("1");`,
      errors: [{ messageId: "mustUse", data: { callee: "findUser" } }],
    },
    {
      name: "generic wrapper annotated as Result",
      code: `function retry<T, E>(f: () => Result<T, E>): Result<T, E> { return f(); }\nretry(() => ok(1));`,
      output: `function retry<T, E>(f: () => Result<T, E>): Result<T, E> { return f(); }\nvoid retry(() => ok(1));`,
      errors: [{ messageId: "mustUse", data: { callee: "retry" } }],
    },
    {
      name: "two dropped results flagged independently",
      code: `${IMPORT}\nok(1);\nerr("e");`,
      output: `${IMPORT}\nvoid ok(1);\nvoid err("e");`,
      errors: [
        { messageId: "mustUse", data: { callee: "ok" } },
        { messageId: "mustUse", data: { callee: "err" } },
      ],
    },
    {
      name: "custom packageName is honored",
      code: `import { ok } from "@acme/res";\nok(1);`,
      output: `import { ok } from "@acme/res";\nvoid ok(1);`,
      options: [{ packageName: "@acme/res" }],
      errors: [{ messageId: "mustUse", data: { callee: "ok" } }],
    },
  ],
});
