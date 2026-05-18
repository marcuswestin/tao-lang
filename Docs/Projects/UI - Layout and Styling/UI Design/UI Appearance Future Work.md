# UI Appearance Future Work

Purpose: preserve useful styling and React Native appearance notes after the design-inference consolidation.

This is not an implementation contract. The active V1 design contract is [UI Design Inference Specification](../../../Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md). This document collects future appearance questions and React Native style-surface reminders harvested from superseded theme/styling notes.

## Current Boundary

V1 design inference does not expose a general source-level styling language.

Current V1 source avoids:

- render-site design specs;
- inline style clauses;
- explicit token dictionaries;
- raw colors, typography, shadows, borders, opacity, or motion values;
- subtree theme replacement;
- source-authored style bundles.

Future appearance work should build on accepted design metadata, composite roles, and resolved style keys rather than reintroducing token dictionaries as the primary authoring model.

## Future Style Surface

When Tao adds explicit appearance syntax, it should still map to React Native/Expo support, a Tao-owned runtime helper, or an explicit validation/runtime error.

Likely categories to cover:

- background and fill;
- border width, color, style, and radius;
- shadow and Android elevation;
- opacity and visibility;
- text color, font, size, weight, line height, letter spacing, alignment, decoration, transform, truncation, and line limits;
- image resize mode, tint, overlay, radius, and placeholder/loading behavior;
- platform-specific effects such as gradients, blur, masks, blend modes, and backdrop effects where supported.

Property spellings remain undecided. Avoid treating examples from archived docs as chosen syntax.

Platform-specific surface reminders to revisit:

- iOS: continuous corners through `borderCurve`, `writingDirection`, text shadow props, and shadow primitives.
- Android: `elevation`, `textAlignVertical`, and `includeFontPadding`.
- Cross-platform gaps need either a supported React Native/Expo mapping, a Tao-owned runtime helper, or a clear validation/runtime diagnostic.

## React Native Style References

The appearance implementation should stay grounded in React Native and Expo:

Current runtime trail:

- `packages/expo-runtime/package.json` pins `react-native` to `0.81.5`.
- Version-sensitive support claims should be checked against React Native 0.81 before they become spec language.

Pinned React Native 0.81 references:

- [React Native 0.81 Style](https://reactnative.dev/docs/0.81/style)
- [React Native 0.81 StyleSheet](https://reactnative.dev/docs/0.81/stylesheet)
- [React Native 0.81 View Style Props](https://reactnative.dev/docs/0.81/view-style-props)
- [React Native 0.81 Text Style Props](https://reactnative.dev/docs/0.81/text-style-props)
- [React Native 0.81 Layout Props](https://reactnative.dev/docs/0.81/layout-props)
- [React Native 0.81 Flexbox](https://reactnative.dev/docs/0.81/flexbox)

Latest React Native docs remain useful for forward-looking checks, but they should not override the runtime-pinned references:

- [React Native Style](https://reactnative.dev/docs/style)
- [React Native StyleSheet](https://reactnative.dev/docs/stylesheet)
- [React Native View Style Props](https://reactnative.dev/docs/view-style-props)
- [React Native Text Style Props](https://reactnative.dev/docs/text-style-props)

## Delimiter Questions

The old styling exploration considered parentheses and angle brackets. Both remain unresolved for a future explicit appearance language.

Do not use `< ... >` as future style syntax while V1 design specs use `<"description">`.

Prior rationale to preserve:

- `( ... )` was the leading old candidate because it is visually distinct from layout `[ ... ]` and reads like applying a named style or list of style values. Its main risk is visual density next to arguments and commas, plus unresolved composition rules.
- `< ... >` is visually distinct and earlier sketches used it for visual tweaks, but V1 now uses `<"description">` for design specs and the form risks future conflicts with generics, comparison parsing, or renewed metadata use.
- A named `style` keyword is explicit and English-like, but costs more syntax in common code and fights the compact, design-tool-adjacent vocabulary goal.

Open questions:

- Does explicit appearance need a delimiter, a keyword, or named declarations?
- How do explicit appearance values compose with generated composites?
- Are inline raw values allowed for prototyping only, and how are they made visually obvious?
- Does explicit appearance override generated design, or create new design specs that must be accepted into the lock?

## Composite And Token Future Work

Future explicit appearance syntax should preserve the V1 design direction:

```text
source intent -> semantic identity -> composite role -> resolved tokens/styles
```

Composites should remain the central unit for app-facing appearance decisions. Tokens remain a generated/resolved layer unless a later design pass deliberately introduces source-authored token dictionaries.

Design-system research still relevant to generated defaults and later export work:

- A Figma-like color hierarchy may be useful internally: palette colors, adaptive schemes, semantic application names, and per-scheme resolved variables.
- Application color names should stay semantic, such as text, icon, background, border, divider, accent, brand, danger, warning, success, and modifiers such as default, secondary, pressed, focused, disabled, inverse, and on-brand.
- Color entries may eventually need contrast metadata for accessibility checks. This belongs with later semantic capability diagnostics and accessibility-axis work, not V1 compiler diagnostics.
- Generated spacing and radius defaults should keep the old Figma-style scale proposals available as references, while treating exact names and values as unsettled.
- Future named spacing values used by layout and generated appearance should resolve through the same design-value pipeline. Raw layout values such as `gap 12` and `pad 16` remain escape hatches, not a separate spacing system.
- Later Style Dictionary/DTCG export should preserve semantic/composite provenance instead of flattening everything to raw platform values too early.

Archived scale proposals, for reference only:

| Spacing Token | Value |
| ------------- | ----: |
| `spacer-0`    |     0 |
| `spacer-1`    |     4 |
| `spacer-2`    |     8 |
| `spacer-3`    |    16 |
| `spacer-4`    |    24 |
| `spacer-5`    |    32 |
| `spacer-6`    |    40 |

| Radius Token    | Value |
| --------------- | ----: |
| `radius-none`   |     0 |
| `radius-small`  |     2 |
| `radius-medium` |     5 |
| `radius-large`  |    13 |
| `radius-full`   |  9999 |

Preserved research links:

- [Figma: How to streamline your design system workflow in Figma](https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/?fuid=154734308415698449)
- [Figma: Creating coherence: how Spotify's design system goes beyond platforms](https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/)
- [Figma: Introducing Code Connect](https://www.figma.com/blog/introducing-code-connect/)
- [Figma: Introducing Dev Mode](https://www.figma.com/blog/introducing-dev-mode/)

Potential future composite areas:

- action composites;
- text composites;
- surface/card composites;
- navigation composites;
- form/input composites;
- feedback/status composites;
- motion composites;
- accessibility/adaptation composites.

## Explicit Appearance Deferrals

These are useful ideas, not V1 commitments:

- source-authored style bundles;
- source-authored token dictionaries;
- raw literal escape hatches for color, spacing, typography, border, shadow, and motion;
- explicit style delimiter;
- structural variants;
- full motion language;
- font loading pipeline;
- complex platform effects such as gradients, blur, masks, and blend modes;
- Style Dictionary export;
- runtime style-object memoization requirements.
