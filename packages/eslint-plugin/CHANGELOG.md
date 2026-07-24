# @zireal/eslint-plugin-result-kit

## 0.1.0

### Minor Changes

- 3138fb1: Initial release.

  - `@zireal/eslint-plugin-result-kit` — type-aware `must-use-result` (structural
    §2 detection through wrappers, aliases, and unions; `any` carved out;
    `Promise<Result>` deferred to `no-floating-promises`) and `no-throw-in-result-fn`.
  - `@zireal/oxlint-plugin-result-kit` — the syntax-tier `must-use-result`,
    re-exported from the shared rule-core (import-provenance + return-type-annotation
    matchers; ~82% dropped-Result recall).
