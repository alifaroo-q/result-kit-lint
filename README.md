# @zireal/result-kit-lint

Lint enforcement for [`@zireal/result-kit`](https://github.com/alifaroo-q/result-kit) — the
`must-use-result` rule vocabulary, one brain, two published hosts. Closes the gap between
`Result` in TypeScript and in Rust: a `Result`-returning call whose value is dropped or never
collapsed should be an error, the way `#[must_use]` makes it one.

> Separate, fast-iterating repo by design ([ADR 0014](https://github.com/alifaroo-q/result-kit/blob/main/docs/adr/0014-peer-dependency-policy-and-lint-package-layout.md)):
> the core `@zireal/result-kit` artifact stays lean, frozen, and zero-dependency; the lint
> toolchain (`typescript-eslint`, oxc's parser, RuleTester) lives here and ships on its own cadence.
> The rule detects `Result` **structurally** (spec §2), never by importing core, so co-location buys nothing.

## Packages

| Package | npm | Host | Tier |
|---|---|---|---|
| `packages/rule-core` | _private, unpublished_ | — | the shared `{ meta, create }` module + structural `Result` matchers; zero peers; bundled into each plugin |
| `packages/eslint-plugin` | `@zireal/eslint-plugin-result-kit` | ESLint (`@typescript-eslint`) | **full** — type-aware, resolves `Result` through wrappers, aliases, unions |
| `packages/oxlint-plugin` | `@zireal/oxlint-plugin-result-kit` | Oxlint | **syntax** — re-exports `rule-core`; sees imports + annotations, not types |

Biome is deferred ([ADR 0013](https://github.com/alifaroo-q/result-kit/blob/main/docs/adr/0013-lint-port-scope-oxlint-biome.md)).

## Capability honesty

The ESLint plugin is the full-fidelity host — the only linter that lets a third-party rule see
types. The Oxlint plugin is **syntax-tier**: it catches `Result`-returning calls it can see through
an import from the package or through a return-type annotation that textually names `Result`. It
**cannot** see two shapes — a call whose `Result` return is **inferred** (no annotation), or one
whose return type **aliases** `Result` behind another name. Measured recall on a representative
consumer corpus is ~82% of dropped `Result`s
([syntax-tier probe](https://github.com/alifaroo-q/result-kit/blob/main/docs/research/must-use-result-syntax-tier-probes.md)).
Never claim parity that isn't there.

## Rules (round one)

- **`must-use-result`** — a `Result`-returning call whose value is dropped or never collapsed is an error.

Backlog: `no-throw-in-result-fn`, `no-unhandled-err-branch`.

## Development

```sh
pnpm install
pnpm build     # bundle each plugin (rule-core inlined)
pnpm test      # vitest + @typescript-eslint/rule-tester
pnpm check     # tsc -b across the workspace
```
