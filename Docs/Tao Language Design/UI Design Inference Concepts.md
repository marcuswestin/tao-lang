# UI Design Inference Concepts

Purpose: explain the intended Tao design-inference experience for humans.

This document describes why Tao design is not primarily a manually-authored theme dictionary, how the common source surface should feel, and how the generated design graph reaches React Native/Expo. The raw settled contract lives in [UI Design Inference Specification](./UI%20Design%20Inference%20Specification.md).

## Core Idea

Tao apps should look coherent with very little design code.

Instead of asking every app author to build a full theme dictionary up front, Tao starts from intent:

```text
app description
+ view and variant names
+ optional human descriptions
+ platform/runtime context
+ accepted generated metadata
= resolved app design
```

The developer writes UI and meaning. Tao generates a design graph that includes theme tokens, composite styles, adaptive style tables, motion-related values later, and platform-aware outputs.

Theme is still important, but it is not the top-level concept. A theme is one generated part of the app design.

## Why Not A Traditional Theme Dictionary

A traditional theme starts with values:

```text
primary = blue
surface = white
spacing.medium = 12
```

That works for design-system experts, but it makes a new app author answer too many questions before the app has enough shape.

Tao starts one level higher:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  render InvoiceScreen
}
```

From this, Tao can generate a coherent design direction and then refine it as named views and variants appear.

The design remains inspectable. The generated result is not magic at runtime. It is accepted into deterministic design metadata and compiled like the rest of the app.

## App Design

The app owns one coherent design.

```tao
app NotesApp {
  design {
    description "quiet writing app with warm focus and excellent long-form readability"
  }

  render NotesScreen
}
```

The app design description is the highest-level input. It tells Tao what the app should feel like, not which exact colors to use.

V1 keeps this intentionally small:

```tao
design {
  description "..."
}
```

Later versions may add more typed fields such as audience, brand, density, seed colors, typography, or platform preferences. V1 only needs the description.

## View Variants

Most local visual differences should be named.

```tao
variant Button = tao.Button
variant WarningButton = Button
variant DangerButton = WarningButton <"brighter, redder">
```

A `variant` is design-only in V1. It keeps the same API and render behavior as its target. It does not add wrappers, icons, children, slots, or new arguments.

The variant chain becomes design input:

```text
tao.Button
Button
WarningButton
DangerButton
"brighter, redder"
```

That chain is enough for Tao to infer that `WarningButton` should behave visually like a warning action, and that `DangerButton` should be a stronger version of it.

If a component needs different structure, it should be a real view, not a design-only variant.

## Local Descriptions

Declarations and variants can carry a short human description:

```tao
frame BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

The description is semantic input for design generation. It is not a raw style clause. It does not mean "set these exact properties."

In V1, `< ... >` contains only a string description. Missing `< ... >` does not turn inference off. Tao still infers from the app description, kind/root type, view or variant name, and variant chain.

Render-site descriptions are deferred:

```tao
render Button <"elevated">
```

That is not V1. If a distinct look matters, give it a name:

```tao
variant ElevatedButton = Button <"elevated">
```

## Always-On Inference

Every used named view participates in design inference.

For a plain view:

```tao
frame InvoiceCard Invoice {
  render Stack {
    Text Invoice.CustomerName
    Text Invoice.Amount
    Button "Pay now", PayInvoice
  }
}
```

Tao can infer from:

```text
app design description
frame
InvoiceCard
```

V1 does not inspect the body or parameter names for design inference. That keeps the first system stable and simple. Body-aware and parameter-aware inference are useful later additions.

## One App Design, Not Subtree Themes

The chosen direction is one coherent app design.

Tao should not encourage this as the normal model:

```text
Use a different theme for this subtree.
```

Local differences should usually be expressed through:

- named variants;
- view names;
- semantic descriptions;
- generated composite style assignments;
- later explicit style systems.

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

Dev mode may generate suggestions in a hidden artifact. The dev app can preview those suggestions, but they are not production design state until accepted.

This is similar in spirit to dependency locking:

```text
human intent       -> source files
accepted resolution -> lock file
```

## Deterministic Compilation

Design inference can use heuristics and later AI-assisted tools, but compilation must stay deterministic.

The compiler does not ask an LLM how to style a button. It reads accepted design metadata and generated tables.

Production builds fail when accepted design metadata is stale or missing for required entries. Dev mode can be more flexible by generating suggestions in the background.

## Generated TypeScript Runtime

V1 targets React Native/Expo directly through generated TypeScript.

Conceptual shape:

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

The real shape should expose resolver helpers, because many facts are runtime-only.

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

Generated views should call stable helpers. The helper owns adaptation, fallback, and merge behavior.

## Adaptation

V1 design resolution must adapt at runtime for core React Native/Expo facts:

- color scheme;
- platform;
- text scale;
- screen size;
- reduced motion.

The generated module starts with base values and applies active overlays in a deterministic order:

```text
base
platform
colorScheme
screenSize
textScale
reducedMotion
```

Later overlays replace earlier properties. Every generated style has a base fallback.

High contrast, locale, RTL, pointer/hover, keyboard, and device posture are deferred.

## Style Dictionary Later

Style Dictionary is useful as an export and interoperability target, but it is not the V1 runtime target.

Tao keeps its own design lock because it needs semantic provenance, suggestion status, source identities, analyzer versions, and accepted/resolved metadata. Later, Tao can emit DTCG or Style Dictionary-compatible tokens for documentation, native resource generation, or design-tool integration.

V1 compiles to generated TypeScript for React Native/Expo.

## What The User Writes

The common path should feel like this:

```tao
app InvoiceApp {
  design {
    description "calm financial tool for clear invoice review"
  }

  render InvoiceScreen
}

variant PrimaryButton = tao.Button
variant WarningButton = PrimaryButton
variant DangerButton = WarningButton <"stronger destructive action">

layout InvoiceScreen {
  render Col [gap 16, pad 20] {
    InvoiceCard CurrentInvoice
    DangerButton "Delete invoice", DeleteInvoice
  }
}

frame InvoiceCard Invoice <"trustworthy document card with clear financial hierarchy"> {
  render Stack [gap 8, pad 16] {
    Text Invoice.CustomerName
    Text Invoice.Amount
    BodyText Invoice.Description
    PrimaryButton "Pay now", PayInvoice
  }
}

frame BodyText Value text <"clear, concise, easy to read"> {
  render Text Value
}
```

The author gives Tao meaningful names and a few descriptions. Tao resolves the design system, stores accepted metadata, and generates deterministic React Native/Expo styles.

## Deferred Complexity

The first version deliberately avoids:

- render-site design metadata;
- explicit token dictionaries;
- raw colors and spacing in design source;
- subtree theme replacement;
- body-aware inference;
- parameter-aware inference;
- node labels for sub-view styling;
- structural variants;
- Style Dictionary runtime output;
- AI in the compile path.

These are not rejected forever. They are held back so the first model stays understandable.
