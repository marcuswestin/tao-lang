# UI Layout Specification

Purpose: define the deterministic build contract for Tao layout.

This document specifies what the compiler/runtime must accept, reject, and lower to React Native/Yoga. It defines Tao syntax, validation, merge behavior, target React Native concepts, and intentional deferrals. It should not re-specify React Native behavior unless Tao intentionally differs. For the human-facing mental model and examples, see [UI Layout Concepts](./UI%20Layout%20Concepts.md).

## 1. Scope

This spec defines the MVP layout contract for Tao views.

All MVP normal-flow layout is Yoga/flex-backed. There is no non-flex normal-flow layout context in MVP.

MVP includes:

```text
ui | frame | layout
items | aligned | stretched
width | height | fill | hug | grow | compress | rigid
gap | pad
Text | TextLabel | MultiLineText
@@children
```

The MVP standard library includes:

```text
Row | Col | Box | Stack | WrappingRow
```

Designed but deferred from MVP1 implementation:

```text
nudge | overlay
```

Out of scope for this layout MVP:

```text
margin | border/radius | scroll containers | raw overflow syntax
raw wrap syntax | raw absolute positioning | z/layer | order/reverse
aspect ratio | display contents | measure functions | animations/transitions
general unit syntax | theme tokens | localization mirroring
native/atom injection | events | state | queries | named render slots | rich/editable/selectable text
```

## 2. View Kinds

`view` is the umbrella category.

```text
view = ui | frame | layout
```

| Kind   | Keyword  | Unnamed caller children | Required child splice           | Default self profile                       | Container specs at call site       |
| ------ | -------- | ----------------------: | ------------------------------- | ------------------------------------------ | ---------------------------------- |
| UI     | `ui`     |                      no | none                            | `rigid + hug`, unless explicit public size | error                              |
| Frame  | `frame`  |                     yes | exactly one static `@@children` | `rigid + hug`                              | allowed; targets `@@children` host |
| Layout | `layout` |                     yes | exactly one static `@@children` | `compress + fill`                          | allowed; targets `@@children` host |

`ui`, `frame`, and `layout` are syntax keywords and type categories, not merely standard-library profiles.

`frame` and `layout` have the same child-receiving capability in MVP. Their mechanical difference is default self-sizing/pressure. Their semantic difference is intent:

```text
frame  = composed object that frames supplied content
layout = spatial region that fills available space and arranges supplied content
```

All three may paint pixels.

## 3. Standard Library Layout Views

`Row`, `Col`, `Box`, `Stack`, and `WrappingRow` are standard-library views, not special syntax keywords or compiler-only built-ins. They are specified here because the shipped standard library must define them with these semantics. User code can define equivalent views using the same language mechanisms, including raw TypeScript injection where needed.

| Name          | Kind     | Direction  | Default self profile                 | Default `items` | Notes                                  |
| ------------- | -------- | ---------- | ------------------------------------ | --------------- | -------------------------------------- |
| `Row`         | `layout` | horizontal | `compress + fill`                    | `baseline left` | normal horizontal region               |
| `Col`         | `layout` | vertical   | `compress + fill`                    | `top stretch`   | normal vertical region                 |
| `Box`         | `frame`  | horizontal | `rigid + hug`                        | `center left`   | horizontal frame                       |
| `Stack`       | `frame`  | vertical   | `rigid + hug`                        | `top center`    | vertical frame                         |
| `WrappingRow` | `layout` | horizontal | `compress + width fill + height hug` | `baseline left` | horizontal row that wraps to new lines |

There is no directionless core `Box`. Normal-flow containers choose a direction.

Horizontal containers:

```text
Row | Box | WrappingRow
```

Vertical containers:

```text
Col | Stack
```

## 4. Layout Clauses

Layout uses square brackets.

```tao
[compress, pad 10 horizontal 4, width fill max 400]
```

Commas separate property heads. Modifiers inside one property head are not comma-separated.

Empty and malformed heads are errors:

```text
[]          = error
[items]     = error
[pad]       = error
[gap]       = error
```

Multiple layout clauses on one render site are not part of MVP.

## 5. Layout Spec Targets

Each layout head belongs to one target category.

| Category    | Examples                                                                                     | Target                                                        |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Self layout | `pad`, `width`, `height`, `fill`, `hug`, `grow`, `compress`, `rigid`, `aligned`, `stretched` | the view's outer/public root as it participates in its parent |
| Container   | `gap`, `items`                                                                               | the child-arranging host                                      |

Container layout means the way a view lays out its children.

For `frame` and `layout` calls, container specs target the `@@children` host.

For `ui` calls, container specs are errors.

MVP uses category routing inside a single `[ ... ]` clause. A future body-leading inner clause is deferred.

## 6. Merge And Override

Effective specs merge per key, not by whole-clause replacement.

For outer/public specs:

```text
view kind defaults
  < declaration-line public defaults
  < render-site call overrides
```

For `frame`/`layout` container specs:

```text
declaration host defaults
  < caller container overrides
```

Internal render-root specs are private implementation. A declaration-line public spec and an internal render-root spec MUST NOT set the same outer/public property in MVP. If they do, validation errors.

Use declaration-line specs when callers may override a default. Use internal render-node specs when the value is private implementation.

Declarations do not create an implicit wrapper node. The public root node is the root of the declaration's `render` statement. For example, in `ui Pill { render Box ... }`, the `Box` is the public root of `Pill`; caller self-layout and declaration-line public defaults apply to that root.

Example:

```tao
ui Pill Label text [compress, pad 8] {
  render Box <bg muted> {
    Text Label
  }
}

Pill "Beta" [rigid, pad 4]
```

Here caller `rigid` replaces inherited/default pressure, and caller `pad 4` replaces declaration `pad 8`.

### React Native / Yoga Lowering Contract

Tao specifies deterministic lowering to React Native/Yoga. It does not re-specify React Native behavior unless Tao intentionally differs.

View lowering:

| Tao surface                           | React Native target                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| `ui` / `frame` / `layout` declaration | no implicit wrapper; public root is the declaration's `render` root |
| `Row`                                 | `View` with `flexDirection: "row"`                                  |
| `Col`                                 | `View` with `flexDirection: "column"`                               |
| `Box`                                 | `View` with `flexDirection: "row"`                                  |
| `Stack`                               | `View` with `flexDirection: "column"`                               |
| `WrappingRow`                         | `View` with `flexDirection: "row"` and `flexWrap: "wrap"`           |

Container lowering:

| Tao surface                          | React Native / Yoga target |
| ------------------------------------ | -------------------------- |
| horizontal container vertical slot   | `alignItems`               |
| horizontal container horizontal slot | `justifyContent`           |
| vertical container vertical slot     | `justifyContent`           |
| vertical container horizontal slot   | `alignItems`               |
| `top` / `left`                       | `flex-start`               |
| `bottom` / `right`                   | `flex-end`                 |
| `center`                             | `center`                   |
| `stretch`                            | `stretch`                  |
| `baseline`                           | `baseline`                 |
| `spread`                             | `space-between`            |
| `spread-inset`                       | `space-around`             |
| `spread-balanced`                    | `space-evenly`             |
| `gap V`                              | `gap: V`                   |

Self-layout lowering:

| Tao surface                                     | React Native / Yoga target                                      |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `width V`                                       | `width: V`                                                      |
| `height V`                                      | `height: V`                                                     |
| `width min V` / `width max V`                   | `minWidth: V` / `maxWidth: V`                                   |
| `height min V` / `height max V`                 | `minHeight: V` / `maxHeight: V`                                 |
| `pad top V` / `right V` / `bottom V` / `left V` | `paddingTop` / `paddingRight` / `paddingBottom` / `paddingLeft` |
| `pad horizontal V`                              | `paddingLeft: V`, `paddingRight: V`                             |
| `pad vertical V`                                | `paddingTop: V`, `paddingBottom: V`                             |
| `grow`                                          | `flexGrow: 1`                                                   |
| `grow N`                                        | `flexGrow: N`                                                   |
| `compress`                                      | `flexShrink: 1`                                                 |
| `rigid`                                         | `flexShrink: 0`                                                 |
| `stretched`                                     | `alignSelf: "stretch"`                                          |
| `aligned top` / `left`                          | `alignSelf: "flex-start"`                                       |
| `aligned bottom` / `right`                      | `alignSelf: "flex-end"`                                         |
| `aligned center`                                | `alignSelf: "center"`                                           |
| `aligned baseline`                              | `alignSelf: "baseline"`                                         |
| default clipping on view roots                  | `overflow: "hidden"`                                            |

Fill and hug lowering:

| Tao surface                          | React Native / Yoga target                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `fill`                               | `flexGrow: 1`, `alignSelf: "stretch"`                                                 |
| `width fill` in a horizontal parent  | `flexGrow: 1`                                                                         |
| `width fill` in a vertical parent    | `alignSelf: "stretch"`                                                                |
| `height fill` in a horizontal parent | `alignSelf: "stretch"`                                                                |
| `height fill` in a vertical parent   | `flexGrow: 1`                                                                         |
| `hug`                                | omit fill/grow/stretch sizing for both axes; rely on RN/Yoga intrinsic/content sizing |
| `width hug`                          | omit horizontal size/fill for that axis, subject to any `minWidth`/`maxWidth`         |
| `height hug`                         | omit vertical size/fill for that axis, subject to any `minHeight`/`maxHeight`         |

Text lowering:

| Tao view                      | React Native target                                           |
| ----------------------------- | ------------------------------------------------------------- |
| `Text Value`                  | `Text` with `numberOfLines={1}` and `ellipsizeMode="tail"`    |
| `TextLabel Value`             | `Text` with `numberOfLines={1}` and `ellipsizeMode="clip"`    |
| `MultiLineText Value`         | `Text` with no Tao-emitted `numberOfLines` or `ellipsizeMode` |
| `MultiLineText Value Lines N` | `Text` with `numberOfLines={N}` and `ellipsizeMode="tail"`    |

MVP layout assumes the default left-to-right React Native direction. Localization and physical/logical remapping are deferred.

## 7. Parent `items`

`items` is the only parent-child alignment/distribution head.

Allowed values:

```text
top | bottom | left | right | center | baseline | stretch
spread | spread-inset | spread-balanced
```

Lowering:

```text
spread          -> justifyContent: space-between
spread-inset    -> justifyContent: space-around
spread-balanced -> justifyContent: space-evenly
```

Slot claims:

| Token      | Horizontal containers                | Vertical containers        |
| ---------- | ------------------------------------ | -------------------------- |
| `top`      | vertical                             | vertical                   |
| `bottom`   | vertical                             | vertical                   |
| `left`     | horizontal                           | horizontal                 |
| `right`    | horizontal                           | horizontal                 |
| `baseline` | vertical, horizontal containers only | error                      |
| `stretch`  | vertical                             | horizontal                 |
| `spread*`  | horizontal                           | vertical                   |
| `center`   | special; see normalization           | special; see normalization |

Defaults:

| Container     | Missing vertical slot | Missing horizontal slot |
| ------------- | --------------------- | ----------------------- |
| `Row`         | `baseline`            | `left`                  |
| `Col`         | `top`                 | `stretch`               |
| `Box`         | `center`              | `left`                  |
| `Stack`       | `top`                 | `center`                |
| `WrappingRow` | `baseline`            | `left`                  |

Normalization is deterministic and order-insensitive:

```text
1. Resolve all non-center tokens into vertical or horizontal slot claims.
2. If a slot has multiple claims, error.
3. Count center tokens.
4. If there are two centers, require both slots empty, then set both slots to center.
5. If there is one center, set every still-empty slot to center. If no slot is empty, error.
6. If there is no center, fill each empty slot from the container default.
```

Examples:

```text
items center       -> center center
items center left  -> center left
items left center  -> center left
items center top   -> top center
items top left     -> top left
items top          -> top + default horizontal slot
items left         -> default vertical slot + left
```

Validation examples:

```tao
Col [items baseline left]  // error: baseline requires horizontal flow
Row [items spread left]    // error: both claim horizontal
Row [items stretch top]    // error: both claim vertical
Col [items stretch bottom] // valid: horizontal stretch, vertical bottom
Col [items spread right]   // valid: vertical spread, horizontal right
Row [items top left center] // error: center has no empty slot
```

Axis conflicts, invalid `baseline`, duplicate slot claims, and malformed `items` are MVP errors.

In development mode, errors prevent compilation and prevent the dev app from updating; warnings are surfaced clearly but still lower and compile. Production builds fail on either errors or warnings. MVP layout should emit errors only for invalid or unlowerable layout; lowerable questionable code should be a warning.

## 8. Child Self Layout

Allowed child self-layout values:

```text
aligned top | aligned bottom | aligned left | aligned right | aligned center | aligned baseline | stretched
```

Rules:

```text
aligned X = positional cross-axis alignment
stretched = cross-axis fill
aligned stretch = error
```

Validity by parent direction:

| Parent direction | Valid `aligned` values                |
| ---------------- | ------------------------------------- |
| horizontal       | `top`, `center`, `bottom`, `baseline` |
| vertical         | `left`, `center`, `right`             |

`stretched` is valid in either direction and fills the relevant cross axis.

Tao does not type-check baselineable views in MVP. It relies on deterministic RN/Yoga baseline behavior.

## 9. Size And Pressure

Physical dimension heads:

```tao
[width 20]
[height 44]
[width fill]
[height fill]
[width hug]
[height hug]
[width min 10 max 20]
[height hug min 32 max 80]
[width 320 min 240 max 420]
```

Rules:

```text
width = physical horizontal dimension
height = physical vertical dimension
min/max = modifiers inside a dimension head
preferred size = optional
hug = explicit content/intrinsic sizing
unitless number = MVP numeric layout value
% = allowed where runtime supports percentages
general units = deferred
```

Fill and pressure:

```text
width fill = fill horizontal space
height fill = fill vertical space
fill = grow + stretched
grow = grow 1
grow N = weighted main-axis claim
stretched = cross-axis fill
compress = may shrink on the main axis
rigid = resists shrinking on the main axis
```

`fill` is the bare common shorthand. It takes no numeric argument. Use `grow N` for weighted main-axis space.

`width fill` and `height fill` are physical-axis forms. Specifying both physical-axis forms is equivalent to bare `fill` in normal flow.

V1 axis ownership rules:

```text
Each physical axis has one sizing mode: fill, hug, fixed, percentage, or unset.
Bare fill assigns fill to both physical axes for that clause.
Within one layout clause, bare fill cannot appear with any width or height head.
Use width fill / height fill for per-axis control or clamped fill.
Duplicate width heads or duplicate height heads in one clause are errors.
Across override layers, later width/height heads replace or constrain that axis.
```

Examples:

```tao
[fill]                         // valid
[width fill, height fill]      // valid, equivalent to fill
[width fill max 400]           // valid
[width fill, height hug]       // valid
[fill, width 320]              // error in one clause
[fill, width max 400]          // error in one clause; use [width fill max 400, height fill]
```

Physical fill lowering:

| Parent     | `width fill`                     | `height fill`                  |
| ---------- | -------------------------------- | ------------------------------ |
| horizontal | claim horizontal main-axis space | stretch vertically             |
| vertical   | stretch horizontally             | claim vertical main-axis space |

Runtime facts accounted for:

```text
In a Row parent, basis behaves like width.
In a Col parent, basis behaves like height.
Grow/compress act on the parent main axis.
RN views can hug content to zero when they have no size, content, grow, or stretch.
RN flexGrow distributes remaining space proportionally; fractional grow values do not sum to fill.
In a Row with height and stretch alignment, children fill height.
In a Row with no height or non-stretch alignment, children may hug their own height.
Explicit width/height win as physical sizes.
Each wrapped line behaves like a small flex container on the main axis.
```

Pressure validation happens after defaults and overrides merge:

| Combination                              | Result                                        |
| ---------------------------------------- | --------------------------------------------- |
| `compress + rigid`                       | error                                         |
| `grow + rigid`                           | valid; may grow, resists shrinking            |
| `grow + compress`                        | valid; may grow and shrink                    |
| `fill + rigid`                           | valid; fills when possible, resists shrinking |
| `fill + compress`                        | valid; fills and may shrink                   |
| `fill + width/height head in one clause` | error                                         |
| `stretched + cross-axis hug`             | error                                         |
| `grow + main-axis hug`                   | valid as hug basis, then grow                 |

`fill + compress` is the maximally flexible common item.

Clamps apply after preferred/fill/hug/grow size resolution. A max clamp may prevent full stretch/fill. If the resulting box is smaller than available space, parent `items` or child self-alignment places it.

`basis` is not common MVP syntax. If exposed later, it must be validated against the parent axis because it overlaps with `width` in `Row` and `height` in `Col`.

## 10. Spacing

`gap`:

```tao
[gap 8]
```

Rules:

```text
gap = one container-level spacing value between arranged children
two-axis gap = not supported in MVP
```

`pad`:

```tao
[pad 10]
[pad 10 horizontal 4]
[pad top 10 bottom 20 horizontal 40]
```

Allowed pad targets:

```text
top | bottom | left | right | horizontal | vertical
```

Pad resolution:

```text
1. Start with all sides unset.
2. A naked value sets all sides.
3. `horizontal V` sets left and right.
4. `vertical V` sets top and bottom.
5. Edge-specific targets set that edge.
6. Values apply left-to-right; later values override earlier values.
7. Unset sides default to 0.
```

Example:

```text
pad 10 horizontal 4 -> top 10, right 4, bottom 10, left 4
```

`margin` is deferred. Use `gap` for sibling spacing and `pad` for inside spacing.

## 11. Text Views

Text pressure is handled by named views, not layout heads. Tao specifies the emitted React Native component and props, then inherits React Native text behavior unless Tao intentionally differs.

| View                    | React Native lowering                                         |
| ----------------------- | ------------------------------------------------------------- |
| `Text`                  | `Text` with `numberOfLines={1}` and `ellipsizeMode="tail"`    |
| `TextLabel`             | `Text` with `numberOfLines={1}` and `ellipsizeMode="clip"`    |
| `MultiLineText`         | `Text` with no Tao-emitted `numberOfLines` or `ellipsizeMode` |
| `MultiLineText Lines N` | `Text` with `numberOfLines={N}` and `ellipsizeMode="tail"`    |

`Lines N` is a typed expression argument, not layout syntax.

If multiline text becomes too short vertically, normal clipping applies. Tao does not invent height-based ellipsis.

Editable, rich, and selectable text are out of scope.

## 12. WrappingRow

`WrappingRow` is the only MVP wrapping primitive.

```text
WrappingRow = layout, horizontal, compress + width fill + height hug, items baseline left
```

Its standard-library implementation emits a single React Native `View` root. It creates no wrapper and no inner child host.

Base root style:

```ts
{
  flexDirection: "row",
  flexWrap: "wrap",
  overflow: "hidden",
  alignItems: "baseline",
  justifyContent: "flex-start",
  flexShrink: 1,
}
```

Its `width fill + height hug` self profile lowers by parent direction:

```text
in a horizontal parent: add flexGrow: 1; emit no height fill
in a vertical parent: add alignSelf: "stretch"; emit no height grow
```

Children render directly as children of that `View`. It fills available width, places children left-to-right, and continues on new lines when needed.

Raw `[wrap]` is not supported in MVP.

Vertical wrapping into columns is deferred.

Wrapped-line distribution uses the runtime default align-content behavior until Tao defines explicit syntax for it.

## 13. Overflow

Tao defaults to clipping overflow.

MVP does not expose React Native overflow as layout syntax.

Scroll is not a layout value. Scroll behavior must be a real scroll container/view in a later design.

Rendering outside bounds is deferred and should be designed as a separate concept rather than as a raw overflow flag.

## 14. `@@children`

`@@children` rules:

```text
Only legal in frame/layout bodies.
Exactly one static reference is required.
Cannot appear in a ui body.
Cannot appear in a loop or conditional in MVP.
Cannot be inspected, looped over, reordered, duplicated, or individually wrapped.
Wherever it is placed, all caller children render there.
```

The `@@children` host is the nearest explicit container whose child list directly contains `@@children`.

Caller routing:

```text
caller neutral specs -> view outer/public root
caller child specs -> the view as a child of its parent
caller container specs -> @@children host
```

Declaration container specs on the host are defaults. Caller container specs override them per key.

If the host also contains fixed declaration-owned siblings, caller container specs affect those siblings too.

To let caller container specs affect only caller children, place `@@children` inside an explicit child host:

```tao
frame LabeledSection Label text {
  render Stack [gap 12] {
    Text Label
    Stack [gap 8] {
      @@children
    }
  }
}
```

The host direction is part of the public layout contract. Changing it from horizontal to vertical, or vertical to horizontal, is a breaking declaration change because caller `items` may resolve differently.

## 15. Style Boundary

Layout syntax:

```text
[ ... ]
```

Future style syntax:

```text
< ... >
```

Style properties are not layout:

```text
bg | radius | border | color | font | shadow | opacity | transform
```

`border` and `radius` are deferred to styling even though border width may eventually affect geometry.

## 16. Direction And Localization

In MVP, `left` and `right` are physical.

Future localization concepts are deferred:

```text
start | end | ltr | rtl | mirroring
```

Future directionality MUST NOT silently change existing physical `left`/`right` meaning. It should be introduced through an explicit mode, migration, or versioned behavior.

## 17. Nudge And Overlay

This section is an intended post-MVP1.1 contract, not MVP1 implementation.

`nudge`:

```tao
[nudge up 4]
[nudge down 8]
[nudge left 2]
[nudge right 2]
[nudge up 4 right 6]
```

Rules:

```text
nudge = post-layout visual movement
does not affect sibling layout
uses positive directional distances
applies after normal layout and alignment
keeps normal sibling z-order unless future z/layer syntax says otherwise
```

`overlay`:

```tao
overlay {
  anchor top left HelpButton "?"
  anchor bottom 10 right 20 Box {
    Text "Drawer"
  }
}
```

Rules:

```text
overlay = content above a view's normal render root
anchor = positioned render statement, not anonymous block
anchors = top-left, top-right, bottom-left, bottom-right
missing distances = 0
at most one anchor per corner
multiple views at one corner must be grouped in Box or Stack
```

Future overlay statements may cover:

```text
modal | popover | portal | toast | viewport anchor
```

Overlay is the intended Tao abstraction over raw absolute positioning. Clipping and outside-bounds rendering are finalized with overlay implementation, not MVP layout.

## 18. MVP Contract Table

| Surface          | Target role                        | Merge behavior                     | Validation                                   | Runtime lowering                       |
| ---------------- | ---------------------------------- | ---------------------------------- | -------------------------------------------- | -------------------------------------- |
| `ui`             | closed public view                 | kind defaults < declaration < call | rejects unnamed children and container specs | render-root-backed UI                  |
| `frame`          | child-receiving object             | kind defaults < declaration < call | exactly one static `@@children`              | render root plus child host            |
| `layout`         | child-receiving region             | kind defaults < declaration < call | exactly one static `@@children`              | render root plus child host            |
| `Row`            | horizontal standard-library layout | standard-library defaults < call   | validates horizontal `items` claims          | `View` with row direction              |
| `Col`            | vertical standard-library layout   | standard-library defaults < call   | validates vertical `items` claims            | `View` with column direction           |
| `Box`            | horizontal standard-library frame  | standard-library defaults < call   | validates horizontal `items` claims          | `View` with row direction              |
| `Stack`          | vertical standard-library frame    | standard-library defaults < call   | validates vertical `items` claims            | `View` with column direction           |
| `WrappingRow`    | wrapping standard-library layout   | standard-library defaults < call   | raw `wrap` not exposed                       | `View` with row direction + wrap       |
| `items`          | container arrangement              | per key on container host          | slot conflicts are errors                    | alignItems + justifyContent            |
| `aligned`        | child cross-axis position          | per key on child                   | invalid parent-axis value errors             | alignSelf                              |
| `stretched`      | child cross-axis fill              | per key on child                   | conflicts with cross-axis hug                | alignSelf stretch                      |
| `width`/`height` | physical size                      | per dimension key                  | malformed min/max errors                     | RN/Yoga width/height/min/max           |
| `fill`           | main-axis claim + cross-axis fill  | axis sizing shorthand              | cannot share a clause with `width`/`height`  | `flexGrow: 1` + `alignSelf: "stretch"` |
| `hug`            | content/intrinsic sizing           | size key                           | conflicts with fill on same axis             | intrinsic/content sizing               |
| `grow`           | main-axis claim                    | pressure key                       | numeric value must be valid                  | flexGrow                               |
| `compress`       | main-axis shrink permission        | pressure key                       | conflicts with rigid                         | `flexShrink: 1`                        |
| `rigid`          | main-axis shrink resistance        | pressure key                       | conflicts with compress                      | `flexShrink: 0`                        |
| `gap`            | container spacing                  | per key on container host          | requires one value                           | runtime gap                            |
| `pad`            | neutral inner spacing              | per side after resolution          | malformed target/value errors                | padding sides                          |
| `@@children`     | caller child splice                | host specs default < caller        | exactly one static ref                       | child insertion point                  |
| `Text` variants  | text pressure                      | typed args, not layout             | malformed `Lines N` errors                   | RN text props                          |

## 19. Explicit Deferrals

Deferred from MVP layout:

```text
margin
border/radius
scroll containers
raw overflow syntax
raw wrap syntax
raw absolute positioning
z/layer
order/reverse
aspect ratio
display contents
measure functions
animations/transitions
general unit syntax
theme tokens
safe-area and keyboard-aware layout
responsive/adaptive container queries
grid/table/masonry layout
outside-bounds effects such as shadows, focus rings, and badges
named render slots
```

These should be added only when Tao has a human-facing concept that is clearer than exposing the underlying runtime property directly.

## 20. Review Queue

This section is non-normative. Items here were preserved from older layout exploration docs because they may contain useful implementation or research material, but they have not been reviewed into the active contract above. Nothing in this section changes what Tao accepts, rejects, or lowers.

- React Native/Yoga default behavior still needs a focused verification pass for empty roots, grow/compress pressure, stretch, wrapped lines, and `alignContent`.
- Static analysis for literally empty containers may be useful, but it needs to be reconciled with conditionals, loops, slots, and query-driven empty states.
- Scroll behavior should be designed as a real scroll container/view, not as raw `overflow scroll`.
- `display: contents` may help semantic wrappers, but it needs a React Native support and failure-mode review before it enters Tao.
- `aspectRatio`, measure functions, `boxSizing`, logical start/end values, inset shorthands, `z`/layering, and outside-bounds effects remain separate design reviews.
- Border width affects geometry in React Native, but `border` and `radius` remain styling concepts unless Tao deliberately promotes a geometry-affecting border model.
