# UI Design Inference Concepts

Purpose: explain the intended Tao design-inference experience for humans.

This document describes why Tao design is not primarily a manually-authored theme dictionary, how design specs and variants should feel, and how the accepted design graph reaches React Native/Expo. The formal contract lives in [UI Design Inference Specification](./UI%20Design%20Inference%20Specification.md).

## Core Principle

The developer writes meaning. Tao generates presentation.

Tao source should name what a thing is for:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  ui InvoiceScreen
}

variant DangerAction = ActionButton <"destructive action that needs restraint">
```

The author is not expected to start by choosing a full color palette, spacing scale, shadow catalog, or platform-specific style table. Tao turns source-level intent into accepted design metadata and then compiles that metadata into deterministic React Native/Expo output.

## From Meaning To Presentation

Design inference starts from intent:

```text
app design description
+ declaration and variant names
+ optional design specs
+ platform/runtime context
+ accepted generated metadata
= resolved app design
```

The generated design graph includes:

- semantic roles;
- composite roles such as actions, surfaces, and text treatments;
- generated design tokens and theme values;
- resolved style tables;
- adaptation overlays;
- later motion and accessibility-related generated values.

Theme is still important, but it is not the top-level authoring model. A theme is one generated and resolved subsystem inside the broader app design graph.

## Why Not A Traditional Theme Dictionary

A traditional theme starts with values:

```text
primary = blue
surface = white
spacing.medium = 12
```

That works for design-system experts, but it asks app authors to define visual primitives before the app has enough shape.

Tao starts one level higher:

```tao
app NotesApp {
  design {
    description "quiet writing app with warm focus and excellent long-form readability"
  }

  ui NotesScreen
}
```

From this, Tao can generate a coherent design direction and refine it as named views and variants appear. The result is inspectable and accepted into deterministic project metadata before production builds use it.

## Design Specs

A design spec is a small source-level design hint attached to a declaration or variant.

```tao
ui BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

The spec describes intent. It is not a style clause and does not set exact properties.

In V1, a design spec is only a string description in `<"...">` form. Missing design specs do not disable inference. Tao still infers from app design, declaration kind, root type, names, and variant chains.

Render-site design specs are deferred:

```tao
render Button <"elevated">
```

That is not V1. If a distinct look matters, give it a name:

```tao
variant ElevatedAction = ActionButton <"elevated supporting action">
```

## View Variants

Most local visual differences should be named.

```tao
use Button from @tao/ui

variant ActionButton = Button
variant WarningAction = ActionButton
variant DangerAction = WarningAction <"stronger destructive action">
```

A `variant` is design-only in V1. It keeps the same API and render behavior as its target. It does not add wrappers, icons, children, slots, or new arguments.

The variant chain becomes design input:

```text
Button
ActionButton
WarningAction
DangerAction
"stronger destructive action"
```

If a component needs different structure, it should be a real view. Structural variants are reserved for later design.

## Composite Roles

Tao design revolves around composites, not individual tokens.

Examples:

```text
composite.action.primary
composite.action.warning
composite.action.danger
composite.text.supporting
composite.surface.card
```

A composite role is an internal design unit that says what kind of presentation a source identity needs. Tokens and style tables are emitted from composites:

```text
source intent -> semantic role -> composite role -> resolved tokens/styles
```

This keeps source code semantic while still allowing the generated runtime to use concrete colors, spacing, typography, shadows, borders, opacity, motion values, and transforms.

## Identity Layers

Tao keeps identity layers separate so design metadata can be cached, reviewed, migrated, and reused.

```text
Source identity
  declaration or variant chain from Tao source

Design spec identity
  source identity + app design input + optional design spec string

Semantic identity
  inferred role and composite meaning

Resolved style key
  stable generated key used by runtime helpers

Runtime context key
  active adaptation and interaction-state context
```

For example:

```text
Source identity:       DangerAction
Design spec identity:  DangerAction + "stronger destructive action"
Semantic identity:     destructive warning action
Composite role:        composite.action.danger
Resolved style key:    style.action.danger
Runtime context key:   ios + dark + compact + pressed
```

The human author mostly sees source names and design specs. The compiler and runtime use the later layers.

## One App Design

The app owns one coherent design.

Tao should not encourage this as the normal model:

```text
Use a different theme for this subtree.
```

Local differences should usually be expressed through:

- named variants;
- view names;
- design specs;
- generated composite role assignments;
- later explicit appearance systems.

This keeps the app harmonious and prevents the view tree from becoming a stack of unrelated theme contexts.

## Accepted And Suggested Design Metadata

Tao separates source intent from resolved design metadata.

```text
Tao source
  -> design analyzer
  -> hidden suggestions during dev
  -> accepted tao.design.lock
  -> generated TypeScript design module
  -> React Native/Expo runtime
```

`tao.design.lock` is accepted project state. Production builds use it.

Dev mode may generate suggestions in a hidden `.tao.design.lock` artifact. The dev app can preview those suggestions, but they are not production design state until accepted.

The compiler does not ask an LLM how to style a button. It reads accepted design metadata and generated tables. Production builds fail when accepted design metadata is stale or missing for required entries.

## Generated Runtime

V1 targets React Native/Expo directly through generated TypeScript.

Conceptual output:

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

Generated views call stable helpers. The helper owns adaptation, fallback, and overlay composition. Runtime style-object memoization is a later performance concern, not a required V1 contract.

## Adaptation And State

V1 design resolution adapts at runtime for core React Native/Expo facts:

- color scheme;
- platform;
- text scale;
- screen size;
- reduced motion.

V1 also supports interaction-state overlays for interactive composites:

- `default`;
- `pressed`;
- `disabled`;
- `focused`;
- `selected`.

The generated module starts with base values, applies active adaptation overlays, then applies the active interaction-state overlay.

```text
base
platform
colorScheme
screenSize
textScale
reducedMotion
state
```

`loading` is deferred because it may affect component behavior, data state, or rendered structure.

High contrast, locale, RTL, pointer/hover, keyboard, and device posture are deferred.

## Style Dictionary Later

Style Dictionary is useful as an export and interoperability target, but it is not the V1 runtime target.

Tao keeps its own design lock because it needs semantic provenance, suggestion status, source identities, analyzer versions, accepted/resolved metadata, composite roles, and runtime style keys. Later, Tao can emit DTCG or Style Dictionary-compatible tokens for documentation, native resource generation, or design-tool integration.

## What The User Writes

The common path should feel like this:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  ui InvoiceScreen
}

use Button, Col, Stack, Text from @tao/ui

variant PrimaryAction = Button <"main positive action">
variant DangerAction = PrimaryAction <"stronger destructive action">

ui InvoiceScreen <"review screen with clear financial hierarchy"> {
  render Col [gap 16, pad 20] {
    InvoiceCard CurrentInvoice
    DangerAction "Delete invoice", DeleteInvoice
  }
}

ui InvoiceCard Invoice <"trustworthy document card with clear financial hierarchy"> {
  render Stack [gap 8, pad 16] {
    Text Invoice.CustomerName
    Text Invoice.Amount
    BodyText Invoice.Description
    PrimaryAction "Pay now", PayInvoice
  }
}

ui BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

The author gives Tao meaningful names and a few descriptions. Tao resolves the design graph, stores accepted metadata, and generates deterministic React Native/Expo styles.

## Deferred Complexity

The first version deliberately avoids:

- render-site design specs;
- explicit token dictionaries;
- raw colors and spacing in design source;
- subtree theme replacement;
- body-aware inference;
- parameter-aware inference;
- node labels for sub-view styling;
- structural variants;
- Style Dictionary runtime output;
- runtime style memoization requirements;
- semantic capability diagnostics;
- AI in the compile path.
