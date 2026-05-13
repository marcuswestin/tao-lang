# UI Layout and Styling

Tao's visual surface for positioning, sizing, spacing, and appearance of views. This project covers layout syntax, styling syntax, the theme/value system, and their interaction with the React Native/Expo runtime.

## Status

- **Layout syntax**: in design, approaching implementation. Grammar, validation, codegen, and runtime shapes are defined.
- **Theme system**: core model decided. Theme is a primitive dictionary; values propagate down the view tree with compile-time dependency checking. Adaptation selector syntax is undecided.
- **Styling syntax**: deferred until theme/value pipeline is proven. `( ... )` is the leading delimiter candidate.
- **Transforms and motion**: deferred. Separate lane from layout and styling.

## Key Decisions

- `[ ... ]` is the layout delimiter. Styling will not reuse it.
- Layout values are actual values (words and numbers), not theme tokens, for v1.
- The theme declares named primitives (colors, spacing, radii, shadows, typography, etc.) and knows nothing about specific views.
- Views own their styling: they reference theme tokens by bare name, disambiguated by property type.
- Theme values propagate down the view tree; any view can override values for its subtree.
- The compiler statically checks that every named value a view uses is provided by an ancestor or the app theme.
- Raw literals are allowed as escape hatches; named tokens are the normal path.
- Default themes are generative (unique per app) plus a library of named presets.

## Documents

| Document                                                                                                            | Purpose                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [UI Layout Design Doc](./UI%20-%20Layout%20and%20Styling/UI%20Layout%20Design%20Doc.md)                             | Authoritative layout direction: syntax, vocabulary, validation rules, codegen shape, and the canonical key/value catalog                   |
| [UI Theme Design Doc](./UI%20-%20Layout%20and%20Styling/UI%20Theme%20Design%20Doc.md)                               | Theme model: primitive dictionary, tree propagation, adaptation, view-level styling, style bundles, defaults                               |
| [UI Styling Design Doc](./UI%20-%20Layout%20and%20Styling/UI%20Styling%20Design%20Doc.md)                           | Styling direction: boundary with layout, likely syntax, deferred decisions                                                                 |
| [Project Implementation Plan](./UI%20-%20Layout%20and%20Styling/Project%20Implementation%20Plan.md)                 | Staged plan: layout first, then themes/values, then styling, then transforms/motion, then interactions, then a11y/i18n                     |
| [UI Layout Syntax Exploration](./UI%20-%20Layout%20and%20Styling/UI%20Layout%20Syntax%20Exploration.md)             | Compressed alternatives for layout syntax: delimiter approaches, child vocabulary, self vocabulary, size, spacing, and the decision matrix |
| [UI Layout Vocabulary Exploration](./UI%20-%20Layout%20and%20Styling/UI%20Layout%20Vocabulary%20Exploration.md)     | Layout wording decisions: morphology system, word choices, naming rationale, axis resolution, shorthand conventions                        |
| [UI Styling and Theme Syntax Exploration](./UI%20-%20Layout%20and%20Styling/UI%20Styling%20Syntax%20Exploration.md) | Full styling/theme alternatives: property catalogs, color system, spacing/radius scales, design-system references, and open questions      |

## Archive

| Document                                                                            | Purpose                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Design WIP - UI Layout and Styling](./Design%20WIP/UI%20Layout%20and%20Styling.md) | Raw historical archive of the original layout and styling discussion. Preserved for prior reasoning and verbatim notes. |

## Open Areas

- Adaptation selector syntax (how the theme expresses conditional values for dark/light, platform, screen size, etc.)
- Multi-axis adaptation composition
- Styling delimiter commitment
- Interaction states and their effect on styling
- Animation/transition connection to theme values
- Library/package theme interaction with app themes
- Generative default theme algorithm
