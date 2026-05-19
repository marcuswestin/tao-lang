# Beautiful App Defaults MVP Project Plan

## Summary

Implement the first practical Tao visual-defaults system: curated deterministic design templates, complete enough token and component recipes, polished standard/template components, app-shell layout defaults, and visual fixtures that prove quick Tao apps look good without hand-authored styling.

This project is a narrower MVP slice of the broader design-inference direction. It does not require production `tao.design.lock`, source-authored token dictionaries, or a general styling language. The baseline must work from deterministic templates; optional LLM-assisted suggestions can improve concrete values later without becoming part of the compile path.

## Start Here

This plan assumes no conversation context. The project goal is to make first Tao apps look solid by default, especially when a person creates a quick app in a few minutes and uses only the standard UI primitives.

Recommended implementation order:

1. Implement the fast first slice in `Docs/Projects/Beautiful App Defaults MVP Mini Project Plan.md`.
2. Return to this full MVP plan after the mini fixture proves that default spacing, palette, core controls, and app-shell framing are visibly better.
3. Keep the broader full design-inference plan separate unless a step below explicitly touches it.

Relevant current implementation seams:

- `packages/tao-std-lib/tao/ui/Views.tao` exposes the current Tao UI primitives.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` wraps React Native components and already accepts `_taoDesignStyle`.
- `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` owns `createTaoDesign`, `resolveStyle`, `useTaoDesignContext`, `useTaoStyle`, and `TaoDesignProvider`.
- `packages/compiler/compiler-src/design/design-analysis.ts` currently reconciles design requirements with optional/accepted locks.
- `packages/compiler/compiler-src/design/design-codegen.ts` emits `_gen/tao-app/tao-design.ts`.
- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` emits the generated app bootstrap and currently renders `AppUIView` directly inside a `ScrollView`.
- `Apps/Test Apps/` owns the compile/runtime fixtures that should prove these defaults.

Do not begin this project by building a styling language, app-local generated component API, broad `tao.design.lock` schema migration, visual editor, or LLM-in-the-compile-path workflow. The first visible success is deterministic code and runtime behavior.

## Relationship To UI Design Inference

Beautiful App Defaults is the practical first visual-quality slice. It may reuse the design runtime and generated `tao-design.ts` module, but it deliberately avoids requiring the full design-inference lifecycle.

The full design-inference track still owns app `design` blocks, declaration/variant design specs, composite role inference, accepted/suggested lock workflow, broad diagnostics, and future source-level appearance syntax. This project owns curated templates, deterministic fallback design payloads, standard component recipes, app-shell defaults, and visual fixtures that work before the full inference track is implemented.

## Goals

- Ship curated deterministic design templates: `Quiet Craft`, `Crisp Operations`, and `Expressive Product`.
- Resolve app-specific defaults from app identity and, when available, app `design.description`.
- Add a runtime design foundation for tokens, component recipes, adaptation context, and state overlays.
- Apply polished recipes automatically to standard Tao UI components.
- Add standard/template components for common app structure: page, card, list row, badge, field group, loading, empty, and error states.
- Make web/tablet max width, native safe areas, basic scroll padding, and form-friendly shell defaults part of the app experience without adding raw styling syntax.
- Add a component/profile gallery and representative Still-style and Rooms-style screens for visual review.
- Define a template-guided LLM suggestion path that can propose values and recipes but is never required for production compilation.

## Non-Goals

- No general source-level styling language.
- No source-authored token dictionaries.
- No production requirement for `tao.design.lock`.
- No render-site design specs.
- No app-local generated component API in the MVP.
- No Style Dictionary or DTCG export.
- No full AI-assisted design inference in the compile path.
- No broad motion, gesture, modal, sheet, or dialog system.
- No high-contrast, RTL, localization-specific typography, pointer-modality, or device-posture implementation beyond reserving adaptation axes.

## Assumptions

- Tao's existing layout syntax stays geometry-only.
- Standard library components can receive design recipes through runtime helper props and generated app bootstrap data.
- The first implementation may use curated static templates while leaving the LLM suggestion path optional.
- If app `design { description "..." }` parsing is not ready when this project starts, the template selector can use app name and package identity first.
- Forms and interactions do not need to be fully complete before this project starts, but text input, button, disabled, pressed, focused, loading, empty, and error visual states need enough runtime surface to be demonstrated.
- Visual quality is an acceptance requirement. Automated checks can catch regressions and missing states, but the final decision still needs screenshot review against the template rules.

## Code Ownership Boundaries

- `packages/compiler/compiler-src/design/`: design template records, deterministic selection, resolved design payload shape, suggestion contract, and validation helpers.
- `packages/compiler/compiler-src/codegen/app/`: generated app bootstrap wiring for the selected/resolved design payload and app-shell debug summary output.
- `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx`: runtime design context, recipe/style resolution, adaptation overlays, and state overlays. Extend this existing helper instead of adding a parallel resolver.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx`: standard React Native view wrappers consuming recipe-derived `_taoDesignStyle` values and stateful component styles.
- `packages/tao-std-lib/tao/ui/Views.tao`: source-facing standard/template component declarations.
- `packages/expo-runtime/`: native/web app-shell integration, safe-area/scroll/max-width behavior, and runtime smoke fixtures.
- `packages/headless-test-runtime/`: deterministic non-native runtime coverage for component recipes and visual-fixture scenario behavior.
- `Apps/Test Apps/`: Beautiful Defaults gallery plus representative Still-style and Rooms-style screens.

Required template tokens and recipe slots should fail in template completeness tests and compiler/codegen validation where statically known. Runtime production fallbacks may return safe empty styles for optional unknown recipe names, but incomplete shipped templates must not silently pass acceptance.

## Implementation Steps

### 1. Define Design Template And Token Contracts

**Context:** The current design-inference docs describe a broad accepted-lock model. This project needs a smaller deterministic foundation that can drive real runtime styles before the full inference workflow exists.

**Work:**

- Add TypeScript types for design templates, token families, component recipes, state overlays, and adaptation axes.
- Define the three initial template records: `Quiet Craft`, `Crisp Operations`, and `Expressive Product`.
- Include template metadata: feeling, best-for categories, avoid list, composition rules, token tendencies, component-family expectations, accessibility floors, platform notes, and LLM prompt brief.
- Define required MVP token families:
  - color;
  - typography;
  - spacing;
  - size;
  - radius;
  - border;
  - elevation/shadow;
  - opacity;
  - simple motion duration/easing names.
- Reserve but do not fully implement advanced token areas for complex motion, effects, localization typography, and high-contrast axes.
- Keep the first commit slice structured so one complete template can be proven before all three templates are fully tuned, while the final step exit criteria still require all three.

**Likely commit units:**

- Template and token type definitions.
- Curated static template data.
- Unit tests for template completeness and stable identities.

**Validation:**

- Targeted TypeScript tests for template schema completeness.
- `./agent check` when the step is complete.
- Intermediate commits may defer full repo checks if they only add isolated types/data and local tests are still being assembled.

**Exit criteria:**

- Every initial template has complete required metadata.
- Missing token families, duplicate template ids, or incomplete component recipe slots fail focused tests.

**Suggested commit subject pattern:** `feat(design): add beautiful defaults templates`

### 2. Add Deterministic Template Selection And Design Resolution

**Context:** Tao apps should differ by default. The selector must be stable, inspectable, and independent of external services.

**Work:**

- Implement deterministic template selection from app identity.
- Use app `design.description` as an input when available; otherwise use app name/package identity.
- Resolve a full design payload from the selected template:
  - tokens;
  - component recipes;
  - default state overlays;
  - platform and screen-size adaptations.
- Add debug or CLI-visible output that reports selected template, seed inputs, and high-level token/recipe summary.
- Keep accepted lock files optional. If future design locks exist, they may override or specialize the deterministic payload, but absence of a lock must not block production.

**Likely commit units:**

- Stable hash/selection helper.
- Design resolver and fallback payload.
- Compiler/bootstrap integration for selected app design.
- Debug summary output.

**Validation:**

- Tests show the same app identity always selects the same template.
- Tests show different app identities can select different templates.
- Tests show missing app design metadata still produces a complete design payload.
- `./agent check` when the step is complete.

**Exit criteria:**

- A compiled app can receive a complete deterministic design payload without `tao.design.lock`.
- The selected template is inspectable in generated output or CLI/debug logs.

**Suggested commit subject pattern:** `feat(design): resolve deterministic app defaults`

### 3. Implement Runtime Design Helpers And Adaptation Context

**Context:** `packages/tao-std-lib/tao/tao-runtime/Views.tsx` already accepts `_taoDesignStyle`. The MVP needs a proper recipe resolver instead of ad-hoc hard-coded styles.

**Work:**

- Extend the existing `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` helper rather than creating a second runtime design path.
- Add or refine runtime helpers such as `createTaoDesign`, `resolveRecipe`, `resolveStyle`, and `useTaoDesignContext`.
- Support adaptation inputs:
  - platform;
  - color scheme;
  - compact/regular screen width;
  - text scale;
  - reduced motion.
- Support component states:
  - default;
  - pressed;
  - disabled;
  - focused;
  - selected;
  - loading where the component exposes it.
- Lower recipes to React Native style arrays and `StyleSheet.create` where practical.
- Keep the runtime helper API small and stable; do not generate per-view hooks in this project.

**Likely commit units:**

- Runtime context and resolver helpers.
- Adaptation and state overlay resolution.
- Generated app bootstrap wiring.
- Focused runtime tests.

**Validation:**

- Runtime unit tests for context selection and overlay precedence.
- Tests for dark/light and compact/regular values.
- Tests for pressed/disabled/focused state resolution.
- `./agent check` when the step is complete.

**Exit criteria:**

- Runtime components can ask for a semantic recipe and receive a deterministic React Native style for the current context and state.
- Missing recipes fail clearly in development/test paths.
- Existing `_taoDesignStyle` consumption remains the bridge between compiler-resolved recipes and React Native component wrappers.

**Suggested commit subject pattern:** `feat(runtime): add Tao design recipe resolver`

### 4. Apply Recipes To Core Standard Components

**Context:** Good defaults are visible only when the common components look finished. The first surface is the existing std-lib/runtime component set.

**Work:**

- Apply recipes to:
  - `Text`;
  - `TextLabel`;
  - `MultiLineText`;
  - `Number`;
  - `Button`;
  - `TextInput`;
  - `Box`;
  - `Stack`;
  - `Row`;
  - `Col`;
  - `WrappingRow`.
- Add button variants through semantic recipe names:
  - primary;
  - secondary;
  - quiet;
  - warning;
  - danger;
  - disabled;
  - loading if action/loading state is available.
- Improve text input defaults:
  - label-derived accessibility label;
  - placeholder color;
  - focus state;
  - disabled state;
  - error/help visual recipe hooks for later form work.
- Ensure text roles handle truncation, readable line height, and text scaling.
- Preserve current layout behavior and do not make layout syntax depend on design tokens.

**Likely commit units:**

- Text and numeric recipes.
- Button state recipes.
- TextInput recipes.
- Structural container/surface recipe integration.

**Validation:**

- Runtime tests for each component's default style resolution.
- State tests for button and text input.
- Existing layout/runtime tests stay green.
- `./agent check` when the step is complete.
- Intermediate commits can defer full visual validation until the gallery exists.

**Exit criteria:**

- Existing Tao apps using standard components look intentionally styled under each template.
- Pressed, disabled, focused, and selected states have deterministic visible differences where supported.

**Suggested commit subject pattern:** `feat(ui): apply beautiful default component recipes`

### 5. Add Standard Template Components

**Context:** Tokenized primitives alone do not create high-quality app screens. Tao needs a small set of semantic components that encode common product layout and feedback patterns.

**Work:**

- Add Tao-owned standard/template components built from existing std-lib primitives:
  - `Page`;
  - `Card`;
  - `ListRow`;
  - `Badge`;
  - `FieldGroup`;
  - `SectionHeader`;
  - `Divider`;
  - `LoadingState`;
  - `EmptyState`;
  - `ErrorState`.
- Keep component names semantic and stable. Templates change their recipes, not the source-facing API.
- Provide recipe slots for each template so `Quiet Craft`, `Crisp Operations`, and `Expressive Product` can make these components feel different while remaining coherent.
- Defer app-local generated component APIs.

**Likely commit units:**

- Standard template component declarations in `packages/tao-std-lib/tao/ui/`.
- Runtime implementations and recipe names.
- Compiler/runtime tests for rendering these components.

**Validation:**

- Tests compile and render a small app using every standard template component.
- Runtime tests confirm each component resolves expected recipe slots.
- `./agent check` when the step is complete.

**Exit criteria:**

- Authors can build a simple app screen with Tao's standard/template components and receive a polished default result with no explicit styling.

**Suggested commit subject pattern:** `feat(std-lib): add beautiful defaults components`

### 6. Add App Shell Defaults For Native And Web

**Context:** Max width and web layout are central to the product goal. A good button is not enough if the app shell stretches a form across a desktop viewport.

**Work:**

- Add app-shell defaults for:
  - safe-area aware root padding on native platforms;
  - scrollable page content with sensible bottom padding;
  - keyboard-aware form screen behavior where React Native/Expo support is available;
  - compact/regular width page insets;
  - web/tablet max-width content columns;
  - optional split content regions for regular-width operational screens when the selected template supports it.
- Keep these defaults in generated app shell/runtime design helpers, not raw layout syntax.
- Make shell behavior explicit in debug output so authors can understand why content is constrained.

**Likely commit units:**

- App shell design context integration.
- Safe-area and scroll shell defaults.
- Web/tablet max-width constraints.
- Keyboard-aware defaults where current runtime support permits.

**Validation:**

- Runtime or compiled-app tests show root shell styles differ for compact versus regular width.
- Web/tablet max-width is covered by a generated app fixture or screenshot check.
- Native shell behavior is smoke-tested where the environment permits.
- `./agent check` when the step is complete.

**Exit criteria:**

- A simple form/detail screen does not stretch edge to edge on web/tablet.
- Native screens respect safe-area and bottom spacing defaults without app-authored layout boilerplate.

**Suggested commit subject pattern:** `feat(runtime): add beautiful app shell defaults`

### 7. Define Template-Guided LLM Suggestion Contract

**Context:** The LLM stage should receive design instructions and template feeling, not just invent raw values. This must be optional and bounded.

**Work:**

- Define the design-suggestion prompt shape so it includes:
  - selected template;
  - template feeling;
  - avoid list;
  - component inventory;
  - reference rules;
  - token ranges;
  - required component recipe slots;
  - rejection checklist.
- Define the suggestion output schema for:
  - concrete token values;
  - component recipe adjustments;
  - state overlays;
  - rationale.
- Define validation and normalization behavior for suggestions that fail:
  - token completeness;
  - contrast floors;
  - minimum hit targets;
  - required recipe slots;
  - unsupported platform features.
- Keep curated deterministic templates as fallback.
- Do not require suggestions or accepted locks for production.
- Do not require a real provider-backed LLM run in this MVP. If existing design-provider hooks are easy to reuse, cover the contract with fake-provider tests only.

**Likely commit units:**

- Prompt/input shape update.
- Suggestion output schema and validation helpers.
- CLI/debug output for selected template plus contract-visible suggested adjustments when a fake suggestion is supplied.
- Focused fake-provider or fixture tests.

**Validation:**

- Existing design LLM provider tests are updated.
- Fake provider tests cover valid suggestions, missing recipe slots, bad contrast, unsupported fields, and fallback behavior.
- `./agent check` when the step is complete.

**Exit criteria:**

- The documented LLM-assisted path can tune a selected template without escaping the template's constraints.
- Production remains deterministic without invoking an LLM.
- Real external-provider execution is explicitly deferred unless it is already supported by existing provider hooks without expanding project scope.

**Suggested commit subject pattern:** `feat(design): define template-guided suggestion contract`

### 8. Build Visual Fixtures And Review Artifacts

**Context:** This project cannot be accepted only through unit tests. It must show that the defaults actually look good.

**Work:**

- Add a Beautiful Defaults Gallery app that shows:
  - all templates;
  - text roles;
  - buttons and states;
  - inputs and states;
  - cards/surfaces;
  - list rows;
  - badges;
  - loading, empty, and error states;
  - compact and regular-width examples.
- Add representative Still-style and Rooms-style screens using the new defaults.
- Generate reference screenshots or PNG artifacts for review.
- Add textual reference rules for each template and connect them to the screenshot review checklist.
- Add a "bad defaults" regression checklist to the project docs or gallery README.

**Likely commit units:**

- Gallery source fixture.
- Still-style screen fixture.
- Rooms-style screen fixture.
- Screenshot/review artifact docs.

**Validation:**

- `./agent test` for the relevant compiler/runtime fixture coverage.
- `./agent check`.
- Manual or scripted screenshot review where available.
- Intermediate commits may defer screenshot review until the gallery renders.

**Exit criteria:**

- The gallery and representative screens demonstrate visible differences between templates.
- The screens pass the taste rejection checklist well enough to be used as future review targets.

**Suggested commit subject pattern:** `feat(examples): add beautiful defaults gallery`

### 9. Documentation And Roadmap Closure

**Context:** The project introduces a practical visual-defaults layer that must stay distinct from full design inference and future styling syntax.

**Work:**

- Update design docs to reflect:
  - curated deterministic templates;
  - no production lock requirement for this MVP;
  - template-guided LLM suggestions as optional;
  - standard/template components as the first component-family path;
  - deferral of app-local generated components and general styling syntax.
- Update `Docs/Tao Project Roadmap.md` status as implementation progresses.
- Document how to inspect selected template and generated/default design values.
- Document visual acceptance fixtures and review workflow.

**Likely commit units:**

- Design docs update.
- Roadmap/status update.
- Gallery/review workflow notes.

**Validation:**

- `./agent dprint check --incremental=false`.
- `./agent git diff --check`.
- `./agent check` if implementation docs are committed alongside code changes at the end of the project.

**Exit criteria:**

- The docs make the MVP boundary clear and do not imply that full design inference, raw styling, or app-local component generation has shipped.

**Suggested commit subject pattern:** `docs(design): document beautiful defaults MVP`

## Validation Plan

- Focused template schema tests.
- Focused design selection/resolution tests.
- Runtime resolver tests.
- Runtime component recipe tests.
- Compiler/codegen tests for app design payload and generated app shell wiring.
- Std-lib component render tests.
- Beautiful Defaults Gallery compile/runtime scenario.
- Still-style and Rooms-style representative screen scenarios.
- Screenshot or visual artifact review across at least:
  - `Quiet Craft`, `Crisp Operations`, `Expressive Product`;
  - light and dark;
  - compact and regular width;
  - long text;
  - disabled, pressed, focused, loading, empty, and error states.
- Mandatory visual fixtures:
  - Beautiful Defaults component gallery;
  - profile/template gallery;
  - one Still-style representative screen;
  - one Rooms-style representative screen;
  - web compact and regular screenshots;
  - native screenshot smoke where current runtime infrastructure permits.
- Minimum taste-calibration gate:
  - written reference rules per template;
  - screenshot review checklist;
  - rejection of stretched web forms, invisible focus, low contrast, generic component-demo feel, unstyled loading/empty/error states, and incoherent component density.
- `./agent check`.
- `./agent prep-commit` before implementation chunks are treated as ready to land.

## Risks

- **Generic output risk:** token generation alone can produce competent but bland UI. Mitigation: template art direction, component recipes, reference rules, and rejection checklist are first-class.
- **Scope creep into full design inference:** lock files, source-authored tokens, and general styling can swallow the MVP. Mitigation: production works without lock files and raw styling remains deferred.
- **Layout boundary confusion:** max-width and safe-area defaults could leak into layout syntax. Mitigation: keep app shell and design runtime defaults separate from layout clauses.
- **Component API churn:** template-owned components can become app-specific too early. Mitigation: ship stable semantic standard/template components first.
- **False confidence from tests:** unit tests can pass while screens still look bad. Mitigation: require gallery and representative screenshot review.
- **Platform mismatch:** iOS, Android, and web style support differs. Mitigation: route differences through recipe/adaptation helpers and fail clearly for unsupported features.

## Deferrals

- Full production design-lock workflow.
- General source styling syntax.
- Source-authored token dictionaries.
- Render-site design specs.
- App-local generated component APIs.
- Style Dictionary/DTCG export.
- Full motion language.
- Real external-provider LLM suggestion acceptance workflow, if the contract and fake-provider path are enough for this MVP.
- Complex modals, sheets, dialogs, gestures, and transitions.
- High contrast, RTL, locale-specific typography, pointer/hover modality beyond basic web hover/focus, and device posture adaptation.
- Full visual regression infrastructure and automated device matrix.

## Next Step

Implement and review the mini first-slice plan first:

```text
Docs/Projects/Beautiful App Defaults MVP Mini Project Plan.md
```

Then run `project-4-review-project-plan` on this full MVP plan before beginning the broader template/component/gallery implementation.
