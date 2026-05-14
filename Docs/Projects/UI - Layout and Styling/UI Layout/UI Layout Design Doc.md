# Tao UI Layout Design Doc

This is the authoritative current design direction for Tao layout syntax. It contains the current decision, key/value catalog, validation rules, runtime target, and the compressed syntax/vocabulary rationale. The preserved raw archive is [UI Layout and Styling Raw Notes](../../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md). The styling/theming counterpart is [UI Styling and Theme Syntax Exploration](../UI%20Styling/UI%20Styling%20Syntax%20Exploration.md). Unresolved or deferred items are tracked in [Miscellaneous Points](#miscellaneous-points).

## Current Decision

Implement layout first, by itself.

- `[ ... ]` is the only layout syntax for this phase.
- `< ... >` is deferred.
- `( ... )` is deferred.
- Themes and named layout tokens are deferred.
- Layout values are actual values: words such as `top`, `left`, `stretch`, and raw numeric React Native point values such as `gap 12` or `pad 16`.
- One layout clause is allowed per view render for v1.
- Top-level layout statements inside a view body are not allowed for v1.
- Generated code should emit the parsed Tao layout parameters and values into a runtime helper at the render site. The runtime helper owns conversion to React Native style props.

The goal is a compact, Figma-adjacent vocabulary that remains deterministic enough to validate before codegen.

```tao
view Tasks {
  Col [top left, gap 12, pad 16] {
    Text "Tasks" [packed]

    Row [center spread, gap 8] {
      Text "Open"
      Button "Save", Save [centered]
    }
  }
}
```

## Runtime Target Confirmation

React Native Flexbox supports the split Tao needs:

- Container child arrangement maps to `flexDirection`, `flexWrap`, `justifyContent`, `alignItems`, `alignContent`, and `gap`.
- Rendered node/self layout maps to `alignSelf`, `flexGrow`, `flexShrink`, `flexBasis`, `width`, `height`, min/max size props, margin, position, and offsets.
- Padding is a style prop on the container node but conceptually affects the child layout area, so it belongs in layout v1.
- Numeric size and spacing values map to React Native logical pixels/points. React Native also supports percentages for many size and offset props.

This means most layout words can be mapped deterministically. The main caveat is bare alignment words such as `top`, `left`, and `stretch`: their React Native target depends on the known flow direction of the rendered container. Validation should resolve those words using the rendered view's layout role (`Row`, `Col`, or explicit `row`/`column`) and produce an error when the axis cannot be known.

Sources:

- [React Native 0.81 Layout Props](https://reactnative.dev/docs/0.81/layout-props)
- [React Native 0.81 Flexbox](https://reactnative.dev/docs/0.81/flexbox)

## Tao Layout Defaults And React Native Differences

<!-- REVIEW NOTE: This section documents default value decisions and RN behavioral -->
<!-- observations that need review. Items marked TODO need a test app or discussion -->
<!-- before finalizing. These notes exist so we can come back and verify together. -->

React Native's flexbox defaults differ from web CSS in ways that affect Tao's vocabulary and runtime behavior. Tao may further diverge from React Native defaults to satisfy the core tenet: "Every configurable thing has sane and tasteful default values."

### React Native vs Web vs Tao Defaults

| Property         | Web CSS Default | React Native Default | Tao Default (Chosen / Pending)                               |
| ---------------- | --------------- | -------------------- | ------------------------------------------------------------ |
| `flexDirection`  | `row`           | `column`             | explicit via `Row`/`Col` (no implicit default needed for v1) |
| `flexWrap`       | `nowrap`        | `nowrap`             | `wrap` (chosen; see [Flow And Wrapping](#flow-and-wrapping)) |
| `alignItems`     | `stretch`       | `stretch`            | pending; `stretch` is likely correct                         |
| `alignContent`   | `stretch`       | `flex-start`         | pending; see alignContent note below                         |
| `flexShrink`     | `1`             | `0`                  | pending; needs test app to evaluate tradeoffs                |
| `flexGrow`       | `0`             | `0`                  | pending                                                      |
| `justifyContent` | `flex-start`    | `flex-start`         | pending                                                      |

<!-- REVIEW NOTE (alignContent): -->
<!-- RN defaults to flex-start. Web defaults to stretch. -->
<!-- In a wrapped Row, flex-start packs wrapped lines to the top of the container. -->
<!-- Stretch distributes lines to fill the container's full cross-axis height. -->
<!-- Center clusters all wrapped lines vertically in the middle. -->
<!-- flex-start (RN's choice) is probably safer for v1 because stretch can cause -->
<!-- unexpected vertical expansion of wrapped containers. But if Tao defaults to -->
<!-- wrap, this decision matters more — wrapped content with flex-start will leave -->
<!-- empty space at the bottom, while stretch fills the container evenly. -->
<!-- Needs the test app to see which looks better "out of the box." -->

<!-- REVIEW NOTE (flexShrink): -->
<!-- RN defaults to 0 (items never shrink below their basis/width). -->
<!-- Web defaults to 1 (items compress to fit the container). -->
<!-- With shrink 0, items can overflow the container and go off-screen. -->
<!-- With shrink 1, items compress but may become too small to read. -->
<!-- This interacts with the wrap default: if Tao defaults to wrap, then shrink 0 -->
<!-- is safer because overflowing items wrap to the next line instead of going -->
<!-- off-screen. But if wrapping is off, shrink 1 keeps items visible. -->
<!-- Needs the test app. -->

### Basis And Axis Binding

<!-- REVIEW NOTE: This describes how basis/grow/shrink map to axes depending on -->
<!-- the parent container. Read this when reviewing Size And Flex validation. -->

`basis`, `grow`, and `shrink` are main-axis properties. Their effective dimension depends on the parent container direction:

- In a `Row` parent: `basis` acts as initial `width`; `grow`/`shrink` act on width.
- In a `Col` parent: `basis` acts as initial `height`; `grow`/`shrink` act on height.

This means `basis 120` on a Row child is functionally equivalent to `width 120` before grow/shrink adjustments. Validation should warn when `basis` and the equivalent axis size (`width` in Row, `height` in Col) are both set on the same node, as they compete for the same initial dimension.

### Stretch And Hug Behavior Under Different Conditions

<!-- REVIEW NOTE: These are observed RN behaviors that affect what Tao defaults -->
<!-- produce. Verify these against the test app before relying on them for -->
<!-- validation rules. -->

Observed React Native behavior that Tao's defaults and validation must account for:

- Without `flexGrow` or an explicit `width`/`height`, empty views collapse to zero size (hug to nothing).
- If two children each have `flexGrow: 0.33`, they collectively take 2/3 of the parent, not 100%. RN's `flexGrow` distributes only the _remaining_ space after basis sizing, proportionally.
- In a Row with non-zero height and default `alignItems: stretch`, children fill the Row's height.
- In a Row with zero height (no explicit height, not stretched by its own parent), children hug their own content height.
- In a Row with `alignItems: flex-start`, children hug their content height regardless of the Row's height.

### TODO: Default Value Combination Test App

Build a test app under `Apps/Test Apps/` that demonstrates every combination of:

- Direction: `row` vs `column`
- `flexWrap`: `wrap` vs `nowrap`
- `alignItems`: `stretch` vs `flex-start` vs `center`
- `alignContent`: `flex-start` vs `stretch` vs `center` (with wrapping enabled)
- `flexShrink`: `0` vs `1`
- `flexGrow`: `0` vs `1` vs fractional (e.g., 0.33)

Each combination should show a labeled container with enough children to make the layout effect visible. Include at least one empty child to demonstrate collapse behavior. The app should make it obvious which default choices produce the most intuitive "works out of the box" result per the core tenet.

## Syntax Shape

Layout appears after view arguments and before the optional block.

```tao
Row [center spread, gap 12] {
  Text "Name"
  Text "Status" [centered]
}

Button "Save", Save [width 120, height 44, centered]
```

Later grammar may allow declaration-level default root layout, but implementation should start with render-site layout because it directly maps to generated runtime props.

## Frozen V1 Surface

The first implementation should not keep expanding while it is being built. V1 is the set below:

- Flow: `row`, `column`, `wrap`, `nowrap`.
- Children arrangement: `top`, `right`, `bottom`, `left`, `center`, `stretch`, `pack`, `spread`, `around`, `evenly`.
- Spacing: `gap`, `row_gap`, `column_gap`, `pad`, side-specific `pad`, `margin`, side-specific `margin`.
- Size and flex: `width`, `height`, `min_width`, `max_width`, `min_height`, `max_height`, `grow`, `shrink`, `basis`.
- Self layout: `centered`, `stretched`, `packed`.
- Position and layering: `relative`, `absolute`, `top`, `right`, `bottom`, `left`, `z`.
- Values: lowercase layout words, raw numeric React Native logical pixels/points, and percentages for size, basis, and offsets.

Everything else in the catalog is preserved for design continuity but is not part of the first build.

## Vocabulary Principles

- Lowercase words are layout values or layout property names.
- Uppercase names remain Tao references and variables.
- Prefer Figma/design vocabulary when it maps cleanly: `row`, `column`, `gap`, `pad`, `hug`, `fill`, `fixed`, `wrap`, `absolute`.
- Prefer short property heads for numeric values: `gap 12`, `pad 16`, `width 320`.
- Prefer adjective forms for self layout: `centered`, `stretched`, `packed`.
- Prefer verb/base forms for children: `center`, `stretch`, `pack`, `spread`.
- Do not put visual styling in `[ ... ]`: no color, font, radius, shadow, opacity, transform, or animation.

## Value Ordering And Shorthand Conventions

### Clause ordering

Layout words inside `[ ... ]` follow a recommended reading order. The clause is comma-separated, and the guideline is: children arrangement first, then spacing, then size, then self alignment, then position.

```tao
Row [center spread, gap 12, pad 16, width 320, centered, absolute, top 8]
//   ^^^^^^^^^^^^^^  ^^^^^^  ^^^^^^  ^^^^^^^^^  ^^^^^^^^  ^^^^^^^^  ^^^^^
//   children arr.   spacing spacing size        self      position  offset
```

This is a readability convention, not a hard grammar rule. Validation does not reject reordered clauses. The formatter may normalize clause order in a later pass.

### Directional value ordering: clockwise (CSS convention)

When a property accepts per-side values, Tao follows the CSS clockwise convention: **top, right, bottom, left**.

The collapsing rules:

- **1 value** sets all four sides: `pad 16` means top 16, right 16, bottom 16, left 16.
- **2 values** set vertical then horizontal: `pad 12 16` means top 12, right 16, bottom 12, left 16.
- **3 values** set top, horizontal, bottom: `pad 8 16 12` means top 8, right 16, bottom 12, left 16.
- **4 values** set each side clockwise: `pad 8 16 12 20` means top 8, right 16, bottom 12, left 20.

This applies to `pad`, `margin`, `border`, `inset`, and any future per-side property.

```tao
Box [pad 16]                     // all sides: 16
Box [pad 12 16]                  // vertical 12, horizontal 16
Box [pad 8 16 12]                // top 8, horizontal 16, bottom 12
Box [pad 8 16 12 20]             // top 8, right 16, bottom 12, left 20

View [margin 8]                  // all sides: 8
View [margin 4 8]                // vertical 4, horizontal 8
View [margin 4 8 12 16]          // top 4, right 8, bottom 12, left 16

View [inset 8]                   // all sides: 8 (later)
View [inset 4 8]                 // vertical 4, horizontal 8 (later)
```

When using named-side forms, the shorthand is unnecessary because each side is explicit:

```tao
Box [pad top 8, pad right 16]   // explicit per-side; no shorthand needed
```

### Alignment value ordering

When bare alignment words appear together, the convention is: **vertical position first, then horizontal position**. This reads like a coordinate: row, column.

```tao
Row [top left]                   // vertical: top, horizontal: left
Row [center right]               // vertical: center, horizontal: right
Col [top left]                   // vertical: top, horizontal: left
```

When alignment and distribution or stretch appear together, the positional word comes first:

```tao
Row [top spread]                 // vertical: top, horizontal: spread
Col [left spread]                // horizontal: left, vertical: spread
Row [stretch spread]             // vertical: stretch, horizontal: spread
```

This mirrors the "vertical then horizontal" convention and also reads naturally: "where are items positioned, then how are they distributed."

### Gap shorthand

`gap` follows the same vertical-then-horizontal convention as spacing:

- **1 value** sets both gaps: `gap 12` means row gap 12, column gap 12.
- **2 values** set vertical then horizontal: `gap 8 12` means row gap 8, column gap 12.

```tao
Row [gap 12]                     // both: 12
Row [gap 8 12]                   // row gap 8, column gap 12 (later)
```

## Layout Morphology Principle

The reason `centered` vs `center` works is not that we picked nice words. It is that the layout vocabulary already carries role information in its parts of speech. The morphology rule makes the existing pattern visible, and it should guide all future vocabulary additions.

Every layout word falls into one of three groups. Each group already implies its target (self or children) without any syntactic mark, prefix, or second bracket.

### 1. Property-headed nouns: role fixed by what the property means

No ambiguity, no morphology needed. The split is the same one the styling boundary uses for "outside the box" vs "inside the box."

**Inward / "about my interior" → container arranging children:**

- `gap`
- `pad`, `pad top`, `pad horizontal`, etc.
- `direction` (`row`, `column`)
- `wrap`, `nowrap`
- `lines pack`, `lines center`, etc. (`alignContent`)

**Outward / "about my place in my parent and my own dimensions" → self:**

- `width`, `height`, `min_width`, `max_width`, `min_height`, `max_height`
- `basis`, `grow`, `shrink`, `flex`
- `aspect_ratio`
- `margin`, `margin top`, `margin horizontal`, etc.
- `position` (`absolute`, `relative`)
- `top N`, `right N`, `bottom N`, `left N` (offsets)
- `inset`, `inset block`, `inset inline`, etc.
- `z`, `isolation`, `box_sizing`

### 2. Locatives: always children

`top`, `bottom`, `left`, `right`, `baseline` — used as bare alignment words (not as offset property heads like `top 8`) always address children. They read as imperatives: "go to the top." A self alignment can never be `top` because self alignment works across the flow and uses adjectives. No author would write "this Text is top" in English; they would write "this Text is at the top" or "this Text is centered." The word class itself rules out the self meaning.

### 3. Alignment overlap words: morphology resolves the only real ambiguity

`center`, `stretch`, and `pack` are the only concepts where the same idea genuinely applies to both roles. The resolution:

| Children (container directive) | Self (node describing itself) | Meaning                       |
| ------------------------------ | ----------------------------- | ----------------------------- |
| `center`                       | `centered`                    | center across the flow        |
| `stretch`                      | `stretched`                   | stretch across the flow       |
| `pack`                         | `packed`                      | pack to the start across flow |

**Where `pack` came from**: The original brainstorm notes (Design WIP) never used `pack` as a syntax keyword. Directional words (`left`/`top` for start, `right`/`bottom` for end) were the only explored vocabulary for `flex-start`. `pack` was introduced during consolidation because a direction-agnostic word for "push items to the main-axis start" was needed to complete the morphology table. The word derives from the brainstorm's own descriptive language ("rows of wrapped items _pack_ to the top or left of container"). `start` was rejected because it conflicts with logical positioning offsets (`start 8`) and RTL semantics. `pack` reads naturally as both a container imperative ("pack the children together") and a self adjective ("this item is packed to the start"). There is no corresponding "end-pack" word because directional words (`right`/`bottom`) already cover the end case, and the concept of "packing to the end" is less common in practice.

Bare verb = imperative to children ("center yourselves"). `-ed` participle = self stative ("I am centered").

Distribution words (`spread`, `around`, `evenly`) do not need `-ed` forms because a single child is never "spread" — distribution only makes sense as a container directive to multiple children.

### Adding new vocabulary

New layout words must follow these rules:

- **New self vocabulary must be an adjective or participle.** Never introduce a bare imperative for self layout.
- **New children vocabulary must be a verb, locative, or inward-property head.** Never introduce an adjective for children arrangement.
- **Property-headed values follow inside/outside semantics.** If the property describes the node's interior, it is a container word. If it describes the node's outward shape or placement, it is a self word.
- **Never introduce the inverse form.** No children-arrangement adjectives (`centeredly`), no self-state imperatives (`widen`). The principle is stronger when the inverse is illegal by construction.

## Layout Key And Value Catalog

This catalog is the single canonical reference for every layout concept Tao tracks: every canonical key, every surface spelling (chosen, alternative, rejected, deferred), every value, and the React Native target. Each subsection ends with an **Examples** block that exercises the spellings in that category, so an author or reviewer can find one place that shows both the doc and the code form for any version of any layout key.

Other docs should link to this section rather than restating spellings:

- [Exploration And Vocabulary Rationale](#exploration-and-vocabulary-rationale) covers alternatives, rejected vocabulary, and the "why" behind current spelling decisions.
- [UI Styling and Theme Syntax Exploration](../UI%20Styling/UI%20Styling%20Syntax%20Exploration.md) covers styling vocabulary and a small "Layout-Adjacent Material Not Captured Elsewhere" section that flags any RN layout surface still being considered. New RN layout props graduate from there into this catalog.
- [UI Layout and Styling Raw Notes](../../../Archive/UI%20Layout%20and%20Styling%20Raw%20Notes.md) is the verbatim historical archive.

Status meanings:

- **v1**: candidate for the first raw layout implementation.
- **later**: likely useful, but should wait until the core model is stable.
- **deferred**: needs separate design work or a stronger use case.
- **not chosen**: preserved from exploration, not a current direction.

Conventions used in this catalog:

- "Surface spellings" lists every textual form Tao recognizes or has considered for a key. Multiple rows for the same canonical key represent different surfaces of the same underlying concept.
- "Applies to" distinguishes container (parent), rendered node/self (the node itself), and positioned-node-only forms.
- "React Native target" names the underlying RN style prop or notes when the value rides a Tao runtime helper.

### Flow And Wrapping

| Canonical key | Surface spellings                                                                             | Values                                                    | Applies to        | Status | React Native target                                        |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------- | ------ | ---------------------------------------------------------- |
| `direction`   | `row`, `column`                                                                               | `row`, `column`                                           | container         | v1     | `flexDirection`                                            |
| `reverse`     | `reverse`                                                                                     | `true`                                                    | container         | later  | `row-reverse` or `column-reverse` after direction is known |
| `wrap`        | `wrap`, `nowrap`                                                                              | `wrap`, `nowrap`                                          | container         | v1     | `flexWrap`                                                 |
| `wrap`        | `wrap reverse`                                                                                | `wrap_reverse`                                            | container         | later  | `flexWrap: 'wrap-reverse'` if supported and validated      |
| `line_align`  | `lines pack`, `lines center`, `lines stretch`, `lines spread`, `lines around`, `lines evenly` | `pack`, `center`, `stretch`, `spread`, `around`, `evenly` | wrapped container | later  | `alignContent`                                             |

Examples:

```tao
Row [row, gap 8]
Col [column, gap 8]
Row [row, wrap, gap 8]
Row [row, nowrap]
Row [row, wrap, lines pack]      // later: alignContent for wrapped lines
Row [row, reverse]               // later: row-reverse once direction is known
```

**Tao wrapping default: `wrap`.** CSS and React Native both default to `nowrap`. Tao defaults to `wrap` because content should stay visible by default (core tenet: "Everything works out of the box without changing configurable values"). The reasons CSS/RN chose `nowrap`:

1. **Predictable layout shape**: with `nowrap`, a Row is always one line. The layout never restructures when content grows.
2. **No sudden layout shifts**: if dynamic content grows past the container width, wrapping causes items to jump to a new line, reshaping the entire page layout. `nowrap` keeps items on one line (potentially overflowing or truncating).
3. **Performance**: wrapping requires additional measurement passes.
4. **Application vs document mindset**: CSS flexbox was designed for fixed-structure application layouts (toolbars, navbars), not reflowing documents.

Tao accepts the tradeoff: layout may shift when content grows, but content is always visible. For containers where wrapping must not happen, the author writes `nowrap` explicitly.

**Text vs TextLine**: Tao has two text elements. `Text` wraps its text content by default (multiline). `TextLine` does not wrap (single line, truncates). This is separate from flex wrapping: `flexWrap` controls whether _child elements_ in a Row/Col reflow to new lines; text wrapping controls whether _text content_ inside a text element reflows within its own bounds.

### Child Arrangement

Bare child-arrangement values are axis-aware. Validation must know whether the rendered container is row-like or column-like.

| Canonical key              | Surface spellings                                             | Values                       | Applies to       | Status                                      | React Native target                                 |
| -------------------------- | ------------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------------------------- | --------------------------------------------------- |
| `main_align`               | `pack`                                                        | `pack`                       | container        | v1                                          | `justifyContent: 'flex-start'`                      |
| `main_align`               | `center`                                                      | `center`                     | container        | v1                                          | `justifyContent: 'center'` when used along the flow |
| `main_align`               | `spread`                                                      | `spread`                     | container        | v1                                          | `justifyContent: 'space-between'`                   |
| `main_align`               | `around`                                                      | `around`                     | container        | v1                                          | `justifyContent: 'space-around'`                    |
| `main_align`               | `evenly`                                                      | `evenly`                     | container        | v1                                          | `justifyContent: 'space-evenly'`                    |
| `main_align`               | `left`, `right` in `Row`                                      | `start`, `end`               | row container    | v1                                          | `justifyContent: 'flex-start'` or `'flex-end'`      |
| `main_align`               | `top`, `bottom` in `Col`                                      | `start`, `end`               | column container | v1                                          | `justifyContent: 'flex-start'` or `'flex-end'`      |
| `cross_align`              | `stretch`                                                     | `stretch`                    | container        | v1                                          | `alignItems: 'stretch'`                             |
| `cross_align`              | `center`                                                      | `center`                     | container        | v1                                          | `alignItems: 'center'` when used across the flow    |
| `cross_align`              | `top`, `bottom`, `baseline` in `Row`                          | `start`, `end`, `baseline`   | row container    | v1 for `top`/`bottom`; later for `baseline` | `alignItems`                                        |
| `cross_align`              | `left`, `right` in `Col`                                      | `start`, `end`               | column container | v1                                          | `alignItems: 'flex-start'` or `'flex-end'`          |
| `child_layout`             | `items ...`                                                   | child arrangement values     | container        | not chosen                                  | Historical explicit target word                     |
| `child_layout`             | `align ...`                                                   | child arrangement values     | container        | not chosen                                  | Historical explicit target word                     |
| `main_align`               | `distribute spread`, `distribute around`, `distribute evenly` | `spread`, `around`, `evenly` | container        | deferred                                    | Explicit distribution syntax                        |
| `main_align`/`cross_align` | `north`, `south`, `east`, `west`, `nw`, `tr`, `t`             | compass/abbreviation values  | container        | not chosen                                  | None until normalized                               |

Examples (chosen v1 spellings):

```tao
Row [top left]
Row [center]
Row [center spread, gap 12]
Row [stretch spread]
Row [bottom right, gap 8]
Col [top left, gap 8]
Col [right spread]
Col [center, gap 12]
```

Examples (alternative spellings preserved as not chosen):

```tao
Col [items top left]                           // historical: explicit `items` head
Row [align top left]                           // historical: explicit `align` head
Row [align top, distribute spread]             // historical: split align/distribute
Row [north west]                               // rejected: compass values
Row [nw]                                       // rejected: compass abbreviations
Row [t, stretch]                               // rejected: single-letter compass
```

Examples (invalid; rejected by validation, see [Axis conflicts](#axis-conflicts-children-arrangement)):

```tao
Row [left right]      // two horizontal positions
Row [top bottom]      // two vertical positions
Row [left spread]     // horizontal position vs horizontal distribution
Row [top stretch]     // vertical position vs vertical stretch
Col [top spread]      // vertical position vs vertical distribution
Col [left stretch]    // horizontal position vs horizontal stretch
Col [items baseline left]  // baseline is row-only
```

### Spacing

| Canonical key                                             | Surface spellings                | Values                             | Applies to              | Status   | React Native target                                        |
| --------------------------------------------------------- | -------------------------------- | ---------------------------------- | ----------------------- | -------- | ---------------------------------------------------------- |
| `gap`                                                     | `gap 12`                         | non-negative number                | container               | v1       | `gap`                                                      |
| `row_gap`                                                 | `row_gap 12`                     | non-negative number                | container               | v1       | `rowGap`                                                   |
| `column_gap`                                              | `column_gap 12`                  | non-negative number                | container               | v1       | `columnGap`                                                |
| `gap`                                                     | `gap 8 12`                       | vertical number, horizontal number | container               | later    | `rowGap` and `columnGap`                                   |
| `pad`                                                     | `pad 16`                         | non-negative number                | rendered node/container | v1       | `padding`                                                  |
| `pad`                                                     | `pad 12 16`                      | vertical, horizontal               | rendered node/container | v1       | `paddingVertical`, `paddingHorizontal`                     |
| `pad`                                                     | `pad 8 16 12`                    | top, horizontal, bottom            | rendered node/container | later    | `paddingTop`, `paddingHorizontal`, `paddingBottom`         |
| `pad`                                                     | `pad 8 16 12 20`                 | top, right, bottom, left           | rendered node/container | later    | per-side padding props (clockwise)                         |
| `pad_horizontal`                                          | `pad horizontal 16`              | non-negative number                | rendered node/container | v1       | `paddingHorizontal`                                        |
| `pad_vertical`                                            | `pad vertical 16`                | non-negative number                | rendered node/container | v1       | `paddingVertical`                                          |
| `pad_top`                                                 | `pad top 8`                      | non-negative number                | rendered node/container | v1       | `paddingTop`                                               |
| `pad_right`                                               | `pad right 8`                    | non-negative number                | rendered node/container | v1       | `paddingRight`                                             |
| `pad_bottom`                                              | `pad bottom 8`                   | non-negative number                | rendered node/container | v1       | `paddingBottom`                                            |
| `pad_left`                                                | `pad left 8`                     | non-negative number                | rendered node/container | v1       | `paddingLeft`                                              |
| `pad_start`/`pad_end`                                     | `pad start 8`, `pad end 8`       | non-negative number                | rendered node/container | later    | logical padding after RTL design                           |
| `margin`                                                  | `margin 8`                       | number                             | rendered node/self      | v1       | `margin`                                                   |
| `margin`                                                  | `margin 4 8`                     | vertical, horizontal               | rendered node/self      | v1       | `marginVertical`, `marginHorizontal`                       |
| `margin`                                                  | `margin 4 8 12`                  | top, horizontal, bottom            | rendered node/self      | later    | `marginTop`, `marginHorizontal`, `marginBottom`            |
| `margin`                                                  | `margin 4 8 12 16`               | top, right, bottom, left           | rendered node/self      | later    | per-side margin props (clockwise)                          |
| `margin_horizontal`                                       | `margin horizontal 8`            | number                             | rendered node/self      | v1       | `marginHorizontal`                                         |
| `margin_vertical`                                         | `margin vertical 8`              | number                             | rendered node/self      | v1       | `marginVertical`                                           |
| `margin_top`/`margin_right`/`margin_bottom`/`margin_left` | `margin top 8`, etc.             | number                             | rendered node/self      | v1       | side-specific margin props                                 |
| `margin_start`/`margin_end`                               | `margin start 8`, `margin end 8` | number                             | rendered node/self      | later    | logical margin after RTL design                            |
| `margin_block`                                            | `margin block 8`                 | number                             | rendered node/self      | later    | `marginBlock` (logical: top + bottom)                      |
| `margin_block_start`                                      | `margin block start 8`           | number                             | rendered node/self      | later    | `marginBlockStart` (logical: top)                          |
| `margin_block_end`                                        | `margin block end 8`             | number                             | rendered node/self      | later    | `marginBlockEnd` (logical: bottom)                         |
| `margin_inline`                                           | `margin inline 8`                | number                             | rendered node/self      | later    | `marginInline` (logical: left + right)                     |
| `margin_inline_start`                                     | `margin inline start 8`          | number                             | rendered node/self      | later    | `marginInlineStart` (logical, RTL-aware)                   |
| `margin_inline_end`                                       | `margin inline end 8`            | number                             | rendered node/self      | later    | `marginInlineEnd` (logical, RTL-aware)                     |
| `pad_block`                                               | `pad block 16`                   | non-negative number                | rendered node/container | later    | `paddingBlock` (logical: top + bottom)                     |
| `pad_block_start`                                         | `pad block start 8`              | non-negative number                | rendered node/container | later    | `paddingBlockStart` (logical: top)                         |
| `pad_block_end`                                           | `pad block end 8`                | non-negative number                | rendered node/container | later    | `paddingBlockEnd` (logical: bottom)                        |
| `pad_inline`                                              | `pad inline 16`                  | non-negative number                | rendered node/container | later    | `paddingInline` (logical: left + right)                    |
| `pad_inline_start`                                        | `pad inline start 8`             | non-negative number                | rendered node/container | later    | `paddingInlineStart` (logical, RTL-aware)                  |
| `pad_inline_end`                                          | `pad inline end 8`               | non-negative number                | rendered node/container | later    | `paddingInlineEnd` (logical, RTL-aware)                    |
| `border_width`                                            | `border 4`, `border 6 10`        | non-negative number or tuple       | rendered node           | deferred | Border width affects geometry but border is mostly styling |
| `border_top_width`                                        | `border top 4`                   | non-negative number                | rendered node           | deferred | `borderTopWidth`; geometry-affecting, see styling boundary |
| `border_right_width`                                      | `border right 4`                 | non-negative number                | rendered node           | deferred | `borderRightWidth`                                         |
| `border_bottom_width`                                     | `border bottom 4`                | non-negative number                | rendered node           | deferred | `borderBottomWidth`                                        |
| `border_left_width`                                       | `border left 4`                  | non-negative number                | rendered node           | deferred | `borderLeftWidth`                                          |
| `border_start_width`                                      | `border start 4`                 | non-negative number                | rendered node           | deferred | `borderStartWidth` (logical, RTL-aware)                    |
| `border_end_width`                                        | `border end 4`                   | non-negative number                | rendered node           | deferred | `borderEndWidth` (logical, RTL-aware)                      |

Examples:

```tao
Row [gap 12]
Row [row_gap 12, column_gap 8]
Row [gap 8 12]                        // later: vertical, horizontal tuple

// pad: 1-value (all), 2-value (vertical horizontal), named-side
Box [pad 16]                          // all sides: 16
Box [pad 12 16]                       // vertical 12, horizontal 16
Box [pad 8 16 12]                     // later: top 8, horizontal 16, bottom 12
Box [pad 8 16 12 20]                  // later: top 8, right 16, bottom 12, left 20
Box [pad horizontal 16]
Box [pad vertical 16]
Box [pad top 8, pad right 12]         // explicit per-side; no shorthand needed

// margin: same shorthand convention as pad
View [margin 8]                       // all sides: 8
View [margin 4 8]                     // vertical 4, horizontal 8
View [margin 4 8 12 16]               // later: top 4, right 8, bottom 12, left 16
View [margin horizontal 8]
View [margin top 8, margin bottom 12]

Row [pad start 8, pad end 12]                   // later: logical sides
Box [margin block 8, margin inline 12]          // later: CSS-logical shorthands
Box [pad block start 8]                         // later: CSS-logical per-edge

View [border 4]                                 // deferred: uniform border width
View [border top 1, border bottom 2]            // deferred: per-side border widths
View [border start 1, border end 1]             // deferred: logical per-side widths
```

### Size And Flex

| Canonical key    | Surface spellings                         | Values                       | Applies to         | Status     | React Native target                                           |
| ---------------- | ----------------------------------------- | ---------------------------- | ------------------ | ---------- | ------------------------------------------------------------- |
| `width`          | `width 320`                               | number or percent            | rendered node/self | v1         | `width`                                                       |
| `height`         | `height 44`                               | number or percent            | rendered node/self | v1         | `height`                                                      |
| `min_width`      | `min_width 120`                           | number or percent            | rendered node/self | v1         | `minWidth`                                                    |
| `max_width`      | `max_width 320`                           | number or percent            | rendered node/self | v1         | `maxWidth`                                                    |
| `min_height`     | `min_height 44`                           | number or percent            | rendered node/self | v1         | `minHeight`                                                   |
| `max_height`     | `max_height 240`                          | number or percent            | rendered node/self | v1         | `maxHeight`                                                   |
| `basis`          | `basis 120`                               | number or percent            | rendered node/self | v1         | `flexBasis`                                                   |
| `grow`           | `grow 1`                                  | non-negative number          | rendered node/self | v1         | `flexGrow`                                                    |
| `shrink`         | `shrink 1`                                | non-negative number          | rendered node/self | v1         | `flexShrink`                                                  |
| `size_mode`      | `hug`                                     | `hug`                        | rendered node/self | later      | no explicit size; natural measurement                         |
| `size_mode`      | `fill`, `fill 2`                          | `fill`, weighted fill number | rendered node/self | later      | `flexGrow`, possible `flexShrink` policy                      |
| `size_mode`      | `fixed 120`                               | fixed number                 | rendered node/self | later      | `width` or `height` after axis is known                       |
| `size_mode`      | `percent 50`                              | percent number               | rendered node/self | later      | percentage size on known axis                                 |
| `width`/`height` | `width fill-parent`, `height hug-content` | `fill-parent`, `hug-content` | rendered node/self | not chosen | Historical verbose Figma naming                               |
| `size_tuple`     | `[fill hug]`, `[100px 50% 20% 20px]`      | positional tuple             | rendered node/self | not chosen | Rejected as too opaque                                        |
| `claim_space`    | `claim_space 50`                          | number or percent            | rendered node/self | deferred   | Unclear; likely flex/basis abstraction                        |
| `claim_ratio`    | `claim_ratio 2`                           | number                       | rendered node/self | deferred   | Unclear; likely flex abstraction                              |
| `resize_ratio`   | `resize_ratio 1`                          | number                       | rendered node/self | deferred   | Unclear; likely flex abstraction                              |
| `aspect_ratio`   | `aspect_ratio 1.777`                      | positive number              | rendered node/self | later      | `aspectRatio`                                                 |
| `flex`           | `flex 1`, `flex 2`                        | non-negative number          | rendered node/self | later      | RN `flex N` = `{ flexGrow: N, flexShrink: 1, flexBasis: 0 }`  |
| `flex`           | `flex 0`                                  | `0`                          | rendered node/self | later      | RN `flex: 0`; sized strictly by `width`/`height`              |
| `flex`           | `flex -1`                                 | `-1`                         | rendered node/self | deferred   | RN `flex: -1`; shrink-to-min sentinel; needs validation story |
| `box_sizing`     | `box_sizing border`                       | `border-box`                 | rendered node/self | later      | `boxSizing: 'border-box'` (RN default)                        |
| `box_sizing`     | `box_sizing content`                      | `content-box`                | rendered node/self | later      | `boxSizing: 'content-box'`                                    |
| `box_sizing`     | `[box-layout content]`                    | `content-box`                | rendered node/self | not chosen | Historical exploration name for the same concept              |

Examples:

```tao
View [width 320, height 44]
View [min_width 120, max_width 320]
View [min_height 44, max_height 240]

View [basis 120]
View [grow 1]
View [shrink 1]
View [basis 120, grow 1, shrink 1]

View [hug]                          // later: Figma-style size mode
View [fill]                         // later: Figma-style fill
View [fill 2]                       // later: weighted fill
View [fixed 120]                    // later: fixed on the relevant axis
View [percent 50]                   // later: percent on the relevant axis

View [aspect_ratio 1.777]           // later

View [flex 1]                       // later: RN single-number shorthand
View [flex 0]                       // later: inflexible, sized by width/height
View [flex -1]                      // deferred: shrink-to-min sentinel

View [box_sizing border]            // later: explicit border-box
View [box_sizing content]           // later: opt out to content-box
```

### Self Alignment

| Canonical key | Surface spellings                                                                  | Values                  | Applies to         | Status     | React Native target                                   |
| ------------- | ---------------------------------------------------------------------------------- | ----------------------- | ------------------ | ---------- | ----------------------------------------------------- |
| `self_align`  | `centered`                                                                         | `center`                | rendered node/self | v1         | `alignSelf: 'center'`                                 |
| `self_align`  | `stretched`                                                                        | `stretch`               | rendered node/self | v1         | `alignSelf: 'stretch'`                                |
| `self_align`  | `packed`                                                                           | `start`                 | rendered node/self | v1         | `alignSelf: 'flex-start'`                             |
| `self_align`  | `aligned top`, `aligned right`, `aligned center`, `aligned bottom`, `aligned left` | axis-specific alignment | rendered node/self | not chosen | Historical explicit self syntax                       |
| `self_align`  | `self center`, `self stretch`, `self start`, `self end`                            | explicit self values    | rendered node/self | deferred   | Could be fallback if adjective words are insufficient |

Examples:

```tao
Text "Title" [centered]
Text "Label" [packed]
View [stretched]
Button "Save", Save [centered, width 120, height 44]

View [aligned right]                // not chosen: explicit `aligned X` form
View [aligned center]
View [self center]                  // deferred: explicit `self ...` fallback
View [self stretch]
```

### Position And Layering

| Canonical key        | Surface spellings                   | Values            | Applies to         | Status     | React Native target                                                                                                                                                           |
| -------------------- | ----------------------------------- | ----------------- | ------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position`           | `relative`                          | `relative`        | rendered node/self | v1         | `position: 'relative'`                                                                                                                                                        |
| `position`           | `absolute`                          | `absolute`        | rendered node/self | v1         | `position: 'absolute'`                                                                                                                                                        |
| `position`           | `static`                            | `static`          | rendered node/self | deferred   | `position: 'static'` support needs RN/version decision                                                                                                                        |
| `top`                | `top 8`                             | number or percent | positioned node    | v1         | `top`                                                                                                                                                                         |
| `right`              | `right 8`                           | number or percent | positioned node    | v1         | `right`                                                                                                                                                                       |
| `bottom`             | `bottom 8`                          | number or percent | positioned node    | v1         | `bottom`                                                                                                                                                                      |
| `left`               | `left 8`                            | number or percent | positioned node    | v1         | `left`                                                                                                                                                                        |
| `start`/`end`        | `start 8`, `end 8`                  | number or percent | positioned node    | later      | logical offsets after RTL design                                                                                                                                              |
| `inset`              | `inset 8`                           | number or percent | positioned node    | later      | `inset` (RN New Architecture; sets all of top/right/bottom/left)                                                                                                              |
| `inset_block`        | `inset block 8`                     | number or percent | positioned node    | later      | `insetBlock` (logical: top + bottom; RN New Architecture)                                                                                                                     |
| `inset_block_start`  | `inset block start 8`               | number or percent | positioned node    | later      | `insetBlockStart` = top (RN New Architecture)                                                                                                                                 |
| `inset_block_end`    | `inset block end 8`                 | number or percent | positioned node    | later      | `insetBlockEnd` = bottom (RN New Architecture)                                                                                                                                |
| `inset_inline`       | `inset inline 8`                    | number or percent | positioned node    | later      | `insetInline` (logical: left + right; RN New Architecture)                                                                                                                    |
| `inset_inline_start` | `inset inline start 8`              | number or percent | positioned node    | later      | `insetInlineStart` (logical, RTL-aware; RN New Architecture)                                                                                                                  |
| `inset_inline_end`   | `inset inline end 8`                | number or percent | positioned node    | later      | `insetInlineEnd` (logical, RTL-aware; RN New Architecture)                                                                                                                    |
| `offset`             | `offset 10 -5%`                     | tuple             | rendered node/self | styling    | Offset is visual displacement without layout effect; belongs in styling, not layout. Margin affects layout flow and pushes siblings; offset shifts visually like a transform. |
| `z`                  | `z 2`                               | integer           | rendered node/self | v1         | `zIndex`                                                                                                                                                                      |
| `isolation`          | `stacking auto`, `stacking isolate` | `auto`, `isolate` | rendered node/self | later      | `isolation` (RN New Architecture); forms a stacking context                                                                                                                   |
| `layer`              | `3d 2`                              | integer           | rendered node/self | not chosen | Historical name; avoid unless real 3D exists                                                                                                                                  |
| `order`              | `order 3`                           | integer           | rendered node/self | deferred   | Not a current React Native target                                                                                                                                             |

Examples:

```tao
View [relative]
View [absolute]
View [absolute, top 8, right 8]
View [absolute, top 8, right 8, bottom 8, left 8]
Box [absolute, top 8, right 8, width 40, height 40]
View [z 2]

View [absolute, start 8, end 8]            // later: logical offsets
View [absolute, inset 8]                   // later: shorthand for all four edges
View [absolute, inset block 8]             // later: top + bottom shorthand
View [absolute, inset inline 8]            // later: left + right shorthand
View [absolute, inset inline start 8]      // later: RTL-aware single edge

View [stacking isolate]                    // later: form a stacking context

View [offset 10 -5%]                       // deferred: name vs margin/transform
View [3d 2]                                // not chosen: historical 3D name
View [order 3]                             // deferred: no RN target
View [static]                              // deferred: needs RN/version decision
```

### Overflow, Display, And Direction

| Canonical key      | Surface spellings                  | Values         | Applies to              | Status   | React Native target                            |
| ------------------ | ---------------------------------- | -------------- | ----------------------- | -------- | ---------------------------------------------- |
| `overflow`         | `clip hidden`, `overflow hidden`   | `hidden`       | rendered node/container | later    | `overflow: 'hidden'`                           |
| `overflow`         | `clip visible`, `overflow visible` | `visible`      | rendered node/container | later    | `overflow: 'visible'`                          |
| `overflow`         | `clip scroll`, `overflow scroll`   | `scroll`       | rendered node/container | deferred | Usually needs `ScrollView`, not just style     |
| `display`          | `hidden` or `display none`         | `none`         | rendered node/self      | later    | `display: 'none'`                              |
| `display`          | `display flex`                     | `flex`         | rendered node/self      | later    | `display: 'flex'`                              |
| `display`          | `display contents`                 | `contents`     | rendered node/self      | deferred | Needs RN support and semantic-wrapper decision |
| `direction`        | `flow ltr`, `flow rtl`             | `ltr`, `rtl`   | rendered node/subtree   | deferred | Direction and `I18nManager` story needed       |
| `logical_position` | `start`, `end` as alignment values | `start`, `end` | container/self          | later    | Logical layout after RTL design                |

Examples:

```tao
Box [overflow hidden]                // later
Box [clip hidden]                    // later: alternative spelling
Box [overflow visible]               // later
Box [overflow scroll]                // deferred: usually needs ScrollView

View [hidden]                        // later: display: none
View [display none]                  // later: explicit form
View [display flex]                  // later: explicit (RN default)
View [display contents]              // deferred: needs RN support story

Box [flow rtl]                       // deferred: direction; ties into I18N
Row [start]                          // later: logical alignment value (RTL-aware)
Row [end]                            // later: logical alignment value (RTL-aware)
```

### Out-Of-Layout Values

These are intentionally not layout keys, even though React Native may represent some of them as style props.

| Area             | Example values                                                                             | Status                 |
| ---------------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| Color            | `color text_primary`, `bg surface`                                                         | Styling/theme          |
| Typography       | `text title`, `font body`, `size 16`, `weight bold`, `line_height 20`, `text_align center` | Styling/text           |
| Radius           | `radius 8`, `radius full`                                                                  | Styling/theme          |
| Shadow/elevation | `shadow card`, `elevation 2`                                                               | Styling/platform       |
| Opacity          | `opacity disabled`                                                                         | Styling/motion state   |
| Transform        | `translate`, `scale`, `rotate`                                                             | Transform lane         |
| Motion           | `duration`, `curve`, `spring`, `transition`                                                | Motion lane            |
| Accessibility    | `access role button`, `access label "Save"`                                                | Accessibility lane     |
| Interaction      | `when pressed`, `on press`                                                                 | Interaction/event lane |

### Combined Examples

These exercise multiple categories at once and reflect realistic clauses an author would write.

```tao
view Tasks {
  Col [top left, gap 12, pad 16] {
    Text "Tasks" [packed]

    Row [center spread, gap 8] {
      Text "Open"
      Button "Save", Save [centered, width 120, height 44]
    }

    Row [stretch spread, gap 8] {
      Text "Filter" [packed]
      Text "Sort"   [centered]
    }
  }
}

view Drawer {
  Col [top left, gap 16, pad 24] {
    Box [absolute, top 8, right 8, width 40, height 40, z 2]
    Box [absolute, inset 8]                          // later: inset shorthand
    Box [stacking isolate]                           // later: scoped layering
  }
}

view Card {
  Col [gap 12, pad 16, box_sizing border] {         // later: explicit box-sizing
    Text "Heading" [packed]
    Row [center spread, gap 8] {
      Text "Status"
      Box [width 12, height 12, aspect_ratio 1]      // aspect_ratio later
    }
  }
}
```

## Container And Children Layout (Axis Resolution Cheat Sheet)

The full, canonical list of every container key, surface spelling, value, and React Native target lives in the [Layout Key And Value Catalog](#layout-key-and-value-catalog). Add new entries there. This section is a quick-lookup view that resolves bare alignment words by container axis, which the per-key catalog does not show on its own.

Alignment and distribution are axis-aware:

| Tao        | In `Row`                                                                           | In `Col`                                                                           |
| ---------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `left`     | `justifyContent: 'flex-start'`                                                     | `alignItems: 'flex-start'`                                                         |
| `right`    | `justifyContent: 'flex-end'`                                                       | `alignItems: 'flex-end'`                                                           |
| `top`      | `alignItems: 'flex-start'`                                                         | `justifyContent: 'flex-start'`                                                     |
| `bottom`   | `alignItems: 'flex-end'`                                                           | `justifyContent: 'flex-end'`                                                       |
| `center`   | center both axes when alone; otherwise center the axis the other word did not take | center both axes when alone; otherwise center the axis the other word did not take |
| `stretch`  | `alignItems: 'stretch'`                                                            | `alignItems: 'stretch'`                                                            |
| `baseline` | `alignItems: 'baseline'`                                                           | validation error unless React Native support is proven useful                      |
| `pack`     | `justifyContent: 'flex-start'`                                                     | `justifyContent: 'flex-start'`                                                     |
| `spread`   | `justifyContent: 'space-between'`                                                  | `justifyContent: 'space-between'`                                                  |
| `around`   | `justifyContent: 'space-around'`                                                   | `justifyContent: 'space-around'`                                                   |
| `evenly`   | `justifyContent: 'space-evenly'`                                                   | `justifyContent: 'space-evenly'`                                                   |

Examples:

```tao
Row [top left, gap 8]
Row [center spread, gap 12]
Row [stretch spread]

Col [top left, gap 8]
Col [center, gap 12]
Col [left spread]
```

Validation should reject contradictory layout on the same axis:

```tao
Row [left right]       // invalid: two horizontal positions
Row [left spread]     // invalid: horizontal position and horizontal distribution conflict
Col [top bottom]      // invalid: two vertical positions
Col [top spread]      // invalid: vertical position and vertical distribution conflict
```

## Self Layout And Morphology Rule (Cheat Sheet)

The full set of self-layout keys, surface spellings, values, and React Native targets lives in the [Layout Key And Value Catalog](#layout-key-and-value-catalog) (especially [Self Alignment](#self-alignment), [Size And Flex](#size-and-flex), [Spacing](#spacing), and [Position And Layering](#position-and-layering)). Add new entries there. The note below captures the load-bearing morphology rule that the catalog does not state on its own.

`centered`, `stretched`, and `packed` are self words. `center`, `stretch`, and `pack` are children words. That morphology is the core readability rule: an adjective ending in `-ed` describes the rendered node's relationship to its parent, while a verb/base form describes how the rendered node arranges its own children.

Examples (all spellings are catalog entries):

```tao
Text "Label" [packed]
Button "Save", Save [centered, width 120, height 44]
Box [absolute, top 8, right 8, width 40, height 40]
View [grow 1, basis 120]
View [margin horizontal 8]
```

## Size Words (Cheat Sheet)

The full size vocabulary, including `width`/`height`/min/max, `basis`/`grow`/`shrink`, the Figma-style `hug`/`fill`/`fixed`/`percent` size_mode, the RN `flex N` shorthand, `box_sizing`, and the deferred `claim_*`/`resize_ratio` exploration, lives in [Size And Flex](#size-and-flex). The note below summarizes the recommended subset for v1.

Keep this small in v1. `width 120`, `height 44`, `grow 1`, and `basis 120` are the safest exact spellings. `hug`, `fill`, and `fixed` should be added only when validation can explain exactly what axis they affect.

## Generated Code Shape

Codegen should preserve Tao's layout vocabulary and avoid embedding all conversion logic in generated TSX.

Target shape:

```tsx
<Row
  _taoLayout={TR.Layout.resolve({
    values: ['center', 'spread'],
    gap: 12,
  })}
>
  <Text _taoLayout={TR.Layout.resolve({ values: ['centered'] })} />
</Row>
```

The exact prop name is implementation detail. The important rule is that generated code passes the validated layout parameters and values to Tao runtime functions at the render site. The runtime translates those Tao parameters and values to React Native style arrays or props.

This keeps grammar/codegen lean:

- Parser recognizes bracketed layout syntax.
- Validation checks property names, values, duplicates, and axis constraints.
- Codegen emits the layout parameters and values.
- Runtime maps valid layout parameters and values to React Native Flexbox styles.

## Validation Rules

Validation is the only place semantic checks live for layout. Codegen and runtime trust that a layout AST node has already passed these rules. The morphology rule is load-bearing for validation: `center`, `stretch`, `pack`, `spread`, `around`, `evenly` are children-arrangement words; `centered`, `stretched`, `packed` are self words. A word can only validate against one of those roles, never both.

### Clause structure

- Reject more than one `[ ... ]` layout clause on the same render statement.
- Reject top-level layout statements in a view body.
- Reject empty `[ ... ]` clauses.
- Reject unknown layout words.

### Container direction and flow

- Reject mixing direction values in one clause: `[row column]`, `[column row]`.
- Reject mixing wrap values in one clause: `[wrap nowrap]`.
- Reject `reverse` without an established direction (explicit `row`/`column`, or a `Row`/`Col` view container).
- Reject children-arrangement words on a view that does not lay out children (for example, an element-like render with no child container role).
- Reject `Row`-only words used on a `Col` container and vice versa: bare `top`/`bottom` resolve to different axes in `Row` vs `Col`, so a value that conflicts on the resolved axis must be rejected as if it were any other axis conflict. `baseline` is `Row`-only.

### Axis conflicts (children arrangement)

The validator resolves each bare alignment word to an along-the-flow or across-the-flow value using the container direction, then enforces:

- One along-the-flow position value per clause. Reject `Row [left right]`, `Col [top bottom]`.
- One across-the-flow position value per clause. Reject `Row [top bottom]`, `Col [left right]`.
- Along-the-flow position and distribution conflict. Reject `Row [left spread]`, `Col [top spread]`, `[pack around]`, `[pack spread]`.
- Across-the-flow position and `stretch` conflict. Reject `Row [top stretch]`, `Col [left stretch]`.
- `center` follows the same axis-conflict rules: `[left center]` in `Row` is fine (left = along-flow start, center = across-flow center); `[center spread]` in `Row` is fine (spread = along flow, center = across flow); `[left center spread]` in `Row` is invalid (two along-the-flow values).

### Self layout and parent context

- Reject self-layout words (`centered`, `stretched`, `packed`, `grow`, `shrink`, `basis`) on a rendered node whose parent axis cannot be determined.
- Reject self-layout words used as if they were children words and vice versa (`Row [centered]` for children alignment, or `Text "Label" [center]` for a self position).
- Reject duplicate self values (`[centered packed]`, `[stretched centered]`).

### Sizing

- Reject duplicate scalar size properties: `width 100, width 200`, `height 44, height 64`, `min_width`, `max_width`, `min_height`, `max_height`, `basis`, `grow`, `shrink`.
- Reject negative values for `width`, `height`, min/max dimensions, `basis`, `grow`, `shrink`, `gap`, `pad*`.
- Allow negative values for `margin*` (React Native supports negative margin); reject NaN and non-numeric inputs.
- Reject `min_width > max_width` and `min_height > max_height` when both are literals.
- Reject `percent` values outside `0..=100` when statically known.

### Positioning and offsets

- Reject mixing position modes in one clause: `[absolute relative]`.
- Reject offset words (`top N`, `right N`, `bottom N`, `left N`) without `absolute` or `relative` in the same clause; offsets without a position mode have no effect in React Native.
- Reject duplicate offsets on the same side.
- Reject opposing-edge offsets combined with an explicit fixed size on the same axis (`width 320` together with both `left 8` and `right 8`) when statically resolvable as over-constrained.

### Lane separation

- Reject styling, transform, motion, accessibility, and interaction words in layout. Layout is geometry only.
- Reject values not supported by React Native/Expo unless Tao owns an explicit runtime helper for them.

### Diagnostic quality

- Every rejection should name the offending word(s), the resolved axis (when applicable), and the conflicting word(s) already in the clause.
- Axis-aware errors should say which container direction was assumed and why.
- Suggestions should reference the morphology rule when a user has likely confused a self word with a children word.

## Out Of Scope For Layout V1

- Theme declarations.
- Named spacing, size, and breakpoint tokens.
- Styling syntax and style tokens.
- Radius, borders as visual styling, color, typography, shadow, opacity.
- Transform and animation.
- Interaction states and event handlers.
- Accessibility, internationalization, localization, and adaptation.
- Grid auto layout.
- Scroll semantics hidden behind a layout word.

## Exploration And Vocabulary Rationale

This section preserves the useful reasoning from the former syntax and vocabulary exploration docs. It is not a second source of truth; new layout spellings belong in the [Layout Key And Value Catalog](#layout-key-and-value-catalog).

### Syntax Alternatives

`[ ... ]` is the chosen layout lane because it is compact, distinct from view arguments, easy to parse, and easy to format. It must stay layout-only so styling, themes, transforms, motion, interactions, and accessibility do not blur into geometry.

Rejected or deferred shapes:

- Separate self and children lanes, such as `View [centered] { <top left> }`, were explicit but too much syntax for v1.
- Mixed layout/style delimiters, especially `< ... >`, were unstable because earlier sketches used them for both layout and visual styling.
- Body-top layout statements put child layout near children but introduce a new statement form; v1 keeps layout on the render line only.
- Positional size tuples such as `row [fill hug]` were rejected because meaning changes by slot and they blur width, height, basis, grow, and shrink.
- Explicit `self ...` remains a possible fallback if adjective self words prove insufficient, but v1 does not need it.

### Vocabulary Alternatives

Bare child-arrangement words won because they are short and readable once axis rules are enforced: `Row [top left]`, `Row [center spread]`, `Col [right stretch]`.

Rejected or deferred vocabulary:

- `items` and `align` were clear but either too narrow or too vague for main-axis distribution.
- Split `align`/`distribute` mapped neatly to React Native but was more verbose and less Figma-like.
- Compass words and abbreviations were compact but less readable for new users.
- Raw CSS names such as `space-between` are accurate but feel less Tao-specific than `spread`, `around`, and `evenly`.
- `fill-parent` and `hug-content` were explicit but too wordy; `hug`, `fill`, and `fixed` remain later Figma-like candidates.
- `claim_space`, `claim_ratio`, and `resize_ratio` were deferred naming explorations around grow/shrink/basis.
- `offset` stays out of layout because it displaces a node visually without moving siblings; use margin for layout-affecting outside spacing.

### Morphology Rationale

The layout language uses word shape to identify target:

- Bare verbs or locatives describe how a container arranges children: `center`, `stretch`, `pack`, `spread`, `top`, `left`.
- Adjectives or participles describe a rendered node's own position in its parent: `centered`, `stretched`, `packed`.
- Property-headed nouns are resolved by meaning: inward properties such as `gap` and `pad` affect the container interior, while outward properties such as `width`, `margin`, `basis`, `grow`, `absolute`, and offsets affect the rendered node itself.

This is why Tao does not need a second delimiter or `self` keyword for common self-layout cases.

Rules for future vocabulary:

- New self-layout words should be adjectives or participles.
- New children-arrangement words should be verbs, locatives, or inward property heads.
- Property-headed numeric values should keep short lowercase heads: `gap 12`, `pad 16`, `width 320`, `basis 120`, `grow 1`, `z 2`.
- Lowercase words inside `[ ... ]` are layout values or property names; uppercase names remain Tao references.
- Prefer Figma/design vocabulary only when it maps cleanly to React Native or a Tao runtime helper.

### Value Ordering And Shorthand Conventions

Ordering inside `[ ... ]` is a readability convention, not a grammar rule: children arrangement, spacing, size, self alignment, then position.

```tao
Row [center spread, gap 12, pad 16, width 320, centered, absolute, top 8]
```

Directional shorthands follow CSS clockwise order:

- One value sets all sides: `pad 16`, `margin 8`.
- Two values set vertical then horizontal: `pad 12 16`.
- Three and four value forms are deferred but would continue `top`, `right`, `bottom`, `left`.
- Bare alignment words also read vertical then horizontal: `top left`, `center right`, `stretch spread`.

### Decision Matrix

| Area              | Preferred now                                | Preserved alternatives                                     |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Layout delimiter  | `[ ... ]`                                    | `< ... >`, body-top child layout                           |
| Styling delimiter | deferred                                     | `< ... >`, `( ... )`, named `style`                        |
| Child arrangement | bare `top left`, `center spread`, `gap 12`   | `items`, `align`, `content`, `distribute`, compass values  |
| Self layout       | `centered`, `stretched`, `packed`            | `aligned center`, explicit `self`                          |
| Distribution      | `spread`, `around`, `evenly`                 | `spread-hug`, `spread-hug-tight`, raw `space-*`            |
| Size              | `width`, `height`, `basis`, `grow`, `shrink` | `fill-parent`, `hug-content`, positional tuples, `claim_*` |
| Spacing           | `gap`, `pad`, `margin`                       | 3-4 value side shorthands, shared border/pad/margin syntax |
| Scroll            | deferred                                     | `[clip scroll]`, `[overflow scroll]`                       |
| RTL/logical       | deferred                                     | `flow ltr/rtl`, future `start/end`                         |
| Defaults          | React Native-compatible runtime defaults     | dev-visible empty containers, empty-container diagnostics  |

### Status Summary

| Area             | V1                                                                        | Later                                                                   | Deferred or rejected                          |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Children words   | bare positions, `center`, `stretch`, `pack`, `spread`, `around`, `evenly` | `baseline`, `lines ...`                                                 | `items`, `align`, compass, `distribute`       |
| Self words       | `centered`, `stretched`, `packed`                                         |                                                                         | `aligned ...`, `self ...`                     |
| Flow             | `row`, `column`, `wrap`, `nowrap`                                         | `reverse`, `wrap reverse`                                               |                                               |
| Spacing          | `gap`, `pad`, `margin`                                                    | 3-4 value shorthands, logical/RTL values                                | `border` width in layout                      |
| Size             | `width`, `height`, min/max, `basis`, `grow`, `shrink`                     | `hug`, `fill`, `fixed`, `percent`, `flex`, `aspect_ratio`, `box_sizing` | `fill-parent`, tuples, `claim_*`              |
| Position         | `absolute`, `relative`, offsets, `z`                                      | `inset`, `start`/`end`, `stacking`                                      | `static`, `order`, `offset`, `3d`             |
| Overflow/display |                                                                           | `overflow hidden/visible`, `hidden`, `display`                          | `overflow scroll`, `display contents`, `flow` |

### Preserved Future Ideas

Useful but deferred ideas include `hug`, `fill`, `fixed`, `aspect_ratio`, `lines ...` for wrapped-line alignment, logical `start`/`end` spacing, inset shorthands, `overflow hidden`, and a declarative custom-view container role. These should graduate only when validation can explain axis, React Native support, and layout/styling boundaries precisely.

## Miscellaneous Points

These were found in prior notes and are not yet fully addressed by layout v1.

- `alignContent` matters only when wrapping creates multiple lines. It should be deferred or exposed with a clear `lines ...` vocabulary. In a wrapped Row, each wrapped line is its own mini flexbox on the main axis. `alignContent` distributes the _lines_ (not the items within lines) across the cross axis. See [Tao Layout Defaults](#tao-layout-defaults-and-react-native-differences) for default choice.
- `overflow scroll` is not just layout in React Native; it usually implies `ScrollView`. Do not ship `[scroll]` until the view/runtime model is explicit.
- **`display: contents`** may be useful for semantically named wrapper views. The use case: a Tao `view` that exists for naming or semantic grouping (like Figma auto-naming layers) but should not introduce a layout box. `display: contents` makes the wrapper transparent to layout so its children participate in the grandparent's flex flow. This is valuable for Tao because view composition often introduces intermediate containers that should not affect geometry. React Native support needs verification (New Architecture may be required). Deferred until the semantic-wrapper pattern is designed.
- `position: static`, inset logical props, and several newer layout props have React Native version or architecture caveats. Keep them out of v1.
- `aspectRatio` is useful and supported, but should be added after core size vocabulary is stable.
- **Empty views**: Are there legitimate cases where correct Tao code produces an empty Row or Col? Likely yes: a container whose children all come from a query or conditional (`Row { for item in items { ... } }`) can be empty at runtime when the data is empty. However, a _literally_ empty container (`Row {}` with no children in the source) is almost always a mistake. Tao should: (1) reject literally empty container blocks as a validation error, (2) allow containers whose only children are conditional/loop-based (the container may be empty at runtime, which is valid), (3) consider a later warning for containers with _only_ conditional children and no fallback/empty state. See also [Static Analysis For Empty Containers](#static-analysis-for-empty-containers).
- RTL and logical start/end spacing should be designed with accessibility, localization, and adaptation rather than patched onto physical `left`/`right` syntax.
- Non-identifiable list keys are deferred. Tao lists are expected to mostly use persisted database items with IDs.
- **Offset vs margin**: `margin` belongs in layout because it affects outside geometry and pushes siblings. `offset` belongs in styling because it displaces a view visually without affecting the layout of siblings, similar to a transform translation. The `offset` entry in [Position And Layering](#position-and-layering) is marked as styling.
- **Custom view container roles**: v1 can axis-validate known built-ins such as `Row`, `Col`, and explicit `row`/`column`. Future custom views need a way to declare whether their root lays out children, and on which axis, so bare child-arrangement words can be validated without guessing.

## Static Analysis For Empty Containers

Tao can do useful static analysis to detect empty containers. The AST has full visibility into a container's children at compile time:

| Source pattern                                       | Detectable?                       | Recommended action                                                           |
| ---------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| `Row {}` or `Col {}` (literally empty block)         | Yes, trivially                    | Validation error                                                             |
| `Row` or `Col` without a block                       | Yes, trivially                    | Validation error                                                             |
| Container with only conditional children (`if ...`)  | Yes                               | Warning: container may be empty at runtime; suggest providing an empty state |
| Container with only loop children (`for ... in ...`) | Yes                               | Warning: container may be empty when collection is empty                     |
| Container with at least one unconditional child      | Yes                               | No warning needed                                                            |
| Container receiving children via slots/composition   | Partially; depends on type system | Later: track "provides children" in the slot type                            |

For v1, the simplest and most valuable check is: reject containers with literally empty blocks. This catches the most common mistake and is trivially implementable. The conditional/loop warnings can be added when the empty-state pattern is designed.
