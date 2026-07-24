/**
 * The type-aware structural `Result` predicate — the full-fidelity half of
 * `must-use-result` that only ESLint can host (feasibility #70).
 *
 * It answers "is this the type of an unconsumed `Result`?" by spec §2's shape,
 * NOT by nominal identity: a consumer's local `type MyResult = Result<…>` alias
 * and a hand-rolled `{ ok, value }` both ARE `Result`s and are caught, while a
 * package-specifier match would miss them (feasibility §1.1, probe cases H/I).
 *
 * The design decisions, each measured in the feasibility probe:
 *   - **`any` is carved out first** — it is the entire false-positive surface
 *     (§10.9 finding #6; probe case E). Everything else degrades to silence.
 *   - **Per-constituent, drop nullish first** — a narrowed `Ok<T>` alone is a
 *     one-member union and must still be must-use; `Result<T,E> | undefined` is
 *     three members and must not be missed (probe cases K/L).
 *   - **Base constraint for a bare type parameter** — `f()` where
 *     `R extends Result<…>` types as `R`; resolve the constraint (probe case D).
 *   - **`Promise<Result>` / `ResultAsync` are NOT matched** — a Promise's shape
 *     is `then`/`catch`, never exactly `{ ok, value }`, so it falls through here
 *     and is left to `no-floating-promises` (feasibility §1.4; probe case G).
 */
import type { Type, TypeChecker, Symbol as TsSymbol, Node as TsNode } from "typescript";
import { TypeFlags } from "typescript";

const NULLISH = TypeFlags.Undefined | TypeFlags.Null | TypeFlags.Void;

function resolveConstraint(type: Type, checker: TypeChecker): Type {
  if (type.flags & TypeFlags.TypeParameter) {
    const base = checker.getBaseConstraintOfType(type);
    if (base) return base;
  }
  return type;
}

function okPropertyIsBooleanLiteral(
  okSymbol: TsSymbol,
  checker: TypeChecker,
  location: TsNode,
): boolean {
  const okType = checker.getTypeOfSymbolAtLocation(okSymbol, location);
  // `ok: true` / `ok: false` — each half's discriminant is a boolean *literal*.
  // The general `boolean` (an object's widened flag) is deliberately not a
  // Result half; a real `Ok`/`Err` always carries the literal.
  if (okType.flags & TypeFlags.BooleanLiteral) return true;
  // A union constituent may present `ok` as `true | false`; accept only if every
  // member is a boolean literal (never a wider type).
  if (okType.isUnion()) return okType.types.every((t) => (t.flags & TypeFlags.BooleanLiteral) !== 0);
  return false;
}

/** The half a constituent is, or `null` if it is not a `Result` half at all. */
type ResultHalf = "ok" | "err" | null;

/** Which `Result` half is `type` — `{ ok, value }`, `{ ok, error }`, or neither? */
function resultHalfKind(type: Type, checker: TypeChecker, location: TsNode): ResultHalf {
  if (type.flags & TypeFlags.Any) return null;
  const props = checker.getPropertiesOfType(type);
  // §2: exactly two fields per half. The `exactly` rejects a foreign union with
  // an extra field (probe case O).
  if (props.length !== 2) return null;
  const okSymbol = props.find((p) => p.name === "ok");
  if (!okSymbol || !okPropertyIsBooleanLiteral(okSymbol, checker, location)) return null;
  const names = props.map((p) => p.name).sort();
  if (names[0] === "ok" && names[1] === "value") return "ok";
  if (names[0] === "error" && names[1] === "ok") return "err";
  return null;
}

/**
 * Is `rawType` the type of an unconsumed `Result`? Generous per feasibility
 * §1.1 — **at least one** constituent is a `Result` half (a dropped `Ok` is
 * still a dropped `Result`) — but bails on `any`. `location` anchors symbol type
 * resolution (a node the checker can use as scope).
 */
export function isResultType(rawType: Type, checker: TypeChecker, location: TsNode): boolean {
  // Carve out `any` before anything else — the whole false-positive surface.
  if (rawType.flags & TypeFlags.Any) return false;

  const type = resolveConstraint(rawType, checker);
  const constituents = type.isUnion() ? type.types : [type];

  let sawResultHalf = false;
  for (const raw of constituents) {
    const c = resolveConstraint(raw, checker);
    if (c.flags & NULLISH) continue; // drop null/undefined/void first
    if (c.flags & TypeFlags.Any) return false; // any anywhere in the union → bail
    if (resultHalfKind(c, checker, location) !== null) sawResultHalf = true;
  }
  return sawResultHalf;
}

/**
 * The `Result` (possibly `Promise<Result>`) return-contract check for
 * `no-throw-in-result-fn`: unwraps a single-argument `Promise` for `async`
 * functions, then applies {@link isResultType}.
 */
export function isResultReturnContract(
  returnType: Type,
  checker: TypeChecker,
  location: TsNode,
): boolean {
  let type = returnType;
  const symbol = type.getSymbol();
  if (symbol?.getName() === "Promise") {
    const args = checker.getTypeArguments(type as import("typescript").TypeReference);
    if (args.length === 1 && args[0]) type = args[0];
  }
  return isResultType(type, checker, location);
}
