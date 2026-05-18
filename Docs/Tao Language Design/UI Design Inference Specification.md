# UI Design Inference Specification

Purpose: raw settled contract for Tao design inference.

This is intentionally a decision dump. It records what has been decided so far without trying to polish the full final specification. The human-facing explanation lives in [UI Design Inference Concepts](./UI%20Design%20Inference%20Concepts.md).

## 1. Terminology

- Use `design` as the primary term.
- A design encompasses theme values, semantic tokens, composite styles, adaptive behavior, generated style helpers, and later motion/accessibility-related generated values.
- A `theme` is a generated/resolved subsystem inside the broader design graph.
- Do not describe the chosen model as subtree theme overriding.
- Do not describe LLMs or AI as part of the compile path.

## 2. App Design Source

V1 app design is inline in the `app` block.

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  render InvoiceScreen
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

## 3. Angle Metadata

V1 angle metadata contains only a string description.

```tao
frame BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

Settled rules:

- `<"description">` is semantic input for design inference.
- Missing angle metadata does not disable inference.
- `< ... >` is legal on declarations and variants in V1.
- `< ... >` is not legal on render sites in V1.
- `<auto>` is not V1.
- `<none>` is not V1.
- `<name>` token/tag references are not V1.
- Concrete style values inside `< ... >` are not V1.

Render-site metadata is deferred:

```tao
render Button <"elevated">
```

Use a named variant instead:

```tao
variant ElevatedButton = Button <"elevated">
```

## 4. View Variants

Use `variant` for design-only view specializations.

```tao
variant Button = tao.Button
variant WarningButton = Button
variant DangerButton = WarningButton <"brighter, redder">
```

Settled rules:

- A variant has the same API as its target.
- A variant has the same render behavior as its target.
- A variant does not wrap the target.
- A variant does not add or remove children.
- A variant does not add slots.
- A variant does not change arguments.
- A variant only changes design identity and therefore resolved style/theme metadata.
- A variant target may be another variant.
- The full variant chain participates in inference.

Example chain:

```text
tao.Button
Button
WarningButton
DangerButton
"brighter, redder"
```

Structural variants are deferred.

## 5. Always-On Inference

Every used named view gets design inference.

There is no V1 opt-out marker.

Settled rules:

- Missing `< ... >` still infers from source identity.
- Standard-library views are not exempt from inference.
- The inference engine may be conservative with standard-library structural views, but it still assigns at least one design tag/composite entry to every used named view identity.
- The underlying root type/kind participates in the identity chain.

Example identity chain:

```text
variant WarningRow = Row
=> [layout, Row, WarningRow]
```

## 6. V1 Inference Inputs

V1 inference uses design identity context, not full UI analysis.

Included inputs:

- app design description;
- view kind/root type;
- underlying root type of a variant chain;
- declaration or variant name;
- variant chain;
- optional `<"description">` string;
- analyzer version;
- design lock schema version.

Excluded from V1 inference:

- parameter names;
- AST body shape;
- internal render nodes;
- whole-app repeated-pattern analysis;
- call-site context;
- render-site metadata.

Body-aware, parameter-aware, and whole-app inference are deferred.

## 7. Lock Staleness

V1 design lock staleness uses design inputs only.

Staleness inputs:

- app design description;
- view kind/root type;
- variant chain;
- declaration or variant names;
- `<"description">` strings;
- analyzer version;
- design lock schema version.

Excluded from V1 staleness:

- parameter names;
- AST body hash;
- call-site changes;
- unrelated source edits.

A body edit alone does not stale a V1 design lock entry.

## 8. Accepted And Suggested Metadata

Accepted design metadata lives in:

```text
tao.design.lock
```

Dev-mode suggestions live in a hidden suggestion artifact. The exact filename is unsettled.

Settled rules:

- `tao.design.lock` tracks current decided and accepted design metadata.
- The hidden suggestion artifact tracks generated but unaccepted suggestions.
- Dev mode may read accepted metadata plus hidden suggestions.
- Production ignores unaccepted hidden suggestions.
- Accepting suggestions merges or overwrites accepted lock entries. Exact workflow is unsettled.
- Explicit source input wins over lock inference.
- Accepted lock inference wins over deterministic defaults.
- Deterministic defaults cover unresolved gaps only where the build mode permits it.

Build mode rules:

- Production compilation fails if the compiler can tell the design graph should be updated.
- Dev compilation may continue while suggestions are generated in the background.
- Dev mode can apply generated suggestions to unresolved parts of the UI before they are accepted.

## 9. Lock Payload

`tao.design.lock` stores semantic and resolved design data.

Semantic payload includes:

- inferred descriptions;
- composite tags;
- role mappings;
- rationale;
- provenance;
- source identity;
- confidence if available.

Resolved payload includes:

- concrete tokens;
- adaptive token tables;
- style keys;
- resolved style objects or style tables;
- platform/adaptation overlays.

Required metadata direction:

- lock schema version;
- analyzer version;
- design input hash;
- source identity;
- accepted or suggested status;
- provenance;
- semantic payload;
- resolved payload.

Exact lock schema is unsettled.

## 10. Generated TypeScript Target

V1 compiles accepted design metadata into a generated TypeScript design module for React Native/Expo.

Conceptual output:

```ts
export const theme = {
  color: {
    background: '#F8F7F4',
    surface: '#FFFFFF',
    primary: '#3B5BDB',
    text: '#171717',
  },
  spacing: {
    sm: 8,
    md: 12,
    lg: 20,
  },
} as const

export const styles = StyleSheet.create({
  Button: {
    backgroundColor: theme.color.primary,
    padding: theme.spacing.md,
    borderRadius: 12,
  },
})
```

Settled direction:

- Generated TS stores resolved tokens.
- Generated TS stores adaptive token/style tables.
- Generated TS stores generated React Native style objects/helpers.
- Generated TS keeps semantic token structure; it is not StyleSheet-only.
- React Native/Expo is the V1 runtime target.
- Style Dictionary is not the V1 runtime target.
- JSON-only runtime token loading is not the main V1 path.

Style Dictionary export is deferred.

## 11. Runtime Resolver Helpers

Generated TypeScript exposes resolver helpers backed by resolved tables.

Conceptual interface:

```ts
const design = createTaoDesign({
  tokens,
  styles,
  adaptations,
})

export function useTaoStyle(name) {
  const context = useTaoDesignContext()
  return design.resolveStyle(name, context)
}
```

Settled rules:

- Resolver helpers are the interface.
- Tables are an internal/generated implementation detail.
- Generated views call stable helpers such as `resolveStyle(...)` or `useTaoStyle(...)`.
- The helper reads current runtime adaptation context.
- The helper owns fallback and overlay composition.
- The compiler validates that referenced style keys exist.
- Every resolver path needs a deterministic fallback.

Exact helper API is unsettled.

## 12. V1 Runtime Adaptation Axes

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

## 13. Adaptation Composition

V1 adaptation composition uses ordered overlays.

Order:

```text
1. base
2. platform
3. colorScheme
4. screenSize
5. textScale
6. reducedMotion
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

## 14. Style Dictionary

Style Dictionary is useful later as an export/interoperability target.

Settled V1 direction:

- Do not make Style Dictionary the primary lock format.
- Do not make Style Dictionary the primary runtime output.
- Do not make Tao language semantics depend on Style Dictionary config structure.
- Keep `tao.design.lock` Tao-owned.
- Later, Tao can emit DTCG or Style Dictionary-compatible tokens from accepted design metadata.

## 15. Explicitly Not Chosen

These are not V1 decisions:

- subtree theme replacement;
- a primitive theme dictionary as the primary source authoring surface;
- view-local `provide` style theme overrides;
- render-site `< ... >`;
- source-authored concrete token values;
- AI or LLM calls during compilation;
- generated structure changes from descriptions;
- node labels as V1 theme identity;
- Style Dictionary as the V1 runtime target.

## 16. Deferred Questions

- Which resolved token categories are V1?
- What is the exact generated TypeScript helper API?
- What is the exact lock schema?
- What is the hidden suggestion artifact filename?
- What is the accept-suggestions command and merge behavior?
- How conservative should standard-library inference be?
- How should diagnostics explain stale, missing, ambiguous, or unsupported design metadata?
- How should screen size classes be represented?
- How should text scale change typography and layout spacing?
- How should reduced motion affect style helpers before the motion project is implemented?
- How should package/library design entries be namespaced?
- How should view/variant renames migrate lock entries?
- When should body-aware inference be introduced?
- How should Style Dictionary export be shaped later?
