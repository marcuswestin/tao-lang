# Beautiful App Defaults MVP Mini Project Plan

## Summary

This is the recommended first implementation slice for Beautiful App Defaults MVP. Its only goal is to make a brand-new Tao app using ordinary standard-library UI primitives look solid within the first 2-3 minutes of app creation.

This mini project is intentionally deterministic and code-first. It does not use an LLM, does not add a design-template selection UI, does not change `tao.design.lock` schema, does not add a source styling language, and does not implement the full Beautiful App Defaults MVP. It creates the smallest visible improvement path: good default spacing, a good neutral palette, one stable seeded accent, native-feeling core controls, a web-friendly content frame, and one visual fixture.

## Start Here

Relevant current files:

- `packages/tao-std-lib/tao/ui/Views.tao` exposes the source-facing UI primitives.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` wraps React Native views and already accepts `_taoDesignStyle`.
- `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` owns runtime design context and style resolution.
- `packages/compiler/compiler-src/design/design-codegen.ts` emits generated `tao-design.ts`.
- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` emits the generated app bootstrap and currently renders `AppUIView` inside a `ScrollView`.
- `Apps/Test Apps/` contains test apps used to prove language/runtime behavior.

Recommended implementation sequence:

1. Add deterministic fallback visual styles to the existing runtime wrappers.
2. Add the default app-shell content frame.
3. Add stable seeded accent variation.
4. Add only the smallest extra feedback/surface components if the base screen already looks good.
5. Add one first-app fixture and visual acceptance checklist.

Do not start with the broader three-template system. That belongs to `Docs/Projects/Beautiful App Defaults MVP Project Plan.md` after this mini slice proves the basic visible payoff.

## Goals

- Make existing `Text`, `TextLabel`, `MultiLineText`, `Number`, `TextInput`, and `Button` look intentionally styled without app-authored styling.
- Prevent first web apps from stretching form/detail content across the entire desktop viewport.
- Give every app one stable accent color selected deterministically from app identity.
- Keep all defaults accessible enough for MVP: readable contrast, visible focus, visible disabled/pressed states, and 44-48px control height.
- Add a small fixture that future agents can run and inspect.

## Non-Goals

- No LLM usage.
- No `tao design` workflow.
- No template candidate selection.
- No design lock schema changes.
- No production requirement for `tao.design.lock`.
- No source-authored token dictionary.
- No general styling syntax.
- No app-local generated component API.
- No full component gallery.
- No multi-template visual system beyond one baseline plus seeded accent.

## Implementation Steps

### 1. Add Deterministic Runtime Baseline Styles

**Context:** `Views.tsx` already wraps the core React Native components. It accepts `_taoDesignStyle`, but a first app still needs strong built-in fallbacks when no generated design payload or accepted lock exists.

**Work:**

- Add a small internal baseline style table in `packages/tao-std-lib/tao/tao-runtime/Views.tsx` or a nearby runtime helper.
- Use one calm neutral palette with light/dark values:
  - app background;
  - surface background;
  - primary text;
  - secondary text;
  - muted text;
  - border;
  - input background;
  - focus/accent;
  - disabled foreground/background.
- Use a fixed spacing and shape baseline:
  - control height: 44px minimum, 48px preferred where it fits;
  - horizontal control padding: 14-16px;
  - vertical field padding: 10-12px;
  - control radius: 10-12px;
  - surface/card radius if needed: 12-14px;
  - border width: 1px.
- Apply fallbacks only when `_taoDesignStyle` does not provide a value. Explicit/generated design styles remain higher precedence.
- Make `Text`, `TextLabel`, `MultiLineText`, and `Number` readable by default:
  - primary text color;
  - 16px body text;
  - sensible line height;
  - label weight/color distinct from body text;
  - number text aligned with the same baseline as text.
- Make `Button` look like a native-feeling primary action:
  - accent background;
  - white/on-accent label;
  - centered content;
  - visible pressed state;
  - visible disabled state;
  - accessible role and label behavior preserved.
- Make `TextInput` look finished:
  - surface/input background;
  - border;
  - radius;
  - internal padding;
  - 16px text;
  - placeholder color;
  - visible focused border/accent state;
  - disabled state if the underlying props expose it.

**Likely commit units:**

- Baseline token/style constants.
- Text and label fallback styles.
- Button fallback states.
- TextInput fallback focus/disabled states.
- Focused runtime tests.

**Validation:**

- Add or update runtime tests to flatten styles for default text, button, and input wrappers.
- Test `Button` default, pressed, and disabled states.
- Test `TextInput` default and focused states if focus tracking is implemented.
- Run the narrow package test that owns these runtime tests, then `./agent check` when the step is complete.

**Exit criteria:**

- A Tao app using only `Text`, `TextInput`, and `Button` no longer renders as raw platform primitives.
- Existing `_taoDesignStyle` behavior still works and overrides the fallback.

**Suggested commit subject pattern:** `feat(ui): add polished default runtime styles`

### 2. Add The Default App-Shell Content Frame

**Context:** The generated app bootstrap currently renders `AppUIView` directly inside a `ScrollView`. That makes simple web apps and forms too likely to stretch edge to edge on desktop.

**Work:**

- Update `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` so generated apps render:
  - root background from the design context or fallback;
  - outer `ScrollView`;
  - inner content `View` frame.
- Give the inner frame stable defaults:
  - `width: "100%"`;
  - `maxWidth: 720`;
  - `alignSelf: "center"`;
  - compact horizontal padding: 16px;
  - regular/web horizontal padding: 24px;
  - compact vertical padding: 20-24px;
  - regular/web vertical padding: 28-32px;
  - bottom padding high enough that final controls do not sit on the viewport edge.
- Use `useTaoDesignContext()` to choose compact versus regular values.
- Keep the shell frame in generated bootstrap/runtime code, not in Tao layout syntax.

**Likely commit units:**

- Generated bootstrap helper/style changes.
- Compiler/codegen snapshot or string tests.
- A tiny compile fixture proving the app shell emits the frame.

**Validation:**

- Add a compiler/codegen test that a simple app emits the inner frame and max-width style.
- Run the relevant compiler test filter.
- Run `./agent check` when the step is complete.

**Exit criteria:**

- A simple first app is padded on mobile/compact screens.
- The same app is centered and constrained on regular/web screens.
- Existing generated app bootstrap imports and runtime design provider behavior remain intact.

**Suggested commit subject pattern:** `feat(app): add default content frame`

### 3. Add Stable Seeded Accent Variation

**Context:** The mini slice should avoid LLM uncertainty but still avoid making every app visually identical.

**Work:**

- Add a deterministic app identity seed helper in compiler/design or generated app code.
- Derive the seed from stable app inputs already available in compile/codegen:
  - entry file/app identity;
  - app config identity when available;
  - app name if available.
- Select one accent from a small curated set:
  - blue;
  - teal;
  - green;
  - amber;
  - rose;
  - indigo.
- Use the selected accent only for:
  - primary button background;
  - focus border/ring;
  - subtle selection/accent surface if needed.
- Do not vary spacing, radius, shadows, or typography in this mini slice. Keep the rest of the baseline stable so visual QA is simple.

**Likely commit units:**

- Stable hash/seed helper.
- Curated accent table.
- Accent wiring into button/focus fallback styles.
- Tests for deterministic selection.

**Validation:**

- Test that the same app identity selects the same accent.
- Test that a set of different app identities can select different accents.
- Test every accent has readable button text contrast against its on-accent text color.

**Exit criteria:**

- Two Tao apps can look subtly different without user configuration or network/LLM calls.
- The accent choice is deterministic and inspectable in tests or generated output.

**Suggested commit subject pattern:** `feat(design): seed default accent color`

### 4. Add Only Minimal Surface And Feedback Components

**Context:** First apps commonly need one surface and one non-happy state. This step should happen only after Steps 1-3 already make the base screen look good.

**Work:**

- Add the smallest std-lib/runtime component set that materially improves first-app screens:
  - `Card`;
  - `LoadingState`;
  - `EmptyState`;
  - `ErrorState`.
- Prefer stable Tao-owned std-lib components over generated app-local components.
- Keep props minimal:
  - `LoadingState` can render a standard label/spinner-like state with a message if current Tao/RN support makes that straightforward.
  - `EmptyState` should accept title and body/message text.
  - `ErrorState` should accept title and body/message text.
  - `Card` should use the existing child/content pattern only if current Tao view composition supports it cleanly; otherwise defer `Card` to the broader MVP.
- Use the same baseline neutral palette, spacing, border, and radius from Step 1.

**Likely commit units:**

- Std-lib declarations in `packages/tao-std-lib/tao/ui/Views.tao`.
- Runtime wrappers in `packages/tao-std-lib/tao/tao-runtime/Views.tsx` or a nearby view module.
- Compile/render tests for the new components.

**Validation:**

- Compile a fixture using every component added in this step.
- Render or runtime-test the components enough to prove styles and text content are present.
- Run `./agent check` when the step is complete.

**Exit criteria:**

- Empty/loading/error states no longer look unstyled in the first-app fixture.
- If `Card` cannot be added without touching unresolved child/slot behavior, it is explicitly deferred and the step still succeeds with the three state components.

**Suggested commit subject pattern:** `feat(ui): add default app state components`

### 5. Add The First-App Visual Fixture

**Context:** This mini project succeeds only if the output visibly improves a real first screen.

**Work:**

- Add `Apps/Test Apps/Beautiful Defaults Mini/`.
- Include a Tao app with:
  - title text;
  - body/supporting copy;
  - at least one `TextInput`;
  - at least one `Button`;
  - one simple grouped surface or section;
  - loading, empty, and error examples if Step 4 adds those components.
- Keep the fixture close to what a person would build in 2-3 minutes. Do not make it a polished marketing/demo screen that hides the defaults behind custom structure.
- Add a `scenario.json` matching existing test-app conventions.
- Add a short README or doc section only if existing fixture conventions use one.

**Likely commit units:**

- Fixture Tao source and scenario.
- Test coverage for compile/render.
- Small visual review note if screenshot artifacts are produced.

**Validation:**

- Run the targeted compiler/runtime test filter for the new fixture.
- Run `./agent check`.
- Manually inspect web/regular and compact/mobile render where current Expo/browser workflow permits.
- Reject the fixture if:
  - content touches viewport edges;
  - desktop content stretches too wide;
  - button/input look raw;
  - focus or disabled states are invisible;
  - text hierarchy is unclear;
  - empty/loading/error states look unstyled.

**Exit criteria:**

- The fixture proves the first-screen experience looks intentionally designed without app-authored styling.
- The mini slice is ready to become the foundation for the broader Beautiful App Defaults MVP.

**Suggested commit subject pattern:** `test(ui): add beautiful defaults mini fixture`

### 6. Close The Mini Slice

**Context:** The mini project should leave clear evidence and avoid drifting into the full MVP.

**Work:**

- Update the main Beautiful App Defaults MVP plan only if implementation discoveries change the broader plan.
- Add a short completion note to this mini plan when implemented:
  - files changed;
  - validation run;
  - screenshots or fixture names;
  - explicit deferrals.
- Do not update the roadmap unless this mini slice is promoted to a separate tracked project.

**Likely commit units:**

- Documentation closure note.
- Any final fixture reference updates.

**Validation:**

- `./agent dprint check --incremental=false`.
- `./agent git diff --check`.
- `./agent check` if code changed in the same closure commit.

**Exit criteria:**

- A future agent can see exactly what the mini slice shipped and what remains for the full MVP plan.

**Suggested commit subject pattern:** `docs(project): close beautiful defaults mini plan`

## Validation Plan

- Runtime tests for text, button, input, focus, pressed, and disabled fallback styles.
- Compiler/codegen tests for generated app-shell content framing.
- Deterministic seed/accent tests.
- Compile/render test for `Apps/Test Apps/Beautiful Defaults Mini`.
- `./agent check` after code steps.
- `./agent dprint check --incremental=false` and `./agent git diff --check` for documentation closure.

## Deferrals

- The three-template system: `Quiet Craft`, `Crisp Operations`, and `Expressive Product`.
- Template-guided LLM suggestions.
- `tao design` candidate UI.
- Design lock schema changes.
- Accepted/suggested lock production workflow changes beyond allowing deterministic no-lock defaults.
- Full component gallery.
- Still-style and Rooms-style representative screens.
- App-local generated components.
- General source styling.
- Broad visual regression infrastructure.

## Next Step

Implement Step 1 and Step 2 first. Those two steps are the smallest path to visible improvement: core controls stop looking raw, and first web apps stop stretching across the viewport.
