# `no-throw-in-result-fn`

A function declared to return a `Result` (or `Promise<Result>`) should not
`throw`. Throwing routes failure through the exception channel that `Result`
exists to replace — a caller reading `(): Result<T, E>` will branch on `ok` and
never wrap the call in try/catch, so a throw is a failure the type system
promised couldn't happen.

```ts
function parse(s: string): Result<Config, ParseError> {
  if (!s) throw new Error("empty"); // ✗ throws out of a Result function
  return ok(JSON.parse(s));
}

function parse(s: string): Result<Config, ParseError> {
  if (!s) return err({ type: "ParseError", message: "empty" }); // ✓
  return ok(JSON.parse(s));
}
```

## What it flags

A `throw` whose nearest enclosing function is **typed to return a `Result`** —
determined from the resolved return type, so an *inferred* `Result` return is
covered too, and `async` functions returning `Promise<Result>` are unwrapped.

Only throws that **escape** the function are flagged. A throw caught by a
`try`/`catch` in the same function (the `try { … } catch { return err(…) }`
shape) never breaks the external contract and is left alone; a throw in the
`catch` block itself does escape, and is flagged.

A throw inside a nested function is judged against *that* function's return
type, not the outer one.

## No autofix

Converting `throw x` to `return err(x)` needs the function's `E` shape and the
project's `err` import — neither of which the rule can invent.

## Requires type information

Type-aware — configure `parserOptions.project` / `projectService`, as with any
`@typescript-eslint` type-aware rule.
