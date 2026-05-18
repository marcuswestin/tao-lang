# UI Design Inference Specification

Purpose: define Tao's settled V1 design-inference contract.

This document is the implementation-facing source of truth for design inference. The human-facing explanation lives in [UI Design Inference Concepts](./UI%20Design%20Inference%20Concepts.md).

## 1. Terminology

- Use `design` as the primary term.
- A design encompasses semantic roles, composite roles, theme values, generated tokens, adaptive behavior, generated style helpers, and later motion/accessibility-related generated values.
- A `theme` is a generated/resolved subsystem inside the broader design graph.
- A `design spec` is source-level string intent attached to a declaration or variant.
- Do not describe the chosen model as subtree theme overriding.
- Do not describe LLMs or AI as part of the compile path.

## 2. App Design Source

V1 app design is inline in the `app` block.

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  ui InvoiceScreen
}
```

Settled rules:

- Each app may have an inline `design` block.
- V1 design block has one field: `description`.
- `description` takes a string.
- No other V1 app design fields are accepted.
- If the design block is omitted, Tao still has a deterministic default app design input.
- Named top-level design declarations are deferred.

Deferred fields:

- audience;
- brand;
- feel;
- seed colors;
- density;
- typography;
- motion feel;
- platform preferences;
- accessibility preferences.

## 3. Design Specs

V1 design specs contain only a string description.

```tao
ui BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

Settled rules:

- `<"description">` is semantic input for design inference.
- Missing design specs do not disable inference.
- Design specs are legal on declarations and variants in V1.
- Design specs are not legal on render sites in V1.
- `<auto>` is not V1.
- `<none>` is not V1.
- `<name>` token/tag references are not V1.
- Concrete style values inside design specs are not V1.

Render-site design specs are deferred:

```tao
render Button <"elevated">
```

Use a named variant instead:

```tao
variant ElevatedAction = ActionButton <"elevated">
```

## 4. View Variants

Use `variant` for design-only view specializations.

```tao
use Button from @tao/ui

variant ActionButton = Button
variant WarningAction = ActionButton
variant DangerAction = WarningAction <"brighter, redder">
```

Settled rules:

- A variant has the same API as its target.
- A variant has the same render behavior as its target.
- A variant does not wrap the target.
- A variant does not add or remove children.
- A variant does not add slots.
- A variant does not change arguments.
- A variant only changes design identity and therefore semantic/resolved design metadata.
- A variant target may be another variant.
- The full variant chain participates in inference.
- Structural variants are deferred.

Example chain:

```text
Button
ActionButton
WarningAction
DangerAction
"brighter, redder"
```

## 5. Identity Layers

V1 stores separate identity layers.

```text
sourceIdentity
designSpecIdentity
semanticIdentity
compositeRole
resolvedStyleKey
runtimeContextKey
```

Layer definitions:

- `sourceIdentity`: declaration or variant chain from Tao source after imports resolve.
- `designSpecIdentity`: source identity plus app design input and optional design spec string.
- `semanticIdentity`: inferred role meaning.
- `compositeRole`: reusable internal presentation role.
- `resolvedStyleKey`: stable generated key referenced by generated view code.
- `runtimeContextKey`: active adaptation and interaction-state context used by resolver helpers.

Example:

```text
sourceIdentity:      app:InvoiceApp/view:DangerAction
designSpecIdentity: sourceIdentity + appDesign + "brighter, redder"
semanticIdentity:   destructive warning action
compositeRole:      composite.action.danger
resolvedStyleKey:   style.action.danger
runtimeContextKey:  ios.dark.compact.pressed
```

Design lock staleness uses design input identity, not runtime context identity.

## 6. Composite Roles

Composite roles are first-class internal design units.

Examples:

```text
composite.action.primary
composite.action.warning
composite.action.danger
composite.text.body
composite.text.supporting
composite.surface.card
composite.surface.warning
```

Settled rules:

- Composites are generated from design intent and semantic identity.
- Resolved tokens and style tables are emitted from composites.
- Tokens are not the primary Tao source authoring model.
- Composite role names use `composite.<role>.<name>`.
- Composite roles participate in rationale/provenance output.
- Standard-library role defaults map to composite roles.

## 7. Always-On Inference

Every used named view gets design inference.

There is no V1 opt-out marker.

Settled rules:

- Missing design specs still infer from source identity.
- Standard-library views are not exempt from inference.
- The inference engine may be conservative with standard-library structural views, but it still assigns at least one design tag or composite entry to every used named view identity.
- The underlying root type/kind participates in the identity chain.

Example identity chain:

```text
variant WarningRow = Row
=> [layout, Row, WarningRow]
```

Future work may collapse trivial structural wrappers internally if lock noise becomes a real problem. That is not a V1 source rule.

## 8. V1 Inference Inputs

V1 inference uses design identity context, not full UI analysis.

Included inputs:

- app design description;
- view kind/root type;
- underlying root type of a variant chain;
- declaration or variant name;
- variant chain;
- optional design spec string;
- analyzer version;
- design lock schema version.

Excluded from V1 inference:

- parameter names;
- AST body shape;
- internal render nodes;
- whole-app repeated-pattern analysis;
- call-site context;
- render-site design specs.

Body-aware, parameter-aware, and whole-app inference are deferred.

## 9. Lock Staleness

V1 design lock staleness uses design inputs only.

Staleness inputs:

- app design description;
- view kind/root type;
- variant chain;
- declaration or variant names;
- design spec strings;
- analyzer version;
- design lock schema version.

Excluded from V1 staleness:

- parameter names;
- AST body hash;
- call-site changes;
- unrelated source edits.

A body edit alone does not stale a V1 design lock entry.

## 10. Accepted And Suggested Metadata

Accepted design metadata lives in:

```text
tao.design.lock
```

Dev-mode suggestions live in:

```text
.tao.design.lock
```

Both files are deterministic JSON documents with two-space indentation, sorted object keys, and no comments.

Settled rules:

- `tao.design.lock` tracks current decided and accepted design metadata.
- `.tao.design.lock` tracks generated but unaccepted suggestions.
- `.tao.design.lock` is a full copy of `tao.design.lock` plus suggestions.
- Dev mode may read accepted metadata plus hidden suggestions.
- Production ignores unaccepted hidden suggestions.
- Production builds read only `tao.design.lock`.
- Production validation and generated import paths reject hidden suggestion artifacts.
- `tao design` analyzes and generates design suggestions into `.tao.design.lock`.
- `tao design update` accepts current suggestions.
- Accepting suggestions uses an internal `acceptAndLockSuggestions` operation.
- In V1, accepting suggestions overwrites `tao.design.lock` with `.tao.design.lock` when they differ, rewriting accepted entries to `accepted`.
- Explicit source input wins over lock inference.
- Accepted lock inference wins over deterministic defaults.
- Deterministic defaults cover unresolved gaps only where the build mode permits it.
- Low-confidence suggestions must be labelled before update; no special V1 partial-accept flow is required.

Build mode rules:

- Production compilation fails if the compiler can tell the design graph should be updated.
- Dev compilation may continue while suggestions are generated in the background.
- Dev mode can apply generated suggestions to unresolved parts of the UI before they are accepted.

## 11. Lock Payload

`tao.design.lock` stores semantic and resolved design data.

Top-level shape:

```text
schemaVersion
analyzer
appDesign
entries
generatedAt
```

`generatedAt` is optional metadata. It must not participate in input hashes or stale checks.

Entry shape:

```text
identity
inputHash
status
semantic
resolved
provenance
```

Semantic payload includes:

- inferred descriptions;
- semantic identity;
- composite tags;
- composite role mappings;
- rationale;
- provenance;
- source identity;
- confidence if available.

Resolved payload includes:

- concrete tokens;
- adaptive token tables;
- resolved style keys;
- resolved style objects or style tables;
- platform/adaptation overlays;
- interaction-state overlays.

Required metadata direction:

- lock schema version;
- analyzer version;
- analyzer/model/profile version;
- design input hash;
- source identity;
- design spec identity;
- semantic identity;
- composite role;
- resolved style key;
- accepted or suggested status;
- provenance;
- semantic payload;
- resolved payload.

Analyzer/model/profile versions are pinned in the lock. Analyzer upgrades do not stale accepted entries unless the project explicitly opts into regeneration or a schema migration requires it.

V1 status values:

```text
accepted | suggested
```

`tao.design.lock` normally contains accepted entries. `.tao.design.lock` may contain accepted and suggested entries.

## 12. V1 Resolved Token Categories

The design graph and generated runtime reserve typed categories for:

```text
color
spacing
radius
text
font
shadow
border
opacity
motion
size
elevation
transform
```

Generators may emit only entries referenced by the accepted design graph, but the schema and runtime helper layer must reserve all listed categories.

Generated token names use lowercase dot paths prefixed by category:

```text
color.background.app
spacing.inset.medium
text.body
motion.feedback.confirm
```

## 13. Generated TypeScript Target

V1 compiles accepted design metadata into a generated TypeScript design module for React Native/Expo.

Generated module path:

```text
_gen/tao-app/tao-design.ts
```

Generated app files import it as:

```ts
import { useTaoStyle } from './tao-design'
```

Reusable runtime helpers live in the Tao runtime package and are imported by the generated design module.

Settled direction:

- Generated TS stores resolved tokens.
- Generated TS stores semantic composite role mappings.
- Generated TS stores adaptive token/style tables.
- Generated TS stores interaction-state overlays for interactive composites.
- Generated TS stores generated React Native style objects/helpers.
- Generated TS keeps semantic token structure; it is not StyleSheet-only.
- React Native/Expo is the V1 runtime target.
- Style Dictionary is not the V1 runtime target.
- JSON-only runtime token loading is not the main V1 path.

Style Dictionary export is deferred.

## 14. Runtime Resolver Helpers

Generated TypeScript exposes resolver helpers backed by resolved tables.

Conceptual interface:

```ts
const design = createTaoDesign({
  tokens,
  styles,
  adaptations,
})

export function useTaoStyle(name, state) {
  const context = useTaoDesignContext()
  return design.resolveStyle(name, context, state)
}
```

Settled rules:

- Resolver helpers are the interface.
- Tables are an internal/generated implementation detail.
- Generated views call stable helpers such as `resolveStyle(...)` or `useTaoStyle(...)`.
- The helper reads current runtime adaptation context.
- The helper may receive current interaction state.
- The helper owns fallback and overlay composition.
- The compiler validates that referenced resolved style keys exist.
- Every resolver path needs a deterministic fallback.
- V1 exposes `createTaoDesign({ tokens, styles, adaptations })`.
- V1 exposes pure `resolveStyle(name, context, state?)`.
- V1 exposes hook `useTaoStyle(name, state?)`.
- V1 exposes hook/provider support for `useTaoDesignContext()`.
- V1 does not generate per-view hooks.

Runtime style-object memoization and stable StyleSheet reference caching are future performance work, not a required V1 contract.

## 15. V1 Runtime Adaptation Axes

V1 supports core runtime axes:

- color scheme;
- platform;
- text scale;
- screen size;
- reduced motion.

Deferred axes:

- high contrast;
- locale;
- RTL/logical direction;
- pointer/hover;
- keyboard;
- device posture;
- broader accessibility categories.

Runtime context shape:

```text
colorScheme
platform
textScale
screenSize
reducedMotion
```

The generated type should reserve room for later axes.

`screenSize` uses named classes derived from measured width in React Native points:

```text
compact = width < 600
regular = width >= 600
```

Text scale directly affects typography. Spacing scales only for text-adjacent/inset tokens, not all layout spacing globally.

Reduced motion collapses or disables generated motion helpers where present. The full motion language remains deferred.

## 16. V1 Interaction State

V1 design resolution supports state overlays for interactive composites.

V1 states:

```text
default
pressed
disabled
focused
selected
```

Settled rules:

- `default` is the base interactive state.
- State overlays are emitted only for composites that need them.
- State overlays use the same partial-object shape as adaptation overlays.
- State overlays apply after adaptation overlays.
- Later state overlays replace earlier resolved properties in the same way adaptation overlays do.
- Every interactive composite needs a deterministic default fallback.

Deferred states:

- loading;
- hovered;
- invalid;
- expanded;
- dragged;
- action lifecycle states.

`loading` is deferred because it may affect component behavior, data/action lifecycle, or rendered structure.

## 17. Adaptation Composition

V1 adaptation composition uses ordered overlays.

Order:

```text
1. base
2. platform
3. colorScheme
4. screenSize
5. textScale
6. reducedMotion
7. state
```

Settled rules:

- Resolution starts from base values.
- Active overlays apply in the canonical order.
- Overlays are partial objects of the same token/style shape.
- Later active overlays replace earlier properties.
- Every style/token needs a base fallback.
- Same-layer conflicts should be diagnosed.

Rejected for V1:

- exact variant table for every axis combination;
- custom resolver per style.

## 18. Standard-Library Roles

Standard-library views participate in design inference through built-in canonical role entries versioned with the Tao standard library.

V1 base role direction:

- `Row`, `Col`, `Stack`, `Box`, and `WrappingRow` use structural layout roles.
- Structural views have no visual surface, border, shadow, typography, or color by themselves.
- Structural views may receive spacing/layout defaults.
- `Text`, `TextLabel`, and `MultiLineText` use text roles.
- `Text` receives body-like typography by default.
- `TextLabel` receives single-line label typography by default.
- `MultiLineText` receives body-like multiline typography by default.
- `Button` receives an interactive action role by default.

## 19. Diagnostics

Production hard errors:

- stale accepted lock entries;
- missing accepted entries;
- resolver fallback gaps.

Development warnings:

- ambiguous inference;
- unsupported platform features when deterministic fallback exists.

Low-confidence suggestions remain reviewable suggestions, not accepted design state. Tooling should show confidence, rationale, and one-click alternatives when available.

V1 review UI is CLI-first:

- `tao design` prints grouped new, changed, stale, and low-confidence entries;
- `tao design` writes `.tao.design.lock`;
- `tao design update` accepts suggestions by overwriting `tao.design.lock`;
- low-confidence entries must be labelled and include rationale before update.

Semantic capability diagnostics are deferred. Later tooling may warn when a requested design spec conflicts with app design intent or asks for an unsupported platform capability.

## 20. Libraries And Namespacing

Library variants provide package-namespaced defaults.

App variants can extend or specialize library variants through the app design graph without mutating the library.

Design entries use package-qualified identities after import resolution. App-local aliases are allowed only after resolving to a unique package source.

V1 treats a renamed view or variant as delete plus create. Later tooling may migrate lock entries by matching compatible old/new identities and target chains.

## 21. Style Dictionary

Style Dictionary is useful later as an export/interoperability target.

Settled V1 direction:

- Do not make Style Dictionary the primary lock format.
- Do not make Style Dictionary the primary runtime output.
- Do not make Tao language semantics depend on Style Dictionary config structure.
- Keep `tao.design.lock` Tao-owned.
- Later export should start with generated DTCG tokens, then optionally produce a full Style Dictionary package and documentation.

## 22. Explicitly Not Chosen

These are not V1 decisions:

- subtree theme replacement;
- a primitive theme dictionary as the primary source authoring surface;
- view-local `provide` style theme overrides;
- render-site design specs;
- source-authored concrete token values;
- AI or LLM calls during compilation;
- generated structure changes from descriptions;
- node labels as V1 design identity;
- Style Dictionary as the V1 runtime target;
- runtime style memoization requirements;
- semantic capability diagnostics.

## 23. Deferred Questions

- The full standard-library role catalog beyond the V1 core roles.
- The complete generated token catalog values for each category.
- The IDE/LSP UI for reviewing and accepting low-confidence suggestions.
- Body-aware inference details after V1 parser, lock, generated TypeScript, runtime resolver, and CLI accept/update flows are working end to end.
- Full Style Dictionary package and documentation export after generated DTCG tokens exist.
- Structural variants that add or remove rendered content.
