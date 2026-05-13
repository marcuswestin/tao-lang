# Tao UI Theme Design Doc

This document captures the core design decisions for the Tao theme system. It was produced through a structured design session narrowing down each decision point. The full style property catalogs, alternative syntaxes, and design-system references live in [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md). The styling boundary and syntax direction live in [UI Styling Design Doc](./UI%20Styling%20Design%20Doc.md).

## What A Theme Is

A theme serves three equally core purposes:

1. **Consistency**: a single source of truth for visual values so changes propagate everywhere.
2. **Beauty for free**: the app looks good with zero effort because the theme provides tasteful defaults.
3. **Adaptability**: the same app automatically looks right in dark mode, on different platforms, at different text scales, etc.

None of these can be separated from the others. The theme system must support all three from the start.

## Theme As A Primitive Dictionary

A theme is a dictionary of named primitive values. It declares abstract tokens -- never specific views.

The theme knows about colors, spacing, radii, shadows, typography, fonts, opacity, borders, and motion. It does not know about Button, Card, or any other view. It is analogous to a data schema: it defines the value space, and views consume from it.

### Token categories

- `color` -- palette and semantic color names, scheme variants (light/dark)
- `font` -- font families
- `text` -- typography presets (family, size, weight, line height, letter spacing)
- `spacing` -- the numeric scale shared with layout (`gap`, `pad`, `margin`)
- `radius` -- border radius scale
- `shadow` -- named shadow/elevation presets
- `border` -- default border widths and styles
- `opacity` -- named opacity levels (disabled, muted, overlay)
- `motion` -- durations, easing curves, spring configs, transition presets

### Spacing is shared with layout

Layout already uses raw numbers for spacing (`gap 12`, `pad 16`). When themes arrive, layout's spacing values and theme spacing tokens resolve through the same pipeline. Raw numbers are inline escape hatches from the theme spacing scale, not a separate system.

## Theme Declaration

The theme is a first-class Tao construct, declared separately like a data schema. The app section includes the theme alongside other configuration.

```tao
theme MyAppTheme {
  color {
    brand: blue_600
    surface: white
    text_primary: gray_900
    text_secondary: gray_600
    on_brand: white
    subtle: gray_400
  }

  spacing {
    small: 4
    medium: 8
    large: 16
    xlarge: 24
  }

  radius {
    small: 2
    medium: 5
    large: 13
    full: 9999
  }

  shadow {
    card: shadow(0 2 8 rgba(0,0,0,0.1))
    modal: shadow(0 4 16 rgba(0,0,0,0.15))
  }

  text {
    display: (family Inter, size 32, weight bold, line_height 40)
    title: (family Inter, size 20, weight semibold, line_height 28)
    body: (family Inter, size 16, weight regular, line_height 24)
    caption: (family Inter, size 12, weight regular, line_height 16)
  }

  opacity {
    disabled: 0.4
    muted: 0.6
  }
}
```

The theme can be inlined in the app section or defined in its own file and referenced by name.

## Adaptation (Light/Dark And Beyond)

### Fallback override model

A base set of values is always present. Adaptation schemes (light, dark, ios, android, tablet, etc.) override only what changes. Omitted tokens inherit from the base.

```tao
theme MyAppTheme {
  color {
    surface: white
    brand: blue_600
    text_primary: gray_900

    // dark overrides only what changes
    dark {
      surface: gray_900
      text_primary: gray_100
    }
  }

  shadow {
    card: shadow(0 2 8 rgba(0,0,0,0.1))

    dark {
      card: shadow(0 2 8 rgba(0,0,0,0.4))
    }
  }
}
```

### General mechanism

The adaptation mechanism is not color-specific. Any token category (spacing, typography, shadows, etc.) can adapt by any axis, even if most categories start with no overrides. The syntax for expressing adaptation conditions is the same regardless of category.

### Resolution at runtime

The compiler validates theme structure and checks that every token used is defined. Actual value resolution happens at runtime, because device context (scheme, platform, screen size, text scale) is not known until then.

### Selector syntax: undecided

The exact syntax for expressing adaptation conditions is still being designed. It needs to express things similar to CSS selectors but with different syntax. The final form may draw from CSS conditional blocks, pattern matching, or tree branching. This is deferred past the first theme implementation.

## How Views Reference Theme Values

### Bare names, disambiguated by property type

Views reference theme tokens by bare name. The property head tells the compiler which token category to resolve against.

```tao
Text "Dashboard" (color text_primary)    // compiler knows text_primary is a color
Box (bg surface, radius medium)          // surface is a color, medium is a radius
View (shadow card)                       // card is a shadow token
```

No `theme.` prefix, no interpolation syntax. The compiler infers the token category from the property.

### Raw literals as escape hatches

Named tokens are the normal path. Raw hex colors, literal numbers, and other raw values are valid but are escape hatches for prototyping or one-off overrides, not the default way to style.

```tao
Box (bg #ff0000)                         // escape hatch, not normal
Box (bg brand)                           // preferred
```

## Theme Value Propagation

### Values flow down the view tree

The app-level theme provides the root set of named values. Values propagate down the view tree. Every view in the tree can read from the set of named values provided above it.

### Views can override values for their subtree

Any view can provide or override named values for its children. This enables local theming without a separate mechanism.

```tao
view Card {
  // Inside Card, 'surface' means something different
  provide { surface: gray_100 }

  Col [gap 8, pad 16] (bg surface) {
    Text "Title" (color text_primary)
  }
}
```

A dark card on a light page, or a branded section with different colors, falls out naturally from this model.

### Compile-time dependency checking

The compiler statically checks that every named value a view uses is provided by some ancestor in the tree or by the app-level theme. If a view uses `bg brand` but no ancestor provides `brand`, the compiler reports an error.

This is analogous to how Java requires functions to either catch exceptions or declare that they throw. Views either receive their named values from parents or must declare the dependency.

## View-Level Styling

### Views own their own visual appearance

Styling lives at the view level, not in the theme. The theme provides named primitives. Views compose those primitives into actual appearances.

### Both inline and local style blocks

A view can apply inline style values at the render site and can define local style blocks for reusable or variant styles.

```tao
view TaskCard {
  Col [gap 8, pad 16] (bg surface, radius medium, shadow card) {
    Text Title (text title, color text_primary)
    Text Description (text body, color text_secondary)
  }
}
```

### Variant style maps

When a view has variants (primary, secondary, danger), the view declares a mapping from variant name to style values.

```tao
view Button {
  variant primary {
    bg: brand
    color: on_brand
    radius: medium
  }

  variant secondary {
    bg: surface
    color: text_primary
    radius: medium
  }

  variant danger {
    bg: red_600
    color: on_brand
    radius: medium
  }

  // render body uses the active variant
}
```

The call site picks the variant: `Button "Save", Save (primary)`.

## Style Bundles (Mixins)

Named style bundles can be declared, combined, and extended. A bundle groups token references into a reusable unit.

```tao
style card_surface {
  bg: surface
  radius: medium
  shadow: card
}
```

At the render site, bundles can be applied alongside individual overrides:

```tao
Box (card_surface, color text_primary)
```

Multiple bundles can be combined. Later values override earlier ones. Inline values override bundle values.

## Default Themes

### Generative + preset library

When someone creates a new Tao app with zero theme code:

- Tao generates a unique-but-tasteful theme (e.g. from a deterministic hash of the project name), so no two new apps look identical out of the box.
- Tao also ships a library of named presets the author can switch to.

The generative output must be as polished as a hand-curated preset.

### Core tenet alignment

From `CORE_TENETS.md`:

- "Every configurable thing has sane and tasteful default values."
- "Everything works out of the box without changing configurable values."
- "Different apps should end up with different defaults."

The generative/preset system satisfies all three.

## What Is Not In Theme V1

These are recognized as important but deferred past the first theme implementation:

- Exact adaptation selector syntax (CSS-like, pattern matching, tree branching, or new)
- Multi-axis adaptation composition (dark + ios + tablet simultaneously)
- Interaction states (pressed, focused, hovered, disabled) and their connection to styling
- Animation and transition connection to theme values
- The styling delimiter (`( ... )` is leading but not committed)
- Platform-specific styling surface (Android elevation, iOS shadow primitives)
- Library/package theme interaction with app themes
- Font loading pipeline (Expo `Font.loadAsync`)
- Generative theme algorithm

## Open Questions

- What is the exact selector syntax for adaptation conditions?
- How do multiple adaptation axes compose when several apply at once?
- How does the generative default theme algorithm work?
- How do library-provided themes interact with the app theme? Can libraries contribute tokens, or must they declare dependencies?
- How do interaction states (pressed, hovered, disabled) modify styled values?
- Should views be able to declare which named values they depend on as part of their public interface (like a type signature for theme dependencies)?
- How are style bundles declared, imported, and composed at scale?
