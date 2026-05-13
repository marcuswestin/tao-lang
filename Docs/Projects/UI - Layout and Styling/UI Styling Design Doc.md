# Tao UI Styling Design Doc

This is the intentionally light styling design doc. Layout is being implemented first; styling waits until layout syntax, theme values, and typed value flow are proven.

The theme model and value propagation design lives in [UI Theme Design Doc](./UI%20Theme%20Design%20Doc.md). The full alternatives, style property catalog, theme/color/spacing exploration, and design-system references live in [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md). The preserved raw archive is [Design WIP - UI Layout and Styling](../Design%20WIP/UI%20Layout%20and%20Styling.md). Use those for prior reasoning; do not delete them when consolidating decisions.

## Current Decision

- Styling is not part of layout v1.
- Styling will not use `[ ... ]`.
- `< ... >` is deferred.
- `( ... )` is deferred.
- Themes, named visual tokens, variants, and inline style escapes are deferred.
- Before styling implementation, Tao needs a separate decision pass for themes and typed values: how values are declared, type-checked, resolved, and threaded into both layout spacing/sizing and styling.
- The styling backend decision remains: generate React Native `StyleSheet.create` output plus a small Tao-owned style/theme runtime unless a later styling pass proves an external library is necessary.

## Boundary

Styling is static visual appearance:

- color
- background color
- typography
- font family
- font size
- font weight
- line height
- text alignment
- radius
- visual borders
- shadow/elevation
- opacity
- component variants

Layout owns geometry and flow:

- row/column direction
- child alignment and distribution
- gap
- padding
- margin
- width/height/min/max
- grow/shrink/basis
- position and offsets

Transforms and motion are separate from both. Accessibility, localization, adaptation, and interactions are also separate design tracks.

## Likely Syntax Direction

The leading candidate from discussion is parentheses for style references and inline style clauses:

```tao
Text "Dashboard" (heading)
Text "Dashboard" (text title, color text_primary)
Button "Save", Save (primary, bg brand, color on_brand)
```

Rules to validate later:

- `(name)` applies a style reference.
- `(name, color brand)` applies a style reference plus overrides.
- `(color brand, text title)` is fully inline styling.
- Raw values should be explicit escape hatches for prototyping, not the normal path.

Example only, not v1 layout implementation:

```tao
Col [top left, gap 16, pad 24] (bg app) {
  Text "Dashboard" (text display, color text_primary)
  Button "Save", Save [centered] (primary)
}
```

## Theme And Value Work Comes First

Styling should not be designed as a standalone token system. The next step after raw layout is the theme/value model:

- layout spacing and sizing values need typed theme values;
- style values need the same typed value system;
- inline overrides need type checking against the property they are passed to;
- adaptation modes such as platform, screen size, dark mode, locale, text scale, and reduced motion need a value-resolution story.

Once that exists, styling can cover the full React Native style surface without inventing a parallel theme mechanism.

## Theme Design

The theme model is now documented in [UI Theme Design Doc](./UI%20Theme%20Design%20Doc.md). Core decisions: the theme is a dictionary of named primitive values (not view-aware), values propagate down the view tree with compile-time checking, views own their styling and reference tokens by bare name, and the adaptation mechanism uses a fallback override model.

When styling resumes, theme values should be typed:

- `color`
- `font`
- `text`
- `size`
- `weight`
- `radius`
- `border`
- `shadow`
- `opacity`
- `duration`
- `easing`
- `motion`
- `transform`

Named style/layout values should remain lowercase in examples. Tao variables and references remain uppercase.

## React Native Target

Styling should map to React Native view and text style props, or to a Tao runtime helper when React Native does not provide a direct portable surface.

Sources:

- [React Native 0.81 Style](https://reactnative.dev/docs/0.81/style)
- [React Native 0.81 StyleSheet](https://reactnative.dev/docs/0.81/stylesheet)
- [React Native 0.81 View Style Props](https://reactnative.dev/docs/0.81/view-style-props)
- [React Native 0.81 Text Style Props](https://reactnative.dev/docs/0.81/text-style-props)

## Open Questions

- Is `( ... )` definitely the styling delimiter, or does style need a named keyword?
- How do style references compose with inline overrides?
- Which values are typed theme tokens versus raw literals?
- How do variants compose with style values?
- How does styling interact with interaction states such as pressed, focused, hovered, and disabled?
- How much style output should be hoisted with `StyleSheet.create` versus resolved at runtime?
