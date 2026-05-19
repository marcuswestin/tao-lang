# Layout Era Architecture Improvements Plan

Purpose: reduce the structural risk introduced during the layout, render-root, children, theme, and design-inference implementation era without changing Tao language behavior.

This is a standalone compiler architecture cleanup plan under `Docs/Projects/`. It is not part of the layout/styling feature-track folder because the work crosses validation, codegen, formatter, design inference, and test organization.

The most important goal is to consolidate view-host AST helpers into a shared layout-domain module so future validator and codegen changes use one model. The premise is not that many helpers are literally duplicated today. Only `nearestViewDeclaration` is currently duplicated between validator and codegen; the larger risk is that related view-host concepts are split across files and will drift as layout, render-host, and children rules evolve.

## Baseline Context

Baseline commit:

```text
ea4d93a feat(layout): add view render layout clause v1
```

The layout era grew several compiler areas at the same time:

- `packages/compiler/compiler-src/validation/tao-lang-validator.ts` absorbed render-root, children-splice, view-host layout, and variant checks.
- `packages/compiler/compiler-src/validation/LayoutValidator.ts` became the owner for layout vocabulary and clause validation.
- `packages/compiler/compiler-src/codegen/app/runtime-gen.ts` gained layout merge and host-routing code in two regions: render-host methods around lines `840-879`, and helper/merge functions around lines `1116-1229`.
- `packages/compiler/compiler-src/design/design-suggestion-provider.ts` introduced a large design-inference provider surface.
- `packages/formatter/formatter-src/TaoFormatter.ts` gained layout, render, children, and variant formatting branches.

Working patterns to preserve:

- `validation/data/` is the preferred shape for domain validators: focused files, local messages, and an `index.ts` barrel.
- `layout/tao-layout.ts` plus `@shared/layout/layout-axis` keep parser-independent layout serialization and item normalization shared.
- `tao-services.ts` should keep using a single validation registry spread rather than a separate per-domain registry.
- Validation owns user-facing semantics. Codegen should assume validation already ran and use assertions only for unreachable internal states.
- Runtime layout merge is the current accepted model. Keep generated output source-traceable and continue emitting `TR.Layout.resolveMerged(...)` unless a later design decision explicitly changes that.

## Goals

- Consolidate view-host AST helpers used by validation and codegen into one layout-domain module.
- Pull view/render/children/variant validation out of the main validator.
- Keep layout validation extensible without turning `LayoutValidator.ts` into the long-term home for styling.
- Extract layout codegen from `runtime-gen.ts` after the shared model exists.
- Split formatter and design-provider files only when doing so lowers risk for the next real feature.
- Add targeted predicate, golden-output, and parity checks where refactors could silently change behavior.

## Non-Goals

- Do not change Tao syntax or user-facing layout semantics.
- Do not rewrite `runtime-gen.ts` wholesale.
- Do not move layout merge from runtime to compiler-side pre-merge in this cleanup.
- Do not add a parallel validation registry.
- Do not put styling rules permanently in `LayoutValidator.ts`.
- Do not touch formatter or design LLM provider code as standalone churn unless earlier steps make it necessary.
- Do not stage or commit changes unless explicitly asked.

## Recommended Batches

First PR or first implementation pass:

1. Step 1: shared view-host layout helpers.
2. Step 2: `validation/view/` extraction.
3. Step 4 only if Steps 1 and 2 together touch at most 8 source/test files, add no more than 450 non-doc changed lines, and `./agent test compiler` is already green.

Steps 1 and 2 should land in the same PR. They do not need to be the same commit, but Step 1 must update existing call sites immediately so the new helper module is live when it lands.

Later passes:

- Step 3 when the next layout vocabulary or style-adjacent validation change starts.
- Step 5 when the next formatter syntax change starts.
- Steps 6 and 7 when the next design-inference or runtime-generator feature starts.
- Step 8 when the next type-system feature starts.

## Governing Skills

Use the relevant Tao skills before changing each area:

- `tao-compiler-work` for parser, validation, type checks, codegen, and runtime emission.
- `langium-formatting` for formatter extraction or formatter tests.
- `langium-scoping` if view-host extraction touches references or scope behavior.
- `git-workflow` for status, staging, commits, prep-commit, and squash-merge workflow.
- `convention-audit` if a proposed split starts drifting from repo patterns.
- `todo-batch` when implementing a coherent subset from this plan and stopping after validation.

## Commit Guidance

Use one commit per coherent step when practical, and run `./agent prep-commit` before every commit.

Suggested step subjects:

- `refactor(layout): share view-host layout helpers`
- `refactor(validation): extract view host validators`
- `refactor(validation): split layout validator internals`
- `refactor(codegen): extract view layout emission`
- `refactor(formatter): split view and layout formatting`
- `refactor(design): split design provider internals`
- `tests(validation): move view validation cases`

When eventually merging a feature branch into `main`, squash merge as required by `AGENTS.md`: one subject line, short overview bullets, then Git's full default `Squashed commit of the following:` appendix with every original squashed commit.

## Step 0. Reconfirm Current Shape

Context:

The original architecture notes were written from a moving branch. Before implementation, recheck the active checkout so stale line counts or old assumptions do not drive the refactor.

Do:

- Confirm the working tree and branch:

  ```sh
  ./agent git status --short --branch
  ```

- Confirm the current view-host helper surface:

  ```sh
  ./agent rg -n "layoutClauseHasContainerEntries|isContainerLayoutEntry|nearestViewDeclaration|publicSelfLayoutConflictKey|kindDefaultSelfEntryValues|childrenSplicesInDeclaration|viewDeclarationUsesChildrenSplice|viewDeclarationRoutesCallerContainerLayout" packages/compiler/compiler-src
  ```

- Re-read the owning files before editing:
  - `packages/compiler/compiler-src/validation/tao-lang-validator.ts`
  - `packages/compiler/compiler-src/validation/LayoutValidator.ts`
  - `packages/compiler/compiler-src/codegen/app/runtime-gen.ts`
  - `packages/compiler/compiler-src/layout/tao-layout.ts`
  - `packages/shared/shared-src/layout/layout-axis.ts`
  - `packages/compiler/compiler-src/langium/tao-services.ts`

- Record the current golden-test inventory before refactoring:
  - compiler codegen tests in `packages/compiler/compiler-tests/6-test-codegen-bindings.test.ts`;
  - design inference/codegen tests in `packages/compiler/compiler-tests/7-test-design-inference.test.ts`;
  - design provider tests in `packages/compiler/compiler-tests/8-test-design-llm-provider.test.ts`;
  - layout runtime tests in `packages/expo-runtime/tests-expo-runtime/layout-resolve.jest-test.ts`;
  - formatter fixed-point tests in `packages/formatter/formatter-tests/1-test-formatter.test.ts`.

Exit criteria:

- The exact functions to move are known.
- Any unrelated dirty worktree state is understood.
- The relevant golden-output and behavior tests are known.
- No edits have been made yet.

Validation:

- No test run required for this reconnaissance step.

## Step 1. Add Shared View-Host Layout Helpers

Context:

Validator and codegen currently own adjacent pieces of the same view-host model. Only `nearestViewDeclaration` is literally duplicated today, but the layout host concepts already span validation-only helpers, codegen-only helpers, and differently named container-entry predicates. The goal is shared ownership for future changes, not a large duplicate-removal diff.

Target module:

```text
packages/compiler/compiler-src/layout/view-host-layout.ts
```

Do:

- Add pure AST helper functions in the layout domain:
  - `isContainerLayoutEntry(entry)`
  - `isSelfLayoutEntry(entry)`
  - `partitionLayoutEntries(clause)`
  - `publicSelfLayoutConflictKey(entry)`
  - `nearestViewDeclaration(node)`
  - `childrenSplicesInDeclaration(decl)`
  - `viewDeclarationUsesChildrenSplice(decl)`
  - `viewDeclarationRoutesCallerContainerLayout(decl)`
  - `kindDefaultSelfEntryValues(decl)`
- Move existing logic first; do not redesign merge semantics.
- Keep parser-specific traversal in compiler code, not in `packages/shared`.
- Reuse existing serialization helpers from `layout/tao-layout.ts` where practical.
- Update existing call sites in `tao-lang-validator.ts` and `runtime-gen.ts` in this step so the new helper module is live immediately.
- Add focused unit tests for pure predicates if the compiler test structure supports them cleanly. At minimum, add regression coverage through existing compiler/codegen validation tests for:
  - `items` and `gap` count as container entries;
  - `aligned`, `stretched`, `fill`, `hug`, `grow`, `compress`, `rigid`, `width`, `height`, and `pad` count as public self layout keys;
  - standard kind defaults remain unchanged for `ui`, `frame`, `layout`, and `WrappingRow`.

Exit criteria:

- View-host layout helpers live in `layout/view-host-layout.ts`.
- Existing validator and codegen call sites import and use the shared helpers.
- The one literal `nearestViewDeclaration` duplication is gone.
- Container/self layout classification is expressed by one shared helper model.
- Codegen still emits runtime merge calls in the current shape.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 2. Extract View, Render, Children, And Variant Validation

Context:

`tao-lang-validator.ts` should orchestrate file-level and block-level validation, not own every view-host rule. The data validators already show the desired shape: focused modules under `validation/data/` with messages and exports collected by a barrel.

Target directory:

```text
packages/compiler/compiler-src/validation/view/
```

Do:

- Add `validation/view/index.ts` as the barrel.
- Add `validation/view/view-messages.ts` for render, children, declaration-layout conflict, and variant diagnostics currently stored in `validationMessages`.
- Add `validation/view/ViewDeclarationValidator.ts` for:
  - exactly one top-level render root;
  - duplicate render roots;
  - children-splice count;
  - `@@children` not allowed in `ui`;
  - static directly hosted `@@children`;
  - declaration-line layout versus public render-root self-layout conflicts;
  - `ui` declaration container-layout rejection.
- Add `validation/view/ViewHostValidator.ts` for:
  - `RenderStatement` placement;
  - render target reference checks;
  - `ui` call children rejection;
  - `ui` call caller-container-layout rejection;
  - composition of `RenderStatement` and `ViewRender` checks from view-host, layout, and type-system validators.
- Add `validation/view/VariantValidator.ts` for:
  - variant target kind checks;
  - variant cycle checks;
  - integration with `design/variant-resolution.ts`.
- Move helper functions only when the receiving module naturally owns them. Shared host helpers from Step 1 stay in `layout/view-host-layout.ts`.
- Keep `tao-lang-validator.ts` responsible for:
  - `TaoFile`;
  - `Block`;
  - app-level provider/design checks;
  - shared duplicate identifier checks;
  - spreading domain validators.
- Make `ViewHostValidator` own `RenderStatement` and `ViewRender` composition. `tao-lang-validator.ts` should only spread validator objects, mirroring the `validation/data/` pattern.

Exit criteria:

- `tao-lang-validator.ts` is materially smaller and reads as orchestration.
- View/render/children/variant diagnostics are still exported through the main `validationMessages` object or a merged equivalent.
- No diagnostics are intentionally renamed or reworded unless tests require updating stale expectations.
- `tao-services.ts` still receives a single validation-checks object.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 3. Split Layout Validation Internals

Context:

`LayoutValidator.ts` is already useful as a separate validator, but it owns too many concerns: vocabulary tables, messages, clause state, entry validators, and public exports. The split should wait until the next layout-head or style-adjacent change so the churn buys immediate clarity.

Target directory:

```text
packages/compiler/compiler-src/validation/layout/
```

Do:

- Move layout vocabulary tables to `validation/layout/vocabulary.ts`:
  - supported layout heads;
  - deferred words;
  - removed words;
  - out-of-layout words routed to styling or other future domains.
- Move messages to `validation/layout/messages.ts`.
- Move clause state to `validation/layout/clause-state.ts`:
  - `ClauseState`;
  - state mutation helpers;
  - final state validation.
- Move per-head validators to `validation/layout/entry-validators.ts`:
  - `items`;
  - `aligned`;
  - `stretched`;
  - dimensions;
  - fill/hug;
  - grow/compress/rigid;
  - `gap`;
  - `pad`.
- Keep `validation/layout/LayoutValidator.ts` as the thin public file that exports:
  - `layoutValidationMessages`;
  - `layoutValidator`;
  - `validateViewDeclarationLayoutClause`.
- Add `validation/layout/index.ts` and update imports.
- Preserve the old public import path temporarily only if it avoids needless churn. If the import path changes, update all callers in one focused commit.

Exit criteria:

- Layout validation has one public surface and several small implementation files.
- Styling words are still rejected or routed as out-of-layout, not accepted by layout validation.
- Existing layout validation tests still pass without semantic changes.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 4. Extract View Layout Codegen

Context:

`runtime-gen.ts` has layout host routing, declaration defaults, render-site layout specs, and merge-expression construction in two regions:

- render-host methods around lines `840-879`;
- helper/merge functions around lines `1116-1229`.

Once Step 1 provides shared host helpers, this code can move without duplicating validator semantics.

Target module:

```text
packages/compiler/compiler-src/codegen/app/view-layout-gen.ts
```

Do:

- Move layout-specific codegen functions out of both runtime-gen layout regions, including:
  - view-render layout spec emission;
  - declaration public self entry value emission;
  - declaration container entry value emission;
  - kind default self entry value usage;
  - caller container routing expressions;
  - `TR.Layout.resolveMerged(...)` expression construction.
- Import shared helpers from `layout/view-host-layout.ts`.
- Import serialization from `layout/tao-layout.ts`.
- Keep runtime merge semantics unchanged.
- Keep `runtime-gen.ts` as the orchestrator that asks the layout module for expressions or props.
- Avoid a broader `runtime-gen.ts` rewrite in this step.
- Before editing, record the current behavior covered by:
  - `packages/compiler/compiler-tests/6-test-codegen-bindings.test.ts`;
  - `packages/compiler/compiler-tests/7-test-design-inference.test.ts`;
  - `packages/compiler/compiler-tests/8-test-design-llm-provider.test.ts`;
  - `packages/expo-runtime/tests-expo-runtime/layout-resolve.jest-test.ts`;
  - formatter fixed-point coverage for generated or fixture syntax in `packages/formatter/formatter-tests/1-test-formatter.test.ts`.

Exit criteria:

- `runtime-gen.ts` no longer owns layout predicate logic.
- Existing codegen, design, runtime, and formatter fixed-point tests remain behavior-identical except for harmless formatting.
- Runtime layout tests still prove current merge behavior.

Validation:

```sh
./agent test compiler
./agent expo-runtime test layout
./agent check
```

If the `expo-runtime` filter does not match the local recipe shape, use the focused runtime test command documented in the current Expo runtime package.

## Step 5. Split Formatter Domain Files

Context:

The formatter is large and has absorbed layout, render-root, children, variant, and design syntax. This is moderate risk, not the first bottleneck. Split only when the next syntax change touches formatter behavior.

Target modules:

```text
packages/formatter/formatter-src/view-formatter.ts
packages/formatter/formatter-src/layout-formatter.ts
```

Do:

- Use stateless function delegation, not class or mixin inheritance.
- Move view-family formatters to `view-formatter.ts`:
  - `ViewDeclaration`;
  - `RenderStatement`;
  - `ViewRender`;
  - `ChildrenSplice`;
  - `VariantDeclaration`;
  - `DesignSpec`, if it is formatted with the same view-family dispatch.
- Move layout formatting to `layout-formatter.ts`:
  - `LayoutClause`;
  - `LayoutEntry`;
  - `LayoutTerm`;
  - helper formatting for one-line versus multiline layout clauses.
- Keep `TaoFormatter.ts` as the top-level dispatch owner.
- Do not reformat unrelated formatter code.
- Run the formatter idempotency check twice on a representative corpus without rewriting tracked files. Prefer the existing formatter test harness; if a manual corpus is needed, copy fixtures to a temp directory and compare outputs there.

Exit criteria:

- Formatter tests stay idempotent.
- A twice-format check proves the representative corpus is byte-identical after the second format.
- Layout syntax formatting is isolated from unrelated expression/declaration formatting.
- No source formatting expectations change except where the next syntax feature explicitly requires it.

Validation:

```sh
./agent test formatter
./agent check
```

## Step 6. Split Design Suggestion Provider

Context:

The design suggestion provider is a separate large file created during the same era. It is not the same correctness risk as split validator/codegen ownership, but it will become hard to evolve if prompt construction, schema, normalization, and provider wiring all remain in one file.

Target modules:

```text
packages/compiler/compiler-src/design/design-llm-prompt.ts
packages/compiler/compiler-src/design/design-llm-schema.ts
packages/compiler/compiler-src/design/design-llm-normalize.ts
packages/compiler/compiler-src/design/design-suggestion-provider.ts
```

Do:

- Move prompt construction to `design-llm-prompt.ts`.
- Move LLM response schema definitions to `design-llm-schema.ts`.
- Move response normalization, defaulting, and validation into `design-llm-normalize.ts`.
- Keep `design-suggestion-provider.ts` as the thin provider factory and orchestration layer.
- Preserve lock-file behavior, accepted-entry behavior, stale-lock diagnostics, and any current hidden suggestion flow.
- Do not change prompt wording as part of the file split unless a test or explicit follow-up calls for it.
- Before editing, inventory `packages/compiler/compiler-tests/8-test-design-llm-provider.test.ts` and any design inference/codegen tests that assert provider output shape.

Exit criteria:

- Provider orchestration can be read without reading prompt text and schema details inline.
- Schema and normalization can be tested independently if existing test structure supports it.
- No design suggestion output changes intentionally.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 7. Continue Runtime Generator Decomposition

Context:

After Step 4, `runtime-gen.ts` may still be large. The next likely extraction is view-render emission, but it should happen only after layout codegen is out and there is a concrete next feature touching render emission.

Possible target module:

```text
packages/compiler/compiler-src/codegen/app/view-render-gen.ts
```

Do:

- Identify a coherent slice around view render host emission.
- Keep imports, helper ownership, and generated output stable.
- Do not mix this with data-query, provider, or app-root emission changes.
- Preserve the source-traceable generated TSX shape.

Exit criteria:

- `runtime-gen.ts` remains the app codegen orchestrator.
- View-render-specific code lives behind a focused module boundary.
- Layout codegen remains in `view-layout-gen.ts`, not folded into the new render module.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 8. Split Type System Validator By Semantic Concept

Context:

`TypeSystemValidator.ts` is not the immediate layout-era risk, but it shares the same large-validator pressure. Its current organization is semantic-concept driven rather than AST-family driven, so any future split should preserve that shape.

Possible target directory:

```text
packages/compiler/compiler-src/validation/type-system/
```

Do:

- Split by current semantic concept clusters:
  - typed literals and struct literal shape;
  - named and dot-local type references;
  - member access paths;
  - binary operator object-shape restrictions;
  - call/render argument object-shape restrictions;
  - action render callee restrictions.
- Preserve the current exported `typeSystemValidator` surface.
- Keep type-shape helpers in existing type modules unless they are truly validator-private.

Exit criteria:

- Call-site and expression type diagnostics remain stable.
- View/render validation does not need to reach through type-system internals.
- The split follows existing concepts rather than introducing a mismatched AST-family taxonomy.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 9. Move Oversized Validation Tests With Their Domain

Context:

`3-test-validation.test.ts` grew heavily during the layout era. Splitting validators without splitting tests leaves the maintenance problem half-solved. `5-test-layout-validation.test.ts` already exists and should be extended, not created.

Do:

- Keep and extend layout vocabulary and layout clause cases in:

  ```text
  packages/compiler/compiler-tests/5-test-layout-validation.test.ts
  ```

- Move view/render/children/variant validation cases to:

  ```text
  packages/compiler/compiler-tests/6-test-view-validation.test.ts
  ```

- Keep generic block/file/app validation in `3-test-validation.test.ts`.
- Before moving tests, record the compiler test count.
- After moving tests, confirm the compiler test count is identical.
- Preserve test names and expected diagnostic text where possible.
- Do not change diagnostics in the same step unless the validator extraction requires a clearer owner.

Exit criteria:

- Test files mirror validator ownership.
- A future view-host rule can be tested without adding more cases to the generic validation file.
- Compiler test count before and after the move is identical.

Validation:

```sh
./agent test compiler
./agent check
```

## Step 10. Final Cleanup And Documentation

Context:

After the implementation steps, the repo should document the new ownership boundaries so future layout, style, render, and design work lands in the right module.

Do:

- Update nearby docs only if they describe old implementation ownership.
- Add short module comments only where the new boundary is not obvious from filenames and exports.
- Re-run searches for old helper ownership:

  ```sh
  ./agent rg -n "nearestViewDeclaration|isContainerLayoutEntry|publicSelfLayoutConflictKey|kindDefaultSelfEntryValues|viewDeclarationUsesChildrenSplice|viewDeclarationRoutesCallerContainerLayout" packages/compiler/compiler-src
  ```

- Confirm there is still one validation registry path in `tao-services.ts`.
- Confirm styling words are not accepted by layout validation.
- Confirm codegen still treats validation as the semantic authority.
- Run `./agent check` after each step because it validates current repo behavior without rewriting tracked files.
- Reserve `./agent fix` for final commit preparation because it may rewrite tracked files and should be reviewed before staging.

Exit criteria:

- Shared view-host semantics have one owner.
- Main validator and runtime generator are smaller and domain boundaries are visible.
- Deferred work remains explicit and is not half-started.

Validation:

```sh
./agent fix
./agent prep-commit
```

Run `./agent prep-commit` before every commit in this plan, not only during Step 10.

## Cross-Step Rules

- Use `./agent` for all repo commands.
- Read files before editing and re-read before editing if another change may have touched them.
- Do not stage changes unless committing.
- Run `./agent prep-commit` before every commit.
- If `./agent test compiler` or `./agent check` fails after a step, do not proceed to the next step. Fix the step, or revert that step's changes and re-plan.
- Preserve the current runtime layout merge model.
- Preserve `overflow: "hidden"` default behavior. Enforcement lives in `packages/tao-std-lib/tao/tao-runtime/Layout.ts` and `packages/expo-runtime/tests-expo-runtime/layout-resolve.jest-test.ts`.
- Do not reintroduce name-derived parent lookup. Prefer explicit metadata such as parent direction.
- Keep current hyphenated layout spellings such as `spread-inset` and `spread-balanced` unless Tao explicitly changes syntax before v1 freeze. Enforcement lives in `packages/shared/shared-src/layout/layout-axis.ts` and `packages/compiler/compiler-src/validation/LayoutValidator.ts`.
- Keep user-facing semantic rules in validation.
- Keep codegen lean and behavior-preserving.

## Decisions

- `ViewHostValidator` owns `RenderStatement` and `ViewRender` composition. The main validator only spreads domain validators.
- Formatter splitting uses stateless function delegation. Do not introduce class or mixin inheritance for the split.
- `kindDefaultSelfEntryValues(decl)` stays in compiler layout helpers for this plan. Reading defaults from std-lib metadata is a later feature, not part of this cleanup.
- Type-system validation should split by current semantic concept clusters, not by AST family.
