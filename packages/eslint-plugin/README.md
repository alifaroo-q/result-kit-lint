# @zireal/eslint-plugin-result-kit

Type-aware ESLint rules that enforce [`@zireal/result-kit`](https://www.npmjs.com/package/@zireal/result-kit)'s
`Result` contract — the full-fidelity host of the `must-use-result` vocabulary.
Closes the gap between `Result` in TypeScript and in Rust: a `Result` you produce
but never handle should be an error, the way `#[must_use]` makes it one.

## Install

```sh
pnpm add -D @zireal/eslint-plugin-result-kit
```

Peer dependencies (you almost certainly already have these): `eslint` >= 9,
`typescript` >= 5, and `@typescript-eslint/parser` for type-aware linting.

## Usage (flat config)

These rules are **type-aware**, so they need the TypeScript parser with type
information enabled — exactly like any `@typescript-eslint` type-aware rule.

```js
// eslint.config.js
import tseslint from "typescript-eslint";
import resultKit from "@zireal/eslint-plugin-result-kit";

export default tseslint.config({
  files: ["**/*.ts", "**/*.tsx"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { projectService: true }, // or: project: "./tsconfig.json"
  },
  plugins: { "@zireal/result-kit": resultKit },
  rules: {
    "@zireal/result-kit/must-use-result": "error",
    "@zireal/result-kit/no-throw-in-result-fn": "error",
  },
});
```

Or spread the bundled `recommended` config and add the type-aware parser options:

```js
import tseslint from "typescript-eslint";
import resultKit from "@zireal/eslint-plugin-result-kit";

export default tseslint.config(
  resultKit.configs.recommended,
  { languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } } },
);
```

## Rules

| Rule | Description | Fixable |
|---|---|---|
| [`must-use-result`](https://github.com/alifaroo-q/result-kit-lint/blob/main/docs/rules/must-use-result.md) | A `Result`-returning expression whose value is dropped is an error. | ✅ (`void`) |
| [`no-throw-in-result-fn`](https://github.com/alifaroo-q/result-kit-lint/blob/main/docs/rules/no-throw-in-result-fn.md) | A function declared to return a `Result` should not `throw`. | — |

### How detection works

`Result` is identified **structurally** (spec §2: `{ ok: true, value } | { ok: false, error }`),
never by where it was imported from — so a consumer's local `type MyResult = Result<…>`
alias and a hand-rolled `{ ok, value }` are both caught. `must-use-result` resolves
the type through wrappers, aliases, and unions; carves out `any` (no false positives);
and defers `Promise<Result>` to `no-floating-promises`. "Consumed" is emergent from
the types — a terminal like `unwrapOr` / `match` returns a non-`Result`, so dropping
it is fine; a transform like `map` / `andThen` returns another `Result`, so dropping
it is flagged.

## Related

- [`@zireal/oxlint-plugin-result-kit`](https://www.npmjs.com/package/@zireal/oxlint-plugin-result-kit) — the syntax-tier Oxlint port of `must-use-result`.
- [`@zireal/result-kit`](https://www.npmjs.com/package/@zireal/result-kit) — the core library.

## License

MIT © Ali Farooq
