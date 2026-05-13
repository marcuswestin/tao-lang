# UI Layout Syntax Exploration

This is the compressed version of the raw [Design WIP - UI Layout and Styling](../Design%20WIP/UI%20Layout%20and%20Styling.md) archive. It preserves the main explored approaches, including ideas that are not chosen for the current preferred layout design.

Use this document when deciding whether to revisit syntax. The single canonical per-key reference for every layout concept (every canonical key, every surface spelling, every value, with examples per category) lives in the [Layout Key And Value Catalog](./UI%20Layout%20Design%20Doc.md#layout-key-and-value-catalog) inside [UI Layout Design Doc](./UI%20Layout%20Design%20Doc.md). New spellings should be added there, not here. The styling, theming, color, spacing, and design-system counterpart is [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md).

## Current Preferred Direction

The current preferred v1 is deliberately narrow:

- `[ ... ]` is layout only.
- Values are raw layout words and numbers, not theme tokens.
- Styling, themes, transforms, animation, interaction, and accessibility are deferred.
- One layout clause is allowed per render statement.
- Generated code passes structured Tao layout data to a runtime helper, which maps to React Native Flexbox.

Example:

```tao
Col [top left, gap 12, pad 16] {
  Row [center spread, gap 8] {
    Text "Open"
    Button "Save", Save [centered]
  }
}
```

## Delimiter Approaches

### One Bracket Lane

Use `[ ... ]` for all layout values:

```tao
Row [top left, gap 10]
Text "Title" [centered]
```

Pros:

- Fast to type.
- Syntactically distinct from ordinary Tao arguments.
- Easy v1 grammar and formatter target.

Cons:

- Needs vocabulary discipline so self layout and child layout do not blur.
- Cannot also carry styling without becoming ambiguous.

Current status: chosen for layout v1.

### Separate Self And Children Lanes

Use different delimiters for self and children:

```tao
View [centered] {
  <top left, gap 12>
}
```

Pros:

- Very explicit target: self versus children.
- Could make validation simpler for some cases.

Cons:

- More syntax to type.
- Forces users to move between render line and block header.
- `< ... >` has also been considered for styling, so this creates delimiter contention.

Current status: deferred. The same distinction is now mostly handled by word morphology: `centered/stretched/packed` for self; `center/stretch/pack/spread` for children.

### Mixed Layout And Style Delimiters

Earlier sketches used both `[ ... ]` and `< ... >`:

```tao
row [stretch, spread, gap 10] <pad 40, aligned left stretched, fill>
col <width fill-parent, height 40px>
```

Pros:

- Tried to keep layout and style visually separate.
- Made room for inline visual tweaks.

Cons:

- Mixed layout and styling too early.
- `< ... >` was not stable: sometimes layout, sometimes styles.
- Too much surface before layout semantics were settled.

Current status: not chosen for layout v1. Styling has a separate design doc.

### Layout Inside The Body

Put child layout at the top of a view body:

```tao
Col [fill] {
  <left, pack top, gap 12>

  Text "Title"
}
```

Pros:

- Child layout appears near children.
- Leaves render-line layout for the rendered root itself.

Cons:

- Adds a new top-level body statement form.
- User later decided top-level layout statements should not be allowed for v1.

Current status: not chosen for v1.

## Child Layout Vocabulary

### `items`

Examples:

```tao
Col [items top left]
Row [items bottom right]
Row [items spread top]
```

Pros:

- Clear that it targets children.
- Familiar from `alignItems`.

Cons:

- Does not naturally cover main-axis distribution.
- `items spread left` can become hard to reason about by axis.

Current status: not chosen, but useful historical vocabulary.

### `align`

Examples:

```tao
Row [align top left]
Row [align center]
Col [align top spread]
```

Pros:

- Short.
- Natural for visual designers.
- Works well with two-axis vocabulary.

Cons:

- Some combinations are axis conflicts.
- `align` hides that React Native splits the work between `justifyContent` and `alignItems`.

Current status: partially absorbed by the preferred bare alignment values.

### Bare Positions

Examples:

```tao
Row [top left]
Row [center]
Col [right spread]
```

Pros:

- Fastest syntax.
- Most readable once axis rules are known.

Cons:

- Requires the compiler to know the container direction.
- Some combinations need clear diagnostics.

Current status: preferred for common alignment when the container direction is known.

### Split `align` And `distribute`

Examples:

```tao
Row [align top, distribute spread]
Row [align top, distribute around]
```

Pros:

- Maps more explicitly to cross-axis alignment and main-axis distribution.
- Reduces accidental contradictions.

Cons:

- More verbose.
- Less Figma-like.

Current status: not chosen for v1, but remains a fallback if bare values become too ambiguous.

### Compass And Abbreviations

Examples:

```tao
Row [north west]
Row [nw]
Row [t, stretch]
```

Pros:

- Very compact.

Cons:

- Less aligned with Figma and React Native vocabulary.
- Abbreviations are harder to read and harder for new users.

Current status: not chosen.

## Distribution Values

Explored names:

- `spread`
- `spread-hug`
- `spread-hug-tight`
- `space-between`
- `space-around`
- `space-evenly`
- `distributed`

Current preferred compression:

- `spread` maps to `space-between`.
- `around` maps to `space-around`.
- `evenly` maps to `space-evenly`.

Rejected/deferred:

- `spread-hug` and `spread-hug-tight` are expressive but wordy and less standard.
- Raw `space-*` names are accurate but feel more like CSS than Tao/Figma.

## Self Layout Vocabulary

Explored:

```tao
View [aligned right]
Row [aligned center]
View [stretched]
```

Later discussion preferred adjective self words:

```tao
Text "Title" [centered]
View [stretched]
Text "Label" [packed]
```

Reasoning:

- `centered/stretched/packed` read as states of the rendered node itself.
- `center/stretch/pack/spread` read as instructions for arranging children.
- This avoids needing a separate `self` keyword for common cases.

Current status: adjective self words are preferred.

## Axis Rules And Invalid Combinations

The raw notes repeatedly identified axis-sensitive validation as necessary.

Examples:

```tao
Col [items baseline left]      // invalid or warning: baseline is only useful in row-like text alignment
Row [items spread left]        // conflict: spread overwrites horizontal left
Row [items stretch top]        // conflict: stretch overwrites vertical top
Col [items stretch bottom]     // conflict: stretch overwrites horizontal/vertical expectation depending on axis model
Col [items spread right]       // conflict: spread in the wrong axis
```

Compressed current rule:

- Main-axis position conflicts with main-axis distribution.
- Cross-axis position conflicts with cross-axis stretch.
- `baseline` should be row-only unless a concrete React Native vertical text use case is proven.
- Validation should be strict once the axis is known.

## Size Vocabulary

### Property-Headed Size

Examples:

```tao
Col [width 320, height 44]
Col [min_width 120, max_width 320]
```

Pros:

- Clear.
- Direct React Native mapping.
- Good v1 target.

Current status: preferred exact spelling for v1.

### Figma-Inspired Size

Examples:

```tao
View [hug]
View [fill]
View [fixed 120]
```

Pros:

- Matches designer vocabulary.
- Compact.

Cons:

- Axis can be unclear unless parent/container context is known.
- React Native empty views can collapse to zero, so `hug` needs careful explanation.

Current status: desired, but should be added only when validation can explain the affected axis.

### `fill-parent` And `hug-content`

Examples:

```tao
Col [width fill-parent, height 40px]
```

Pros:

- Explicit.

Cons:

- Longer than Figma's `fill`/`hug`.
- Mixes CSS-ish unit spelling with Tao vocabulary.

Current status: not preferred. Preserve as prior naming.

### Positional Size Tuple

Examples:

```tao
row [fill hug]
row [100px 50% 20% 20px]
```

Pros:

- Extremely compact.

Cons:

- Hard to read.
- Meaning changes by position.
- Easy to confuse basis, grow, shrink, width, and height.

Current status: rejected.

### Basis/Grow/Shrink Model

Observations preserved from the WIP:

- Basis acts like width inside a row.
- Basis acts like height inside a column.
- Grow/shrink act on the parent main axis.
- React Native `flex` accepts a single number and differs from web CSS.

Possible vocabulary:

```tao
View [basis 120, grow 1, shrink 1]
View [claim_space 50]
View [claim_ratio 2]
View [resize_ratio 1]
```

Current status:

- `basis`, `grow`, and `shrink` are plausible v1 exact props.
- `claim_space`, `claim_ratio`, and `resize_ratio` are deferred naming explorations.

## Spacing, Padding, Margin, And Border Width

Explored compact forms:

```tao
Box [gap 10]
Box [gap 8 12]
Box [pad 16]
Box [pad top right bottom left]
Box [pad vertical horizontal]
Box [border 4]
Box [border 6, 10]
```

Current compression:

- `gap 12` is in layout.
- `pad 16`, `pad horizontal 16`, `pad vertical 16`, and side-specific `pad top 8` are preferred.
- `margin` is layout because it affects outside geometry.
- Visual border color/radius belong to styling.
- Border width is ambiguous: it affects geometry, but users usually think of border as visual styling. Defer until styling boundary is settled.

## Overflow, Scroll, Wrap, And Clipping

Explored:

```tao
Box [clip hide]
Box [clip scroll]
Row [wrap]
Row [wrap reverse]
```

Current status:

- `wrap` is layout.
- `reverse` is plausible layout.
- `clip hidden` may map to `overflow: 'hidden'`, but naming is unsettled.
- `scroll` should not be a casual layout word because React Native scroll behavior generally requires a `ScrollView` or runtime view decision.

## Position, Offset, Layering, And Order

Explored:

```tao
Box [absolute]
Box [offset 10 -5%]
Box [top 8, right 8]
Box [3d 2]
Box [z 2]
Box [order 3]
Box [reverse]
```

Current status:

- `absolute`, `relative`, physical offsets, and `z` are plausible layout values.
- `offset` needs clearer distinction from margin and transform.
- `order` is deferred.
- `reverse` is useful for flow direction but needs precise behavior.
- Any 3D-ish naming should be avoided unless it maps to a concrete React Native stacking behavior.

## Direction, Localization, And Logical Layout

Explored:

```tao
Box [flow ltr]
Box [flow rtl]
```

Current status:

- Physical `left`/`right` is acceptable for raw layout v1 examples.
- Full RTL/logical direction support needs the accessibility, internationalization, localization, and adaptation design track.
- Future syntax may need `start`/`end` in addition to `left`/`right`.

## Advanced React Native Layout Surface

Deferred but preserved:

- `aspectRatio`
- `display: contents`
- `position: static`
- measure functions
- `boxSizing`
- writing direction
- text layout props such as line height, number of lines, and text alignment

Current status:

- `aspectRatio` is likely useful after core size syntax stabilizes.
- `display: contents` may help with semantically named wrappers, but needs React Native support verification.
- `position: static` and measure functions are too advanced for layout v1.
- Text layout should probably live in styling or text-specific syntax, not generic layout.

## Empty View And Defaults Problem

Important observations from the raw notes:

- React Native empty views can disappear without width, height, or flex.
- React Native defaults differ from web:
  - `flexDirection` defaults to `column`.
  - `alignContent` defaults to `flex-start`.
  - `alignItems` defaults to `stretch`.
  - `flexShrink` defaults to `0`.
- Figma frames usually have visible dimensions even when hugging empty content.

Possible Tao responses:

- Require empty containers to be validation errors.
- Add debug layout defaults or dev-only min sizes.
- Let empty containers collapse in production.
- Provide tasteful defaults per app or per UI theme later.

Current status: deferred. Do not solve this in raw layout v1.

## Styling And Theme Ideas Preserved From The Layout Archive

The WIP file also contains styling and theme material that should not be lost:

- Theme tokens for colors, spacing, radius, fonts, and dimensions.
- Figma-like variable modes for light/dark/platform/size classes.
- Color scale naming such as `blue 700` plus semantic aliases like `icon brand pressed`.
- Spacing/radius scales such as `0`, `4`, `8`, `16`, `24`, `32`, `40`, plus `radius-small`, `radius-medium`, `radius-large`, `radius-full`.
- A future styling spec needs element styling props, text styling props, theme syntax, and theme application syntax.

Current status: moved out of layout v1. Styling and theme syntax should be designed in the styling track.

## Consolidated Decision Matrix

| Area              | Preferred now                                | Preserved alternatives                                        |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Layout delimiter  | `[ ... ]`                                    | `< ... >`, body-top child layout                              |
| Styling delimiter | deferred                                     | `< ... >`, `( ... )`, named `style`                           |
| Child arrangement | bare `top left`, `center spread`, `gap 12`   | `items`, `align`, `content`, `distribute`, compass values     |
| Self layout       | `centered`, `stretched`, `packed`            | `aligned center`, explicit `self`                             |
| Distribution      | `spread`, `around`, `evenly`                 | `spread-hug`, `spread-hug-tight`, raw `space-*`               |
| Size              | `width`, `height`, `basis`, `grow`, `shrink` | `fill-parent`, `hug-content`, positional tuples, `claim_*`    |
| Spacing           | `gap`, `pad`, `margin`                       | shared border/pad/margin tuple syntax                         |
| Scroll            | deferred                                     | `[clip scroll]`                                               |
| RTL/logical       | deferred                                     | `flow ltr/rtl`, future `start/end`                            |
| Defaults          | defer to RN/Tao runtime for v1               | dev-visible empty containers, validation for empty containers |

## How To Use This Doc

- Keep this file as the readable alternatives summary.
- Keep the raw WIP archive for full context and verbatim historical notes.
- Do not treat alternatives here as implementation permission; the preferred design doc remains the implementation source of truth.
