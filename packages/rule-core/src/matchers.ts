/**
 * The two single-file syntax matchers that identify a `Result`-returning call
 * without type information. Both are AST-only, so they run identically on
 * `@typescript-eslint/parser` (ESLint) and oxc's parser (Oxlint) — the
 * annotation-shape parity that lets matcher (b) be shared verbatim was measured
 * in `docs/research/must-use-result-syntax-tier-probes.md` (all cases identical).
 *
 * They are the syntax tier's whole reach. What they cannot see — a call whose
 * `Result` return is *inferred*, or one whose return type *aliases* `Result`
 * behind another name — is unreachable without types and is named as a known
 * blind spot in each plugin's README.
 */
import type { AstNode } from "./types.js";

function isNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as AstNode).type === "string";
}

/** Depth-first over every child node. */
function forEachChild(node: AstNode, visit: (child: AstNode) => void): void {
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) visit(item);
    } else if (isNode(value)) {
      visit(value);
    }
  }
}

/**
 * Matcher (a) — import provenance. Collect the local names bound by imports from
 * the result-kit package (bare specifier or a subpath). Handles renamed
 * specifiers (`import { ok as success }`) and default imports; a namespace
 * import surfaces as a member call, which the syntax tier does not resolve.
 */
export function collectImportedNames(program: AstNode, packageName: string): Set<string> {
  const names = new Set<string>();
  const body = program.body;
  if (!Array.isArray(body)) return names;
  for (const stmt of body) {
    if (!isNode(stmt) || stmt.type !== "ImportDeclaration") continue;
    const source = stmt.source;
    if (!isNode(source) || typeof source.value !== "string") continue;
    const spec = source.value;
    if (spec !== packageName && !spec.startsWith(packageName + "/")) continue;
    // `import type { … }` binds only types — nothing callable, so it never
    // introduces a Result-returning value.
    if (stmt.importKind === "type") continue;
    const specifiers = stmt.specifiers;
    if (!Array.isArray(specifiers)) continue;
    for (const s of specifiers) {
      if (!isNode(s)) continue;
      // Per-specifier `import { type Result, ok }` — skip the type-only ones.
      if (s.importKind === "type") continue;
      // ImportSpecifier / ImportDefaultSpecifier both bind `local` (Identifier).
      if (s.type === "ImportSpecifier" || s.type === "ImportDefaultSpecifier") {
        const local = s.local;
        if (isNode(local) && typeof local.name === "string") names.add(local.name);
      }
    }
  }
  return names;
}

/** Is `node` a `TSTypeReference` to `Result` (bare or qualified `ns.Result`)? */
function isResultReference(node: AstNode): boolean {
  if (node.type !== "TSTypeReference") return false;
  const typeName = node.typeName;
  if (!isNode(typeName)) return false;
  const name = typeName.name ?? (isNode(typeName.right) ? typeName.right.name : undefined);
  return name === "Result";
}

/**
 * Does this return-type annotation name `Result` as a **direct constituent** —
 * the whole return type, or a member of a top-level union? Deliberately not "any
 * nested mention": a function returning `Array<Result<…>>` or `Promise<Result<…>>`
 * does not itself return a droppable `Result`, so matching those would be a false
 * positive the syntax tier can and should avoid. (`Promise<Result>` is
 * `no-floating-promises`' job — feasibility §1.4.)
 */
function annotationMentionsResult(returnType: AstNode): boolean {
  // `returnType` is a TSTypeAnnotation wrapping `.typeAnnotation`.
  let inner = isNode(returnType.typeAnnotation) ? returnType.typeAnnotation : returnType;
  while (inner.type === "TSParenthesizedType" && isNode(inner.typeAnnotation)) {
    inner = inner.typeAnnotation;
  }
  if (inner.type === "TSUnionType") {
    const members = inner.types;
    if (Array.isArray(members)) {
      return members.some((m) => isNode(m) && isResultReference(m));
    }
    return false;
  }
  return isResultReference(inner);
}

function functionLikeReturnType(node: AstNode): AstNode | undefined {
  const rt = node.returnType;
  return isNode(rt) ? rt : undefined;
}

/**
 * Matcher (b) — return-type annotation. Collect the names of in-file functions
 * whose declared return type textually names `Result`. Covers function
 * declarations and `const f = (): Result<…> => …` arrow/function initializers.
 * A method (`obj.q()`) is a member call the syntax tier does not resolve.
 */
export function collectResultAnnotatedFns(program: AstNode): Set<string> {
  const names = new Set<string>();
  const visit = (node: AstNode): void => {
    if (node.type === "FunctionDeclaration") {
      const id = node.id;
      const rt = functionLikeReturnType(node);
      if (isNode(id) && typeof id.name === "string" && rt && annotationMentionsResult(rt)) {
        names.add(id.name);
      }
    } else if (node.type === "VariableDeclaration") {
      const decls = node.declarations;
      if (Array.isArray(decls)) {
        for (const d of decls) {
          if (!isNode(d)) continue;
          const id = d.id;
          const init = d.init;
          if (
            isNode(id) &&
            typeof id.name === "string" &&
            isNode(init) &&
            (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")
          ) {
            const rt = functionLikeReturnType(init);
            if (rt && annotationMentionsResult(rt)) names.add(id.name);
          }
        }
      }
    }
    forEachChild(node, visit);
  };
  visit(program);
  return names;
}
