# UI Layout Vocabulary Exploration

This document captures all vocabulary and wording decisions for Tao layout syntax: the morphology system, word choices, naming rationale, rejected alternatives, shorthand conventions, and axis resolution rules. It is an organized extraction of the wording-relevant material from [UI Layout Design Doc](./UI%20Layout%20Design%20Doc.md).

For the canonical per-key reference (every key, spelling, value, RN target), see the [Layout Key And Value Catalog](./UI%20Layout%20Design%20Doc.md#layout-key-and-value-catalog). For syntax-shape alternatives (delimiter approaches, bracket lanes), see [UI Layout Syntax Exploration](./UI%20Layout%20Syntax%20Exploration.md). For styling, see [UI Styling and Theme Syntax Exploration](./UI%20Styling%20Syntax%20Exploration.md). The raw archive is [Design WIP - UI Layout and Styling](../Design%20WIP/UI%20Layout%20and%20Styling.md).

## Word Casing

- Lowercase words are layout values or layout property names.
- Uppercase names remain Tao references and variables.

```tao
Col [top left, gap 12] {    // lowercase: layout values
  Text "Name"                // uppercase: Tao references
}
```

## Figma-Adjacent Vocabulary

Prefer Figma/design vocabulary when it maps cleanly to React Native. The layout language should feel intuitive to visual designers, not like raw CSS.

Preferred words: `row`, `column`, `gap`, `pad`, `hug`, `fill`, `fixed`, `wrap`, `absolute`.

## Property Heads For Numeric Values

Short lowercase property names precede numeric values:

```tao
gap 12
pad 16
width 320
height 44
basis 120
grow 1
margin 8
z 2
```

## Adjective vs Verb Distinction

The core readability split:

- **Verb/base forms** describe how a container arranges its children: `center`, `stretch`, `pack`, `spread`.
- **Adjective/participle forms** describe a node's own position in its parent: `centered`, `stretched`, `packed`.

```tao
Row [center spread] {        // verbs: instructions to children
  Text "Label" [centered]    // adjective: self-description
}
```

---

## Morphology System

The reason `centered` vs `center` works is not that we picked nice words. The layout vocabulary carries role information in its parts of speech. The morphology rule makes the existing pattern visible and guides all future vocabulary additions.

Every layout word falls into one of three groups. Each group implies its target (self or children) without any syntactic mark, prefix, or second bracket.

### Property-Headed Nouns

No ambiguity, no morphology needed. The split follows "inside the box" vs "outside the box."

**Inward (about my interior, container arranging children):**

- `gap`
- `pad`, `pad top`, `pad horizontal`, etc.
- `direction` (`row`, `column`)
- `wrap`, `nowrap`
- `lines pack`, `lines center`, etc. (`alignContent`)

**Outward (about my place in my parent and my own dimensions, self):**

- `width`, `height`, `min_width`, `max_width`, `min_height`, `max_height`
- `basis`, `grow`, `shrink`, `flex`
- `aspect_ratio`
- `margin`, `margin top`, `margin horizontal`, etc.
- `position` (`absolute`, `relative`)
- `top N`, `right N`, `bottom N`, `left N` (offsets)
- `inset`, `inset block`, `inset inline`, etc.
- `z`, `isolation`, `box_sizing`

### Locatives

`top`, `bottom`, `left`, `right`, `baseline` as bare alignment words (not offset property heads like `top 8`) always address children. They read as imperatives: "go to the top."

A self alignment can never be `top` because self alignment works across the flow and uses adjectives. No author would write "this Text is top" in English; they would write "this Text is at the top" or "this Text is centered." The word class itself rules out the self meaning.

### Alignment Overlap Words

`center`, `stretch`, and `pack` are the only concepts where the same idea genuinely applies to both roles. The resolution:

| Children (container directive) | Self (node describing itself) | Meaning                       |
| ------------------------------ | ----------------------------- | ----------------------------- |
| `center`                       | `centered`                    | center across the flow        |
| `stretch`                      | `stretched`                   | stretch across the flow       |
| `pack`                         | `packed`                      | pack to the start across flow |

Bare verb = imperative to children ("center yourselves"). `-ed` participle = self stative ("I am centered").

Distribution words (`spread`, `around`, `evenly`) do not need `-ed` forms because a single child is never "spread" -- distribution only makes sense as a container directive to multiple children.

### Where `pack` Came From

The original brainstorm never used `pack` as a syntax keyword. Directional words (`left`/`top` for start, `right`/`bottom` for end) were the only explored vocabulary for `flex-start`. `pack` was introduced during consolidation because a direction-agnostic word for "push items to the main-axis start" was needed to complete the morphology table.

The word derives from the brainstorm's own descriptive language ("rows of wrapped items _pack_ to the top or left of container"). `start` was rejected because it conflicts with logical positioning offsets (`start 8`) and RTL semantics. `pack` reads naturally as both a container imperative ("pack the children together") and a self adjective ("this item is packed to the start").

There is no corresponding "end-pack" word because directional words (`right`/`bottom`) already cover the end case, and the concept of "packing to the end" is less common in practice.

### Rules For Adding New Vocabulary

- New self vocabulary must be an adjective or participle. Never introduce a bare imperative for self layout.
- New children vocabulary must be a verb, locative, or inward-property head. Never introduce an adjective for children arrangement.
- Property-headed values follow inside/outside semantics. If the property describes the node's interior, it is a container word. If it describes the node's outward shape or placement, it is a self word.
- Never introduce the inverse form. No children-arrangement adjectives (`centeredly`), no self-state imperatives (`widen`). The principle is stronger when the inverse is illegal by construction.

---

## Children Arrangement Words

### Bare Positional Words

Axis-aware words that place children at a side. Validation must know the container direction.

| Word     | In `Row`                       | In `Col`                       |
| -------- | ------------------------------ | ------------------------------ |
| `left`   | `justifyContent: 'flex-start'` | `alignItems: 'flex-start'`     |
| `right`  | `justifyContent: 'flex-end'`   | `alignItems: 'flex-end'`       |
| `top`    | `alignItems: 'flex-start'`     | `justifyContent: 'flex-start'` |
| `bottom` | `alignItems: 'flex-end'`       | `justifyContent: 'flex-end'`   |

```tao
Row [top left]
Col [top left]
Row [bottom right, gap 8]
```

### Distribution Words

Main-axis distribution (always `justifyContent`):

| Word     | RN target                         |
| -------- | --------------------------------- |
| `spread` | `justifyContent: 'space-between'` |
| `around` | `justifyContent: 'space-around'`  |
| `evenly` | `justifyContent: 'space-evenly'`  |

```tao
Row [center spread, gap 12]
Col [left spread]
```

**Rejected alternatives:** `spread-hug`, `spread-hug-tight` (expressive but wordy), raw `space-*` names (too CSS-like), `distributed`.

### Center, Stretch, Pack (Children Form)

| Word      | Effect                               | RN target                                  |
| --------- | ------------------------------------ | ------------------------------------------ |
| `center`  | center on both or the remaining axis | `justifyContent` or `alignItems: 'center'` |
| `stretch` | stretch children across the flow     | `alignItems: 'stretch'`                    |
| `pack`    | push children to main-axis start     | `justifyContent: 'flex-start'`             |

`center` behavior: when alone, centers both axes; when paired with another word, centers the axis the other word did not take.

```tao
Row [center]               // center both axes
Row [center spread]        // center cross-axis, spread main-axis
Row [stretch spread]       // stretch cross-axis, spread main-axis
```

### Baseline

`baseline` maps to `alignItems: 'baseline'`. Row-only unless a React Native vertical text use case is proven.

### Rejected Children Vocabulary

**`items` head:**

```tao
Col [items top left]       // not chosen: explicit target word
Row [items spread top]     // does not naturally cover main-axis distribution
```

**`align` head:**

```tao
Row [align top left]       // not chosen: partially absorbed by bare values
Row [align center]         // hides justifyContent vs alignItems split
```

**Split `align` and `distribute`:**

```tao
Row [align top, distribute spread]    // not chosen: verbose, less Figma-like
```

Remains a fallback if bare values become too ambiguous.

**Compass and abbreviations:**

```tao
Row [north west]    // not chosen: less aligned with Figma/RN vocabulary
Row [nw]            // not chosen: abbreviations harder to read
Row [t, stretch]    // not chosen: single-letter compass
```

### Line Alignment (Wrapped Containers)

For multi-line containers with wrapping, `alignContent` is addressed via `lines` prefix:

```tao
Row [wrap, lines pack]       // alignContent: flex-start
Row [wrap, lines center]     // alignContent: center
Row [wrap, lines stretch]    // alignContent: stretch
Row [wrap, lines spread]     // alignContent: space-between
Row [wrap, lines around]     // alignContent: space-around
Row [wrap, lines evenly]     // alignContent: space-evenly
```

Status: later. `alignContent` only matters when wrapping creates multiple lines.

---

## Self Alignment Words

### Preferred: Adjective Forms

| Word        | Meaning                   | RN target                 |
| ----------- | ------------------------- | ------------------------- |
| `centered`  | center across the flow    | `alignSelf: 'center'`     |
| `stretched` | stretch across the flow   | `alignSelf: 'stretch'`    |
| `packed`    | pack to start across flow | `alignSelf: 'flex-start'` |

```tao
Text "Title" [centered]
Text "Label" [packed]
View [stretched]
Button "Save", Save [centered, width 120, height 44]
```

### Rejected: `aligned X`

```tao
View [aligned right]        // not chosen: explicit aligned-X form
View [aligned center]
```

### Deferred: `self X`

```tao
View [self center]          // deferred: explicit self fallback
View [self stretch]         // could supplement if adjective words prove insufficient
```

---

## Flow And Wrapping Words

### Direction

`row` and `column`. Usually implicit from `Row`/`Col` view names; can be explicit:

```tao
Row [row, gap 8]        // explicit (redundant with Row)
Col [column, gap 8]     // explicit (redundant with Col)
```

### Wrapping

| Word           | RN target                                 | Status |
| -------------- | ----------------------------------------- | ------ |
| `wrap`         | `flexWrap: 'wrap'`                        | v1     |
| `nowrap`       | `flexWrap: 'nowrap'`                      | v1     |
| `wrap reverse` | `flexWrap: 'wrap-reverse'` (if validated) | later  |

**Tao default: `wrap`.** CSS and RN default to `nowrap`. Tao changes this because content should stay visible by default (core tenet). Reasons CSS/RN chose `nowrap`:

1. Predictable layout shape (Row is always one line).
2. No sudden layout shifts when dynamic content grows.
3. Performance (wrapping requires additional measurement passes).
4. Application vs document mindset (flexbox designed for fixed-structure layouts).

Tao accepts the tradeoff: layout may shift when content grows, but content is always visible. For containers where wrapping must not happen, write `nowrap` explicitly.

### Reverse

`reverse` flips the main-axis direction. Requires an established direction (explicit `row`/`column`, or a `Row`/`Col` container).

```tao
Row [reverse]       // later: row-reverse
```

### Text vs Flex Wrapping

`Text` wraps its text content by default (multiline). `TextLine` does not (single line, truncates). This is separate from flex wrapping: `flexWrap` controls child element reflow; text wrapping controls text content reflow within its own bounds.

---

## Spacing Words

### Gap

Between-child spacing on the main axis.

```tao
Row [gap 12]          // both: 12
Row [gap 8 12]        // later: row gap 8, column gap 12
Row [row_gap 12]
Row [column_gap 8]
```

Gap shorthand follows vertical-then-horizontal: 1 value sets both; 2 values set vertical then horizontal.

### Pad

Inside spacing (affects the child layout area). Belongs in layout v1 because it's a container interior property.

**Shorthand (clockwise CSS convention):**

```tao
Box [pad 16]              // all sides: 16
Box [pad 12 16]           // vertical 12, horizontal 16
Box [pad 8 16 12]         // later: top 8, horizontal 16, bottom 12
Box [pad 8 16 12 20]      // later: top 8, right 16, bottom 12, left 20
```

**Named-side forms:**

```tao
Box [pad horizontal 16]
Box [pad vertical 16]
Box [pad top 8]
Box [pad right 12]
Box [pad bottom 8]
Box [pad left 12]
```

**Logical/RTL forms (later):** `pad start 8`, `pad end 8`, `pad block 16`, `pad inline 16`, `pad block start 8`, `pad inline start 8`.

### Margin

Outside spacing (affects the node's relationship to siblings). Belongs in layout because it affects geometry flow.

Same shorthand convention as `pad`. Margin supports negative values (React Native allows negative margin).

```tao
View [margin 8]
View [margin 4 8]             // vertical 4, horizontal 8
View [margin horizontal 8]
View [margin top 8, margin bottom 12]
```

**Logical/RTL forms (later):** `margin start 8`, `margin end 8`, `margin block 8`, `margin inline 8`, etc.

### Border Width (Deferred)

Border width affects geometry but users usually think of border as visual styling. Deferred until the styling boundary is settled.

```tao
View [border 4]                  // deferred: uniform border width
View [border top 1, border bottom 2]   // deferred: per-side
```

### Margin vs Offset

`margin` belongs in layout because it affects outside geometry and pushes siblings. `offset` belongs in styling because it displaces a view visually without affecting the layout of siblings, similar to a transform translation.

---

## Size Words

### Property-Headed (v1)

Direct, clear, good React Native mapping:

```tao
View [width 320, height 44]
View [min_width 120, max_width 320]
View [min_height 44, max_height 240]
```

### Flex Properties (v1)

`basis`, `grow`, and `shrink` are main-axis properties. Their effective dimension depends on the parent:

- In a `Row` parent: `basis` acts as initial `width`; `grow`/`shrink` act on width.
- In a `Col` parent: `basis` acts as initial `height`; `grow`/`shrink` act on height.

```tao
View [basis 120]
View [grow 1]
View [shrink 1]
View [basis 120, grow 1, shrink 1]
```

Validation should warn when `basis` and the equivalent axis size (`width` in Row, `height` in Col) are both set, as they compete for the same initial dimension.

### RN `flex` Shorthand (Later)

React Native `flex N` = `{ flexGrow: N, flexShrink: 1, flexBasis: 0 }`. Different from web CSS:

```tao
View [flex 1]       // later: standard flex shorthand
View [flex 0]       // later: inflexible, sized by width/height
View [flex -1]      // deferred: shrink-to-min sentinel
```

### Figma-Inspired Size Modes (Later)

Desired vocabulary, but should only ship when validation can explain the affected axis:

| Word         | Meaning                                |
| ------------ | -------------------------------------- |
| `hug`        | size to content (no explicit size)     |
| `fill`       | grow to fill parent; `fill 2` weighted |
| `fixed 120`  | fixed dimension on the relevant axis   |
| `percent 50` | percentage on the relevant axis        |

```tao
View [hug]
View [fill]
View [fill 2]
View [fixed 120]
View [percent 50]
```

### Rejected Size Vocabulary

**`fill-parent` and `hug-content`:** Verbose Figma naming, mixes CSS-ish unit spelling with Tao vocabulary.

```tao
Col [width fill-parent, height 40px]    // not chosen
```

**Positional size tuple:** Hard to read, meaning changes by position, easy to confuse basis/grow/shrink/width/height.

```tao
row [fill hug]                   // rejected
row [100px 50% 20% 20px]        // rejected
```

**`claim_space`, `claim_ratio`, `resize_ratio`:** Deferred naming explorations.

### Other Size-Adjacent

- `aspect_ratio 1.777` -- useful and supported, but deferred until core size vocabulary is stable (later).
- `box_sizing border` / `box_sizing content` -- explicit border-box or content-box (later).

---

## Position And Layering Words

### Position Modes

| Word       | RN target              | Status   |
| ---------- | ---------------------- | -------- |
| `relative` | `position: 'relative'` | v1       |
| `absolute` | `position: 'absolute'` | v1       |
| `static`   | `position: 'static'`   | deferred |

### Physical Offsets

Used with `absolute` or `relative`. Rejected without a position mode (offsets without one have no effect in RN).

```tao
View [absolute, top 8, right 8]
View [absolute, top 8, right 8, bottom 8, left 8]
Box [absolute, top 8, right 8, width 40, height 40]
```

### Logical Offsets (Later)

`start 8`, `end 8` for RTL-aware positioning. Designed with accessibility/localization, not patched onto physical `left`/`right`.

### Inset Shorthand (Later)

Sets all four edges at once. Requires RN New Architecture:

```tao
View [absolute, inset 8]                   // all four edges
View [absolute, inset block 8]             // top + bottom
View [absolute, inset inline 8]            // left + right
View [absolute, inset inline start 8]      // RTL-aware single edge
```

### Z-Index

```tao
View [z 2]       // zIndex: 2
```

### Stacking Context (Later)

```tao
View [stacking isolate]    // forms a stacking context (RN New Architecture)
```

### Rejected Layering Words

- `3d 2` -- historical name; avoid unless real 3D exists.
- `order 3` -- not a current React Native target, deferred.
- `offset 10 -5%` -- visual displacement without layout effect; belongs in styling, not layout.

---

## Overflow, Display, And Direction Words

### Overflow / Clip

Two spellings explored: `overflow hidden` and `clip hidden`. Status: later.

```tao
Box [overflow hidden]      // later
Box [clip hidden]          // later: alternative spelling
Box [overflow visible]     // later
Box [overflow scroll]      // deferred: usually needs ScrollView, not just style
```

`scroll` should not be a casual layout word because React Native scroll behavior generally requires a `ScrollView` or runtime view decision.

### Display

```tao
View [hidden]              // later: display: none
View [display none]        // later: explicit form
View [display flex]        // later: explicit (RN default)
View [display contents]    // deferred: needs RN support; useful for semantic wrappers
```

`display: contents` may be useful for semantically named wrapper views that should not introduce a layout box. Deferred until the semantic-wrapper pattern is designed.

### Flow Direction (Deferred)

```tao
Box [flow rtl]     // deferred: ties into I18N
Box [flow ltr]     // deferred
```

Physical `left`/`right` is acceptable for raw layout v1. Full RTL/logical direction support needs the accessibility/internationalization/localization design track.

### Logical Alignment Values (Later)

```tao
Row [start]        // later: logical alignment (RTL-aware flex-start)
Row [end]          // later: logical alignment (RTL-aware flex-end)
```

---

## Value Ordering Conventions

### Clause Ordering

Recommended reading order inside `[ ... ]`: children arrangement, spacing, size, self alignment, position.

```tao
Row [center spread, gap 12, pad 16, width 320, centered, absolute, top 8]
//   ^^^^^^^^^^^^^^  ^^^^^^  ^^^^^^  ^^^^^^^^^  ^^^^^^^^  ^^^^^^^^  ^^^^^
//   children arr.   spacing spacing size        self      position  offset
```

This is a readability convention, not a hard grammar rule. Validation does not reject reordered clauses. The formatter may normalize order later.

### Directional Shorthand: Clockwise (CSS Convention)

When a property accepts per-side values, Tao follows top, right, bottom, left:

- **1 value** sets all four sides: `pad 16`.
- **2 values** set vertical then horizontal: `pad 12 16`.
- **3 values** set top, horizontal, bottom: `pad 8 16 12`.
- **4 values** set each side clockwise: `pad 8 16 12 20`.

Applies to `pad`, `margin`, `border`, `inset`, and any future per-side property.

### Alignment Value Ordering

Bare alignment words: **vertical position first, then horizontal position**. Reads like a coordinate.

```tao
Row [top left]          // vertical: top, horizontal: left
Row [center right]      // vertical: center, horizontal: right
Row [top spread]        // vertical: top, horizontal: spread
Row [stretch spread]    // vertical: stretch, horizontal: spread
```

Mirrors "vertical then horizontal" and reads naturally: "where are items positioned, then how are they distributed."

### Gap Shorthand

Same vertical-then-horizontal convention:

```tao
Row [gap 12]        // both: 12
Row [gap 8 12]      // row gap 8, column gap 12 (later)
```

---

## Axis Resolution

Bare alignment words resolve differently in `Row` vs `Col`:

| Tao        | In `Row`                | In `Col`                |
| ---------- | ----------------------- | ----------------------- |
| `left`     | main-axis start         | cross-axis start        |
| `right`    | main-axis end           | cross-axis end          |
| `top`      | cross-axis start        | main-axis start         |
| `bottom`   | cross-axis end          | main-axis end           |
| `center`   | both or remaining axis  | both or remaining axis  |
| `stretch`  | cross-axis stretch      | cross-axis stretch      |
| `baseline` | cross-axis baseline     | validation error        |
| `pack`     | main-axis start         | main-axis start         |
| `spread`   | main-axis space-between | main-axis space-between |
| `around`   | main-axis space-around  | main-axis space-around  |
| `evenly`   | main-axis space-evenly  | main-axis space-evenly  |

### Axis Conflicts

These combinations are invalid and rejected by validation:

```tao
Row [left right]      // two horizontal positions
Row [top bottom]      // two vertical positions
Row [left spread]     // horizontal position vs horizontal distribution
Row [top stretch]     // vertical position vs vertical stretch
Col [top spread]      // vertical position vs vertical distribution
Col [left stretch]    // horizontal position vs horizontal stretch
```

`center` follows the same rules: `[left center]` in `Row` is fine (left = main, center = cross); `[left center spread]` is invalid (two main-axis values).

---

## Layout Boundary

These areas are not layout, even though React Native may represent some as style props:

| Area             | Examples                                    | Belongs to             |
| ---------------- | ------------------------------------------- | ---------------------- |
| Color            | `color text_primary`, `bg surface`          | Styling/theme          |
| Typography       | `text title`, `font body`, `size 16`        | Styling/text           |
| Radius           | `radius 8`, `radius full`                   | Styling/theme          |
| Shadow/elevation | `shadow card`, `elevation 2`                | Styling/platform       |
| Opacity          | `opacity disabled`                          | Styling/motion state   |
| Transform        | `translate`, `scale`, `rotate`              | Transform lane         |
| Motion           | `duration`, `curve`, `spring`, `transition` | Motion lane            |
| Accessibility    | `access role button`, `access label "Save"` | Accessibility lane     |
| Interaction      | `when pressed`, `on press`                  | Interaction/event lane |

Layout is geometry only: positioning, sizing, spacing, flow.

---

## Status Summary

| Area             | v1                                                                        | Later                                                                   | Deferred/Rejected                             |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Children words   | bare positions, `center`, `stretch`, `pack`, `spread`, `around`, `evenly` | `baseline`, `lines X`                                                   | `items`, `align`, compass, `distribute`       |
| Self words       | `centered`, `stretched`, `packed`                                         |                                                                         | `aligned X`, `self X`                         |
| Flow             | `row`, `column`, `wrap`, `nowrap`                                         | `reverse`, `wrap reverse`                                               |                                               |
| Spacing          | `gap`, `pad` (1-2 values + named sides), `margin`                         | 3-4 value shorthands, logical/RTL                                       | `border` width                                |
| Size             | `width`, `height`, min/max, `basis`, `grow`, `shrink`                     | `hug`, `fill`, `fixed`, `percent`, `flex`, `aspect_ratio`, `box_sizing` | `fill-parent`, tuples, `claim_*`              |
| Position         | `absolute`, `relative`, offsets, `z`                                      | `inset`, `start`/`end`, `stacking`                                      | `static`, `order`, `offset`, `3d`             |
| Overflow/display |                                                                           | `overflow hidden/visible`, `hidden`, `display`                          | `overflow scroll`, `display contents`, `flow` |
