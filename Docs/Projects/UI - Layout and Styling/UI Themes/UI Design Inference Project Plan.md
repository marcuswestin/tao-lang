# UI Design Inference Project Plan

Tao's design system should generate a coherent app design from source-level intent, view and variant names, accepted design metadata, and runtime adaptation context. "Design" is the umbrella term. Theme tokens, composite styles, motion, accessibility behavior, and platform-specific style outputs are generated parts of that design.

## Status

- **Design direction:** active exploration has pivoted away from manually-authored theme dictionaries as the primary user surface.
- **Theme model:** a theme is now treated as a generated/resolved subsystem inside the broader app design graph.
- **Source surface:** V1 should stay small: an inline app `design` block with one `description`, `variant` declarations, and optional string descriptions in `< ... >` on declarations and variants.
- **Inference:** every used named view gets design inference. Missing angle metadata still infers from the app description, view kind/root type, declaration or variant name, and variant chain.
- **Compilation target:** V1 lowers accepted design metadata to a generated TypeScript design module for React Native/Expo, not Style Dictionary output.
- **Locking:** accepted design state belongs in `tao.design.lock`; dev-mode suggestions belong in `.tao.design.lock`.

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
- **Runtime:** `createTaoDesign`, typed adaptation context, `resolveStyle`, `useTaoStyle`, `StyleSheet` integration.
- **CLI:** `tao design` for analysis/generation, `tao design update` for accepting generated suggestions.
- **IDE/LSP:** surface suggestions, generated descriptions, stale metadata, and accepted/suggested diffs.
- **Tests:** parser, formatter, validation, lock staleness, generated TS module, runtime adaptation, sample apps.
- **Sample apps:** show app description, view variants, generated buttons/text/card-like components, and adaptation behavior.

## Settled Planning Decisions

- **V1 token categories:** generate and type resolved entries for `color`, `spacing`, `radius`, `text`, `font`, `shadow`, `border`, `opacity`, `motion`, `size`, `elevation`, and `transform`. Generators may emit only the entries actually referenced by the accepted design graph, but the schema and runtime helpers must reserve all listed categories.
- **Generated helper API:** expose a small stable interface: `createTaoDesign({ tokens, styles, adaptations })`, pure `resolveStyle(name, context)`, hook `useTaoStyle(name)`, and hook/provider support for `useTaoDesignContext()`. Do not generate per-view hooks in V1.
- **Accepted lock file:** `tao.design.lock`.
- **Suggestion lock file:** `.tao.design.lock`.
- **Lock schema:** use a Tao-owned structured object with `schemaVersion`, `analyzer`, `appDesign`, `entries`, and `generatedAt`. Each entry stores `identity`, `inputHash`, `status`, `semantic`, `resolved`, and `provenance`.
- **Suggestion acceptance:** implement an internal `acceptAndLockSuggestions` operation. For V1, `.tao.design.lock` is a full copy of `tao.design.lock` plus suggestions. `tao design update` overwrites `tao.design.lock` with `.tao.design.lock` when they differ.
- **Commands:** `tao design` analyzes/generates design suggestions. `tao design update` accepts all generated suggestions into `tao.design.lock`.
- **Standard-library roles:** standard views participate in inference through built-in canonical role entries versioned with the Tao standard library. `Row`, `Col`, and `Stack` are structural by default: no visual surface, border, shadow, typography, or color by themselves, but they may receive spacing/layout defaults. `Text` receives body-like typography by default. `Button` receives an interactive action role by default.
- **Diagnostics:** production emits hard errors for stale locks, missing accepted entries, and resolver fallback gaps. Development emits warnings for ambiguous inference and unsupported platform features when a deterministic fallback exists.
- **Low-confidence suggestions:** show as reviewable dev suggestions, not accepted design state, with confidence, rationale, and one-click alternatives where tooling supports it.
- **Rationale/provenance:** store source identity, input hash, analyzer version, model/profile, confidence, chosen role, and a short rationale for every inferred entry.
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
- **Namespacing:** design entries use package-qualified identities. App-local aliases are allowed only after resolving to a unique package source.
- **Renames:** V1 treats a renamed view or variant as delete plus create. Later tooling may migrate lock entries by matching compatible old/new identities and target chains.
- **Future body-aware invalidation:** when body-aware inference exists, stale entries only for changes to render structure, child roles, meaningful text/content shape, interaction/state usage, or style-relevant calls.
- **Future node labels:** later testing, named parts, and sub-view styling should use `@Name` or `@Name:` labels, separate from design metadata.
- **Render-site strings:** V1 remains strict: distinct looks should be named variants. Render-site strings are deferred as a possible dev-only experiment surface.

## Final Implementation Defaults

- **Generated module path:** emit `_gen/tao-app/tao-design.ts` beside `_gen/tao-app/app-bootstrap.tsx`. Generated app files import it with `./tao-design`.
- **Runtime helper source:** define reusable runtime helpers in the Tao runtime package, then import them from the generated design module.
- **Lock serialization:** `tao.design.lock` and `.tao.design.lock` are deterministic JSON documents with two-space indentation, sorted object keys, and no comments.
- **Standard-library role catalog:** `Row`, `Col`, `Stack`, `Box`, and `WrappingRow` use structural layout roles; `Text`, `TextLabel`, and `MultiLineText` use text roles; `Button` uses an interactive action role.
- **Generated naming:** token names use lowercase dot paths prefixed by category, for example `color.background.app`, `spacing.inset.medium`, `text.body`, and `motion.feedback.confirm`. Composite role names use `composite.<role>.<name>`, for example `composite.action.primary` and `composite.surface.card`.
- **Review UI:** V1 review is CLI-first. `tao design` prints a grouped summary of new, changed, stale, and low-confidence entries and writes `.tao.design.lock`. `tao design update` accepts all suggestions by overwriting `tao.design.lock`.
- **Low-confidence entries:** low-confidence entries remain in `.tao.design.lock` until accepted. The CLI must label them as low-confidence and include rationale before update.
- **Body-aware inference timing:** body-aware inference starts after V1 parser, lock, generated TypeScript, runtime resolver, and CLI accept/update flows are working end to end.

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
