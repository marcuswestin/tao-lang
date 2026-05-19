# Beautiful App Defaults MVP Project Research

## Purpose

Define a new MVP project whose job is to make Tao apps look materially better by default. This project is narrower than the full design-inference plan: it should give quick Tao apps strong default visual quality, app-specific variation, and polished standard components without requiring app authors to hand-author a theme.

Working project name: **Beautiful App Defaults MVP**.

Product goal: a person should be able to create a first Tao app in a few minutes and get a screen that looks intentionally designed, readable, platform-appropriate, and coherent without writing a theme, choosing tokens, accepting a design lock, or invoking an LLM.

The project exists because Tao's product promise depends on first-run visual quality. Correct rendering is not enough if the first app has raw-looking buttons, cramped inputs, edge-to-edge web forms, weak hierarchy, or unstyled loading and empty states.

## Handoff Summary

Start with the mini first slice before the broader MVP:

```text
Docs/Projects/Beautiful App Defaults MVP Mini Project Plan.md
```

Then continue with the full MVP plan:

```text
Docs/Projects/Beautiful App Defaults MVP Project Plan.md
```

Implementation should use existing Tao seams first:

- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` already wraps React Native primitives and accepts `_taoDesignStyle`.
- `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` already owns `createTaoDesign`, `resolveStyle`, `useTaoDesignContext`, `useTaoStyle`, and `TaoDesignProvider`.
- `packages/tao-std-lib/tao/ui/Views.tao` exposes the current source-facing UI primitives.
- `packages/compiler/compiler-src/design/` owns design analysis, lock reading/writing, and generated design entries.
- `packages/compiler/compiler-src/design/design-codegen.ts` emits `_gen/tao-app/tao-design.ts`.
- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` emits the generated app bootstrap and is the lowest-risk place to add app-shell content framing.
- `Apps/Test Apps/` is the place to prove the visual defaults with a small fixture.

The first implementation should not begin with LLM prompts, template review UI, lock schema migration, source styling syntax, broad design inference, or app-local generated components. The fastest useful path is deterministic runtime defaults plus app-shell spacing/max-width plus a visual fixture.

## Current Tao Context

- `CORE_TENETS.md` already requires sane tasteful defaults, out-of-the-box behavior, and different defaults for different apps.
- `Docs/Tao Language Design/UI Design Inference Specification.md` defines a broad V1 design-inference model with app `design` descriptions, design specs, variants, composite roles, lock files, generated tokens, and runtime helpers.
- `Docs/Projects/UI - Layout and Styling/Layout and Styling Project Plan.md` says default design should provide tasteful app-specific output without required configuration, while raw style literals and source-authored token dictionaries stay deferred.
- Current std-lib/runtime surface is small but usable: `Row`, `Col`, `Box`, `Stack`, `WrappingRow`, `Text`, `TextLabel`, `MultiLineText`, `TextInput`, `Number`, and `Button`.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` already has a `_taoDesignStyle` hook point and state-aware `Button` styling for `default`, `pressed`, and `disabled`.
- `packages/tao-std-lib/tao/tao-runtime/Views.tsx` currently gives `TextInput` a fallback placeholder color, but does not yet track focus state.
- `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` already measures runtime design context for platform, color scheme, compact/regular screen size, text scale, and reduced motion.
- `packages/compiler/compiler-src/design/design-analysis.ts` currently requires an accepted design lock in production design mode. This MVP intentionally changes that product boundary: production must be able to compile with curated deterministic defaults when no lock exists.
- `packages/compiler/compiler-src/codegen/app/app-gen-main.ts` currently wraps `AppUIView` directly in a `ScrollView`. It already imports `TaoDesignProvider`, `resolveStyle`, and `useTaoDesignContext`, so app-shell defaults can be added without introducing a separate styling path.
- The layout MVP intentionally excludes design tokens, border/radius, shadows, scroll containers, safe-area, keyboard-aware layout, and responsive/adaptive container queries. This project should add those only through default app shell, runtime design values, or std-lib components, not by muddying layout syntax.

## External Research Notes

- Apple HIG emphasizes hierarchy, harmony, and consistency. Buttons need recognizable style, content, semantic role, adequate hit area, and a press state. Text fields need clear hints or labels, appropriate keyboard behavior, and enough spacing to associate labels with inputs.
- Material 3 treats theming as color, typography, and shape subsystems. Color schemes can be generated from source colors and tonal palettes, typography uses named roles, shape uses a corner-radius scale, elevation combines tonal and shadow cues, and components ship with role variants and defaults.
- Fluent 2 layout guidance treats spacing as a tool for proximity, grouping, hierarchy, and scannability. Its elevation system uses a controlled shadow ramp to communicate importance and focus.
- The Design Tokens Community Group format frames tokens as platform-agnostic design decisions that can be converted into platform-specific code. Tao does not need DTCG export for MVP, but the token categories and interoperability direction are useful.
- React Native 0.81 provides the implementation constraints: `Pressable` supports press state, hit slop, Android ripple, hover events, and stateful style functions; `TextInput` owns keyboard, placeholder, focus, submit, autocomplete, and font-scaling behavior; React Native accessibility APIs expose roles, labels, hints, state, live regions, and platform differences.
- Nielsen Norman Group's aesthetic-usability research is a useful product-quality reminder: attractive interfaces can make users more tolerant of minor usability issues, but visual polish cannot rescue severe task or information-architecture problems.
- Nielsen Norman Group's visual-design principles are a useful review checklist for generated Tao screens: scale, visual hierarchy, balance, contrast, and Gestalt grouping.
- Don Norman's emotional-design framing supports a Tao design bar beyond raw correctness: the default UI should create a positive first response while still behaving clearly.
- Material 3 Expressive is relevant as an example of "design feeling" becoming systemized: deeper tonal palettes, type roles, shape language, grouped containers, and expressive interaction feedback are treated as a design language, not one-off component styling.
- Windows 11 design principles are useful for default app direction because they define aesthetic qualities in operational terms: effortless, calm, personal, familiar, complete, and coherent.
- Atlassian's design foundations reinforce that good product UI needs a full system of accessibility, content, spacing, grid, color, typography, iconography, elevation, border, and radius.
- Figma's design-system writing on variables and modes supports treating design values as contextual and semantic. Light/dark, localization, screen size, and other modes should be first-class adaptation contexts rather than forks of the component library.
- Practitioner discussions around moodboards and inspiration boards point to a common failure mode: collecting references is weak unless the references are translated into concrete decisions such as spacing, hierarchy, color ratio, type scale, component shape, and layout rhythm.

## Taste Research Synthesis

Beautiful default UI is not only a better palette. It usually combines five layers:

1. **Art direction:** a small set of taste rules that says what the app should feel like and what visual moves are forbidden.
2. **Composition:** hierarchy, grouping, balance, information density, readable line lengths, and clear page rhythm.
3. **Component craft:** buttons, inputs, cards, lists, loading states, empty states, and errors that look like they belong to the same product.
4. **Token discipline:** color, typography, spacing, radius, elevation, opacity, and motion values that stay consistent and adapt across contexts.
5. **Reference calibration:** screenshots, reference boards, or generated PNGs used as target taste evidence, then reduced into measurable style decisions.

For Tao, this means "good taste" should be represented as a design template plus component recipes, not only as generated raw values.

## Approaches For Introducing Taste

### Approach 1. Curated Design Profiles Only

Tao ships several carefully authored profiles. The app seed picks one profile and resolves tokens and components from it.

Strengths:

- deterministic;
- no LLM dependency;
- easy to test;
- keeps visual quality high if the profiles are well authored.

Weaknesses:

- app-specific nuance is limited;
- profiles can start to feel repetitive;
- new app categories require new authored profiles.

### Approach 2. LLM-Generated Token Sets

An LLM reads the app name, app design description, and component inventory, then proposes concrete token values.

Strengths:

- more app-specific;
- can produce surprising combinations;
- fits the existing design-inference direction.

Weaknesses:

- raw generated values can be tasteful in isolation but incoherent as a system;
- it needs review, fallback, and validation;
- without templates, it may produce generic "AI dashboard" aesthetics.

### Approach 3. Template-Guided Generation

Tao selects a design template first. The template carries art direction, reference intent, component recipe rules, and token tuning ranges. The LLM or heuristic generator then chooses specific values inside those constraints.

Strengths:

- app-specific without being unbounded;
- preserves coherent taste;
- makes generated values easier to review because there is an explicit design brief;
- allows curated component families to travel with each visual direction.

Weaknesses:

- requires initial template authorship;
- needs a way to inspect which template and rules were used;
- template boundaries must stay semantic rather than becoming a hidden style DSL.

Recommended path: **Approach 3**, with Approach 1 as the fallback when the LLM/suggestion stage is not available.

### Approach 4. Reference PNG Calibration

Each design template can include a small reference pack:

- curated screenshots from public design systems or Tao-owned generated examples;
- generated reference PNGs that show the intended screen feeling without copying a specific product;
- component-gallery target screenshots;
- annotations that extract what matters: density, contrast, spacing rhythm, corner style, elevation, type scale, action emphasis, and empty-state treatment.

The point is not to copy references. The point is to convert taste into constraints and reviewable screenshots.

This should become part of the project validation loop:

1. Choose template and app seed.
2. Generate token and component recipes.
3. Render a component gallery and 2-3 representative app screens.
4. Compare screenshots against the template's reference pack and rejection checklist.
5. Adjust template rules or generated values.
6. Lock or accept the result when the screen feels coherent.

## Design Template Model

A Tao design template should be higher level than a value theme.

It should contain:

- **Name:** stable template identity.
- **Feeling:** short language for the desired emotional effect.
- **Best for:** app categories where the template should be selected.
- **Avoid:** visual moves that would break the template.
- **Composition rules:** density, max width, hierarchy, section rhythm, card/list/form layout defaults.
- **Component family:** preferred component variants and Tao views created on top of standard library primitives.
- **Token ranges:** safe ranges for color contrast, spacing, radius, shadow/elevation, type scale, and motion.
- **Reference pack:** PNGs or screenshots plus extracted visual rules.
- **Accessibility floor:** minimum contrast, text scale, hit target, focus, and state requirements.
- **Platform notes:** how the template adapts on iOS, Android, and web.
- **LLM prompt brief:** compact instructions for generating concrete token values and component recipes.

The template selection pipeline could be:

```text
app name + app design description + app category hints
  -> deterministic template selection
  -> optional LLM/template-specific suggestions
  -> token values + component recipes + app shell defaults
  -> component gallery + app screen screenshots
  -> accepted design data
```

## Initial Three Design Templates

These are not final names, but they are strong starting directions.

### 1. Quiet Craft

Feeling:

- calm, precise, warm, thoughtful, content-first.

Best for:

- personal productivity, notes, local-first apps, finance review, wellness, planning, focused tools.

Design instructions:

- make content feel cared for, not decorative;
- use generous but controlled whitespace;
- prefer subtle surfaces over obvious panels;
- keep one clear primary action per screen;
- use restrained color with a warm or natural accent;
- use soft radius and very low elevation;
- make empty states quiet and useful.

Avoid:

- neon accents;
- heavy gradients;
- dense table-like layouts;
- multiple competing call-to-action colors;
- oversized hero treatments inside operational screens.

Likely component family:

- `QuietPage`
- `QuietCard`
- `PrimaryAction`
- `SecondaryAction`
- `FieldStack`
- `InlineHelp`
- `EmptyPanel`
- `SoftDivider`

Token tendencies:

- warm neutral background;
- high-quality text contrast;
- medium-large app inset;
- modest card radius;
- low shadow/elevation;
- comfortable input height.

### 2. Crisp Operations

Feeling:

- clear, professional, scannable, reliable, work-focused.

Best for:

- dashboards, admin tools, operational review, project trackers, data-heavy app screens, support tools.

Design instructions:

- prioritize scanning and comparison;
- keep density moderate to high without crowding;
- use borders and surface contrast more than shadow;
- make status and risk states obvious but not loud;
- align labels, values, and actions to a strong grid;
- support web/tablet max widths and split panes early.

Avoid:

- playful rounded shapes;
- decorative illustrations as primary content;
- weak row boundaries;
- low-contrast metadata;
- card-heavy marketing composition.

Likely component family:

- `OperationsPage`
- `Toolbar`
- `DataCard`
- `MetricTile`
- `StatusPill`
- `DenseListRow`
- `InlineFilter`
- `ReviewAction`
- `RiskBanner`

Token tendencies:

- cool neutral background;
- crisp borders;
- compact spacing scale;
- small-to-medium radius;
- minimal shadow;
- strong typographic hierarchy for labels, values, and metadata.

### 3. Expressive Product

Feeling:

- distinctive, modern, energetic, approachable, memorable.

Best for:

- creator tools, social apps, onboarding-heavy apps, showcase apps, lightweight consumer products.

Design instructions:

- use a more ownable accent system;
- allow bolder shape contrast and stronger section identity;
- use larger screen titles and richer empty states;
- make loading and success states feel delightful but fast;
- keep components coherent through repeated shape and color logic;
- still respect readability and task clarity.

Avoid:

- novelty on every element;
- saturated backgrounds behind long text;
- uncontrolled random palettes;
- decorative motion that hides state changes;
- excessive cards inside cards.

Likely component family:

- `ExpressivePage`
- `HeroHeader`
- `FeatureCard`
- `PillAction`
- `FloatingAction`
- `CelebrationEmptyState`
- `ExpressiveLoading`
- `AccentBadge`

Token tendencies:

- brighter accent palette;
- stronger shape contrast;
- larger title scale;
- more visible state overlays;
- moderate motion tokens with reduced-motion fallback;
- card and badge components that look intentionally related.

## Template-Owned Components

The user-facing source should still use standard Tao views where possible, but the project can generate or provide template-owned components built on top of the standard library.

Examples:

```tao
share frame QuietCard {
  render Box [pad 18, gap 10, width fill] {
    @@children
  }
}

share ui EmptyPanel Title text, Body text {
  render QuietCard {
    Text Title
    MultiLineText Body
  }
}
```

These components should not be arbitrary app-specific hacks. They should be reusable output of the selected design template:

- they compose existing std-lib primitives;
- they carry semantic names;
- they receive template recipe styles automatically;
- they can be previewed in the component gallery;
- they are stable enough for generated app code and examples.

Settled implementation decision: template-owned components should start as Tao-owned standard/template components, not generated app-local code. They belong in the std-lib/runtime path first so they are inspectable, stable across apps, testable in fixtures, and compatible with deterministic templates. App-local generated components are deferred until the full design-inference track can justify the added ownership and migration complexity.

## LLM Stage Shape

The LLM stage should not receive the vague instruction "make it beautiful." It should receive a structured brief:

```text
App: Still
Description: local-first personal focus app
Selected template: Quiet Craft
Screen archetypes: first-run form, now screen, manage list
Components used: Button, TextInput, ListRow, Card, EmptyState
Reference rules:
  - warm neutral background
  - one primary action
  - comfortable spacing
  - low elevation
  - quiet empty states
Generate:
  - concrete token values
  - component recipes
  - state overlays
  - app shell layout defaults
Reject:
  - neon accents
  - dense dashboards
  - heavy shadow
  - wide web forms
```

The LLM output should be validated and normalized:

- contrast checks;
- minimum hit target checks;
- text scale checks;
- token category completeness;
- component recipe completeness;
- platform support checks;
- screenshot review against reference pack.

If validation fails, Tao falls back to curated template defaults.

## Taste Rejection Checklist

Generated defaults should be rejected when:

- every screen has the same spacing rhythm regardless of content type;
- all components have the same radius and shadow strength;
- web content stretches wider than readable lines;
- buttons look like labels or labels look like buttons;
- loading, empty, and error states look unstyled;
- form labels and inputs are not visually grouped;
- focus state is invisible;
- metadata is too faint to read;
- there are too many accent colors fighting for attention;
- dark mode is just inverted light mode;
- the UI looks like a generic component demo rather than an app with a point of view;
- a reference board exists but no concrete spacing, hierarchy, color, or component decisions were extracted from it.

## Planning Decisions

- Beautiful App Defaults MVP should not require `tao.design.lock` for production. Curated deterministic templates must be enough for an app to compile and look good out of the box.
- The project should still support app `design { description "..." }` as an input when the parser/compiler work for app design blocks is available. If that syntax is not ready when implementation starts, app name and package identity are enough for the first template selection slice.
- Template-guided generation is the preferred model. The selected template supplies art direction, component recipe constraints, token ranges, reference expectations, and rejection rules before any LLM-generated values are considered.
- The first shipped templates should be `Quiet Craft`, `Crisp Operations`, and `Expressive Product`.
- Template-owned components should start as Tao-owned standard/template components with stable semantic names such as `Page`, `Card`, `ListRow`, `Badge`, `FieldGroup`, `EmptyState`, and `LoadingState`. The selected template changes their recipes, not their source-facing API.
- App-local generated components are deferred. They are more flexible, but they create harder inspection, migration, and ownership problems than the MVP needs.
- Reference PNGs should begin as review artifacts generated from component galleries and representative screens. The research and plan should record reference rules first; binary golden references can be committed only after the first gallery is stable.
- Automatic validation should cover token completeness, contrast floors, touch targets, missing recipes, state coverage, platform support, and basic screenshot sanity. Human or agent review should judge taste, hierarchy, coherence, and whether the output still looks generic.
- The plan should prove the work with a Beautiful Defaults Gallery plus Still-style and Rooms-style representative screens, not only unit tests.
- Full AI-assisted design inference, broad lock-file workflow, source-authored token dictionaries, general styling syntax, and app-specific component generation should stay deferred.
- Runtime design work should extend the existing `packages/tao-std-lib/tao/tao-runtime/tao-design-runtime.tsx` and `Views.tsx` boundaries instead of adding a second styling resolver path.
- Required recipe and token slots should fail through template completeness tests, compiler/codegen validation where statically known, and development diagnostics. Production runtime may keep a safe empty-style fallback only for unknown optional recipe names, not for incomplete shipped templates.
- The MVP should define the template-guided LLM suggestion contract, prompt shape, output schema, and validation rules, but real provider-backed suggestion execution can stay deferred if curated deterministic templates and fixtures are enough to prove visual quality.

## Auto-Agent Consultation Attempt

The auto-research helper was run for round 1 with this prompt:

```text
/private/tmp/beautiful-app-defaults-auto-research-round-1-prompt.md
```

Artifacts:

```text
/private/tmp/tao-project-reviews/beautiful-app-defaults-round-1-auto-research-20260519-135034
```

Result:

- Codex failed before producing review output because the sandboxed CLI could not initialize the local app-server/state database.
- Claude timed out after 600 seconds and produced no substantive output.
- An unsandboxed rerun was rejected because it would allow local Codex/Claude CLIs to export private repository context to external vendor services.

No agent feedback from this attempt was used as a research source. The planning updates after this point are local synthesis from the same question batch.

## Round 1 Local Planning Synthesis

- Keep three curated templates in the project, but implement the first code slice so a single template could ship independently if necessary. Template selection and recipe completeness tests should make adding the second and third templates mechanical.
- Name code ownership in the plan before implementation starts. The likely split is compiler design modules for selection/resolution and suggestion contracts, std-lib runtime modules for recipe lowering, std-lib Tao declarations for source-facing components, runtime targets for app shell integration, and fixtures/tests for visual acceptance.
- Treat written template rules plus screenshot review checklists as the first taste-calibration mechanism. Reference PNGs are useful after the gallery stabilizes, but should not block the first implementation slices.
- Make the mandatory visual proof small and concrete: component gallery, profile/template gallery, one Still-style screen, one Rooms-style screen, web compact/regular screenshots, dark/light screenshots, long text, and disabled/pressed/focused/loading/empty/error states.
- Keep app shell defaults separate from layout syntax. Web max width, safe-area padding, scroll padding, and keyboard-aware defaults should live in generated app shell/runtime helpers and be visible in debug output.
- Avoid turning this into full design inference by deferring production design locks, source-authored token dictionaries, render-site style specs, broad variant generation, app-local generated components, and real LLM-provider acceptance workflows.

## Working Thesis

The MVP should start with **deterministic design foundations plus excellent standard components**, not the whole design-inference pipeline.

The smallest strong version is:

1. Generate or select an app design profile from app name and optional app design description.
2. Resolve a complete token and component-recipe set from that profile.
3. Apply those recipes automatically to std-lib components and app shell surfaces.
4. Adapt the recipes for platform, color scheme, text scale, and compact versus regular screen width.
5. Prove the defaults in a component gallery and in Still/Rooms-style app screens.

If full app-specific generation is too much for the first slice, the fallback is a small curated set of high-quality profiles selected deterministically by app identity.

## Ambition Inventory

### App Design Identity

- Optional app-level `design { description "..." }` input.
- Deterministic fallback design input when no design block exists.
- App-specific seed from app name, package identity, and design description.
- Curated profile families such as calm utility, warm personal, crisp operations, serious finance, playful creator, social realtime, editorial knowledge, and focused productivity.
- Stable light/dark variants for every profile.
- Profile preview/debug output so authors can inspect what Tao chose.

### Token Families

- Color tokens:
  - app background, elevated background, surface, card, overlay, divider, border;
  - text primary, secondary, muted, disabled, inverse;
  - accent/brand, on-accent, accent container;
  - success, warning, danger, info and their surface/on-surface variants;
  - focus ring, selection, input background, input border, placeholder.
- Typography tokens:
  - display, screen title, section title, body, supporting body, label, caption, button label, input text, numeric/metric value;
  - line heights, font weights, text scale behavior, truncation defaults.
- Spacing tokens:
  - app inset, page gutter, section gap, group gap, field gap, control internal padding, list row gap, card padding, compact/dense variants.
- Size tokens:
  - minimum control height, minimum touch target, icon size, avatar/badge size, list row height, toolbar/header height.
- Radius tokens:
  - none, subtle, control, card, sheet, pill, full;
  - profile-specific roundness without making every component equally rounded.
- Border/stroke tokens:
  - standard border, subtle border, strong border, focus border, input border, divider.
- Elevation/shadow tokens:
  - flat, raised, floating, modal/sheet;
  - Android elevation and web/iOS shadow equivalents where supported.
- Motion tokens:
  - quick feedback, normal transition, emphasized transition;
  - reduced-motion fallback values.
- Opacity tokens:
  - disabled, pressed, hover, overlay, scrim.

### Semantic Composites

- Action composites:
  - primary, secondary, tertiary, quiet, destructive, warning, link, icon-only, floating.
- Text composites:
  - screen title, section header, body, supporting, metadata, caption, empty-state title, empty-state body, error text.
- Surface composites:
  - app background, section, card, inset card, warning surface, success surface, selected row, hovered row.
- Form composites:
  - field group, label, help text, error text, input, multiline input, search input, picker-like input.
- Navigation composites:
  - screen header, tab bar, tab item, stack back action, selected tab, inactive tab.
- Feedback composites:
  - loading inline, loading page, skeleton block, empty state, error state, banner, toast/snackbar, progress.
- List composites:
  - list container, row, row title, row supporting text, row action, section header, divider.

### Standard Components

- Text components:
  - `Text`, `TextLabel`, `MultiLineText`, `Number`;
  - default font, weight, color, line height, truncation, text scaling, and maximum readable line lengths.
- Button components:
  - primary, secondary, quiet/text, destructive, warning, icon-only, loading, disabled;
  - state overlays for pressed, focused, hovered on web, disabled, selected, and loading;
  - touch target and hit slop defaults.
- Input components:
  - text input, multiline text area, search input, number input, secure input;
  - label/help/error regions, placeholder color, focus ring, disabled state, validation state, keyboard type, submit behavior.
- Selection controls:
  - switch, checkbox, radio, segmented control, picker/select, if the form project exposes them.
- Data display:
  - card, badge/pill, divider, metric tile, list row, section header, avatar placeholder.
- Feedback states:
  - inline spinner, page loading state, button loading state, skeleton placeholder, empty state, error state, success/confirmation.
- Navigation:
  - stack header, tab bar, tab item, active/inactive states, back action, web max-width aware content shell.
- Modal/sheet/dialog:
  - probably not first slice unless routing/app shell already provides the needed runtime surface.

### App Shell And Layout Defaults

- Safe-area aware root shell for native platforms.
- Keyboard-aware form screen defaults.
- Default page padding by screen class.
- Default content max widths on web and tablet so forms, detail pages, and dashboards do not stretch edge to edge.
- Centered readable content columns for simple apps.
- Split layout defaults for regular-width screens when there is obvious master/detail or nav/content structure.
- Scroll container defaults with visible content padding, keyboard avoidance, and bottom safe-area padding.
- Section spacing defaults that create hierarchy without requiring manual `gap` everywhere.
- Card/list/form max widths and line-length constraints.
- Default empty/error/loading page layouts.

### App-Specific Variation

- Deterministic profile selection from app identity.
- Palette variation that preserves contrast and semantic role coverage.
- Typography variation within safe readable bounds.
- Radius/density/elevation variation by profile.
- Different defaults for personal, operational, social, finance, editorial, and playful apps.
- Variation should be coherent at the app level, not random per component.
- Generated values must be stable until app identity or accepted design data changes.

### Platform Adaptation

- iOS:
  - system font defaults, safe areas, shadow behavior, native-feeling control height and shape.
- Android:
  - ripple where appropriate, elevation where appropriate, status/navigation bar color, keyboard behavior, Material-compatible control affordances.
- Web:
  - max-width rules, pointer/hover/focus-visible states, keyboard navigation, responsive content columns.
- Shared:
  - light/dark mode, compact/regular width, text scaling, reduced motion.

### Accessibility And Usability Defaults

- Minimum hit target defaults.
- Contrast-safe token generation.
- Focus styles on web and keyboard-capable platforms.
- Accessibility roles for standard components.
- Labels and hints derived from visible labels where possible.
- Disabled/loading/selected state exposed through accessibility state.
- Live region behavior for loading or status changes where supported.
- Text scaling preserved by default; avoid fixed-height text traps.

### Runtime And Compiler Shape

- A generated or built-in `createTaoDesign(...)` payload with tokens, composites, component recipes, and adaptations.
- Runtime resolver helpers for component recipes and state overlays.
- Std-lib components consume recipe names instead of raw hard-coded values.
- Generated design values should be typed enough that missing recipes fail in tests or validation.
- No LLM or network dependency in the compile path.
- Optional design suggestions can remain future work; MVP should work without accepting a lock file if curated profiles cover the app.

### Tooling And Review

- Component gallery app showing all default components and states.
- Profile gallery showing several deterministic app profiles.
- CLI output that prints chosen profile, seed inputs, token summary, and major component recipes.
- Screenshot/visual checks across:
  - iOS, Android, and web where feasible;
  - light and dark;
  - compact and regular width;
  - text scale increase;
  - long labels and empty data;
  - loading, error, disabled, pressed, focused states.
- A canonical "bad defaults" regression checklist: stretched web forms, unstyled buttons, cramped fields, unreadable long text, no loading states, invisible focus, low contrast, inconsistent cards.

## Recommended MVP Scope

### Include

- Curated deterministic app design profiles and design templates.
- Three initial template directions: Quiet Craft, Crisp Operations, and Expressive Product.
- Complete token families for color, typography, spacing, size, radius, border, elevation, opacity, and simple motion.
- Runtime resolver and std-lib component recipes.
- Template-owned component families built on top of the standard library where they materially improve cohesion.
- Polished defaults for text, buttons, text inputs, cards/surfaces, list rows, badges, dividers, and loading/empty/error states.
- Safe-area app shell and web/tablet content max-width defaults.
- Basic platform adaptation for iOS, Android, web, light/dark, compact/regular, text scale, and reduced motion.
- Reference PNG or screenshot packs for each template, with extracted design rules.
- Component gallery, profile gallery, and at least one real app screen fixture.
- A taste rejection checklist and screenshot review loop.

### Defer

- Full AI-assisted design inference.
- Production `tao.design.lock` requirement.
- Render-site design specs.
- Source-authored token dictionaries.
- General styling syntax and raw appearance literals.
- Style Dictionary/DTCG export.
- High-contrast, RTL, localization-specific typography, pointer modality, and device posture beyond reserved axes.
- Complex animation and gesture design.
- Full modal/sheet/dialog system unless already needed by routing/forms.
- Open-ended app-specific component generation that cannot be traced back to a selected template.

## Project Placement Recommendation

Create a new project row named **Beautiful App Defaults MVP**.

Recommended queue position: after Data Schema/Queries, Navigation/Routing, Android bring-up, and the minimum Core Language/control-flow work needed to compile real screens, but before Still and Rooms are treated as polished canonical demos.

Reason: Still and Rooms should prove Tao's "quick app looks good" promise. Building them before the defaults exist risks either ugly demos or app-specific styling workarounds.

## Top Alternatives

### 1. Beautiful App Defaults MVP

Recommended. This gives Tao visible product quality fastest, uses existing design-inference direction without requiring the whole lock/suggestion workflow, and directly supports Still/Rooms.

Blockers:

- Forms and interactions need enough surface for controls to demonstrate real states.
- Layout/app shell must expose safe-area, scroll, keyboard, and max-width behavior somehow.
- Runtime component recipes need a clean boundary from raw layout syntax.

### 2. Full UI Design Inference V1

More ambitious. This implements app design blocks, variants, accepted/suggested lock files, generated TypeScript design modules, and diagnostics.

Why not first:

- It may delay the concrete visual payoff.
- The MVP can get excellent defaults from curated deterministic profiles before full inference is proven.

### 3. Forms And Input Defaults First

Useful fallback if implementation needs a narrower slice. This would polish text inputs, buttons, labels, validation states, keyboard behavior, and loading/disabled behavior before broad theme variation.

Why not enough:

- It does not solve app-level palette, typography, layout max width, surfaces, lists, empty states, or app-specific variability.

## Settled Answers For Implementation

1. Curated deterministic profiles are enough for the MVP baseline. App `design.description` should influence selection or tuning when that language surface is available, but its absence must not block the project.
2. `tao.design.lock` is not required for this project. Defaults must work in production without a lock file. Future accepted locks may override or specialize deterministic defaults, but missing locks are not an MVP failure.
3. The first useful component set is `Text`, `TextLabel`, `MultiLineText`, `Number`, `TextInput`, `Button`, app shell, and a visual fixture. The broader MVP then adds `Page`, `Card`, `ListRow`, `Badge`, `FieldGroup`, `SectionHeader`, `Divider`, `LoadingState`, `EmptyState`, and `ErrorState`.
4. Web max-width, page gutters, scroll padding, and native safe-area behavior should live in generated app shell and runtime design helpers. They should not become new raw layout syntax.
5. The component gallery must prove that default components, common states, compact width, regular/web width, light mode, dark mode, long text, loading, empty, and error states look intentional rather than raw.
6. Template-owned components are Tao-owned standard/template components for the MVP. Generated app-local components are deferred.
7. The minimum reference pack is textual reference rules plus generated screenshots from one component gallery and one representative screen. Binary golden/reference PNGs can be added after the first gallery stabilizes.
8. The LLM suggestion contract may propose concrete token values, component recipe adjustments, and state overlays inside a selected template. It must not invent new source-facing component APIs for the MVP.

## Implementation Priority

Implement in this order:

1. Mini first slice: deterministic runtime styles, app-shell content frame, seeded accent variation, and one first-app fixture.
2. Full deterministic template system: `Quiet Craft`, `Crisp Operations`, and `Expressive Product`.
3. Runtime recipe resolver and recipe application for all existing std-lib primitives.
4. Tao-owned standard/template components for pages, cards, lists, badges, fields, loading, empty, and error states.
5. Template-guided LLM suggestion contract with fake-provider tests only unless the existing provider path makes real execution trivial.
6. Gallery and representative Still/Rooms-style screens for visual acceptance.

Do not start with the full accepted-lock design-inference workflow. That remains related future work, not the shortest path to better first apps.

## Source Links

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Apple Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple Text Fields: https://developer.apple.com/design/human-interface-guidelines/text-fields
- Apple Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Material 3 in Compose: https://developer.android.com/develop/ui/compose/designsystems/material3
- Material 3 Expressive Design Language: https://developer.android.com/design/ui/wear/guides/get-started/design-language
- Windows 11 Design Principles: https://learn.microsoft.com/en-us/windows/apps/design/design-principles
- Fluent 2 Layout: https://fluent2.microsoft.design/layout
- Fluent 2 Elevation: https://fluent2.microsoft.design/elevation
- Atlassian Design Foundations: https://atlassian.design/foundations
- Figma, The Future of Design Systems is Semantic: https://www.figma.com/blog/the-future-of-design-systems-is-semantic/
- Nielsen Norman Group, The Aesthetic-Usability Effect: https://www.nngroup.com/articles/aesthetic-usability-effect/
- Nielsen Norman Group, 5 Principles of Visual Design in UX: https://www.nngroup.com/articles/principles-visual-design/
- Don Norman, Emotion & Design: Attractive things work better: https://jnd.org/emotion-design-attractive-things-work-better/
- Design Tokens Format Module: https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- React Native 0.81 Pressable: https://reactnative.dev/docs/0.81/pressable
- React Native 0.81 TextInput: https://reactnative.dev/docs/0.81/textinput
- React Native 0.81 ActivityIndicator: https://reactnative.dev/docs/0.81/activityindicator
- React Native 0.81 Accessibility: https://reactnative.dev/docs/0.81/accessibility
- Practitioner moodboard discussion, inspiration should become concrete decisions: https://www.reddit.com/r/productdesign/comments/1rxsn2s/most_designers_dont_actually_use_their/
- Practitioner discussion, inspiration to UI decisions: https://www.reddit.com/r/DesignThinking/comments/1rxsyf4/how_do_you_actually_go_from_design_inspiration/
