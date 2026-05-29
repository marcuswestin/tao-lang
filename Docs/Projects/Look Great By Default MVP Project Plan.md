# Look Great By Default MVP Project Plan

## Summary

Make every Tao app look polished and visibly distinct by default, without the author authoring a theme. Ship a curated library of six design templates, a deterministic seed-driven candidate selection step with an author choice surfaced through `tao design`, two-path token generation (deterministic fallback + optional LLM enhancement) with a WCAG-AA contrast guarantee, app-shell defaults including web max-width, polished std-lib component states in every interaction state, std-lib loading/empty/error feedback components, accessibility floor built into defaults, and a verification surface that gates differentiation and contrast in CI.

This project supersedes the placeholder "Beautiful App Defaults MVP" entry in `Docs/Tao Project Roadmap.md`. The research doc with full settled decisions and Round 1 auto-research reconciliation is [Look Great By Default MVP Project Research](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md).

## Goals

- Ship **6 curated design templates** under `packages/tao-std-lib/tao/tao-runtime/templates/`, each with `description.md`, `rules.json`, `fallback-tokens.json`, 3 reference PNGs, and ≥ 2 component overrides.
- Implement deterministic per-app candidate selection (3 candidates per seed) with terminal text-art previews in `tao design`.
- Add the `templateSelection` block to `tao.design.lock` (schemaVersion bumps to 2). Implement default-with-warning in dev and hard fail in production until accepted.
- Implement two token generation paths: required deterministic fallback (with seed-derived accent hue shift) and optional LLM enhancement via the design-inference plan's `--llm-provider` flag.
- Implement WCAG AA contrast guarantee at acceptance time with auto-adjust up to ±30% HSL lightness; reject and re-prompt on failure.
- Generate values for 9 token categories (`color`, `spacing`, `radius`, `text`, `shadow`, `border`, `opacity`, `motion`, `size`) with light and dark variants for color.
- Wire the generated `tao-design.ts` module into the app shell: web max-width clamp, prose max-width, page gutter, section gap, safe area, splash tint, status bar.
- Add new std-lib views (`Card`, `ListRow`, `Section`, `Divider`, `Avatar`, `Badge`, `Icon`) and extend `Button` and `TextInput` with the V1 state matrix.
- Add std-lib feedback components: `LoadingShell`, `EmptyState`, `ErrorState`.
- Implement compile-time import-path rewriting so the chosen template's component overrides replace std-lib views in the generated app.
- Add a component gallery app, side-by-side template demo, `tao design audit`, and CI checks for template distribution and accent ΔE.

## Non-Goals

- Source-authored token dictionaries, raw style escape hatches, or explicit appearance syntax — all remain deferred to the broader design-inference plan.
- Procedural app-icon generation beyond a tasteful placeholder.
- VLM acceptance check at acceptance time. VLM-as-judge is curation-only in V1.
- LLM running during production compilation. The LLM step runs only at `tao design update`.
- Smart typography beyond what React Native provides for free.
- Haptics on standard interactions.
- Pull-to-refresh, paginated-list affordances, image placeholders / fade-in, procedural empty-state illustrations, iOS `borderCurve` precision, Android elevation precision, reduced-motion handling beyond disabling shimmer.
- `tao design preview` Expo-runtime gallery, automated pixel-perfect visual regression between seeds.
- Community-contributed templates; V1 templates are Tao core-team-authored.
- Per-render-site template override; V1 is one chosen template per app.
- LLM-proposed empty/error copy. Default copy is hardcoded.
- `font`, `elevation`, `transform` token categories.
- A Tao-owned semantic icon name layer over `@expo/vector-icons` families.

## Assumptions

- Tao runtime is React Native 0.81 + Expo. Web target ships through React Native Web. All decisions map to one of: React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime diagnostic.
- The design-inference plan's `tao.design.lock` / `.tao.design.lock` files are the canonical home for accepted/suggested design state. This project adds a `templateSelection` block and bumps `schemaVersion` from 1 to 2; design-inference code reading the lock must handle the new schema or fail loudly.
- The Layout MVP is stable enough that adding color, radius, shadow, and max-width clamping on top will not collide with its layout-clause parsing. Mechanical app-shell safe-area and keyboard behavior lives in `TaoAppShell`.
- The Still and Rooms demo apps can run on the first-candidate-default + fallback-token path while Steps 8–10 finish; they do not need the full overrides or gallery to look acceptable.
- `@expo/vector-icons` is already an Expo runtime dependency. Each template picks one family from its V1 set; an authoring escape hatch to a different family is deferred.
- An LLM provider routing layer (`--llm-provider`) is available or will be added in coordination with the design-inference plan. This project does not own provider plumbing.

## Demo-App Slice

Steps 3–7 in this plan are the minimum slice that benefits the Still and Rooms demo apps:

- coherent palette per app from fallback path,
- correct web max-width clamp,
- consistent page gutter and section spacing,
- splash and status bar matching app background.

Land Steps 3–7 before finalizing demo-app visual polish. Steps 8–10 may continue in parallel with demo-app work.

## Implementation Steps

### 1. Template Infrastructure And New Std-Lib Views

**Context:** Nothing exists yet. The std-lib runtime exposes `Row`, `Col`, `Box`, `Stack`, `WrappingRow`, `Text`, `TextLabel`, `MultiLineText`, `TextInput`, `Number`, `Button`. No template directory exists. No `Card`, `ListRow`, `Section`, `Divider`, `Avatar`, `Badge`, or `Icon`.

**Work:**

- Create `packages/tao-std-lib/tao/tao-runtime/templates/` directory with a README explaining the template anatomy.
- Add a JSON schema for `rules.json` (the schema is settled in [research doc](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#rulesjson-schema)) plus a validator usable from the CLI and from tests.
- Add a JSON schema for `fallback-tokens.json` matching the V1 token catalog (9 categories with the entry shapes from the research doc).
- Write the Template Acceptance Checklist as a doc beside the templates README.
- Add new std-lib views: `Card`, `ListRow`, `Section`, `Divider`, `Avatar`, `Badge`, `Icon`. All token-styled defaults only at this stage; no template overrides yet. Wire them through the existing `_taoDesignStyle` hook surface.
- Add the std-lib view exports to the public surface and to Tao's view registry.
- No `templateSelection` lock changes yet; lock work is Step 4.

**Validation:** `./agent gen`, `./agent compiler test`, `./agent shared test`. Schema validators reject malformed `rules.json` and `fallback-tokens.json` examples; new views render in the existing test apps without breaking layout tests.

**Exit criteria:** Template directory exists with schemas, validators, README, and acceptance checklist. New std-lib views render with token defaults in the existing test app suite.

**Suggested commit subject:** `feat(design): add template infrastructure and new std-lib views`

### 2. Author All 6 Templates

**Context:** Schemas, validators, and the Template Acceptance Checklist exist. The six templates are listed in the research doc's [First Six Template Sketches](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#first-six-template-sketches): Editorial Quiet, Modern Confident, Crisp Utility, Warm Personal, Playful Creator, Serious Operations.

**Work:**

- For each template, author the full directory: `description.md` (≥ 300 words), `rules.json`, `fallback-tokens.json`, 3 reference PNGs at 390×844pt @2x (`home.png`, `detail.png`, `web.png`).
- No component overrides in this step. Bundled components are Step 9.
- Run each template through the Template Acceptance Checklist before committing.
- One commit per template so a partial landing leaves the others authorable independently.

**Validation:** `./agent dprint check`, validators against each template's `rules.json` and `fallback-tokens.json`, plus a contrast audit on each template's fallback tokens in light and dark.

**Exit criteria:** All 6 templates pass the acceptance checklist. Each `rules.json` validates; each `fallback-tokens.json` validates; each contrast audit passes; reference PNGs are present and correctly sized.

**Suggested commit subjects:**

- `feat(design/templates): add editorial-quiet template`
- `feat(design/templates): add modern-confident template`
- `feat(design/templates): add crisp-utility template`
- `feat(design/templates): add warm-personal template`
- `feat(design/templates): add playful-creator template`
- `feat(design/templates): add serious-operations template`

Intermediate commits inside one template may skip the full checklist as long as the template is complete and validated by the final commit for that template.

### 3. Seed-Driven Candidate Selection And `tao design` Text-Art

**Context:** Six validated templates exist. `tao` CLI infrastructure lives under `packages/tao-cli/`. No `design` subcommand yet.

**Work:**

- Implement seed computation: `first64bits(SHA-256(appQualifiedName + "::" + designDescription))`.
- Implement the candidate selection algorithm (see research doc [How Three Candidates Surface](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#how-three-candidates-surface)):
  - alphabetical template ordering,
  - keyword-overlap bias from `designDescription`,
  - weighted choice with `effectiveSeed = SHA-256(seed || candidateRound || templateLibrarySchemaVersion)`,
  - diversity constraint ≥ 2 of `{typePersonality, colorMood, density, radiusCharacter}`, relax to ≥ 1, then fall back with logged warning.
- Implement `tao design` CLI command producing terminal text-art with: candidate name, axis values, summary line, description excerpt, simulated component sample.
- Read app `qualifiedName` and `design { description }` from the project's parsed app declaration.
- Implement keyword-overlap scoring as a pure deterministic function (no embedding API).
- Add CLI tests asserting same inputs → same three candidates across runs.
- No lock writes yet; this step only renders previews.

**Validation:** `./agent cli test design`, `./agent compiler test`, `./agent dprint check`. CLI integration test runs `tao design` against a fixture project and snapshot-compares the rendered text-art.

**Exit criteria:** `tao design` renders three deterministic candidates for any project; same project → same candidates; description bias measurably alters the picks.

**Suggested commit subject:** `feat(design): implement seed-driven template selection and tao design CLI`

### 4. Lock Integration And Default/Reroll Behavior

**Context:** Candidate selection works in text-art only. `tao.design.lock` schema is `1`; the design-inference plan defines the lock shape and acceptance flow.

**Work:**

- Bump `tao.design.lock` `schemaVersion` from 1 to 2. Add the `templateSelection` block (`libraryVersion`, `seed`, `candidateRound`, `candidates`, `chosen`, `chosenAt`, `status`, `tokenSource`, `templateVersion`, `rulesHash`, `componentsHash`, `referencesHash`).
- Implement lock reading/writing for `templateSelection`. Update the design-inference lock readers to handle schemaVersion 2 (or fail loudly with a clear message if not yet supported).
- Implement `tao design update` to promote `.tao.design.lock` → `tao.design.lock`, including the `templateSelection.chosen` field.
- Implement default-without-choice behavior: dev mode picks the first candidate, writes `.tao.design.lock` with `status: "suggested"`, and prints the warning; production compilation fails when no `chosen` is present in `tao.design.lock` with a clear diagnostic that names the project and points to `tao design update`.
- Implement `tao design --reroll`: increment `candidateRound`, clear `chosen` and all generated token entries from `.tao.design.lock`, re-render candidates.
- Add CLI tests for the dev warning, prod failure, and reroll flow.

**Validation:** `./agent cli test design`, `./agent compiler test`. Integration tests run dev and prod compile against fixture projects to assert the warning vs. failure split. Lock-schema migration tests verify schemaVersion-1 locks fail loudly until upgraded.

**Exit criteria:** Lock writes round-trip cleanly; dev mode warns and defaults to first candidate; prod build fails until `tao design update` runs; `--reroll` produces a fresh candidate set.

**Suggested commit subject:** `feat(design): add template selection to design lock`

### 5. Fallback Token Generation And Contrast Audit

**Context:** Templates ship `fallback-tokens.json`. The lock can record the chosen template. Token generation does not exist yet.

**Work:**

- Implement the fallback token generator: load chosen template's `fallback-tokens.json`, apply seed-derived hue shift within the template's `colorMood` envelope (±30° rotation by default, narrower for templates that constrain `accentSaturation` to `low`).
- Implement the WCAG contrast auto-adjust step (research doc [Contrast Guarantee](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#contrast-guarantee)): check every required pair (text-on-bg, accent, status surfaces, input border, focus ring) in both light and dark; shift failing foreground HSL lightness up to ±30%; record adjustments under `provenance.contrastAdjustments`; reject if ±30% is insufficient.
- Write resolved tokens to `.tao.design.lock` under the existing `entries` array, with composite-role identity matching the design-inference plan's contract.
- Implement `tao design audit` as a standalone CLI command that reports per-pair pass/fail.
- Wire the audit into `tao design update` so failing locks cannot be accepted.

**Validation:** `./agent compiler test design generation`, `./agent cli test design audit`. Contrast audit tests verify each of the 6 templates against ≥ 5 seeds in light and dark.

**Exit criteria:** Fallback path produces a complete, contrast-safe, seed-personalized token set for every template-seed pair in both light and dark. `tao design audit` blocks acceptance on failure.

**Suggested commit subject:** `feat(design): implement fallback token generation with contrast guarantee`

### 6. LLM-Assisted Token Generation

**Context:** Fallback path is complete. The design-inference plan settles `--llm-provider` as the routing mechanism but the provider plumbing may need coordination.

**Work:**

- Add `tao design --llm` invocation path that calls the configured LLM provider with: chosen template's `description.md` (full), `rules.json` (full), app name and description, seed (hex), and the V1 token catalog schema.
- Pin temperature low and record provider/model identity in lock provenance.
- Validate LLM output against the token catalog before write. Reject and log on validation failure.
- Apply the same contrast guarantee step to LLM output as to fallback.
- Without `--llm`, behavior remains the fallback path from Step 5.
- Coordinate with the design-inference plan if `--llm-provider` plumbing needs additions in this repo.

**Validation:** `./agent cli test design llm`. Integration tests use a fixture provider that returns canned valid JSON to assert the schema validation path. Contrast tests reuse Step 5's harness.

**Exit criteria:** `tao design --llm` produces valid, contrast-safe token sets; `--llm` and fallback paths produce identical lock shapes; provider/model identity is recorded.

**Suggested commit subject:** `feat(design): add LLM-assisted token generation`

### 7. App Shell And Runtime Wiring

**Context:** Tokens land in `tao.design.lock`. The generated app does not yet read them. The design-inference plan settles `_gen/tao-app/tao-design.ts` and `createTaoDesign` as the generated-module surface.

**Work:**

- Implement the codegen path that reads `tao.design.lock`, resolves the chosen template, and writes `_gen/tao-app/tao-design.ts` with `createTaoDesign({ tokens, styles, adaptations })` per the design-inference plan.
- Implement the runtime helper layer: `useTaoStyle`, `useTaoShell`, `useTaoDesignContext`. Helpers live in `packages/tao-std-lib/tao/tao-runtime/` and are imported by the generated module.
- Wire web max-width clamp and prose max-width on the app shell from `rules.json.constraints.web.contentMaxWidth` and `proseMaxWidth`.
- Derive page gutter and section gap from `constraints.spacing.insetScale` and `sectionGapScale` and apply at app-shell and screen-root level.
- Wire splash screen tint from `color.background.app` token.
- Wire status bar style per screen based on current background.
- Preserve the hardened app shell safe-area and keyboard defaults from `TaoAppShell`; this step owns visual app-shell tokens such as web max-width, gutters, splash tint, and status-bar style.
- Apply the wiring to the existing Kitchen Sink / Data Schema test apps so the shell wiring is exercised.

**Validation:** `./agent compiler test codegen design`, `./agent expo-runtime test`, `./agent headless-test-runtime test`. Test apps render with max-width clamp on web; safe-area insets applied; status bar style follows scheme.

**Exit criteria:** Generated `tao-design.ts` resolves from lock; runtime helpers consume tokens; app shell respects template-derived max-width/gutter/section/splash/status values.

**Suggested commit subject:** `feat(design): wire app shell and generated design module`

### 8. Component Polish And Interaction States

**Context:** New views exist with token defaults from Step 1. The state matrix in research doc [Components](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#components) names what each V1 component must support.

**Work:**

- `Button`: add `hovered` (web pointer), `loading` (label hidden, spinner shown at fixed width), `focused` (accent ring 2pt + 2pt offset). Loading is wired as an explicit prop and via action async state.
- `TextInput`: add `focused`, `filled` (placeholder gating only), `error` (red border + error text slot below), `disabled`.
- `Card`: add `pressed` (when tappable), `selected`.
- `ListRow`: add `pressed`, `hovered` (web), `focused`, `selected`, `disabled`.
- `Section`: add `withTrailingAction`.
- `Avatar`: implement image rendering with initial-fallback derived from a `name` prop.
- `Badge`: implement `neutral`, `status` variants.
- `Icon`: implement size scale from `size.icon.*` tokens; family from `rules.json.iconFamily` via `@expo/vector-icons`.
- Wire `hitSlop` from `size.minTouchTarget` for `Button` and `ListRow`.
- Ensure roles/labels/hints are wired on all interactive components.
- Reuse `_taoDesignStyle` for all new states; do not invent a parallel mechanism.

**Validation:** `./agent expo-runtime test`, `./agent compiler test`, plus a state-matrix render test app per template.

**Exit criteria:** Every state in the matrix renders correctly for every shipped template; touch targets ≥ 44pt iOS / 48dp Android on `Button` and `ListRow`; focus indicator visible; reduced-motion respected for the shimmer.

**Suggested commit subject:** `feat(design): add polished component states and a11y wiring`

### 9. Template Component Overrides

**Context:** Std-lib component states are complete. Templates can now ship overrides.

**Work:**

- Implement compile-time import-path rewriting in the codegen layer: when `tao.design.lock.templateSelection.chosen` is non-null, rewrite generated component imports from `tao-runtime/Views` to `tao-runtime/templates/<identity>/<Component>` for every overridden component.
- Add a small TypeScript shim that re-exports the public prop types (`TaoButtonProps`, `TaoCardProps`, `TaoTextInputProps`, `TaoListRowProps`, `TaoSectionProps`) for overrides to typecheck against.
- Author overrides for all 6 templates:
  - **Required minimum per template:** Button.tsx, Card.tsx.
  - **Encouraged where the template benefits visibly:** TextInput.tsx, ListRow.tsx, Section.tsx.
- Each override imports from the internal `ViewFactories` layer so it inherits press/focus/disabled tracking and `_taoDesignStyle` resolution, then applies template-specific structural additions on top.
- Add CI typecheck that builds every template override against the current std-lib factory types.
- Update the component gallery (Step 10) to render every override × every state.

**Validation:** `./agent compiler test codegen design templates`, `./agent expo-runtime test`, manual gallery review.

**Exit criteria:** Each template's overrides render under that template only; std-lib defaults render under all other templates; TypeScript build passes for every override against the current factory contract.

**Suggested commit subject:** `feat(design/templates): wire template component overrides`

### 10. Feedback Components, Gallery, Verification

**Context:** Components and overrides are complete. Verification surface is not yet built.

**Work:**

- Add `LoadingShell`, `EmptyState`, `ErrorState` std-lib feedback components with the prop interfaces in research doc [MVP Cut → Components](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md#components). Default copy is hardcoded.
- `LoadingShell` shimmer respects `reducedMotion` via `useTaoDesignContext`.
- Build a component gallery app under `Apps/Test Apps/` that renders every std-lib component in every state, under each of the 6 templates, in both light/dark and at compact/regular widths.
- Build a side-by-side template demo: one demo app (or a stand-in) rendered under all 6 templates.
- Add CI checks:
  - automated contrast audit on every template against a 5-seed sample in light + dark,
  - template distribution audit over a 200-name corpus: no template > 40%, ≥ 5 of 6 templates appear,
  - accent ΔE between two seeds using the same template ≥ 20 (CIE76) on `color.accent.default`.

**Validation:** `./agent expo-runtime test`, `./agent dprint check`, CI runs for the three verification audits.

**Exit criteria:** Gallery renders every state without visual error; demo apps render across all six templates; CI audits pass on every push.

**Suggested commit subject:** `feat(design): add feedback components, gallery, and verification`

## Validation Strategy

- Each step has its own validation block; the listed `./agent` commands are the primary gates.
- Many steps will produce multiple smaller commits. Per Tao's git workflow, intermediate commits inside one step may skip running the full step's validation as long as the final commit of the step passes its exit criteria.
- The repo-wide `./agent prep-commit` battery should be run at the boundary between steps and before merge prep.
- For commits that touch only docs, run `./agent dprint check --incremental=false` and `./agent git diff --check`. Skip code tests.
- The CI audits added in Step 10 (contrast, template distribution, accent ΔE) become permanent regression gates beyond this project.

## Deferrals

Recap of work explicitly out of scope for this MVP. Each is a candidate for follow-on work.

- Source-authored token dictionaries; raw style escape hatches; explicit appearance syntax.
- Procedural app-icon generation; smart typography beyond RN defaults; haptics; pull-to-refresh; paginated-list visuals; image placeholders/fade-in; procedural illustrations; iOS `borderCurve` precision; Android elevation precision; reduced-motion beyond shimmer.
- `tao design preview` Expo-runtime gallery; pixel-perfect visual regression between seeds; VLM acceptance gate at acceptance time.
- Community-contributed templates; per-render-site template overrides; LLM-proposed copy.
- `font`, `elevation`, `transform` token categories; Tao-owned semantic icon names.

## Risks

- **LLM output mediocre or inconsistent.** Mitigation: fallback path is required and ships first; LLM is enhancement only. Manual token-sample review during `tao design update`.
- **Authoring 6 polished templates is harder than estimated.** Mitigation: Template Acceptance Checklist is strict; prefer fewer complete templates over more incomplete ones. Acceptable to ship 4 at launch and follow on with the last 2.
- **Override drift from std-lib API changes.** Mitigation: factory functions become a semi-stable internal contract; CI compiles every override on every std-lib type change.
- **Web max-width clamp behaves differently on React Native Web.** Mitigation: prove the clamp on the existing Kitchen Sink test app during Step 7 before relying on it.
- **`tao design` candidate UX feels like a chore.** Mitigation: text-art output must be fast and informative; first-candidate default must be genuinely good.

## Related Documents

- [Look Great By Default MVP Project Research](./Look%20Great%20By%20Default%20MVP%20Project%20Research.md) — settled decisions, full research, Round 1 agent reconciliation, brainstorm ambitions, open questions.
- [UI Design Inference Project Plan](./UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Design%20Inference%20Project%20Plan.md) — broader settled design model; lock file owner; this project nests inside its contract.
- [UI Design Inference Specification](../Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md) — implementation-facing contract.
- [Layout and Styling Project Plan](./UI%20-%20Layout%20and%20Styling/Layout%20and%20Styling%20Project%20Plan.md) — sibling track; Layout MVP must be stable before this project starts.
- [CORE_TENETS.md](../../CORE_TENETS.md) — Tao tenets, including "sane and tasteful defaults" and "different apps should end up with different defaults."
