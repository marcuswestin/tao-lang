# Look Great By Default MVP Project Research

## Goal

Make any Tao app — even an app written in an afternoon — feel visually polished, internally coherent, and visibly distinct from every other Tao app, without the author having to author a theme, pick fonts, choose colors, set spacing values, or hand-style standard components.

The success bar is "a stranger can tell two Tao apps apart at a glance, and both look like they were designed on purpose." Not "the framework provides a theme API."

This project is narrower than full design inference. It supplies the foundation that design inference will eventually accept, refine, and lock: a quality floor that is in place before any author writes a `design` block.

Working project name: **Look Great By Default MVP**. This project supersedes the placeholder "Beautiful App Defaults MVP" entry in the roadmap; the roadmap entry should be renamed and re-linked to this doc when the queue is updated.

## Current Context

- `CORE_TENETS.md` already requires: sane and tasteful defaults; everything works out of the box; different apps end up with different defaults; the variation is deterministic from the project name or generated programmatically.
- [UI Design Inference Specification](../Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md) defines the broader settled model: app `design { description }`, declaration/variant design specs, composite roles, accepted lock file, runtime resolver helpers, and React Native/Expo lowering.
- [UI Design Inference Project Plan](./UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Design%20Inference%20Project%20Plan.md) settles the V1 token categories: `color`, `spacing`, `radius`, `text`, `font`, `shadow`, `border`, `opacity`, `motion`, `size`, `elevation`, `transform`.
- [UI Appearance Future Work](./UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Appearance%20Future%20Work.md) preserves prior spacing and radius scale proposals as reference, not commitment.
- Existing std-lib views: `Row`, `Col`, `Box`, `Stack`, `WrappingRow`, `Text`, `TextLabel`, `MultiLineText`, `TextInput`, `Number`, `Button`.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` already exposes a `_taoDesignStyle` hook point and wires pressed/disabled state for `Button`.
- Layout MVP intentionally excludes color, radius, shadow, scroll containers, safe area, and keyboard handling. Those visual concerns belong here.
- Runtime is React Native 0.81 + Expo. Web target ships through React Native Web.

## Working Thesis

"Look great by default" is not one thing. It is the union of:

1. **A coherent visual language per app**, chosen deterministically, never identical across apps.
2. **Standard components that already look polished** in every interaction state, with no author work required.
3. **Frame-level concerns that authors forget** — app shell, max width on web, safe areas, keyboard, status bar, splash, app icon, scroll edges.
4. **Loading and empty states that don't look broken** while data is in flight.
5. **Microcopy and content shape defaults** so empty/error/loading screens read like a real product, not a placeholder.

If any of those five is missing, the app does not "look great." Authors who skip writing a theme will still trip on whichever piece is weakest.

A useful MVP cut is to ship just enough of all five categories that a small Tao app feels finished, and then deepen each category over time. Better to be 60% complete in all five than 100% complete in only tokens and buttons.

How taste enters the system matters as much as what the system can produce. A token generator that emits arbitrary-but-coherent values does not produce a beautiful app; it produces a neutral one. To produce something a person would call beautiful, generation needs an anchor: a curated set of design directions, each described in human language and visually exemplified, that the value-generation step refines into specific tokens and components. See [Design Templates: Instructions, Not Values](#design-templates-instructions-not-values) for the proposed mechanism.

## Decisions

The decisions below are settled after Round 1 auto-research consultation with local Codex and Claude agents (artifacts at `/private/tmp/tao-project-reviews/look-great-by-default-round-1-auto-research-20260519-135605/`). Where the agents disagreed, the chosen position is explained in [Round 1 Agent Reconciliation](#round-1-agent-reconciliation).

### Foundational

- Deterministic per-app design seeding is a CORE tenet implementation, not an opt-in. Apps without a `design` block still get a non-default-looking design.
- Seed = first 64 bits of `SHA-256(appQualifiedName + "::" + designDescription)`. Same inputs → same design forever. The seed only resets when the template library's `schemaVersion` changes.
- Variation is bounded to four visible axes (`typePersonality`, `colorMood`, `density`, `radiusCharacter`) plus four secondary axes (`elevationFeel`, `motionFeel`, `contrastLevel`, `layoutWidth`).

### Templates

- V1 ships **exactly 6 Tao-curated design templates**, drawn from the six sketches in [First Six Template Sketches](#first-six-template-sketches).
- Templates are authored by the **Tao core team only** in V1. Community submissions are deferred.
- Each template is a directory with `description.md`, `rules.json`, `fallback-tokens.json`, `references/` (3 Tao-authored PNGs), and optional `components/` overrides.
- Per seed, **three deterministic candidates** are surfaced via `tao design`. Candidates must pairwise differ on ≥ 2 of the four visible axes (relaxed to ≥ 1 if the library cannot satisfy strict).
- Templates may bundle component overrides for **exactly five std-lib views in V1**: `Button`, `TextInput`, `Card`, `ListRow`, `Section`. All other components are token-styled only. `Card` does not currently exist in std-lib and must be added.
- Overrides preserve the std-lib view's prop interface. They modify appearance, internal layout, and interaction polish only.

### Generation

- Token generation has two paths sharing one output format: a required **deterministic fallback** (`fallback-tokens.json` per template + seed-derived hue shift for accent differentiation), and an optional **LLM enhancement** at acceptance time. Both produce the same accepted lock shape.
- The LLM step runs only at acceptance time (`tao design update`). Production compilation reads only the accepted lock; no LLM runs at hot compile. Determinism after acceptance is guaranteed by the lock, not by the model.
- V1 generates values for **9 of 12 token categories**: `color`, `spacing`, `radius`, `text`, `shadow`, `border`, `opacity`, `motion`, `size`. Defer `font`, `elevation`, `transform`.
- All generated `color` entries include light and dark variants.
- Contrast is computed at acceptance time and re-checked at production compile. The acceptance step **auto-adjusts** failing pairs by shifting HSL lightness up to ±30%; if adjustment cannot reach WCAG AA, the suggestion is rejected and a re-prompt or fallback is required.

### Workflow

- `tao design` UX is **terminal text-art previews** in V1. PNG previews and an Expo-runtime gallery are deferred (`tao design preview`).
- If the author runs the app before `tao design`, dev mode defaults to the **first candidate with a visible warning**; production compilation **fails** until the author runs `tao design update`.
- `tao design --reroll` produces **new candidates** by incrementing `candidateRound` in the lock metadata. Re-roll clears the chosen template and all generated token entries.
- Template upgrades are **strict-pin**: when a template's `libraryVersion` advances, `tao design` warns; the author must run `tao design upgrade` to accept changes.
- Lock data lives in the existing `tao.design.lock` / `.tao.design.lock` files. `schemaVersion` bumps to **2** to add a `templateSelection` block.

### Quality Floor

- Every generated design must meet WCAG AA for body text (4.5:1), large text (3:1), and UI components (3:1) on all relevant pairs in both light and dark.
- Touch targets enforced at runtime: ≥ 44pt iOS, ≥ 48dp Android, on Button and ListRow.
- Visible focus indicator on all pressables: accent-colored ring, 2pt width, 2pt offset.
- Body font size ≥ 15pt; text scaling to 200% must not break layout.
- Color is never the only signal for status.
- Reduced motion disables shimmer and decorative motion.

### Project Boundaries

- This project covers five quality categories together at ~60% completeness rather than one category at 100%: visual language, polished std-lib components in every state, app shell/frame concerns (including web max-width), loading/empty/error, microcopy defaults.
- Source-authored token dictionaries, raw style escape hatches, and explicit appearance syntax remain deferred to the broader design-inference plan.
- All visual decisions are inspectable through `tao design` and reproducible across machines through the lock file.

## Round 1 Agent Reconciliation

The Codex and Claude agents (round-1 prompt at `/private/tmp/tao-look-great-prompts/look-great-by-default-round-1-prompt.md`) agreed on most fundamentals. Where they differed, the decisions above reflect:

- **Template count.** Codex 9, Claude 6. Chose 6 — matches the existing sketches, realistic curation budget, still mathematically meaningful (20 possible candidate triplets under diversity constraint).
- **Authorship model.** Codex AI-assisted + human review, Claude Tao-core-only. Chose Tao core only for V1 — quality bar must be tight.
- **Reference image count.** Codex 5 per template, Claude 3. Chose 3 — light enough to actually author 18 mockups total.
- **Candidate UX.** Codex generated PNGs, Claude pure text-art. Chose text-art — shippable now; PNG/gallery deferred.
- **No-choice behavior.** Codex prod-fails-until-accepted, Claude dev+prod default-to-first-with-warning. Chose Codex's stricter prod failure — matches the design-inference plan's "production isolation" requirement.
- **Re-roll semantics.** Codex new candidates (candidateRound bump), Claude same candidates (just pick differently). Chose Codex — if re-roll only re-picks among 3, no CLI command is needed.
- **Token category count.** Codex 11 (defer transform), Claude 9 (defer font + elevation + transform). Chose 9 — tighter MVP cut; font pipeline and elevation precision are separate work.
- **Eligible overrides.** Codex 5 (incl. TextInput), Claude 4 (excludes TextInput). Chose 5 — TextInput is identity-bearing and visible.
- **Icon strategy.** Codex Tao semantic names mapping to families, Claude direct `@expo/vector-icons` family per template. Chose Claude's direct wrap for V1; Tao semantic name layer is a follow-on.
- **Plan step count.** Codex 8 steps, Claude 10 steps. Chose Claude's 10-step structure for clearer commit boundaries.
- **Roadmap position vs demo apps.** Codex before Still/Rooms, Claude concurrent. Chose concurrent — Steps 3–7 land first so demos lean on them while Steps 8–10 finish.

## User Interview Notes

- 2026-05-19: User invoked `project-1-decide-next-project` but redirected: they want to create a new MVP project for "making apps look really, really good by default" instead of selecting from the existing queue. Working name accepted: **Look Great By Default MVP**.
- 2026-05-19: User confirmed scope priorities: really good default theme token values; default theme not identical across apps (already a CORE tenet); core fundamentals like spacing, layout, and **max-width especially on web**; default styles for interaction elements (inputs, buttons); default loading UI; "whatever more."
- 2026-05-19: User asked the agent to keep working only on this research doc and to ignore the parallel `Beautiful App Defaults MVP Project Research.md` produced by another agent in the same repo. Both docs are intentional drafts; the user will reconcile later.
- 2026-05-19: User asked for additional research on how to introduce real taste, including "what people are saying and what different approaches there are for just like creating UI that people tend to think is beautiful in general," and offered reference PNGs developed-against as one possible angle.
- 2026-05-19: User proposed a key direction: in addition to value generation (tokens), introduce **design templates** that are instruction-shaped descriptions of the app's visual style, used during the LLM-assisted generation step. Templates are not value themes; they describe what style the app is and how to create it.
- 2026-05-19: User asked for **three different design templates** to be surfaced per app, then folded into the process of picking specific values for spacing, color, and so on.
- 2026-05-19: User suggested templates may include a small set of UI elements built on top of std-lib components, styled to look good together, and that the app then uses these in place of the bare std-lib defaults.
- 2026-05-19: User directed: do not use the local Claude CLI for any future review rounds on this project (auto-research, plan review, implementation review). Subsequent rounds should run Codex only. Round 1 already used both; future rounds will call `codex exec` directly rather than the dual-agent script.

## External Research: Approaches To Beautiful UI

Survey of how teams have introduced "good taste at scale" elsewhere, grouped by the lever each approach pulls on. These inform what mechanisms Tao can plausibly adopt for the template-driven direction.

### Reference-Driven Approaches

- **Curated screen libraries.** Mobbin, Page Flows, and Pttrns archive thousands of mobile screens from apps people already consider polished. Designers use them as anchor references when establishing patterns. The lesson for Tao: a small curated set of anchor screenshots per template is more useful than a large unfiltered one, because the curation itself encodes taste.
- **Component reference catalogs.** Tailwind UI, Untitled UI, and Shadcn UI ship libraries of polished components. They don't define a "theme" so much as a known-good baseline that other designs deviate from on purpose. Most React UI starters work because they crib from this baseline.
- **Reference-anchored AI generation.** Vision-language models can compare generated mockups against a reference set ("does this look more like the editorial cluster or the playful cluster?"). Useful as an acceptance test rather than a generator: VLM-as-judge filters candidates but does not author them. The compile path stays deterministic; judging runs only at template-acceptance time.
- **Style transfer.** Older but still relevant: feed a reference image plus a structural mockup; transfer color palette, density, and corner treatment. Useful as a one-shot brainstorming tool, less so as a runtime pipeline.

### Design-System Primary Sources

- **Apple Human Interface Guidelines.** Emphasizes hierarchy, deference, and depth; gives precise component baselines (touch target 44pt, button styles, list patterns). Its strength is that following it lands an app squarely in iOS-native-feeling territory.
- **Material 3.** Treats theming as color/typography/shape subsystems, each with named roles. Generates entire color schemes from a single source color through tonal palettes. The "you pick the seed, Material picks the rest" model maps almost directly onto Tao's deterministic seed → resolved tokens flow.
- **Fluent 2.** Layout-and-spacing-first: spacing as the primary tool for hierarchy, elevation as a focused signal. The reduced palette discipline is instructive — fewer surface colors than people expect.
- **IBM Carbon, Salesforce Lightning, Atlassian, Shopify Polaris, GitLab Pajamas.** Each codifies opinions about density, type scale, and component voice. Reading several side-by-side shows that "looks great" is not one answer; it is a small set of internally coherent answers, each suited to a domain.

### Design-Principles Literature

- **Refactoring UI (Wathan & Schoger).** Practical heuristics: limit grays to one ramp; lean on font weight for hierarchy; prefer fewer shadows but stronger ones; use color sparingly to highlight; design at extreme sizes first. The closest-to-implementation rulebook for a defaults system.
- **Don't Make Me Think (Krug).** Reminds us most "looks great" failures are actually "reads great" failures: hierarchy, scannability, and labels matter more than chrome.
- **Universal Principles of Design.** A long catalog; relevant subset for Tao: alignment, proximity, contrast, repetition, hierarchy, Fitts's law on touch targets, Hick's law on choice counts.
- **Dieter Rams's 10 principles.** "As little design as possible" as a quality floor; useful as a tie-breaker when generation has too many degrees of freedom.

### Operational Patterns From Real Generators

- **Material Color Utilities.** Google's open library generates a complete tonal palette from a single source color, with documented contrast guarantees. A precedent for "one input, many tokens, deterministic, contrast-safe."
- **Stripe's design-tokens story.** Stripe rebuilt its design system around tokens that map to multiple platform outputs. The lesson: tokens are an output, not an authoring surface. Tao's direction matches.
- **Linear, Things 3, Mubi, Cron.** Each is widely cited as beautiful-by-default without being themable. The shared trick is that each has chosen one strong direction and held it. Tao should not try to be all of them at once; it should let an app pick one.
- **CSS-only "themes" such as simple.css, water.css, new.css.** These show how much default UI quality can come from a small stylesheet with no JS — just rhythm and type. Useful constraint to remember: most of "looks great" is not components, it is rhythm.

### What This Implies For Tao

- Generation should produce a small set of internally coherent directions, not a continuum. A continuum produces mush.
- Each direction needs a written description plus anchor examples — not just numeric tokens — so the LLM-at-acceptance-time has something concrete to reason about.
- Acceptance can be reference-anchored: a VLM check that says "this matches the editorial cluster" before locking.
- The component layer matters because design-system primary sources show that values alone do not carry the look — repeated component shapes do.
- Three candidates feels like a useful surface: enough variety to feel like a choice, few enough to compare side-by-side without fatigue. Worth validating with a sample.

## Design Templates: Instructions, Not Values

### Concept

A **design template** is a Tao-curated package of design intent. It contains a human-readable description, structured style rules, anchor references, and optional component overrides built on top of std-lib. Templates are the lever between the deterministic seed and the resolved tokens; they replace "the seed picks one profile family" with "the seed picks three candidate templates, the author picks one, the chosen template drives generation."

The shift is from values-first to **instructions-first**. A template does not say `radius.card = 8`. It says "soft pillowy surfaces; corners noticeably rounded; never sharp." The value-generation step (LLM at acceptance, deterministic resolver thereafter) reads the instructions and emits the values.

### Why Templates, Not Just Profiles

The earlier working model in this doc treated profile families as a fixed lookup ("calm utility," "playful creator") that resolves directly to tokens. Templates are richer:

- They survive better through LLM-assisted generation because instructions are LLM-native input.
- They invite human curation by people who write design intent for a living.
- They can bundle component-level decisions that values alone cannot express (e.g. "buttons in this template are pill-shaped with a subtle gradient, even though gradient tokens are not first-class").
- They give authors a moment of taste — a choice of three — without exposing the full design surface.

### Template Anatomy

Each template lives as a directory in `packages/tao-std-lib/tao/tao-runtime/templates/<identity>/`:

```text
templates/
  editorial-quiet/
    description.md         # LLM-facing prompt + human-facing rationale (≥ 300 words)
    rules.json             # structured constraints (see schema below)
    fallback-tokens.json   # required: full deterministic token set for offline path
    references/            # exactly 3 Tao-authored portrait PNGs at 390x844pt @2x
      home.png
      detail.png
      web.png
    components/            # optional std-lib overrides, V1 limit: Button, TextInput, Card, ListRow, Section
      Button.tsx
      Card.tsx
      ListRow.tsx
      Section.tsx
      TextInput.tsx
```

- `description.md` is the LLM-facing prompt and the human-facing rationale. Covers type personality, color mood, density, corner treatment, motion feel; names three reference apps by category, never scraped images.
- `rules.json` carries the deterministic schema described below.
- `fallback-tokens.json` is the required offline path: a complete V1 token set authored by the template curator, good but not personalized to the app's seed beyond the deterministic hue-shift step.
- `references/` are three Tao-authored portrait mockup PNGs (home/list, detail/form, web layout). No scraped screenshots; no external URLs. Used at curation time and during `tao design` text-art previews via the description summary.
- `components/` is optional. Eligible overrides in V1: `Button`, `TextInput`, `Card`, `ListRow`, `Section`. Override files preserve the std-lib view's prop interface.

### `rules.json` Schema

`rules.json` is a Tao-owned taxonomy (not DTCG-native, not Material-native). It describes design character; specific values are derived downstream. Required keys:

```json
{
  "schemaVersion": 1,
  "identity": "editorial-quiet",
  "version": "1.0.0",
  "displayName": "Editorial Quiet",
  "summary": "Serif headings, generous whitespace, one ink accent",
  "axes": {
    "typePersonality": "serif-accent",
    "colorMood": "neutral-cool",
    "density": "airy",
    "radiusCharacter": "subtle",
    "elevationFeel": "flat",
    "motionFeel": "still",
    "contrastLevel": "gentle",
    "layoutWidth": "standard"
  },
  "constraints": {
    "color": { "accentSaturation": "low", "surfaceContrast": "gentle", "allowDarkMode": true },
    "spacing": { "insetScale": "generous", "sectionGapScale": "generous" },
    "radius": { "controlRadius": "subtle", "cardRadius": "none" },
    "text": { "lineHeightFeel": "generous", "bodySize": "medium" },
    "shadow": { "shadowDepth": "none" },
    "motion": { "reducedByDefault": false },
    "web": { "contentMaxWidth": 960, "proseMaxWidth": 680 }
  },
  "componentHints": {
    "buttonStyle": "outlined",
    "cardStyle": "flat",
    "listRowStyle": "hairline-separated"
  },
  "iconFamily": "Feather",
  "tokenEmitPolicy": {
    "color": "required",
    "spacing": "required",
    "radius": "required",
    "text": "required",
    "shadow": "minimal",
    "border": "required",
    "opacity": "required",
    "motion": "required",
    "size": "required"
  }
}
```

- `axes` enum values are the authoring vocabulary the token generator reads. New enum values can only be added between `schemaVersion` bumps.
- `constraints` are the per-category authoring rails for the generator.
- `componentHints` guide both the LLM step and the bundled component overrides if present.
- `iconFamily` is a string referencing an `@expo/vector-icons` family.
- `tokenEmitPolicy` lets a template opt out of richness in a category (`minimal` = use category defaults, no template-specific shaping).

### How Three Candidates Surface

Algorithm:

1. Compute `seed = first64bits(SHA-256(appQualifiedName + "::" + designDescription))`. Empty string if no description.
2. Read `candidateRound` from `tao.design.lock.templateSelection` if present; else 0.
3. Combine: `effectiveSeed = SHA-256(seed || candidateRound || templateLibrarySchemaVersion)`.
4. Sort all templates alphabetically by `identity`.
5. Score each template with keyword overlap between `designDescription` and the template's `description.md` keywords; multiply pick weight by `0.7 + 0.6 * normalizedScore`. With no description, all templates score equally.
6. Primary pick: weighted choice using `effectiveSeed` as random source.
7. Second and third picks: iterate remaining templates in seed-shuffled order; pick the first two that each pairwise differ from the primary and from each other on ≥ 2 of `{typePersonality, colorMood, density, radiusCharacter}` (strict difference). If strict difference is unattainable, relax to ≥ 1 axis (weak). If still unattainable, surface all available templates with a logged warning `"Design template library too small to guarantee candidate diversity."`

Determinism: the same `(appQualifiedName, designDescription, candidateRound, templateLibrarySchemaVersion)` always produces the same three candidates.

`tao design` renders the three candidates as terminal text-art: name, one-line summary, axis values, simulated component sample row, and description excerpt. The author picks one. The choice is recorded in `tao.design.lock.templateSelection.chosen`. Subsequent runs without override continue to use the locked template.

### Default-Without-Choice And Re-Roll Behavior

If the author runs the app before `tao design`:

- **Dev mode**: uses the first candidate, writes `.tao.design.lock.templateSelection.chosen` with `status: "suggested"`, and prints a visible warning: `"No design template accepted. Using '<first-candidate>' by default. Run \`tao design update\` to accept."` Hot-reload continues.
- **Production compile**: fails with a clear diagnostic naming the project and pointing the author to `tao design update`. Matches the design-inference plan's production-isolation requirement.

`tao design --reroll` increments `candidateRound` in the lock and re-runs the candidate algorithm with the new effective seed, producing a fresh set of three candidates. Re-roll clears `chosen`, all generated token entries, and any view-level semantic entries that depend on the template. The seed and template library version are preserved.

### How Templates Feed The Token Step

The compile path stays deterministic; templates do not run in the hot path. Token generation has two paths sharing the same accepted-lock output shape:

**Deterministic fallback (always available):**

1. Load `fallback-tokens.json` from the chosen template.
2. Apply a seed-derived hue shift (±30° within the template's `colorMood` envelope) to the accent and accent-derived entries so two apps using the same template still produce visibly different palettes.
3. Run the contrast guarantee step (auto-adjust failing pairs; reject if adjustment fails).
4. Write to `.tao.design.lock` for review.

**LLM enhancement (optional):**

1. Input to the LLM: chosen template's `description.md` (full), `rules.json` (full), app `qualifiedName`, `designDescription`, `seed` (hex), and the expected output schema (the V1 token catalog).
2. Provider routed through the design-inference plan's existing `--llm-provider` flag. Temperature pinned low. Model identity recorded in lock provenance.
3. Output is strict JSON validated against the V1 token schema before write.
4. Contrast guarantee runs on LLM output before acceptance, same as fallback.
5. Output written to `.tao.design.lock` for review.

Either path passes through `tao design update` to be promoted to `tao.design.lock`. Production reads only the accepted lock. Determinism after acceptance is guaranteed by the lock, not by the model.

V1 token catalog (entries per category that the generator must emit):

| Category  | Shape                                                    | Required entries                                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`   | named semantic, light + dark variants                    | `background.app`, `background.elevated`, `surface.card`, `text.primary`, `text.secondary`, `text.muted`, `text.disabled`, `accent.default`, `accent.on`, `divider`, `border.default`, `border.focus`, `status.danger`, `status.warning`, `status.success` |
| `spacing` | named scale (pt)                                         | `inset.app`, `inset.card`, `gap.section`, `gap.group`, `gap.field`, `padding.control`                                                                                                                                                                     |
| `radius`  | named scale (pt)                                         | `none`, `control`, `card`, `sheet`, `pill`                                                                                                                                                                                                                |
| `text`    | per-role object: size, weight, lineHeight, letterSpacing | `display`, `title`, `body`, `supporting`, `label`, `caption`, `button`, `input`, `numeric`                                                                                                                                                                |
| `shadow`  | per-role object: offset, radius, opacity                 | `none`, `raised`, `floating`                                                                                                                                                                                                                              |
| `border`  | named widths (pt)                                        | `hairline`, `default`, `strong`, `focus`                                                                                                                                                                                                                  |
| `opacity` | named values (0..1)                                      | `disabled`, `pressed`, `hover`, `scrim`, `divider`                                                                                                                                                                                                        |
| `motion`  | per-role object: duration (ms), easing (string)          | `feedback`, `transition`, `emphasized`                                                                                                                                                                                                                    |
| `size`    | named point values                                       | `minControlHeight`, `minTouchTarget`, `icon.sm`, `icon.md`, `icon.lg`, `avatar.sm`, `avatar.md`                                                                                                                                                           |

Deferred categories: `font` (Expo Font loading pipeline is separate work), `elevation` (Android elevation precision belongs to native-polish), `transform` (motion/animation project).

### Contrast Guarantee

- Computed at acceptance time on `.tao.design.lock` writes; re-checked on production compile when loading `tao.design.lock`.
- Pairs checked: text on backgrounds and surfaces, accent on background, on-accent on accent, status surfaces and their on-colors, input border on input background, focus ring on focused surface, in both light and dark schemes.
- WCAG 2.1 relative luminance. Required ratios: normal text 4.5:1, large text (≥ 18pt regular or ≥ 14pt bold) 3:1, UI components 3:1.
- Failure path: auto-adjust the failing foreground by shifting HSL lightness toward 0% or 100% in steps of 1% up to ±30%. Adjusted values are recorded under `provenance.contrastAdjustments`. If ±30% does not reach threshold, the suggestion is rejected; LLM path re-prompts; fallback path errors and requires curator attention to the template's palette.

### Component Override Mechanism

Compile-time import-path rewriting:

- Eligible V1 overrides: `Button`, `TextInput`, `Card`, `ListRow`, `Section`. All other std-lib components stay token-styled defaults.
- Override files live at `packages/tao-std-lib/tao/tao-runtime/templates/<identity>/<Component>.tsx`.
- When the lock's `templateSelection.chosen` is non-null, the compiler rewrites generated import paths from `tao-runtime/Views` to `tao-runtime/templates/<identity>/<Component>` for every overridden component. No runtime branching.
- Overrides import from the internal `ViewFactories` layer rather than the public `Views` export, so they inherit press/disabled/focus state tracking and `_taoDesignStyle` resolution. They add visual character on top.
- Overrides are typechecked against the std-lib's exported prop types (`TaoButtonProps`, `TaoCardProps`, etc.). Compilation fails on prop drift.
- Overrides may not add required props or change validation behavior. New optional/internal props are allowed for template-specific structure.
- Component overrides are versioned with the template package; they upgrade together.
- No automated visual regression in V1. Manual review against the component gallery is the safeguard.

### Template Acceptance Checklist

Every V1 template must pass this checklist before merging:

1. `description.md` ≥ 300 words; covers type personality, color mood, density, corner treatment, motion feel; names three reference apps by category, no scraped images.
2. `rules.json` validates against the V1 schema; required keys present; enum values within allowed set.
3. `fallback-tokens.json` validates against the V1 token catalog (all 9 categories present, all required entries).
4. `references/` contains exactly 3 Tao-authored mockup PNGs at 390×844pt @2x portrait. No scraped images.
5. `components/` contains at minimum `Button.tsx` and `Card.tsx` overrides. `TextInput`, `ListRow`, `Section` are optional in V1 but encouraged.
6. Contrast audit passes in both light and dark for the template's `fallback-tokens.json` and for a 5-seed sample under hue-shift.
7. Diversity check: differs from every previously merged template on ≥ 2 of `{typePersonality, colorMood, density, radiusCharacter}`.
8. Component gallery renders every state of every overridden component without visual error.

### Lock Integration

Lock data fits inside the existing `tao.design.lock` / `.tao.design.lock` files specified by the design-inference plan. `schemaVersion` bumps from 1 to 2 to add a `templateSelection` block:

```json
{
  "schemaVersion": 2,
  "templateSelection": {
    "libraryVersion": "1.0.0",
    "seed": "a3f4c8d2e1b09f...",
    "candidateRound": 0,
    "candidates": ["editorial-quiet", "modern-confident", "crisp-utility"],
    "chosen": "editorial-quiet",
    "chosenAt": "2026-05-19T00:00:00Z",
    "status": "accepted",
    "tokenSource": "llm",
    "templateVersion": "1.0.0",
    "rulesHash": "…",
    "componentsHash": "…",
    "referencesHash": "…"
  },
  "appDesign": { … },
  "entries": [ … ]
}
```

Generated tokens flow into the existing `entries` array as composite role entries; the `templateSelection` block carries the selection metadata only. Old design-inference code that reads schemaVersion 1 must handle the new block or fail loudly.

### Template Upgrades

- Strict pin until `tao design upgrade`. Lock stores `templateSelection.templateVersion`.
- When the library reports a newer version for the chosen template, `tao design` warns with the version delta and a hint to run upgrade.
- `tao design upgrade` shows a diff of changed tokens and component overrides; author accepts or rejects.
- Auto-upgrade is explicitly rejected. Visual changes must never appear in an app without the author having seen the diff.

### First Six Template Sketches

V1 ships **exactly these six**. Each will be authored to the [Template Acceptance Checklist](#template-acceptance-checklist).

- **Editorial Quiet.** Serif headings, generous whitespace, neutral palette with one ink accent, hairline borders, no shadows, line height ≈ 1.6, max content width ~680pt prose / ~960pt content on web. Icon family: Feather. Component overrides: hairline-outlined Button, no-shadow Card, hairline-separated ListRow.
- **Modern Confident.** Bold sans, larger touch targets, soft shadows, generous radius, vivid accent paired with low-chroma neutrals. Icon family: MaterialCommunityIcons. Component overrides: filled Button with subtle elevation on press, lifted Card, edge-padded ListRow.
- **Crisp Utility.** Dense layouts, neutral grays with one signal color, hairline lines, monospaced numerics in tables, small radius, fast snappy motion. Icon family: Ionicons. Component overrides: minimal-padding Button, dense Card, two-line ListRow with leading icon.
- **Warm Personal.** Rounded humanist sans, warm neutrals, peach/sage accent, soft shadows, generous radius, lots of breathing room. Icon family: Feather. Component overrides: pill Button, soft Card, single-line ListRow with avatar.
- **Playful Creator.** Mixed type weights, saturated palette, larger radii, faster animations, bolder shadows. Icon family: MaterialCommunityIcons. Component overrides: gradient Button, lifted Card with overflow, vibrant ListRow.
- **Serious Operations.** Compact, high-contrast, monospaced accents, no decorative motion, table-first layouts. Icon family: MaterialIcons. Component overrides: rectangular Button, hairline Card, dense ListRow with right-aligned numerics.

### Risks And Constraints

- **LLM output mediocre or inconsistent.** Most likely failure: valid JSON but visually flat. Mitigation: ship the deterministic fallback first; treat LLM as enhancement; require manual token-sample review at `tao design update`.
- **Authoring 6 templates is more work than estimated.** Likely failure: 3–4 polished and 2–3 rough. Mitigation: gate strictly on the Template Acceptance Checklist; prefer fewer complete templates over more incomplete ones. Acceptable to ship 4 at launch with 2 in follow-on if needed.
- **Override drift from std-lib API.** Mitigation: factory functions become a semi-stable internal contract; an integration test compiles all template overrides whenever std-lib types change.
- **Web max-width clamp on RN Web.** Layout containment behavior differs from native. Mitigation: test early in a real RN Web test app; do not assume it works.
- **Three-candidate UX feels like a chore.** Mitigation: keep text-art output fast and informative; first candidate must be genuinely good, not a fallback.

## Ambitions: What "Look Great By Default" Should Cover

The list below is the full brainstorm. Items are not all MVP; the cut is in the next section.

### A. App Identity And Variation

- Deterministic per-app design seed from project identity and optional description.
- Profile families (e.g. calm, warm, crisp, serious, playful, editorial) so generation lands in a recognizable region instead of random noise.
- Variation axes: hue family, neutral temperature (cool/warm gray), contrast level, type personality (humanist, geometric, neutral sans, serif accent), radius character (sharp/soft/pill), density (compact/comfortable/airy), elevation feel (flat/lifted), motion feel (still/responsive).
- Stable light and dark variants derived from the same seed.
- Per-app accent color + supporting neutral ramp guaranteed to meet contrast thresholds.
- `tao design` CLI prints chosen profile, seed, and resolved variation axes.
- Inspect/regen workflow so the author can re-roll the seed if they hate it, lock it once it's right, and never have it change underneath them after that.

### B. Token Layer

- **Color:** background (app/elevated/inset), surface (card/sheet), divider, border (default/subtle/strong/focus), text (primary/secondary/muted/disabled/inverse), accent (default/on-accent/container/on-container), link (default/visited/active), status (success/warning/danger/info each with surface/on-surface), focus ring, selection, scrim/overlay, input bg/border/placeholder.
- **Typography:** display, screen title, section title, body, body-supporting, label, caption, button label, input text, numeric/metric value, code/mono. Line height, weight, letter spacing, truncation defaults baked in.
- **Spacing:** app inset, page gutter, section gap, group gap, field gap, control padding, list-row gap, card padding, plus a compact/comfortable/airy density modifier.
- **Radius:** none, subtle, control, card, sheet, pill, full — profile-aware so a "sharp" app does not round its inputs.
- **Border width:** hairline, default, strong, focus.
- **Shadow / Elevation:** flat, raised, floating, modal/sheet, with Android-elevation and iOS/web-shadow pairings.
- **Opacity:** disabled, pressed, hover, scrim, divider-on-surface.
- **Motion duration & easing:** quick feedback, transition, emphasized; reduced-motion fallbacks.
- **Size:** min control height, min touch target (44pt iOS / 48dp Android), icon size scale, avatar/badge size, header/toolbar/tab-bar heights.
- **Z-index ramp:** content, sticky, overlay, modal, toast, tooltip.
- **Breakpoints:** compact (< 600), regular (≥ 600), plus a "wide" web threshold for max-width clamping.

### C. App Shell And Frame

- Default app background that is not pure white, picked per profile.
- Status bar style (light/dark content) derived from theme.
- Splash screen tint and logo treatment derived from theme.
- App icon generation hook (procedural mark from seed) — at minimum, a tasteful default placeholder, since "white square" makes every fresh app look broken.
- Safe-area handling baked into every screen root.
- Keyboard-aware layout for screens with inputs.
- Web: max-width clamp on app content (~960–1200pt), centered, with breathable side padding.
- Web: max reading-width clamp on long-form text (~65ch).
- Web: pleasant body background that isn't the same as content surface, so the clamped width is visible without a border.
- Web: smooth scroll, sensible scrollbar styling, system font fallback stack.
- Page gutter rhythm: consistent inset on every screen so screens line up vertically when navigated.
- Section/group spacing rhythm: predictable gap above section headers, between groups, around lists.

### D. Standard Components, In Every State

- Buttons: primary, secondary, quiet/text, destructive, warning, icon-only, FAB-style. States for default, pressed, hovered (web), focused, disabled, loading, selected. Hit slop ≥ touch target. Loading state replaces label with a spinner without resizing.
- Text variants: heading levels, body, supporting body, label, caption, link. Max-line-length defaults. Truncation defaults.
- TextInput / multiline / search / number / secure / email / URL / phone. States for default, focused, filled, error, disabled. Floating-or-fixed label + helper text + error text slot. Placeholder color tuned for contrast. Focus ring honored on web; iOS/Android focus appearance correct.
- Selection controls: Checkbox, Radio, Switch, Slider — even just stubs styled correctly.
- Select / dropdown / picker — at minimum a native-feeling stub.
- DatePicker stub since `date` is a V1 field type.
- Card surface, with default padding, radius, and elevation per profile.
- List row: hit area, separator handling, press feedback, leading/trailing slots, two-line title/supporting layout.
- Section with heading and trailing action.
- Avatar with initial fallback derived from name.
- Badge / Pill / Tag / Chip.
- Icon component with size scale; bundled minimal icon set or wrapper around an Expo icon family so authors never write `<svg>`.
- Divider, with sensible "between list rows" vs "between sections" variants.
- Link with visible underline + hover + visited states on web.

### E. Loading, Empty, Error

- Page-level loading shell that doesn't flash blank.
- Skeleton blocks for known shapes (list row, card, paragraph, avatar). Shimmer disabled under reduced motion.
- Inline loading affordance on buttons during async actions, wired through Tao's action system.
- Default empty state component: illustration-or-symbol slot + title + supporting text + optional action. Defaults that read like a product, not "No data."
- Default error state component: same shape, with a retry action.
- Pull-to-refresh affordance on lists where applicable.
- "Loading more" / end-of-list affordance for paginated lists (even if pagination is deferred at the query level, the visual idiom should exist).

### F. Interaction Feel

- Press state on every pressable, including list rows and cards.
- Hover state on web for every pressable.
- Focus indicator that is visible without being garish (matches accent, not browser default).
- Touch ripple on Android where appropriate; subtle opacity/scale on iOS.
- Disabled state that reads as inert, not as low-priority.
- Selection state for rows and toggle-like controls.
- Cursor: pointer on web pressables.
- Haptics on key interactions (submit, destructive confirm, switch toggle) via Expo Haptics, gated by user preference.
- Keyboard return-key labels (`done`, `next`, `search`) derived from input role.
- Tap-outside-to-dismiss keyboard.
- Auto-scroll focused input into view.

### G. Content And Microcopy Defaults

- Default empty-state copy patterns (e.g. "No notes yet. Write your first.") instead of "No data."
- Default error copy patterns ("Couldn't load. Try again." with retry).
- Default loading copy when copy is needed at all (usually nothing; let the skeleton speak).
- Default button labels respect platform conventions (`Done` vs `Save` capitalization, destructive button placement on iOS modals).
- Smart typography defaults: smart quotes, true apostrophes, ligatures on, en/em dashes preserved, no double-space-as-emphasis nonsense.
- Numeric formatting that respects locale once i18n lands; sensible defaults until then.

### H. Image, Icon, Media Defaults

- Image placeholder color from theme while loading; fade-in on load.
- Default aspect-ratio handling for known roles (avatar = circle, card cover = 16:9, hero = configurable).
- Default tint for monochrome icons.
- Default radius on user-supplied images that matches profile radius character.
- Reasonable image cache defaults via Expo Image.

### I. Native Surface Polish

- Status bar style auto-set per screen based on background.
- Navigation bar (Android) and home indicator (iOS) tinted to app background.
- Splash screen color matches app background to remove the "white flash" before first paint.
- Default keyboard appearance (`light` / `dark`) matches color scheme.
- iOS continuous corners (`borderCurve`) on cards/sheets where supported.
- Android elevation values aligned with shadow tokens.
- Edge-to-edge layout where supported, with safe-area handled.

### J. Accessibility Built Into Defaults

- All generated color pairs meet WCAG AA contrast; warn if a seed pushes any composite under threshold.
- Min font size at body ≥ 15–16pt logical.
- Text scaling enabled; layout doesn't break at 200% scale.
- Min touch target enforced on Button, list row, IconButton.
- Visible focus indicator everywhere.
- Roles, labels, hints wired for standard components (Button, TextInput, list row, Checkbox/Radio/Switch).
- Reduced motion disables shimmer and any decorative motion.
- Color is never the only signal for status (icons or text accompany danger/warning/success).

### K. Inspect, Override, Escape Hatches

- `tao design` prints the resolved profile, seed, axes, and token sample for a project.
- `tao design preview` (later) renders a component gallery using the current resolved design.
- Accepted lock file (`tao.design.lock`) freezes the chosen design for production builds — already specified by the design-inference plan.
- Optional `description` in the app `design` block lets the author nudge the result without authoring tokens.
- No source-level token dictionary or raw style escape hatch in MVP. If the author hates the result, they re-seed or describe it, not redefine it.

### L. Verification Surface

- Component gallery app that renders every std-lib component in every state under both color schemes and at compact/regular widths.
- Snapshot of two demo apps (Still and Rooms, or stand-ins) under three different seeds, side by side.
- Contrast audit report in CLI output.
- "Looks the same" guard: a regression check that two seeds visibly differ across hue, density, or radius character.

## MVP Cut

The V1 contract.

### Templates And Selection

- Exactly **6 Tao-curated templates** as named in [First Six Template Sketches](#first-six-template-sketches).
- Each template ships `description.md`, `rules.json`, `fallback-tokens.json`, 3 reference PNGs, and ≥ 2 component overrides (`Button`, `Card` required; `TextInput`, `ListRow`, `Section` optional).
- Seed-driven candidate selection of three per app per the [How Three Candidates Surface](#how-three-candidates-surface) algorithm.
- Author choice via `tao design`; default-to-first-candidate with **dev warning + prod failure** until `tao design update` runs.
- `tao design --reroll` increments `candidateRound` for a new set of three.
- Identity, seed, candidateRound, chosen template, and template version locked in `tao.design.lock.templateSelection` (schemaVersion 2).
- Strict pin until `tao design upgrade`.

### Token Generation

- V1 generates the 9 token categories in the catalog table under [How Templates Feed The Token Step](#how-templates-feed-the-token-step).
- All `color` entries include **light + dark variants**.
- Two paths, one output: deterministic fallback (always available) and optional LLM enhancement at acceptance time.
- Contrast guarantee at acceptance time, re-checked at production compile.
- Seed-derived hue shift on the fallback path so two apps using the same template still visibly differ.

### App Shell

- Background color per template (token).
- Safe-area handled at app root.
- Web content max-width and prose max-width per template (`rules.json.constraints.web`); default `contentMaxWidth: 960`, `proseMaxWidth: 680`.
- Page gutter derived from `constraints.spacing.insetScale`: `tight → 12`, `standard → 16`, `generous → 24` pt.
- Section gap derived from `constraints.spacing.sectionGapScale`: `tight → 24`, `standard → 32`, `generous → 48` pt.
- Section heading rhythm: 1.5× section gap above section header.
- Splash tint derived from `background.app` token.
- Status bar style auto-set per screen based on the current background.
- Default app-icon placeholder (no procedural generation in V1).

### Components

Std-lib component state matrix the MVP must support (extensions to `packages/tao-std-lib/tao/tao-runtime/Views.tsx`):

| Component   | New states added in V1                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `Button`    | `hovered` (web), `loading` (label hidden, spinner shown at fixed width), `focused` (accent ring 2pt + 2pt offset) |
| `TextInput` | `focused` (border + ring), `filled` (placeholder gating only), `error` (red border + error text slot), `disabled` |
| `Card`      | new std-lib view; `default`, `pressed` (when tappable), `selected`                                                |
| `ListRow`   | new std-lib view; `default`, `pressed`, `hovered` (web), `focused`, `selected`, `disabled`                        |
| `Section`   | new std-lib view; `default`, `withTrailingAction`                                                                 |
| `Divider`   | new std-lib view; `subtle`, `default`, `strong`                                                                   |
| `Avatar`    | new std-lib view; image / initial-fallback                                                                        |
| `Badge`     | new std-lib view; `neutral`, `status`                                                                             |
| `Icon`      | new std-lib view; size scale from `size.icon.*`; family from `rules.json.iconFamily`                              |
| `Text`      | unchanged; styled through tokens only                                                                             |

Loading/empty/error are std-lib feedback components, template-neutral structurally, themed through tokens:

```ts
interface LoadingShellProps {
  rows?: number /* default 3 */
}
interface EmptyStateProps {
  symbol?: string
  title: string
  supporting?: string
  action?: { label: string; onPress(): void }
}
interface ErrorStateProps {
  symbol?: string
  title: string
  supporting?: string
  action?: { label: string; onPress(): void }
}
```

Default copy is hardcoded; the LLM-at-acceptance step does **not** propose copy in V1.

### Accessibility Guarantees

| Guarantee                                                         | Enforced at                                        |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| Text-on-bg pairs ≥ 4.5:1                                          | Acceptance + production compile; auto-adjusted     |
| Large text ≥ 3:1                                                  | Acceptance + production compile; auto-adjusted     |
| UI components (border, focus ring) ≥ 3:1                          | Acceptance + production compile; auto-adjusted     |
| Min touch target ≥ 44pt iOS / 48dp Android on `Button`, `ListRow` | Runtime: `size.minTouchTarget` token + `hitSlop`   |
| Visible focus indicator                                           | Runtime: accent ring on Button/TextInput/ListRow   |
| Body font size ≥ 15pt                                             | Generator constraint on `text.body.size`           |
| Text scaling to 200% does not break layout                        | Template layout constraints + dev overflow warning |
| Color is never the only signal for status                         | Component convention: icon + text accompany        |
| Reduced motion disables shimmer                                   | Runtime: `LoadingShell` checks `reducedMotion`     |
| Accessible roles + labels                                         | Wired in component implementation                  |

### Microcopy

- Hardcoded defaults in `EmptyState` ("Nothing here yet"), `ErrorState` ("Something went wrong" / "Try Again"), and `LoadingShell` (no copy by default).
- Author overrides any string by passing the prop.

### Inspect

- `tao design` (unlocked): print three candidate previews in text-art with axis values and a simulated component sample.
- `tao design update`: promote `.tao.design.lock` to `tao.design.lock`.
- `tao design --reroll`: new candidate set.
- `tao design --llm`: invoke LLM enhancement path; without flag, fallback path.
- `tao design upgrade`: review template-version changes and accept.
- `tao design audit`: standalone contrast audit.
- `tao design` (locked, no changes): chosen template + seed + 4-line token sample + "Lock is current."

### Verification

- **Component gallery app**: renders every std-lib component in every state, under all 6 templates, in light + dark, at compact + regular widths. Lives as a test app in the repo.
- **Side-by-side template demo**: one demo app (or a stand-in) rendered under all 6 templates.
- **Automated contrast audit** via `tao design audit`, runs in CI.
- **Differentiation metrics** in CI:
  - Template distribution over a 200-name corpus: no template > 40%, ≥ 5 of 6 templates appear.
  - Accent `ΔE` between two seeds using the same template ≥ 20 (CIE76, on `color.accent.default`).
- Manual review checklist used at template curation time.

### Deferred From MVP (Follow-On Work)

- Procedural app-icon generation beyond a tasteful placeholder.
- VLM acceptance check against template reference images at acceptance time (curation-only in V1).
- Smart typography (smart quotes etc.) beyond what RN gives free.
- Haptics on standard interactions.
- Pull-to-refresh + paginated-list affordances.
- Skeleton variants beyond a single block primitive.
- Image placeholders, tint, fade-in, role-based aspect ratios.
- Procedural illustrations for empty states.
- iOS `borderCurve` + Android elevation matching to a precise spec.
- Reduced-motion handling beyond disabling shimmer.
- `tao design preview` Expo-runtime gallery.
- Automated pixel-perfect visual regression between seeds.
- Community-contributed templates.
- Per-render-site template override; V1 is one chosen template per app.
- LLM-proposed empty/error copy.
- `font`, `elevation`, `transform` token categories.
- Tao-owned semantic icon names layered over `@expo/vector-icons` families.

## Proposed Implementation Steps

These are the 10 numbered intended implementation steps that the project plan will own. Sequenced for incremental landability and for the Still/Rooms demo apps to benefit from Steps 3–7 before later polish.

1. **Template infrastructure and schema.** Define the template directory layout under `tao-std-lib/tao/tao-runtime/templates/`. Write the `rules.json` JSON schema and validator. Write the `fallback-tokens.json` schema. Add the Template Acceptance Checklist doc. Add `Card`, `ListRow`, `Section`, `Divider`, `Avatar`, `Badge`, `Icon` to `Views.tsx` as new std-lib views (token-styled defaults only). Suggested commit subject: `feat(design): add template infrastructure and new std-lib views`.
2. **Author all 6 templates.** For each of the six template directions: write `description.md`, `rules.json`, `fallback-tokens.json`, and three reference PNGs. No component overrides in this step. One commit per template, subject `feat(design/templates): add <template-name> template`.
3. **Seed-driven candidate selection and `tao design` text-art.** Implement SHA-256 seed, candidate selection with diversity constraint, keyword-overlap bias from `designDescription`, and terminal text-art rendering. Subject: `feat(design): implement seed-driven template selection and tao design CLI`.
4. **Lock integration.** Add `templateSelection` block to `tao.design.lock` (schemaVersion → 2). Implement default-to-first-candidate with dev warning and prod failure. Implement `--reroll` (candidateRound bump). Subject: `feat(design): add template selection to design lock`.
5. **Fallback token generation and contrast audit.** Implement the fallback generator (rules + fallback-tokens + seed hue shift). Implement WCAG contrast auto-adjustment. Implement `tao design audit`. Subject: `feat(design): implement fallback token generation with contrast guarantee`.
6. **LLM-assisted token generation.** Implement `tao design --llm` using the design-inference plan's `--llm-provider` flag. Validate LLM output against the token schema. Reuse contrast adjustment. Record provider/model in lock provenance. Subject: `feat(design): add LLM-assisted token generation`.
7. **App shell and runtime wiring.** Generate `_gen/tao-app/tao-design.ts` with `createTaoDesign` from accepted lock. Wire web max-width clamp, prose width, page gutter, section gap, safe area, splash tint, status bar style. Add `useTaoStyle`/`useTaoShell` runtime helpers. Subject: `feat(design): wire app shell and generated design module`.
8. **Component polish and interaction states.** Add `hover` / `loading` / `focused` to `Button`. Add `focused` / `filled` / `error` / `disabled` to `TextInput`. Add states for `Card`, `ListRow`, and `Section`. Wire `hitSlop` for min touch target. Wire `Icon` via `@expo/vector-icons` per `rules.json.iconFamily`. Wire `Avatar` initial fallback. Subject: `feat(design): add polished component states and a11y wiring`.
9. **Template component overrides.** Implement compile-time import-path rewriting for the chosen template. Author Button + Card overrides for all 6 templates. Author TextInput / ListRow / Section overrides where the template benefits visibly. Enforce prop-interface typechecks. Subject: `feat(design/templates): wire template component overrides`.
10. **Loading/empty/error, gallery app, and verification.** Implement `LoadingShell`, `EmptyState`, `ErrorState` with reduced-motion gating. Build the component gallery app. Add the side-by-side template demo. Add CI checks: contrast audit, template distribution, accent ΔE. Subject: `feat(design): add feedback components, gallery, and verification`.

Demo-app slice: **Steps 3–7** are the minimum slice that benefits Still and Rooms (coherent palette per seed, web max-width, page gutter, section spacing, splash, status bar). Land Steps 3–7 before either demo finalizes visual polish; Steps 8–10 continue in parallel.

## Alternatives Considered

- **Ship a single curated theme.** Rejected: violates the tenet that different apps look different by default; every Tao app would feel templated.
- **Ship tokens but no component defaults.** Rejected: tokens without components do not produce "looks great." Most authors will use std-lib components directly and need them already polished.
- **Ship components but no per-app variation.** Rejected: all Tao apps would look identical, which is the failure mode the tenet exists to prevent.
- **Single profile family per seed, value-only generation.** Rejected: design-system primary sources show that values alone do not carry the look — repeated component shapes do. Templates that bundle both descriptions and component shapes carry the missing piece.
- **Continuous, unbounded seed → token mapping.** Rejected: a continuum produces mush. A small set of internally coherent directions, each curated, lands closer to what people call beautiful.
- **Generate the design at hot compile time using AI.** Rejected: matches the broader design-inference settled decision. LLM runs at acceptance time only; the compiler reads the accepted lock.
- **Skip the author choice; deterministically lock one template per seed.** Rejected: the moment of taste is worth keeping. Three candidates is small enough to compare and large enough to feel meaningful. First candidate is still the deterministic default for zero-config flows.
- **More than three candidates.** Rejected for V1: four-plus candidates erode side-by-side comparability. Three is small enough to render in one CLI screen.
- **Author-authored or community-contributed templates in V1.** Deferred: V1 templates are Tao-curated to hold the quality bar.
- **Reference images scraped from real apps as anchors.** Rejected: licensing risk. V1 references are Tao-authored mockups designed to evoke the cluster.
- **Wait for the full design-inference pipeline to land first.** Rejected: design inference is a long road, and the project tenet ("everything works out of the box without changing configurable values") is undermined every day until defaults exist. This MVP is the floor; design inference deepens it.
- **Treat web-only concerns (max-width, hover, scrollbar) as a separate project.** Rejected: an unclamped full-width Tao app on a desktop browser visibly fails the "looks great" test, so the web frame work is in scope.
- **Defer loading/empty/error states.** Rejected: every demo app hits these screens in the first 5 seconds. Skipping them is the single most visible quality regression possible.

## Open Questions

Most original open questions are now settled (see [Decisions](#decisions) and the Design Templates subsections). The remaining unknowns are:

- **Template description influence on the LLM token step.** Candidate selection biases by keyword overlap; should the LLM token-generation step also receive the `designDescription` as an authoritative input or only as flavor text? Round 2 candidate.
- **`density` as a per-user preference.** Should "density" remain a per-template axis only, or expose a per-user adaptation context like `colorScheme` and `textScale`? Round 2 candidate; cross-references the design-inference plan's adaptation axes.
- **Internal factory API stability contract.** Template overrides import from `ViewFactories`; what stability guarantees does that internal layer give? Versioning, deprecation path, integration test policy. Round 2 candidate.
- **Reference-image curation budget.** Authoring 18 mockup PNGs (3 × 6 templates) is real design work. Is in-house time available, or do we contract one designer for the V1 library batch?
- **Library version bump policy.** What counts as a `libraryVersion` bump worth warning the author about? Component override changes definitely; token shifts probably; copy-only changes probably not. Needs a written policy.
- **Two-app same-template visual differentiation in practice.** The ΔE ≥ 20 metric assumes the seed-hue-shift step produces meaningfully different accents. The shift envelope per template is unwritten and needs the curator's input per template.

### Settled Questions Record

Resolved during Round 1 auto-research:

| Was                    | Now                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| Template count         | Exactly 6                                                                      |
| Curators               | Tao core team only                                                             |
| `rules.json` format    | Tao-owned taxonomy, schema in [`rules.json` Schema](#rulesjson-schema)         |
| Reference images       | 3 Tao-authored portrait PNGs per template; no scraped images                   |
| Override package       | `packages/tao-std-lib/tao/tao-runtime/templates/<identity>/`                   |
| Candidate diversity    | ≥ 2 of 4 visible axes (strict), relax to ≥ 1 (weak)                            |
| `tao design` UX        | Terminal text-art in V1; PNG/Expo gallery deferred                             |
| LLM proposes copy      | No; visual tokens only                                                         |
| Upgrade policy         | Strict pin until `tao design upgrade`                                          |
| Contrast               | Acceptance-time auto-adjust; ±30% lightness; reject on failure                 |
| Icons                  | `@expo/vector-icons` family per template via `rules.json.iconFamily`           |
| Roadmap position       | After Layout MVP; concurrent with Still/Rooms; before broader design inference |
| Differentiation metric | Template distribution + accent ΔE ≥ 20 between two seeds                       |

## Repo Findings

- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` already wires Button pressed/disabled state via a `_taoDesignStyle` hook point — MVP component work can extend this pattern rather than inventing a new one.
- The Expo runtime already depends on Expo Image, Expo Font, Expo Symbols, Expo Haptics, Expo Linking, Expo Web Browser, Expo Splash, Expo Status Bar, Expo System UI, react-native-safe-area-context, and react-native-gesture-handler — every native-polish ambition above has runtime support already installed.
- The layout MVP explicitly does not own color, radius, shadow, scroll containers, safe area, or keyboard handling, leaving room for this project to claim them.
- Std-lib component surface is small enough that the MVP component cut above is reachable without an enormous component-library buildout.
- `Docs/Projects/UI - Layout and Styling/UI Design/UI Design Inference Project Plan.md` already lists `color`, `spacing`, `radius`, `text`, `font`, `shadow`, `border`, `opacity`, `motion`, `size`, `elevation`, `transform` as token categories — this MVP populates those with profile-aware default values.

## Suggested Next Steps

- Write `Docs/Projects/Look Great By Default MVP Project Plan.md` from the 10 numbered steps in [Proposed Implementation Steps](#proposed-implementation-steps).
- Update `Docs/Tao Project Roadmap.md`: rename or supersede the "Beautiful App Defaults MVP" entry, link this research and plan, and set status to `Planned` after the plan is written.
- Optionally run Round 2 auto-research narrowed to the remaining items in [Open Questions](#open-questions): description-as-LLM-input, density as adaptation axis, `ViewFactories` API stability contract, and library version bump policy.
- After the plan is written, run `project-4-review-project-plan` to do the formal plan review.
