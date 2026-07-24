# `must-use-result`

Require the value of a `Result`-returning expression to be used. A `Result` that
is produced and then dropped is the exact failure `Result` exists to prevent —
`const r = mightFail(); doNext();` silently swallows the error. This rule is the
lint-time equivalent of Rust's `#[must_use]`.

```ts
findUser(id);            // ✗ the Result is dropped
const r = findUser(id);  // ✓ captured
return findUser(id);     // ✓ returned
match(findUser(id), …);  // ✓ collapsed by a terminal
void findUser(id);       // ✓ explicitly discarded (the autofix)
```

**Autofix:** inserts `void ` before the dropped expression.

## Two tiers

`Result` is identified **structurally** (spec §2: `{ ok: true, value } | { ok: false, error }`),
never by where it was imported from — so a local `type MyResult = Result<…>` alias
and a hand-rolled `{ ok, value }` are both caught.

### ESLint — full, type-aware

Resolves the type of each discarded expression through wrappers, aliases, and
unions. Consumption is emergent from types: a terminal (`unwrapOr`, `match`)
returns a non-`Result`, so a dropped call to it is not flagged; a transform
(`map`, `andThen`) returns a `Result`, so it is. `any` is carved out (no false
positives); `Promise<Result>` is left to `no-floating-promises`.

Requires typed linting — configure `parserOptions.project` / `projectService`,
as with any `@typescript-eslint` type-aware rule.

### Oxlint — syntax tier

No type information, so it recognises a `Result` call two ways: the callee is
imported from `@zireal/result-kit`, or the callee is a locally-declared function
whose return-type annotation names `Result`. **Blind spots** (unreachable without
types): a call whose `Result` return is *inferred* (no annotation), or whose
return type *aliases* `Result` behind another name. Measured recall ≈ 82% of
dropped `Result`s on a representative corpus.

## Options (Oxlint / syntax tier only)

- `packageName` (string, default `"@zireal/result-kit"`) — the package whose
  imports are treated as `Result`-returning.

The ESLint rule takes no options: structural detection needs no package name.
