# AST test traversal and ergonomics (iteration)

## A. `scope-resolution`: drop `.unwrap().root.ref`

[`AST-Wrapper.ts`](packages/compiler/compiler-tests/test-utils/AST-Wrapper.ts) already dereferences Langium `Reference` values on property access. For `MemberAccessExpression`, use **`alias.value.as_MemberAccessExpression.root.match({ $type: '…' })`** (or assign `val` then `val.root.match(...)`) instead of `expect(val.unwrap().root.ref).toMatchObject(...)`.

**File:** [`2-test-parser-scope-resolution.test.ts`](packages/compiler/compiler-tests/2-test-parser-scope-resolution.test.ts) (3 occurrences).

---

## B. `object-literal-vs-block` line 63: must read as an expectation

**Problem:** A bare chain ending in `.as_ViewRender` is a type-narrowing side effect; readers do not see an assertion.

**Preferred fix:** use an explicit expectation on the same node, e.g.

- `render.block.statements.only.match({ $type: 'ViewRender' })`, or
- `expect(render.block.statements.only.unwrap()).toMatchObject({ $type: 'ViewRender' })`

`.match({ $type: 'ViewRender' })` is preferred for consistency with other parser tests and stays on the `Wrapped` path.

**File:** [`2-test-parser-object-literal-vs-block.test.ts`](packages/compiler/compiler-tests/2-test-parser-object-literal-vs-block.test.ts) (Inner `{ Text "x" }` test).

---

## C. `expectParseHasHumanErrors` helper

**Problem:** `const errors = await parseASTWithErrors(\`…\`); expectHasHumanErrors(errors)` is two steps and repeats.

**Add to** [`test-harness.ts`](packages/compiler/compiler-tests/test-utils/test-harness.ts) (or colocate in [`diagnostics.ts`](packages/compiler/compiler-tests/test-utils/diagnostics.ts) if you want all human-error asserts in one module — harness is fine if it already owns `parseASTWithErrors`):

```ts
/** expectParseHasHumanErrors parses `code` expecting pipeline errors and asserts at least one human diagnostic. */
export async function expectParseHasHumanErrors(code: string, stdLibRoot = ''): Promise<ParseError> {
  const report = await parseASTWithErrors(code, stdLibRoot)
  expectHasHumanErrors(report)
  return report
}
```

**Optional extension (later):** overload or second export `expectParseHumanMessagesContain(code, ...needles)` = parse + `expectHumanMessagesContain` for the common “substring” case without touching large files like `3-test-validation.test.ts` in the first pass.

**First-pass call sites:** [`2-test-parser-object-literal-vs-block.test.ts`](packages/compiler/compiler-tests/2-test-parser-object-literal-vs-block.test.ts) (both error-only tests); optionally [`2-test-parser-objects.test.ts`](packages/compiler/compiler-tests/2-test-parser-objects.test.ts) empty-object test if it is only `expectHasHumanErrors`.

---

## D. Optional follow-ups (unchanged from prior plan)

- Grep `compiler-tests` for redundant `.unwrap()` where `Wrapped` already exposes the path.
- Avoid stringly path APIs unless repetition justifies a small navigator helper.

---

## Implementation todos

1. **scope-root-wrap** — Replace `.unwrap().root.ref` + `toMatchObject` with `.root.match` in `2-test-parser-scope-resolution.test.ts`.
2. **object-literal-inner-expect** — Replace bare `.only.as_ViewRender` with `.only.match({ $type: 'ViewRender' })` (or equivalent) in `2-test-parser-object-literal-vs-block.test.ts`.
3. **expect-parse-has-human-errors** — Add `expectParseHasHumanErrors` to harness (or diagnostics + re-export), migrate object-literal-vs-block (+ objects if applicable).
