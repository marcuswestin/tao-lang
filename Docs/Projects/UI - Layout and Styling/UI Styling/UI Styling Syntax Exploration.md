# UI Styling and Theme Syntax Exploration

This is the compressed-but-thorough exploration of Tao styling, theming, and design-system vocabulary, sibling to the [UI layout rationale](../UI%20Layout/UI%20Layout%20Design%20Doc.md#exploration-and-vocabulary-rationale). It absorbs the styling, theme, color, spacing/radius, and design-system material from the raw [UI Layout and Styling Raw Notes](../../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md) archive and organizes it without losing the original exploratory voice.

The current authoritative direction is intentionally light and lives in [UI Styling Design Doc](./UI%20Styling%20Design%20Doc.md). Use this exploration doc when revisiting style vocabulary, deciding theme syntax, listing properties to cover, or planning the design-system surface. It is not implementation permission; the design doc and [Layout and Styling Project Plan](../Layout%20and%20Styling%20Project%20Plan.md) remain the source of truth.

Status meanings used below:

- **v1**: candidate when styling implementation begins.
- **later**: useful, but waits until the core styling/theme model is stable.
- **deferred**: needs separate design or a stronger use case.
- **not chosen**: preserved from exploration, not a current direction.

## Current Preferred Direction

The current preferred styling direction is deliberately narrow:

- Styling is not part of layout v1.
- `[ ... ]` is layout only; styling will not reuse it.
- The leading styling delimiter candidate is `( ... )`, but it is not committed.
- `< ... >` is deferred and has been reserved/rejected for various roles already.
- Themes, named visual tokens, variants, and inline style escapes are deferred.
- Theme/value type system work comes before styling syntax, so styling can target a real typed value pipeline rather than inventing one.
- The styling backend remains React Native `StyleSheet.create` plus a small Tao-owned style/theme runtime, unless a later pass proves an external library is necessary.

Example (illustrative, not v1):

```tao
Col [top left, gap 16, pad 24] (bg app) {
  Text "Dashboard" (text display, color text_primary)
  Button "Save", Save [centered] (primary)
}
```

## Layout/Styling Boundary

The split is intentional and load-bearing. Layout is geometry and flow. Styling is static visual appearance. Transforms and motion are a separate lane. Accessibility, localization, adaptation, and interactions are separate design tracks.

### Layout owns

- row/column direction
- child alignment and distribution
- gap
- padding
- margin
- width / height / min / max
- grow / shrink / basis
- position and offsets

### Styling owns

- color
- background color
- typography (font family, size, weight, style, variant)
- line height and letter spacing
- text alignment
- text decoration
- text transform
- visual borders
- border radius
- shadow / elevation
- opacity
- component variants

### Outside both lanes

- Transforms (`translate`, `scale`, `rotate`, etc.).
- Motion (`duration`, `curve`, `spring`, `transition`).
- Accessibility (`access role`, `access label`).
- Interactions (`when pressed`, `on press`).

The morphology rule from layout still applies in spirit: a layout `[ ... ]` clause should not carry color, font, radius, shadow, opacity, transform, or animation words.

## Delimiter Approaches

### `( ... )` for styling

Examples:

```tao
Text "Dashboard" (heading)
Text "Dashboard" (text title, color text_primary)
Button "Save", Save (primary, bg brand, color on_brand)
```

Pros:

- Visually distinct from layout `[ ... ]`.
- Reads like applying a named style or list of styles.
- Leaves `[ ... ]` free for layout only.

Cons:

- Parens are visually dense next to view arguments and trailing commas.
- Composition rules with overrides need to be defined.

Current status: leading candidate, not committed.

### `< ... >` for styling

Examples:

```tao
Text "Dashboard" <heading>
Box <bg surface, radius 8>
```

Pros:

- Visually different from both `[ ... ]` and `( ... )`.
- Earlier sketches used it for inline visual tweaks.

Cons:

- Earlier sketches were unstable: sometimes layout, sometimes styles.
- Conflicts with possible generics or comparison parsing later.

Current status: deferred, not chosen.

### Named keyword for styling

Examples:

```tao
Text "Dashboard" style heading
Text "Dashboard" style (text title, color text_primary)
```

Pros:

- Explicit.
- Reads in English.

Cons:

- More to type for the common case.
- Fights the "compact, Figma-adjacent vocabulary" goal.

Current status: deferred.

## Style Reference And Override Composition

Behavior to validate later, regardless of delimiter choice:

- `(name)` applies a single named style reference.
- `(name, color brand)` applies a style reference and adds inline overrides.
- `(color brand, text title)` is fully inline styling.
- Multiple style names should be order-defined: later names override earlier names; inline values override named values.
- Raw literal values (e.g. raw hex colors, raw pixel sizes) should be explicit escape hatches for prototyping, not the normal path.
- Variants compose with style values, but how is unresolved.

## Element Style Property Catalog

These are the visual surfaces a non-text Tao view needs to express. Surface spellings are illustrative; the real surface is unresolved. Targets are React Native unless noted.

### Background and fill

- `bg color_token` — `backgroundColor`. v1 once color tokens exist.
- `bg none` / `bg transparent` — explicit no fill. v1.
- `bg image:asset_token` — background image; deferred (RN has no `backgroundImage`; needs `ImageBackground` runtime helper).
- `bg gradient:token` — gradient background; deferred (needs Expo `LinearGradient` or runtime helper).
- `bg blur:token` — translucent blur background; deferred (needs Expo `BlurView`).

### Border

- `border N` — uniform border width. v1 once styling lands.
- `border N color_token` — width plus color. v1.
- `border top N`, `border right N`, `border bottom N`, `border left N` — side widths. v1.
- `border color color_token` — `borderColor`. v1.
- `border style solid|dashed|dotted` — `borderStyle`. v1.
- `border start N`, `border end N` — logical side widths. later, depends on RTL design.
- `border curve continuous` — iOS continuous corners (`borderCurve`). later.
- Per-side colors (`border top color`, etc.) — later.

### Border radius

- `radius N` — uniform `borderRadius`. v1.
- `radius full` — pill/circle shape (very large value or computed). v1.
- `radius small|medium|large|none` — named scale. depends on theme tokens.
- `radius top N`, `radius bottom N` — `borderTopLeft/RightRadius`, `borderBottomLeft/RightRadius` pair. later.
- `radius top_left N`, `radius top_right N`, `radius bottom_left N`, `radius bottom_right N` — per-corner. later.
- `radius start N`, `radius end N` — logical corners. deferred.

### Shadow and elevation

- `shadow card`, `shadow popover`, etc. — named shadow tokens. v1 once tokens exist.
- `elevation N` — Android `elevation`. v1, but should usually be implied by a shadow token.
- iOS shadow primitives: `shadow color color_token`, `shadow offset X Y`, `shadow opacity 0.2`, `shadow radius N` — later, prefer tokens.
- `box_shadow ...` — newer RN prop; later.
- `filter ...` — newer RN prop; later.

### Opacity and visibility

- `opacity N` — `opacity`. v1.
- `opacity disabled`, `opacity muted` — named opacity tokens. v1 with tokens.
- `hidden` / `visible` — `display: 'none'` vs default. later, may overlap with layout.
- `pointer none|auto|box_only|box_none` — `pointerEvents`. later, has interaction-lane overlap.

### Cursor and platform pointers

- `cursor pointer|default|...` — RN `cursor` (web/macOS). later.
- Hover/press cursor variants — interaction lane.

### Blend and effects

- `mix_blend ...` — `mixBlendMode`. deferred.
- `tint color_token` — for `Image`/`Icon`; v1 in image catalog.
- Backdrop filter / blur backgrounds — deferred (Expo `BlurView`).

### Test, debug, and identity

- `test_id "..."` — `testID`. Probably belongs in semantics/access lane, not styling.
- `access *` — accessibility lane, not styling.

## Text Style Property Catalog

Text styling is the heaviest catalog and the one users notice first. Spellings are illustrative.

### Color

- `color color_token` — `color`. v1.
- Inline raw color — escape hatch only.

### Font family and face

- `font font_token` — `fontFamily`. v1 once font tokens exist.
- `font_family "Inter"` — explicit string; escape hatch.
- Font loading pipeline (Expo `Font.loadAsync`) — runtime concern; styling doc must say how Tao surfaces it.

### Size

- `size N` — `fontSize`. v1.
- `size body|caption|title|display` — named scale. v1 with tokens.
- Text scale adaptation — adaptation lane, not raw styling.

### Weight, style, variant

- `weight thin|light|regular|medium|semibold|bold|black` — named weights. v1.
- `weight 100..900` — numeric weights. v1.
- `italic` / `style italic` — `fontStyle`. v1.
- `variant small_caps|tabular_nums|...` — `fontVariant`. later.
- `feature ...` — `fontFeatureSettings`. later.

### Line height and spacing

- `line_height N` — `lineHeight`. v1.
- `letter_spacing N` — `letterSpacing`. v1.
- `word_spacing N` — not in RN; deferred.

### Alignment

- `text_align left|right|center|justify|auto` — `textAlign`. v1.
- `text_align start|end` — logical; later.
- `text_align_vertical top|center|bottom` — Android `textAlignVertical`. later, has layout overlap.
- `vertical_align top|center|bottom|baseline` — newer RN `verticalAlign`. later.

### Decoration

- `underline` — `textDecorationLine: 'underline'`. v1.
- `strikethrough` — `textDecorationLine: 'line-through'`. v1.
- `decoration none|underline|strikethrough|both` — explicit form. v1.
- `decoration_style solid|double|dotted|dashed` — iOS `textDecorationStyle`. later.
- `decoration_color color_token` — iOS `textDecorationColor`. later.

### Transform

- `text_transform none|uppercase|lowercase|capitalize` — `textTransform`. v1.

### Shadow

- `text_shadow color color_token`, `text_shadow offset X Y`, `text_shadow radius N` — `textShadow*`. later.
- Probably better as a named text-shadow token.

### Truncation and lines

- `lines N` — `numberOfLines`. v1, but partially layout-adjacent.
- `truncate head|middle|tail|clip` — `ellipsizeMode`. v1.
- `selectable` / `select user|none|all|contain` — `userSelect`. later.

### Direction

- `writing rtl|ltr` — iOS `writingDirection`. deferred; ties into RTL/I18N design.
- `include_font_padding true|false` — Android `includeFontPadding`. later.

### Reading order / accessibility

- Accessible alternatives, language tags, and rich-text fragments are accessibility/I18N concerns.

## Image Style Property Catalog

For `Image`, `Icon`, and similar.

- `resize cover|contain|stretch|repeat|center` — `resizeMode`. v1.
- `object_fit cover|contain|fill|none|scale_down` — newer `objectFit`. later.
- `tint color_token` — `tintColor`. v1.
- `overlay color_token` — `overlayColor`. later.
- `radius *` — same as element radius vocabulary.
- `aspect N` — usually layout, but image assets often need it; cross-listed.
- Loading/placeholder states — runtime concern, not styling.

## Cross-cutting Property Names That Could Be Themed Tokens

These are values that the WIP repeatedly suggested live in a theme rather than as inline literals:

- color (semantic and palette)
- spacing (gaps, padding, margin)
- radius
- border width
- shadow / elevation
- opacity (`disabled`, `muted`, `overlay`)
- typography sets (`title`, `body`, `caption`, `display`)
- font family
- font size scale
- font weight scale
- line height scale
- letter spacing scale
- duration (motion)
- easing / curve
- motion presets
- transform presets

## Component Variants And States

Variants are explicitly in the styling lane.

- A variant is a named style profile applied at the call site, e.g. `Button (primary)`, `Button (secondary)`, `Button (danger)`.
- Variants should compose with inline overrides.
- Variants should compose with interaction states (pressed, focused, hovered, disabled), but state styling is its own design pass.
- Open question: are variants declared on the view, on the theme, or both?
- Open question: can a variant change layout? If yes, that breaks the layout/styling boundary; if no, components needing variant-driven layout need a different mechanism.

## Theme And Value System Vocabulary

Theme work comes before styling. The styling design doc lists typed value categories; this section explores them in more depth.

### Typed value categories

Theme values that should eventually be typed:

- `color`
- `font` (family + face metadata)
- `text` (a complete typography preset: family, size, weight, line height, letter spacing)
- `size` (sizing values used for width/height/min/max)
- `spacing` (used for gap, pad, margin)
- `weight` (font weight)
- `radius`
- `border` (width, style, color combo)
- `shadow`
- `elevation`
- `opacity`
- `duration` (motion)
- `easing`
- `motion` (composite)
- `transform`

### Naming conventions

- Lowercase words for theme values and property names.
- Uppercase names for Tao references and variables.
- Semantic over palette: prefer `color text_primary` over `color blue_700` at usage sites; allow palette references inside theme declarations.

### Adaptation modes

The theme system should select values based on:

- color scheme (`light`, `dark`)
- platform (`ios`, `android`, `web`)
- screen size class / breakpoints
- text scale
- reduced motion
- high contrast
- locale and direction (`rtl`)
- safe area / notch
- pointer/hover capability
- keyboard presence
- device class

### Open questions about themes

- Are theme values compile-time constants, runtime-resolved, or both?
- How does adaptation priority compose when several modes apply (e.g. `dark + tablet + rtl + reduced_motion`)?
- Are inline conditional values allowed at view sites, or do views consume semantic tokens and let the theme resolve?
- How are app-wide defaults selected so that everything still works out of the box?

## Color System (Figma-Inspired Hierarchy)

The raw notes describe a multi-level color model lifted from Figma's variables-and-aliases workflow.

### Hierarchy

1. **Palette colors** are named hues with weight/value steps.
   - Example: `Blue` has steps `100, 200, 300, 400, 500, 600, 700, 800, 900`, going from light to dark.
   - Example values: `Red 500`, `Green 600`, `Gray 100`.
2. **Schemes** apply across the palette.
   - Examples: `light`, `dark`, `figjam` (a brand-specific scheme in the Figma example).
   - A scheme picks which palette step is "neutral 0", which is "neutral max", etc.
3. **Application names** describe where a color is used in the UI.
   - Example axis: `icon | text | bg | border | divider | accent | brand | danger | warning | success`
   - Example modifier axis: `default | secondary | pressed | hovered | focused | disabled | onbrand | inverse`
   - Compose: `icon brand pressed`, `bg surface`, `text on_brand`, `border subtle`.
4. Each application name resolves to a `palette + step` per scheme.
   - Example: `icon brand pressed` in `light` scheme resolves to `Blue 700`.
   - Stored as theme variables, similar to Figma variables.

### Surface ideas

```tao
theme app {
  color {
    palette {
      blue { 100 ..., 700 #1d4ed8, ... }
      gray { 100 ..., 900 ... }
    }

    scheme light {
      icon { brand { default blue.600, pressed blue.700, disabled gray.300 } }
      text { primary gray.900, secondary gray.600, on_brand white }
      bg   { app gray.50, surface white, brand blue.600 }
    }

    scheme dark {
      // overrides
    }
  }
}
```

### Open questions

- Where do brand-specific schemes live (one per app, or as overlays)?
- How are color variables referenced at use sites: dotted paths, lowercase compounds, or tokens?
- Should colors include opacity layers, or is opacity always its own property?
- Should named colors carry contrast metadata for accessibility checks?

## Spacing And Radius Scales

The raw notes propose Figma-style numeric scales as defaults.

### Spacing scale (default proposal)

| Token      | Value (px / RN points) |
| ---------- | ---------------------- |
| `spacer-0` | 0                      |
| `spacer-1` | 4                      |
| `spacer-2` | 8                      |
| `spacer-3` | 16                     |
| `spacer-4` | 24                     |
| `spacer-5` | 32                     |
| `spacer-6` | 40                     |

Notes:

- Apps and themes should be able to extend or replace the scale.
- Layout v1 currently uses raw numeric values like `gap 12` and `pad 16`; named spacing tokens slot in once the theme/value system lands.
- Naming `spacer-N` vs `space N` vs `gap N` is unsettled.

### Radius scale (default proposal)

| Token           | Value |
| --------------- | ----- |
| `radius-none`   | 0     |
| `radius-small`  | 2     |
| `radius-medium` | 5     |
| `radius-large`  | 13    |
| `radius-full`   | 9999  |

Notes:

- `radius-full` is the conventional pill/circle sentinel.
- The exact step values are placeholders from the WIP, not committed.
- A `radius` token may want `outer` and `inner` variants for nested elements, but that is later work.

## Beautiful By Default

A standing principle from the WIP that styling and theming need to honor:

- Apps should look nice with zero theme configuration.
- Layouts should be easy to write without thinking about defaults.
- Defaults should err on visible/readable rather than collapsed/invisible (see [Empty view and defaults problem](#empty-view-and-defaults-problem-cross-link-with-depth)).
- Tasteful defaults per app or per theme are a dedicated design step, not an accident of values picked for the first sample.

Open questions:

- Does Tao ship one canonical default theme, multiple, or a generative defaults system?
- How do app-level defaults interact with library-provided defaults?
- How are defaults chosen so they do not silently mask missing theme work in user apps?

## Layout-Adjacent Material Not Captured Elsewhere

These items came out of the WIP layout discussion but did not fully land in the layout design doc or layout exploration. They are preserved here so they are not lost.

### React Native flexbox observations

Most of these are reflected in the current layout doc; they are restated here because the WIP voice was specific:

- `BASIS` is the same as `width` inside a Row; same as `height` inside a Col.
- `flexGrow`/`flexShrink` only apply to `width` inside a Row; only to `height` inside a Col.
- In RN, views hug content down to 0 by default. Two children with `flexGrow: 1/3` will only consume `2/3` of the parent.
- In a Row with non-0 height: a child fills parent height because `alignItems: 'stretch'` is the RN default.
- In a Row with 0 height: a child hugs and becomes its own content's height.
- In a Row with `alignItems: 'flex-start'`: a child hugs and becomes its own content's height.
- A Row child with `height: 50` is `50` regardless.
- In a wrapped Row: each line becomes its own "mini flex container on the main axis"; `alignContent` distributes space between/around lines.
- RN defaults differ from web:
  - `flexDirection: 'column'` (web is `row`).
  - `alignContent: 'flex-start'` (web is `stretch`).
  - `alignItems: 'stretch'` (matches web).
  - `flexShrink: 0` (web is `1`).
  - `flex` accepts only one number.

### Sizing concept names that did not win

- `claim_space N` / `claim_space N%` (basis-ish abstraction).
- `claim_ratio N` (flex-ish abstraction).
- `resize_ratio N` (flex-ish abstraction).
- `[fill hug]` positional tuple (rejected).
- `[100px 50% 20% 20px]` positional tuple (rejected).
- `width fill-parent` / `height hug-content` (longer than Figma `fill`/`hug`; not preferred).
- `[width HORZ, height VERT]` tuple ordering (not chosen).
- Should `resize` and `width/height` ever be allowed at the same time? (open).

### Property-name vocabulary that did not win

For child arrangement:

- `items ...` (familiar from `alignItems`, but does not naturally cover main-axis distribution).
- `align ...` (short, but hides the `justifyContent`/`alignItems` split).
- `content ...`, `layout ...`, `flow ...`, `distribute ...`, `gravity ...` (various synonyms explored).
- Compass / abbreviations: `[north west]`, `[nw]`, `[t, stretch]`, `[tr]` (rejected as less aligned with Figma/RN vocabulary).

For self alignment:

- `aligned right`, `aligned center`, `aligned bottom`, `stretched` (the adjective form survived for the bare cases; explicit `aligned ...` did not).
- Explicit `self center` / `self stretch` / `self start` / `self end` (kept as a deferred fallback if adjective words become insufficient).

For distribution:

- `spread-hug`, `spread-hug-tight` (mapped to `space-around`/`space-evenly`; expressive but wordy).
- Raw `space-between`, `space-around`, `space-evenly` (CSS-accurate but feels less Tao/Figma).
- `distributed` (vague; rejected).
- `[Row align top, distribute spread]` split (deferred fallback if bare values get ambiguous).

### Overflow, scroll, wrap, clipping

- `overflow` naming explored: `[clip hide]`, `[clip scroll]`, `[clip visible]`, plus the more direct `overflow hidden`.
- `scroll` should not be a casual layout word: RN scroll usually means a `ScrollView`, not just `overflow: 'scroll'`. Naming a layout word `scroll` risks hiding view choice behind a property.
- `wrap` is layout. `wrap reverse` is plausible. The default direction (wrap vs nowrap) is unsettled — RN defaults to `nowrap`.
- `[clip hidden]` may end up as `overflow: 'hidden'`, but the surface name is unsettled.

### Position, offset, layering, order

- `absolute`, `relative`, physical `top`/`right`/`bottom`/`left`, and `z N` are the surviving v1 candidates.
- `offset X Y` (e.g. `[offset 10 -5%]`) needs a clearer distinction from margin and transform; deferred.
- `[3d N]` was an early name for stacking; rejected unless a real 3D behavior shows up in RN.
- `[order N]` — change render order in layout flow; deferred (no current RN target).
- `[reverse]` — reverse content order; useful for flow direction but needs precise behavior.
- `position static` — RN/version caveats; deferred. Notes: offsets do not apply, and child elements skip this node for containing-block calculations.

### Display, contents, box layout

- `display none` / `hidden` — useful to hide without removing from the tree; later.
- `display flex` — explicit; later (RN's effective default is flex anyway).
- `display contents` — possibly useful for semantically named wrapper views (`Foo Bar { ... }` could project its layout through), but RN support and semantics need a dedicated decision; deferred.
- `box-layout content` / "box layout" — early sketch for choosing whether spacing/borders count from content edge, padding edge, or border edge (`box-sizing` analog). Default would be border. Surface name is open; deferred.

### Direction and localization

- `flow ltr` / `flow rtl` was the early surface for direction.
- Approach idea: try first to flip ALL physical properties under `flow rtl`; only mark explicit instances to ignore.
- Logical layout terms `start`/`end` will likely come in alongside RTL design rather than retrofitted onto `left`/`right`.
- Full localization story belongs to the [Internationalisation and Accessibility Project Plan](../../A11y%20I18N%20and%20L10N/Internationalisation%20and%20Accessibility%20Project%20Plan.md) track.

### Aspect ratio and measure functions

- `aspect_ratio N` — RN `aspectRatio`; useful, deferred until core size syntax is stable.
- Measure functions — too advanced for layout v1; preserved as a research note.

### React Native layout props not yet captured in Tao layout vocabulary

A pass over [React Native 0.81 Layout Props](https://reactnative.dev/docs/0.81/layout-props) surfaced these props that exist in RN but were not represented in the layout docs at the time of writing. The canonical per-key entries (with surface spellings, values, status, and examples) have since been added to the [Layout Key And Value Catalog](../UI%20Layout/UI%20Layout%20Design%20Doc.md#layout-key-and-value-catalog). The notes below preserve the rationale and the open questions so they are not lost as the catalog evolves.

#### `flex` (single-number shorthand)

- RN's `flex` is a number with RN-specific semantics, not the CSS shorthand:
  - `flex: positive N` is equivalent to `{ flexGrow: N, flexShrink: 1, flexBasis: 0 }`.
  - `flex: 0` makes the component sized strictly by `width`/`height`; inflexible.
  - `flex: -1` is normally sized by `width`/`height`, but shrinks to `minWidth`/`minHeight` when needed.
- Tao currently exposes `basis`, `grow`, and `shrink` separately and a deferred `fill N`/`hug`/`fixed N` Figma-style vocabulary.
- Open question: should there be a single Tao surface that maps to RN's `flex N` (e.g. `fill N`, or a dedicated `flex N`), and how should `flex 0` and `flex -1` be expressed (or rejected) when authors lean on the all-in-one form?

#### `boxSizing`

- RN now exposes `boxSizing: 'border-box' | 'content-box'`. `border-box` is the default. This is the actual prop the WIP's "box-layout" idea was reaching for.
- Defaulting to `border-box` matches the historical Yoga behavior, so most existing Tao examples already assume it.
- Tao should decide whether to expose `box_sizing border|content`, force `border-box`, or surface only an explicit "content edge" escape hatch when layout needs `content-box`.
- Status proposal: later, but flagged as a real prop rather than an exploration.

#### Per-side border widths as layout

- RN treats border widths as layout props because they affect geometry: `borderTopWidth`, `borderRightWidth`, `borderBottomWidth`, `borderLeftWidth`, `borderStartWidth`, `borderEndWidth`.
- The Tao layout doc currently lists only the uniform `border_width` and marks it deferred because most users think of border as visual styling.
- Per-side widths still belong to the layout lane in RN. Tao should at minimum:
  - Acknowledge per-side `border_top`/`border_right`/`border_bottom`/`border_left` as deferred layout, not styling.
  - Reserve `border_start`/`border_end` for the logical/RTL pass.
  - Decide whether `border_color`/`border_style` (style props that often co-travel with width) live with the layout `border *` words or only in styling.

#### `inset` family (New Architecture)

RN's New Architecture exposes CSS-Logical inset shorthands. None are captured in the current Tao position/offset vocabulary:

- `inset N` — same effect as setting all of `top`, `right`, `bottom`, `left`.
- `insetBlock N` — equivalent to `top` + `bottom`.
- `insetBlockStart N` — equivalent to `top`.
- `insetBlockEnd N` — equivalent to `bottom`.
- `insetInline N` — equivalent to `right` + `left`.
- `insetInlineStart N` — `left` in ltr, `right` in rtl.
- `insetInlineEnd N` — `right` in ltr, `left` in rtl.

Notes:

- These ride the New Architecture availability story, so Tao should make the dependency explicit rather than silently emitting them.
- Tao's `top`/`right`/`bottom`/`left` cover the per-edge cases. The shorthand and logical surfaces are real asks for absolute/relative positioning ergonomics.

#### `isolation` (New Architecture)

- RN's New Architecture ships `isolation: 'auto' | 'isolate'`, which forms a [stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context) without touching `zIndex` or `position`.
- This belongs to the same lane as `z` (zIndex). Without it, sibling stacking contexts are tied to `position` and `transform`, and authors have no clean way to scope layering.
- Tao should either expose `stacking auto|isolate` (or `layer isolate`) or document that isolation is implied by Tao's stacking model.
- Status proposal: later, alongside any rework of `z`/zIndex semantics.

#### CSS-Logical margin and padding shorthands

RN exposes the full CSS-Logical surface. The Tao layout doc lists only `margin_start`/`margin_end` and `pad_start`/`pad_end`. The broader logical shorthand family is not yet captured:

- Margin: `marginBlock`, `marginBlockStart`, `marginBlockEnd`, `marginInline`, `marginInlineStart`, `marginInlineEnd`.
- Padding: `paddingBlock`, `paddingBlockStart`, `paddingBlockEnd`, `paddingInline`, `paddingInlineStart`, `paddingInlineEnd`.

Notes:

- `*Block` is vertical (top/bottom in horizontal writing modes); `*Inline` is horizontal (left/right in ltr).
- `*Block`/`*Inline` are RTL-aware shorthands that complement the per-side `start`/`end` props Tao already plans to defer.
- Tao does not need to mirror every CSS-Logical name, but the design pass for RTL/I18N should pick a consistent vocabulary and either expose the shorthand axes or explicitly justify dropping them.

#### Default differences worth re-stating in Tao terms

RN defaults that Tao codegen and validation should be conscious of (already noted elsewhere, restated here for the layout-prop audit):

- `flexDirection` defaults to `column` (web defaults to `row`).
- `alignContent` defaults to `flex-start` (web defaults to `stretch`; Yoga-on-web also defaults to `stretch`).
- `alignItems` defaults to `stretch` (matches web).
- `flexShrink` defaults to `0` (web defaults to `1`).
- `flex` accepts a single number (web accepts a CSS shorthand string).
- `boxSizing` defaults to `border-box` (web's CSS default is `content-box`).

### Empty view and defaults problem (cross-link with depth)

The preserved empty-view problem statement and option set are summarized here. Specific WIP options worth preserving:

- Force `flexGrow > 0` by default so empty containers stay visible.
- Special-case empty elements with a `min_width`/`min_height`.
- Provide two compile modes:
  - **production**: empty elements may collapse, matching RN behavior.
  - **layout development**: empty elements get `grow 1` or a min size to stay visible.
- Require container elements like `Row` and `Col` to have content, surfacing emptiness as a parse/validation error.
- Mirror Figma: every node carries width/height even when hugging; truly empty views must be marked invisible explicitly.
- Question: should a fully empty Row/Col ever be visible by default?

## Design System References

Preserved Figma references from the WIP for design-system inspiration. They describe how a mature design-system pipeline organizes tokens, variables, and platform coherence.

- [Figma — How to streamline your design system workflow in Figma](https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/?fuid=154734308415698449) — examples of tools and how to create a theme/design system.
- [Figma — How to streamline your design system workflow in Figma (variables organization variant)](https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/?fuid=1547343084156984494) — examples of organizing design variables.
- [Figma — Creating coherence: how Spotify's design system goes beyond platforms](https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/) — opinionated cross-platform defaults.
- [Figma — Introducing Code Connect](https://www.figma.com/blog/introducing-code-connect/) — connecting code and design.
- [Figma — Introducing Dev Mode](https://www.figma.com/blog/introducing-dev-mode/) — Figma's Dev Mode VSCode IDE integration for developers.
- Color naming reference image: `https://cdn.sanity.io/images/599r6htc/regionalized/de5dbc54da1eef0d1e9a70ac7627a182c8c5a472-1608x904.png?w=804&q=75&fit=max&auto=format&dpr=2`.
- Spacing reference image: `https://cdn.sanity.io/images/599r6htc/regionalized/e2d76c2d1807bd0d28eb77159d21946bd8cf5d3a-1876x1916.png?w=804&q=75&fit=max&auto=format&dpr=2`.

## React Native Style Surface (Sources)

Targets and surface coverage should be checked against:

- [React Native 0.81 Style](https://reactnative.dev/docs/0.81/style)
- [React Native 0.81 StyleSheet](https://reactnative.dev/docs/0.81/stylesheet)
- [React Native 0.81 View Style Props](https://reactnative.dev/docs/0.81/view-style-props)
- [React Native 0.81 Text Style Props](https://reactnative.dev/docs/0.81/text-style-props)
- [React Native 0.81 Layout Props](https://reactnative.dev/docs/0.81/layout-props)
- [React Native 0.81 Flexbox](https://reactnative.dev/docs/0.81/flexbox)
- [React Native Layout Props — `aspectRatio` / `measure()` reference](https://reactnative.dev/docs/layout-props#aspectratio)

## Open Questions

These are the styling/theme questions still on the table. The first six are the open questions from the styling design doc; the rest came out of the WIP archive.

- Is `( ... )` definitely the styling delimiter, or does style need a named keyword?
- How do style references compose with inline overrides?
- Which values are typed theme tokens versus raw literals?
- How do variants compose with style values?
- How does styling interact with interaction states such as pressed, focused, hovered, and disabled?
- How much style output should be hoisted with `StyleSheet.create` versus resolved at runtime?
- What is the canonical color hierarchy: palette → scheme → application name → variable, or something flatter?
- How do app-wide and library-wide default themes coexist without one silently overriding the other?
- How does Tao reconcile Figma-style nested variable definitions with code-side semantic tokens?
- Are spacing tokens shared with layout (`gap`, `pad`, `margin`) under the same name, or do styling and layout have separate token spaces?
- How are platform-specific style props (Android `elevation`, iOS shadow primitives, iOS `writingDirection`) surfaced in Tao without leaking platform names into every app?
- How are unsupported style surfaces (e.g. backdrop blur, gradients, masks) named so apps can discover the gap and pick a runtime helper?
- Should "beautiful by default" ship a single curated theme, or generate one from a small palette/font seed per app?

## How To Use This Doc

- Treat this as the readable alternatives + theme/style backlog summary.
- Keep the raw [UI Layout and Styling Raw Notes](../../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md) for full historical context and verbatim notes.
- The current authoritative styling direction is [UI Styling Design Doc](./UI%20Styling%20Design%20Doc.md); the implementation order across both lanes is in the [Layout and Styling Project Plan](../Layout%20and%20Styling%20Project%20Plan.md).
- Do not treat anything here as implementation permission; styling waits on theme/value work.
