# UI Design Inference Project Plan

Tao's design system should generate a coherent app design from source-level intent, declaration and variant names, design specs, accepted design metadata, and runtime adaptation context. "Design" is the umbrella term. Design tokens, composite roles, motion, accessibility behavior, and platform-specific style outputs are generated parts of that design.

## Status

- **Design direction:** active design has pivoted away from manually-authored theme dictionaries as the primary user surface.
- **Theme model:** a theme is a generated/resolved subsystem inside the broader app design graph.
- **Source surface:** V1 stays small: an inline app `design` block with one `description`, `variant` declarations, and optional string design specs on declarations and variants.
- **Inference:** every used named view gets design inference. Missing design specs still infer from app design, declaration kind/root type, declaration or variant name, and variant chain.
- **Composites:** composite roles are the central internal presentation unit. Resolved tokens and style tables are emitted from composites.
- **Compilation target:** V1 lowers accepted design metadata to a generated TypeScript design module for React Native/Expo, not Style Dictionary output.
- **Locking:** accepted design state belongs in `tao.design.lock`; dev-mode suggestions belong in `.tao.design.lock`.

## Active Documents

- [UI Design Inference Concepts](../../../Tao%20Language%20Design/UI%20Design%20Inference%20Concepts.md): human-facing mental model.
- [UI Design Inference Specification](../../../Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md): implementation-facing language/runtime contract.
- [UI Design Inference Example App](./UI%20Design%20Inference%20Example%20App.tao): target-only source sketch for the intended authoring experience.
- [UI Appearance Future Work](./UI%20Appearance%20Future%20Work.md): harvested, non-authoritative future styling and React Native style-surface notes.

Superseded theme and styling documents were harvested and moved unchanged to [UI Layout and Styling Superseded](../../../Archive/UI%20Layout%20and%20Styling%20Superseded/).

## Scope

This project covers the design inference layer between Tao UI source and generated React Native/Expo style code:

- app-level design intent;
- declaration and variant design identity;
- source-facing design specs;
- semantic identity and composite roles;
- resolved token and style payloads;
- accepted and suggested design lock artifacts;
- runtime adaptation and interaction-state resolver helpers;
- generated TypeScript design modules;
- diagnostics for stale, missing, ambiguous, or unsupported design metadata.

This project does not replace the layout MVP. Layout remains in `[ ... ]`. Design, styling, layout, motion, interaction states, and accessibility must remain distinct tracks.

## V1 Source Direction

Example:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  ui InvoiceScreen
}

use Button, Text from @tao/ui

variant ActionButton = Button
variant WarningAction = ActionButton
variant DangerAction = WarningAction <"brighter, redder">

ui BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

Rules:

- `design { description "..." }` is inline in the app block.
- The only V1 app design field is `description`.
- A design spec is an optional string description on a declaration or variant.
- Render-site design specs are deferred.
- Concrete token dictionaries, colors, spacing values, and raw style properties are not V1 user syntax.
- `variant` creates a design-only variant with the same API and render behavior as its target.

## Phases

### Phase 1. Documentation Consolidation

Goal: make the design-inference docs the only active authority.

Deliverables:

- human-facing concept doc;
- formal settled-decision specification;
- project plan with implementation work areas;
- target-only example app;
- future appearance notes harvested from old styling docs;
- archived superseded theme/styling docs.

Exit criteria:

- docs distinguish design, theme, styling, layout, variants, motion, interaction states, and accessibility;
- active document maps point at design inference, not the old primitive-theme model;
- deferred work is explicit.

### Phase 2. Parser And AST

Goal: parse the V1 source surface.

Work areas:

- inline `design { description "..." }` inside `app`;
- `variant Name = Target` declarations;
- optional design spec strings on declarations and variants;
- reject `<auto>`, `<none>`, named tags, concrete values, and render-site design specs in V1.

Exit criteria:

- parser tests cover valid app design blocks, variants, declaration design specs, and malformed design specs;
- formatter tests preserve canonical shape.

### Phase 3. Design Graph And Locking

Goal: create deterministic accepted and suggested design metadata.

Work areas:

- compute design-input identities from app description, kind/root type, variant chain, names, design specs, analyzer version, and schema version;
- separate source identity, design spec identity, semantic identity, composite role, resolved style key, and runtime context key;
- write or read accepted `tao.design.lock`;
- write or read `.tao.design.lock` for dev-mode generated suggestions;
- detect stale accepted metadata from design inputs only;
- keep AI or heuristic generation outside the hot compile path.

Exit criteria:

- production build can determine whether accepted design metadata is current;
- dev mode can layer suggestions over accepted metadata;
- accepted metadata is inspectable and deterministic.

### Phase 4. Generated TypeScript Runtime Module

Goal: lower accepted design metadata to TypeScript for React Native/Expo.

Work areas:

- generate semantic/composite role tables;
- generate resolved token tables;
- generate adaptive style tables;
- generate interaction-state overlays for interactive composites;
- generate React Native `StyleSheet.create` style objects where possible;
- expose resolver helpers such as `resolveStyle(...)` or `useTaoStyle(...)`;
- read runtime context for supported adaptation axes and interaction state.

Exit criteria:

- generated view code can resolve styles through stable helpers;
- every referenced resolved style key has a deterministic fallback;
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
- inspection output showing semantic assignment, composite role, provenance, and resolved values.

Exit criteria:

- users can see why a view got a style;
- production failures name the specific stale or missing design entries;
- dev suggestions can be accepted without guessing what changed.

## Implementation-Facing Work Areas

- **Parser:** app `design` block, `variant`, declaration/variant design specs.
- **Validation:** accepted design availability, V1 design spec restrictions, variant target compatibility, production stale-lock failures.
- **Formatter:** canonical multiline app design blocks and compact variant declarations.
- **Compiler:** design identity extraction, lock lookup, composite role use, generated style key references, production/dev mode behavior.
- **Runtime:** `createTaoDesign`, typed adaptation context, interaction-state input, `resolveStyle`, `useTaoStyle`, `StyleSheet` integration.
- **CLI:** `tao design` for analysis/generation, `tao design update` for accepting generated suggestions.
- **IDE/LSP:** surface suggestions, generated descriptions, stale metadata, accepted/suggested diffs, composite roles, and rationale.
- **Tests:** parser, formatter, validation, lock staleness, generated TS module, runtime adaptation, state overlays, sample apps.
- **Sample apps:** show app description, view variants, generated buttons/text/card-like components, composites, and adaptation behavior.

## Settled Planning Decisions

- **V1 token categories:** generate and type resolved entries for `color`, `spacing`, `radius`, `text`, `font`, `shadow`, `border`, `opacity`, `motion`, `size`, `elevation`, and `transform`. Generators may emit only the entries referenced by the accepted design graph, but the schema and runtime helpers must reserve all listed categories.
- **Composite roles:** treat composites as first-class internal presentation roles. Examples include `composite.action.primary`, `composite.action.warning`, `composite.text.supporting`, and `composite.surface.card`. Tokens and style tables are emitted from composites, not treated as the source authoring model.
- **Identity layers:** keep source identity, design spec identity, semantic identity, composite role, resolved style key, and runtime context key separate.
- **Generated helper API:** expose a small stable interface: `createTaoDesign({ tokens, styles, adaptations })`, pure `resolveStyle(name, context, state?)`, hook `useTaoStyle(name, state?)`, and hook/provider support for `useTaoDesignContext()`. Do not generate per-view hooks in V1.
- **Accepted lock file:** `tao.design.lock`.
- **Suggestion lock file:** `.tao.design.lock`.
- **Lock schema:** use a Tao-owned structured object with `schemaVersion`, `analyzer`, `appDesign`, `entries`, and optional `generatedAt`. Each entry stores `identity`, `inputHash`, `status`, `semantic`, `resolved`, and `provenance`.
- **Suggestion acceptance:** implement an internal `acceptAndLockSuggestions` operation. For V1, `.tao.design.lock` is a full copy of `tao.design.lock` plus suggestions. `tao design update` overwrites `tao.design.lock` with `.tao.design.lock` when they differ and rewrites accepted entries to `accepted`.
- **Commands:** `tao design` analyzes/generates design suggestions. `tao design update` accepts generated suggestions into `tao.design.lock`.
- **Standard-library roles:** standard views participate in inference through built-in canonical role entries versioned with the Tao standard library. `Row`, `Col`, `Stack`, `Box`, and `WrappingRow` are structural by default. `Text`, `TextLabel`, and `MultiLineText` use text roles. `Button` uses an interactive action role.
- **Interaction state:** interactive composites may emit `default`, `pressed`, `disabled`, `focused`, and `selected` overlays. State overlays apply after adaptation overlays. `loading` is deferred.
- **Diagnostics:** production emits hard errors for stale locks, missing accepted entries, and resolver fallback gaps. Development emits warnings for ambiguous inference and unsupported platform features when a deterministic fallback exists.
- **Low-confidence suggestions:** show as reviewable dev suggestions, not accepted design state, with confidence, rationale, and one-click alternatives where tooling supports it.
- **Rationale/provenance:** store source identity, design spec identity, input hash, analyzer version, model/profile, confidence, chosen role, composite role, and a short rationale for every inferred entry.
- **Generation boundary:** V1 Tao compiles resolved style values from accepted lock data. AI-assisted tooling may propose semantic assignments and initial values before acceptance, but compilation never invokes AI.
- **Analyzer stability:** lock analyzer/model/profile versions. Do not stale accepted entries on analyzer upgrades unless the project explicitly opts into regeneration or a schema migration requires it.
- **Production isolation:** production builds read only `tao.design.lock`. Hidden suggestion artifacts are dev-only and rejected by production validation/import paths.
- **Adaptation context:** generated typed runtime context contains `colorScheme`, `platform`, `textScale`, `screenSize`, and `reducedMotion`, with reserved room for later axes.
- **Screen size classes:** V1 uses named classes derived from measured width in React Native points: `compact` below 600 and `regular` at 600 or above.
- **Text scale:** text scale directly affects typography. Spacing scales only for text-adjacent/inset tokens, not all layout spacing globally.
- **Reduced motion:** V1 exposes the axis and collapses or disables generated motion helpers where present, while the full motion language remains deferred.
- **Deferred axes:** high contrast, locale, RTL, pointer/hover, keyboard, and device posture are later axes grouped under future accessibility, i18n, input-modality, and device-context passes.
- **Style Dictionary export:** later export starts with generated DTCG tokens, then can optionally produce a full Style Dictionary package and documentation.
- **Library/app interaction:** library variants provide package-namespaced defaults. App variants can extend or specialize library variants through the app design graph without mutating the library.
- **Namespacing:** design entries use package-qualified identities after import resolution. App-local aliases are allowed only after resolving to a unique package source.
- **Renames:** V1 treats a renamed view or variant as delete plus create. Later tooling may migrate lock entries by matching compatible old/new identities and target chains.
- **Future body-aware invalidation:** when body-aware inference exists, stale entries only for changes to render structure, child roles, meaningful text/content shape, interaction/state usage, or style-relevant calls.
- **Future node labels:** later testing, named parts, and sub-view styling should use `@Name` or `@Name:` labels, separate from design metadata.
- **Render-site strings:** V1 remains strict: distinct looks should be named variants. Render-site strings are deferred as a possible dev-only experiment surface.

## Final Implementation Defaults

- **Generated module path:** emit `_gen/tao-app/tao-design.ts` beside `_gen/tao-app/app-bootstrap.tsx`. Generated app files import it with `./tao-design`.
- **Runtime helper source:** define reusable runtime helpers in the Tao runtime package, then import them from the generated design module.
- **Lock serialization:** `tao.design.lock` and `.tao.design.lock` are deterministic JSON documents with two-space indentation, sorted object keys, and no comments. `generatedAt` is optional metadata and does not affect stale checks.
- **Generated naming:** token names use lowercase dot paths prefixed by category, for example `color.background.app`, `spacing.inset.medium`, `text.body`, and `motion.feedback.confirm`. Composite role names use `composite.<role>.<name>`, for example `composite.action.primary` and `composite.surface.card`.
- **Review UI:** V1 review is CLI-first. `tao design` prints a grouped summary of new, changed, stale, and low-confidence entries and writes `.tao.design.lock`. `tao design update` accepts suggestions by overwriting `tao.design.lock`.
- **Low-confidence entries:** low-confidence entries remain in `.tao.design.lock` until accepted. The CLI must label them as low-confidence and include rationale before update.
- **Body-aware inference timing:** body-aware inference starts after V1 parser, lock, generated TypeScript, runtime resolver, and CLI accept/update flows are working end to end.

## Explicit Deferrals

- Render-site design specs.
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
- Runtime style-object memoization and stable StyleSheet reference caching requirements.
- Semantic capability diagnostics.
- LLM participation in the compile path.
- High contrast, locale, RTL, pointer/hover, keyboard, and device-posture adaptation axes.
