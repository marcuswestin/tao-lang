# UI Design Inference Project Plan

Tao's design system should generate a coherent app design from source-level intent, view and variant names, accepted design metadata, and runtime adaptation context. "Design" is the umbrella term. Theme tokens, composite styles, motion, accessibility behavior, and platform-specific style outputs are generated parts of that design.

## Status

- **Design direction:** active exploration has pivoted away from manually-authored theme dictionaries as the primary user surface.
- **Theme model:** a theme is now treated as a generated/resolved subsystem inside the broader app design graph.
- **Source surface:** V1 should stay small: an inline app `design` block with one `description`, `variant` declarations, and optional string descriptions in `< ... >` on declarations and variants.
- **Inference:** every used named view gets design inference. Missing angle metadata still infers from the app description, view kind/root type, declaration or variant name, and variant chain.
- **Compilation target:** V1 lowers accepted design metadata to a generated TypeScript design module for React Native/Expo, not Style Dictionary output.
- **Locking:** accepted design state belongs in `tao.design.lock`; dev-mode suggestions belong in a hidden suggestion artifact whose exact name is unsettled.

## Scope

This project covers the design inference layer between Tao UI source and generated React Native/Expo style code:

- app-level design intent;
- view and variant design identity;
- generated composite style assignments;
- generated semantic and resolved token data;
- accepted and suggested design lock artifacts;
- runtime adaptation resolver helpers;
- generated TypeScript theme/style modules;
- diagnostics for stale, missing, ambiguous, or unsupported design metadata.

This project does not replace the layout MVP. Layout remains in `[ ... ]`. Design and styling metadata must not collapse layout, styling, motion, interaction states, and accessibility into one vague surface.

## V1 Source Direction

Example:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  render InvoiceScreen
}

variant Button = tao.Button
variant WarningButton = Button
variant DangerButton = WarningButton <"brighter, redder">

frame BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

Rules:

- `design { description "..." }` is inline in the app block.
- The only V1 app design field is `description`.
- `< ... >` contains only a string description in V1.
- `< ... >` is legal on declarations and variants only.
- Render-site `< ... >` is deferred.
- Concrete token dictionaries, colors, spacing values, and raw style properties are not V1 user syntax.
- `variant` creates a design-only variant with the same API and render behavior as its target.

## Phases

### Phase 1. Design Documentation

Goal: record the current direction before implementation.

Deliverables:

- human-facing concept doc;
- raw settled-decision specification;
- this project plan with open questions and implementation work areas.

Exit criteria:

- docs distinguish design, theme, styling, layout, variants, motion, and interaction states;
- older theme/styling docs are not silently rewritten;
- deferred work is explicit.

### Phase 2. Parser And AST

Goal: parse the V1 source surface.

Work areas:

- inline `design { description "..." }` inside `app`;
- `variant Name = Target` declarations;
- optional `<"description">` metadata on declarations and variants;
- reject `<auto>`, `<none>`, named tags, concrete values, and render-site metadata in V1.

Exit criteria:

- parser tests cover valid app design blocks, variants, declaration descriptions, and malformed metadata;
- formatter tests preserve canonical shape.

### Phase 3. Design Graph And Locking

Goal: create deterministic accepted and suggested design metadata.

Work areas:

- compute design-input identities from app description, kind/root type, variant chain, names, descriptions, analyzer version, and schema version;
- write or read accepted `tao.design.lock`;
- write or read a hidden suggestion artifact for dev-mode generated suggestions;
- detect stale accepted metadata from design inputs only;
- keep AI or heuristic generation outside the hot compile path.

Exit criteria:

- production build can determine whether accepted design metadata is current;
- dev mode can layer suggestions over accepted metadata;
- accepted metadata is inspectable and deterministic.

### Phase 4. Generated TypeScript Runtime Module

Goal: lower accepted design metadata to TypeScript for React Native/Expo.

Work areas:

- generate resolved token tables;
- generate adaptive style tables;
- generate React Native `StyleSheet.create` style objects where possible;
- expose resolver helpers such as `resolveStyle(...)` or `useTaoStyle(...)`;
- read runtime context for supported adaptation axes.

Exit criteria:

- generated view code can resolve styles through stable helpers;
- every referenced style key has a deterministic fallback;
- runtime does not run design inference.

### Phase 5. Diagnostics And Tooling UX

Goal: make design inference understandable.

Work areas:

- stale lock diagnostics;
- missing accepted entry diagnostics;
- hidden suggestion availability diagnostics;
- unsupported adaptation diagnostics;
- ambiguous or low-confidence inference diagnostics;
- "accept suggestions" workflow;
- inspection output showing semantic assignment, provenance, and resolved values.

Exit criteria:

- users can see why a view got a style;
- production failures name the specific stale or missing design entries;
- dev suggestions can be accepted without guessing what changed.

## Implementation-Facing Work Areas

- **Parser:** app `design` block, `variant`, declaration/variant metadata holders.
- **Validation:** accepted design availability, V1 metadata restrictions, variant target compatibility, production stale-lock failures.
- **Formatter:** canonical multiline app design blocks and compact variant declarations.
- **Compiler:** design identity extraction, lock lookup, generated style key references, production/dev mode behavior.
- **Runtime:** `createTaoDesign`, adaptation context, resolver helpers, `StyleSheet` integration.
- **CLI:** design analyze/generate command, dev background generation, accept-suggestions command.
- **IDE/LSP:** surface suggestions, generated descriptions, stale metadata, and accepted/suggested diffs.
- **Tests:** parser, formatter, validation, lock staleness, generated TS module, runtime adaptation, sample apps.
- **Sample apps:** show app description, view variants, generated buttons/text/card-like components, and adaptation behavior.

## Unanswered Questions

- Which resolved token categories are V1: color, spacing, radius, text, shadow, border, opacity, motion, font, size, elevation, transform?
- What is the exact generated TypeScript helper API: `resolveStyle`, `useTaoStyle`, generated per-view hooks, or a mix?
- What is the exact `tao.design.lock` schema?
- What is the hidden suggestion artifact name?
- Does accepting suggestions merge selected entries or overwrite the accepted lock from the suggestion graph first?
- What command names should exist: `tao analyze design`, `tao design infer`, `tao design accept`, or something else?
- How conservative should inference be for standard-library views such as `Row`, `Col`, `Text`, and `Button`?
- How are standard-library base roles represented in the design graph?
- What diagnostics are emitted for stale locks, missing generated entries, ambiguous inference, unsupported platform features, and resolver fallback gaps?
- How should low-confidence suggestions be surfaced in dev mode?
- How much rationale/provenance must be stored for each inferred entry?
- What values are generated directly by Tao versus by a later AI-assisted tool?
- How are generated values made stable across analyzer upgrades?
- How does Tao prevent unaccepted hidden suggestions from leaking into production?
- What is the exact runtime adaptation context shape?
- Does the V1 screen-size axis use fixed breakpoints, measured window dimensions, or named classes?
- How does text scale affect typography and layout spacing?
- How does reduced motion affect motion tokens and style helpers when motion itself is still a separate project?
- Are high contrast, locale, RTL, pointer/hover, keyboard, and device posture separate later axes or part of a broader accessibility/i18n design pass?
- How should Style Dictionary export work later: generated DTCG tokens, a full Style Dictionary package, documentation output, or all three?
- How do library-authored variants and app-authored variants interact?
- How are design entries namespaced across packages?
- What is the migration path if a variant or view is renamed?
- When body-aware inference is added, which AST changes should stale design metadata?
- Are node labels needed for testing, named parts, or future sub-view styling, and what syntax should they use?
- Should render-site design strings ever be allowed for experiments, or should all distinct looks be named variants?

## Explicit Deferrals

- Render-site `< ... >`.
- Explicit token dictionaries in Tao source.
- Concrete colors, spacing, typography, shadows, borders, opacity, or motion values in Tao source.
- Subtree theme overriding or local theme replacement.
- Style Dictionary as the V1 runtime target.
- Style Dictionary export and DTCG package generation.
- Body-aware inference.
- Parameter-aware inference.
- Whole-app repeated-pattern inference.
- Node labels and named sub-view style anchors.
- Structural variants that add or remove rendered content.
- LLM participation in the compile path.
- High contrast, locale, RTL, pointer/hover, keyboard, and device-posture adaptation axes.
