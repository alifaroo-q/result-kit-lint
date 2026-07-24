# @zireal/oxlint-plugin-result-kit

The [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) port of
[`@zireal/result-kit`](https://www.npmjs.com/package/@zireal/result-kit)'s
`must-use-result` rule — **syntax tier**. It shares the exact rule brain with the
[ESLint plugin](https://www.npmjs.com/package/@zireal/eslint-plugin-result-kit),
re-exported verbatim.

## Install

```sh
pnpm add -D @zireal/oxlint-plugin-result-kit
```

Peer dependency: `oxlint`. Oxlint JS plugins are **alpha** as of early 2026.

## Usage

Register the plugin in your Oxlint config and enable the rule (see the
[Oxlint JS-plugins guide](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
for the current wiring):

```jsonc
// .oxlintrc.json
{
  "jsPlugins": ["@zireal/oxlint-plugin-result-kit"],
  "rules": {
    "@zireal/result-kit/must-use-result": "error"
  }
}
```

## Rules

- **`must-use-result`** — a `Result`-returning call whose value is dropped in
  statement position is flagged. Options: `packageName` (string, default
  `"@zireal/result-kit"`).

## Capability honesty (read this)

Oxlint cannot give a third-party rule **type information**, so this is the
**syntax tier**, not the full rule. It recognises a `Result` call two ways:

1. the callee is imported from `@zireal/result-kit`, or
2. the callee is a locally-declared function whose return-type annotation
   textually names `Result`.

It **cannot** see two shapes — a call whose `Result` return is **inferred**
(no annotation), or whose return type **aliases** `Result` behind another name.
Measured recall is ~82% of dropped `Result`s on a representative corpus; the two
blind spots are unreachable without types.

For full-fidelity, type-aware enforcement (through wrappers, aliases, and unions),
use [`@zireal/eslint-plugin-result-kit`](https://www.npmjs.com/package/@zireal/eslint-plugin-result-kit).

## License

MIT © Ali Farooq
