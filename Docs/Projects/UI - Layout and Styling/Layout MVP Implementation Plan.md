# Layout MVP Implementation Plan

Purpose: break the full Tao layout MVP into commit-sized implementation steps.

This plan implements the active layout contract from:

- [UI Layout Concepts](../../Tao%20Language%20Design/UI%20Layout%20Concepts.md)
- [UI Layout Specification](../../Tao%20Language%20Design/UI%20Layout%20Specification.md)
- [UI Declaration and Render Slots Specification](../../Tao%20Language%20Design/UI%20Declaration%20and%20Render%20Slots%20Specification.md)

This is a hard migration. Remove implementation choices that do not match the active specs. Do not preserve legacy `view` declarations, old layout words, or compatibility aliases.

## Goals

- Replace user-facing `view` declarations with `ui`, `frame`, and `layout`.
- Add material public roots through explicit `render` statements.
- Add opaque caller children through `@@children`.
- Replace the old layout v1 words with the spec vocabulary:

  ```text
  items | aligned | stretched
  width | height | fill | hug | grow | compress | rigid
  gap | pad
  ```

- Implement deterministic validation, merge behavior, and React Native/Yoga lowering.
- Update the standard library, compiler tests, formatter tests, runtime tests, and test apps.
- Keep the implementation aligned with React Native/Expo behavior, a Tao runtime helper, or a clear validation/runtime error.

## Non-Goals

These concepts remain deferred and should not be smuggled into this MVP:

```text
style syntax
margin
border/radius
scroll containers
raw overflow syntax
raw wrap syntax
raw absolute positioning
z/layer
order/reverse
aspect ratio
display contents
measure functions
animations/transitions
general unit syntax
theme tokens
localization mirroring
native/atom injection beyond trusted std-lib wrappers
events
state
queries
named render slots
rich/editable/selectable text
```

`nudge` and `overlay` are designed concepts, but they are not part of this implementation batch.

## Commit Strategy

Use one commit per numbered step when practical. Each step is a coherent review unit, not necessarily a fully shippable language state by itself.

Steps 1, 3, and 7 are migration-heavy. Steps 2, 4, 5, and 6 are the main semantic changes. Step 8 is cleanup and final verification.

Avoid helper-only commits unless a step becomes too large to review coherently. Do not stage changes except when actually committing.

## Implementation Status

- Step 1: complete in `adb1dde` (`feat(layout): cut over UI declaration keywords`).
- Step 2: complete in the current implementation commit.
  - Replaced the old layout-v1 bracket vocabulary with the MVP heads: `items`, `aligned`, `stretched`, `width`, `height`, `fill`, `hug`, `grow`, `compress`, `rigid`, `gap`, and `pad`.
  - Added shared standard-container direction/default helpers for `Row`, `Col`, `Box`, `Stack`, and `WrappingRow`.
  - Rewrote layout validation for item slot claims, parent-axis self alignment, size/pressure conflicts, numeric rules, legacy/deferred word rejection, and malformed entries.
  - Updated serialized layout specs and runtime lowering to emit React Native/Yoga style props through the Tao runtime resolver, including `overflow: "hidden"` defaults.
  - Updated parser, validation, codegen, formatter, runtime tests, and the active Kitchen Sink layout fixture.
- Steps 3 through 8: pending.

## Step 1. Declaration Kind Cutover

Goal: replace the user-facing declaration keyword while preserving the current render-body behavior temporarily.

This step gets the parser, formatter, scope, type system, codegen, std-lib, and fixtures onto the new declaration categories before changing root semantics.

Implementation:

- Change the grammar so UI-producing declarations use one of:

  ```text
  ui | frame | layout
  ```

- Keep `view` as the internal umbrella concept only. If preserving an internal AST name such as `ViewDeclaration` avoids churn, keep it, but expose a concrete declaration kind on the AST.
- Remove user-facing `view` declaration parsing. Code that still writes `view Foo` should fail after this step.
- Keep `app { ui Root }` unchanged. The `ui` in an app block still names the app's root UI declaration.
- Update scope computation and scope provider behavior so `ui`, `frame`, and `layout` declarations remain referenceable by render calls, app roots, argument binding, and imports.
- Update type-system call-site validation so all three declaration kinds are callable UI declarations.
- Update formatter rules and tests for the new keywords.
- Mechanically migrate declarations in:
  - `packages/tao-std-lib/tao/ui/Views.tao`
  - compiler parser/validation/codegen tests
  - formatter tests
  - `Apps/Test Apps/**`

Classification default for migration:

- Use `ui` for declarations that present complete content and do not accept unnamed caller children.
- Use `frame` for composed objects that should hug their contents and eventually place `@@children`.
- Use `layout` for area-like regions that should fill available space and eventually arrange `@@children`.
- For this first step, if a declaration's eventual classification is unclear, choose the kind implied by the active specs and surrounding examples rather than preserving old behavior.

Exit criteria:

- The repo no longer contains user-facing `view` declaration syntax in active Tao fixtures.
- Parser tests cover `ui`, `frame`, and `layout` declarations.
- Existing call-site argument binding still works for all three declaration kinds.
- Existing codegen behavior is otherwise unchanged except for declaration kind parsing and emitted names.

Suggested validation:

```sh
./agent gen
./agent test parser
./agent test formatter
./agent test compiler
```

## Step 2. Spec Layout Vocabulary And Lowering

Goal: replace the old bracketed layout vocabulary with the active layout specification.

This step should remove the old v1 layout language rather than layering the new one on top.

Implementation:

- Rewrite layout validation around the spec heads:

  ```text
  items
  aligned
  stretched
  width
  height
  fill
  hug
  grow
  compress
  rigid
  gap
  pad
  ```

- Reject old or out-of-scope layout words directly, including:

  ```text
  centered
  packed
  row
  column
  wrap
  nowrap
  margin
  absolute
  relative
  top/right/bottom/left offsets
  row_gap
  column_gap
  shrink
  basis
  z
  around
  evenly
  ```

- Parse and validate `items` as the only parent-child arrangement head.
- Normalize `items` order-insensitively:
  - resolve non-`center` tokens to vertical or horizontal slot claims;
  - reject duplicate slot claims;
  - use `center` to fill empty slots;
  - fill missing slots from the container default.
- Implement standard container defaults:

  | Container     | Missing vertical slot | Missing horizontal slot |
  | ------------- | --------------------- | ----------------------- |
  | `Row`         | `baseline`            | `left`                  |
  | `Col`         | `top`                 | `stretch`               |
  | `Box`         | `center`              | `left`                  |
  | `Stack`       | `top`                 | `center`                |
  | `WrappingRow` | `baseline`            | `left`                  |

- Validate `aligned` by parent direction:
  - horizontal parent: `top`, `center`, `bottom`, `baseline`;
  - vertical parent: `left`, `center`, `right`;
  - `aligned stretch` is invalid;
  - `stretched` is the stretch form.
- Validate size and pressure:
  - duplicate width or height heads in one clause are errors;
  - bare `fill` cannot appear with `width` or `height` heads in the same clause;
  - `compress + rigid` is an error;
  - `stretched + cross-axis hug` is an error after parent direction is known;
  - `grow + rigid`, `grow + compress`, `fill + rigid`, and `fill + compress` are valid.
- Implement `pad` resolution:
  - naked value sets all sides;
  - `horizontal` sets left and right;
  - `vertical` sets top and bottom;
  - edge-specific values override earlier broad values;
  - unset sides default to `0`.
- Implement runtime lowering to React Native/Yoga:
  - `items` to `alignItems` and `justifyContent`;
  - spread variants to `space-between`, `space-around`, and `space-evenly`;
  - `gap` to `gap`;
  - resolved `pad` to padding side props;
  - `width`, `height`, min, and max to RN size props;
  - `grow` to `flexGrow`;
  - `compress` and `rigid` to `flexShrink`;
  - `aligned` and `stretched` to `alignSelf`;
  - default clipping to `overflow: "hidden"`.

Exit criteria:

- Runtime layout tests cover all supported heads and defaults.
- Validation tests cover malformed heads, legacy word rejection, deferred word rejection, axis conflicts, pressure conflicts, and malformed numeric values.
- Codegen still emits structured layout data through the Tao runtime resolver.

Suggested validation:

```sh
./agent test layout
./agent test compiler
./agent expo-runtime test
```

## Step 3. Material `render` Roots

Goal: give every UI-producing declaration one material public root.

This step changes declaration body semantics. It should be reviewed as a root-model change, not just syntax.

Implementation:

- Add a top-level `render` statement inside `ui`, `frame`, and `layout` declarations.
- A declaration must have exactly one public root.
- The `render` statement creates no hidden wrapper. The rendered target is the public root.
- Generated React code may still use fragments internally, but no public Tao declaration is rootless.
- Codegen for a declaration returns the public root instead of returning a fragment over every body statement.
- Non-root declaration body statements that remain legal should be compile-time declarations, aliases, states, actions, queries, guards, or trusted injection that support the root. They should not create additional public roots.
- Validation should report:
  - missing root;
  - multiple roots;
  - invalid root statement shape.
- Migrate former multi-root bodies into real material roots:
  - `layout` pages/screens commonly wrap in `Col`;
  - horizontal frames commonly wrap in `Box`;
  - vertical frames commonly wrap in `Stack`;
  - list or screen regions commonly wrap in `Col` or `WrappingRow`.

Exit criteria:

- Parser tests cover `render Foo ...` statements.
- Validation tests cover no root and multiple roots.
- Codegen tests show a declaration returning its root directly.
- Migrated fixtures no longer depend on implicit fragment roots.

Suggested validation:

```sh
./agent gen
./agent test compiler
./agent test formatter
```

## Step 4. Caller Children And `@@children`

Goal: make `frame` and `layout` receive caller-provided unnamed children through an explicit splice.

This is the highest-risk behavior step because it changes call body ownership and layout routing.

Implementation:

- Add `@@children` syntax as a render splice.
- `@@children` is legal only in `frame` and `layout` declaration bodies.
- Ordinary Tao `frame` and `layout` declarations must place exactly one static `@@children`.
- `ui` declarations must reject `@@children`.
- `@@children` cannot appear inside loops or conditionals in MVP.
- `@@children` cannot be inspected, duplicated, reordered, looped over, or individually wrapped.
- Pass unnamed caller children through `_ViewProps.children`.
- Where `@@children` appears, all caller children render there.
- The `@@children` host is the nearest explicit container whose child list directly contains `@@children`.
- Caller container specs such as `items` and `gap` route to the `@@children` host.
- If the host also contains declaration-owned siblings, caller container specs affect those siblings too.
- To isolate caller container specs, authors should use an explicit inner host:

  ```tao
  frame LabeledSection Label text {
    render Stack [gap 12] {
      Text Label
      Stack [gap 8] {
        @@children
      }
    }
  }
  ```

- Allow trusted raw-injection std-lib/native wrappers to forward `_ViewProps.children` when they intentionally implement a material root in TypeScript.

Exit criteria:

- Validation tests cover `@@children` in `ui`, missing `@@children`, duplicate `@@children`, and illegal dynamic placement.
- Codegen tests show children passed from a call site and inserted at the splice point.
- Layout routing tests show caller container specs target the `@@children` host.
- Existing unnamed child call sites are legal only for `frame` and `layout`.

Suggested validation:

```sh
./agent test compiler
./agent expo-runtime test
./agent headless-test-runtime test
```

## Step 5. Public Layout Defaults And Merge Rules

Goal: implement default and override behavior from the spec.

This step should make layout predictable across kind defaults, declaration defaults, internal root specs, and render-site overrides.

Implementation:

- Add declaration-line layout clauses:

  ```tao
  ui Pill Label text [compress, pad 8] {
    render Box {
      Text Label
    }
  }
  ```

- Apply kind defaults:
  - `ui`: `rigid + hug`, unless explicit public size;
  - `frame`: `rigid + hug`;
  - `layout`: `compress + fill`.
- Merge outer/public specs:

  ```text
  view kind defaults
    < declaration-line public defaults
    < render-site call overrides
  ```

- Merge `frame` and `layout` container specs:

  ```text
  declaration host defaults
    < caller container overrides
  ```

- Split layout heads by target category:
  - self layout targets the public root;
  - container layout targets the child-arranging host;
  - `ui` calls reject container specs.
- Validate that declaration-line public specs and internal render-root specs do not set the same outer/public property in MVP.
- Let codegen assume validation has already enforced conflicts.

Exit criteria:

- Tests show kind defaults applied without explicit clauses.
- Tests show declaration-line defaults overridden by call-site specs.
- Tests show caller container specs routed to the `@@children` host.
- Tests reject public/internal property conflicts.
- Tests reject container specs on `ui` calls.

Suggested validation:

```sh
./agent test compiler
./agent expo-runtime test
```

## Step 6. Standard Library MVP Views

Goal: finalize the shipped standard-library views against the active spec.

The standard library should remain normal Tao declarations plus trusted injection where needed. These are specified views, not compiler-only built-ins.

Implementation:

- Implement core layout/frame views:

  | Name          | Kind     | Direction       | Default self profile                 | Default `items` |
  | ------------- | -------- | --------------- | ------------------------------------ | --------------- |
  | `Row`         | `layout` | horizontal      | `compress + fill`                    | `baseline left` |
  | `Col`         | `layout` | vertical        | `compress + fill`                    | `top stretch`   |
  | `Box`         | `frame`  | horizontal      | `rigid + hug`                        | `center left`   |
  | `Stack`       | `frame`  | vertical        | `rigid + hug`                        | `top center`    |
  | `WrappingRow` | `layout` | horizontal wrap | `compress + width fill + height hug` | `baseline left` |

- `WrappingRow` emits one `View` root with:

  ```ts
  {
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    alignItems: "baseline",
    justifyContent: "flex-start",
    flexShrink: 1,
  }
  ```

- Implement core text/control views:
  - `Text Value`: one line, tail ellipsis;
  - `TextLabel Value`: one line, hard clip;
  - `MultiLineText Value`: wraps naturally with no Tao-emitted line limit;
  - `MultiLineText Value Lines N`: normal Tao argument, forwarded by injection/runtime wrapper;
  - `Number Value`: text wrapper for numeric values;
  - `Button Title, Action`: trusted wrapper that forwards `_taoLayout`.
- Do not add compiler special cases for `MultiLineText Lines N`.
- Keep React Native/Expo as the runtime authority for text and layout behavior.

Exit criteria:

- Runtime tests cover base style and layout forwarding for every std-lib view.
- Std-lib Tao declarations compile using the new declaration and root model.
- Test apps can import and render all MVP std-lib views.

Suggested validation:

```sh
./agent test compiler
./agent expo-runtime test
./agent headless-test-runtime test
```

## Step 7. App And Fixture Migration

Goal: migrate active examples and fixtures so the repository demonstrates the final language surface.

This step is intentionally migration-heavy. Keep it mostly mechanical and avoid changing unrelated app behavior.

Implementation:

- Migrate all remaining active Tao fixtures under `Apps/Test Apps/**`.
- Migrate Kitchen Sink modules.
- Replace old layout clauses with spec clauses.
- Replace former implicit fragment bodies with explicit material roots.
- Add or update at least one broad layout showcase covering:
  - `items` normalization;
  - `gap`;
  - `pad`;
  - `width` and `height`;
  - `fill`, `hug`, `grow`, `compress`, and `rigid`;
  - `aligned` and `stretched`;
  - `WrappingRow`;
  - `Text`, `TextLabel`, `MultiLineText`, and line-limited `MultiLineText`.
- Keep the showcase realistic enough to exercise runtime behavior, not just parser syntax.

Exit criteria:

- Active test apps no longer use old `view` declarations.
- Active test apps no longer use old layout words.
- Shared scenarios compile and render in Expo/headless tests.
- Kitchen Sink demonstrates the MVP surface.

Suggested validation:

```sh
./agent test compiler
./agent expo-runtime test
./agent headless-test-runtime test
```

## Step 8. Cleanup And Verification

Goal: remove dead transitional code and prove the final branch is coherent.

Implementation:

- Remove old layout helper branches, diagnostics, tests, and stale docs references that describe removed implementation behavior.
- Keep the active concepts/spec docs intact unless implementation uncovers a real contradiction.
- Update `Layout and Styling Project Plan.md` status if needed after implementation lands.
- Confirm no active code, tests, or examples still depend on:

  ```text
  view declarations
  centered
  packed
  bare top/left layout words
  row/column layout words
  wrap/nowrap layout words
  margin
  absolute/relative offsets
  row_gap/column_gap
  shrink
  around/evenly
  ```

Final verification:

```sh
./agent gen
./agent test compiler
./agent test formatter
./agent expo-runtime test
./agent headless-test-runtime test
./agent check
./agent fix
./agent prep-commit
```

`./agent fix` and `./agent prep-commit` should run before the final implementation commit. If either changes files, inspect the diff before committing.

## Key Files

Expected implementation touchpoints:

- Grammar: `packages/parser/tao-grammar.langium`
- Parser generated output: generated by `./agent gen`
- Validation: `packages/compiler/compiler-src/validation/`
- Layout serialization/modeling: `packages/compiler/compiler-src/layout/`
- Shared layout helpers: `packages/shared/shared-src/layout/`
- Typing and argument binding: `packages/compiler/compiler-src/typing/`
- Formatter: `packages/formatter/formatter-src/TaoFormatter.ts`
- Codegen: `packages/compiler/compiler-src/codegen/app/runtime-gen.ts`
- Runtime layout helpers: `packages/tao-std-lib/tao/tao-runtime/Layout.ts`
- Runtime view wrappers: `packages/tao-std-lib/tao/tao-runtime/Views.tsx`
- Standard UI declarations: `packages/tao-std-lib/tao/ui/Views.tao`
- Tests: `packages/compiler/compiler-tests/`, `packages/formatter/formatter-tests/`, `packages/expo-runtime/tests-expo-runtime/`, `packages/headless-test-runtime/tests/`
- Apps: `Apps/Test Apps/**`

## Risks And Review Focus

- Declaration kind migration can create noisy diffs. Keep semantic edits separate from purely mechanical fixture migration where possible.
- `render` root semantics will invalidate assumptions in codegen that a view body returns a fragment. Review generated TSX carefully.
- `@@children` routing needs precise ownership: self specs target the public root, while container specs target the child host.
- `items center` normalization is easy to implement inconsistently. Keep normalization pure and well-tested.
- `fill`, `hug`, `grow`, `compress`, and `rigid` need post-merge validation because defaults and overrides can create conflicts.
- Text variants should remain normal std-lib views. Do not turn `MultiLineText Lines N` into parser or compiler magic.
- Runtime lowering should avoid re-specifying React Native behavior beyond deterministic Tao mapping.

## Done Definition

The layout MVP is done when:

- New syntax is accepted and old syntax is rejected.
- `ui`, `frame`, and `layout` have distinct validation behavior.
- Every UI-producing declaration has one material public root.
- `frame` and `layout` route unnamed caller children through one static `@@children`.
- Layout specs merge deterministically and lower to RN/Yoga styles.
- Std-lib views match the MVP table in `UI Layout Specification.md`.
- Active test apps and Kitchen Sink use the new syntax.
- Compiler, formatter, Expo runtime, headless runtime, and repo checks pass.
