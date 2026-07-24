import { afterAll, describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import { RuleTester } from "@typescript-eslint/rule-tester";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** A type-aware RuleTester backed by the fixtures default project. */
export function makeRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.ts"],
        },
        tsconfigRootDir: fileURLToPath(new URL("./fixtures", import.meta.url)),
      },
    },
  });
}

/**
 * The structural `Result` shape, declared inline so the corpus never depends on
 * module resolution — detection is structural (spec §2), and this proves it.
 */
export const RESULT_PRELUDE = [
  `type Ok<T> = { ok: true; value: T };`,
  `type Err<E> = { ok: false; error: E };`,
  `type Result<T, E> = Ok<T> | Err<E>;`,
  `declare function ok<T>(value: T): Ok<T>;`,
  `declare function err<E>(error: E): Err<E>;`,
  `declare function isOk<T, E>(r: Result<T, E>): r is Ok<T>;`,
  `declare function isErr<T, E>(r: Result<T, E>): r is Err<E>;`,
  `declare const cond: boolean;`,
].join("\n");

export const withPrelude = (body: string): string => `${RESULT_PRELUDE}\n${body}`;
