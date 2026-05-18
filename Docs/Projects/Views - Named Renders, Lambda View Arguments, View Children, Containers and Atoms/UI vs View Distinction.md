# UI vs View: A Structural Distinction for Tao

This document explores a new conceptual split in Tao between two declaration
kinds: **UI** (declarations whose descendant views are specified in their own
body) and **View** (declarations whose descendant views are passed in by
callers). It develops the distinction into a full characteristic list, shows
concrete Tao code under this model, maps layout ownership to the distinction,
and evaluates the design against the concerns raised in the peer documents.

This is a full-language design exploration, not only an MVP implementation
note. It asks whether Tao's first complete UI language should expose two
declaration kinds from the start.

Cross-links:

- Prior root-model decision: [View Root Model Decision](./View%20Root%20Model%20Decision.md)
- Prior root-model recommendation: [View Root Model Recommendation](./View%20Root%20Model%20Recommendation.md)
- Prior alternatives exploration: [View Root Element Design Doc](./View%20Root%20Element%20Design%20Doc.md)
- Layout vocabulary and validation: [UI Layout Design Doc](../UI%20-%20Layout%20and%20Styling/UI%20Layout/UI%20Layout%20Design%20Doc.md)
- Core tenets: [CORE_TENETS.md](../../../CORE_TENETS.md)

## 1. The Distinction

**UI** corresponds to a declaration whose sub-views are specified in its own
body. The author of a UI writes all the descendant views it contains. Callers
render the UI as a unit and do not supply children.

**View** corresponds to a declaration whose sub-views are passed in by callers.
The declaration defines a container shape, and callers fill it with content.

### 1.1 Seed Examples

UI examples: `Button`, `Header`, `ProfileLink`, `Avatar`, `Divider`,
`NumberBadge`, `LoginForm`, `SettingsRow`.

View examples: `Row`, `Column`/`Col`, `Box`, `List`, `ScrollView`, `Card`
(when Card accepts `@@children`), `TabBar` (when tabs are caller-supplied).

## 2. Full Characteristic List

### 2.1 Characteristics of UI

1. **Sub-views are author-specified.** Every descendant view that a UI renders
   is written in the UI's own body. Callers cannot inject, replace, or
   rearrange those descendants.

2. **Always renders something visible.** A UI without visible output is
   pointless. If removing all visible children leaves the declaration empty,
   it was never a useful UI.

3. **Has a material root.** Because it always renders something visible, a UI
   always compiles to at least one React Native host node. That node is the
   target for layout, styling, accessibility, test IDs, animation, and
   gestures.

4. **The declaration fully owns its interior.** The UI's internal layout (gap,
   padding, child arrangement, flow direction) is set by the author and is not
   overridable by callers. The UI's visual styling (background, radius, shadow,
   text style) is likewise author-owned unless the author exposes a parameter
   or theme token.

5. **Call-site layout is self-placement only.** When a parent renders a UI, the
   parent controls how that UI sits in the parent's layout: margin, width,
   height, grow, shrink, basis, self-alignment, positioning, and z-order.
   The parent does not reach into the UI's interior.

6. **Does not accept `@@children` or child slots.** A UI's children are
   closed. If a declaration needs caller-supplied children, it is a View,
   not a UI.

7. **May accept value parameters.** A UI can take data parameters (a User, a
   Title string, a Count number, an IsFriend boolean). These control what the
   UI displays, not what views it contains.

8. **May accept action parameters.** A UI can take action callbacks (an
   OnPress action, a Toggle action). These wire behavior without changing the
   UI's structure.

9. **May accept renderer parameters for data-driven repetition.** A UI might
   internally iterate over data and call a renderer for each item. This is
   the edge case where a UI has "caller-supplied views" in a narrow sense:
   the caller provides a view function, not direct children. Whether this
   makes the declaration a View instead of a UI is an open question
   (Section 7).

10. **Stable tree identity.** Because the UI always has a root, it always has
    a stable node in the React tree for dev tools, test targeting, error
    overlays, and hot-reload identity.

11. **Conceptual entities do not fit.** A UI that only holds state, wraps a
    guard, or re-exports another view is not "rendering something visible" in
    the meaningful sense. Conceptual wrappers are not UIs.

12. **Public variability is not child injection.** A UI may expose value
    parameters, action parameters, variants, theme names, accessibility inputs,
    or public style/layout tokens. Those do not make it a View. It becomes a
    View only when callers supply rendered descendants or renderer functions.

13. **Named visual parts are a design boundary.** If a declaration lets callers
    replace `@icon`, `@label`, `@leading`, or `@trailing` with rendered UI, that
    is caller-supplied descendant structure and should be treated as View-like.
    If it only accepts values such as `IconName`, `Title`, or `Tone`, it remains
    UI-like.

### 2.2 Characteristics of View

1. **Sub-views are caller-specified.** The View's body defines a container
   shape, and callers supply the content that fills it. The canonical
   mechanism is `@@children` (variadic child views) or named slots
   (`@header`, `@footer`).

2. **Often does not render its own pixels.** A `Row` renders no pixels of its
   own; it only arranges children. A `Col` is the same. A `Box` renders
   nothing visible unless styled. A `List` renders no visible list chrome
   by default; only its items are visible.

3. **May or may not have a material root.** A View that is a direct wrapper
   around a React Native `View` (like `Row`, `Col`, `Box`) does have a
   material root. A View that is purely conceptual (a state holder, a guard
   wrapper, a fragment grouping) does not. The distinction matters for
   whether layout and styling can target the View.

4. **The declaration owns its container layout.** The View defines its flex
   direction, gap, padding, wrapping, and child arrangement. Callers do not
   casually change these unless the View exposes them as parameters.

5. **Call-site layout is self-placement by default.** Same rule as UI: callers
   control how the View sits in the parent's layout, not the View's interior.

6. **Call-site layout may extend to container layout for direct stdlib
   containers.** When a caller writes `Row [gap 12, spread]`, the caller is
   the one who chose `Row` as the container, so the caller owns the
   container layout. This is different from calling a custom View that
   internally uses a `Row`.

7. **Accepts `@@children`, named slots, or renderer slots.** This is the
   defining characteristic. The View's purpose is to arrange, filter,
   transform, or display caller-supplied content.

8. **May accept value parameters too.** A `List` takes `Items` data; a
   `TabBar` takes tab definitions. Parameters are orthogonal to children.

9. **May accept non-variadic child arguments.** A View might accept exactly
   one child view (a decorator pattern) or a fixed number of named child
   slots (`@header`, `@body`, `@footer`). The distinction between variadic
   and non-variadic is a sub-classification within View.

10. **Tree identity depends on materiality.** A View with a material root
    (like `Row`) has tree identity. A View without one (a fragment grouping)
    does not.

11. **Can still draw its own chrome.** "View" does not mean visually invisible.
    A View may render background, border, padding, separators, scroll indicators,
    empty states, or loading chrome. The key distinction is still that callers
    supply the descendant content.

12. **Owns a child contract.** A View's public API includes the shape of caller
    content: variadic `@@children`, fixed named slots, renderer slots, exactly
    one child, or some combination. The validator and IDE should surface that
    contract as prominently as ordinary value parameters.

### 2.3 Characteristics That Both Share

- Both can have state, actions, and queries.
- Both can use `if`, `for`, guards, and other control flow inside their body.
- Both participate in the render tree as invocable declarations.
- Both can be `share`d (exported) from a file.
- Both can be rendered by other declarations.
- Both can have a `render` block (per the root-model decision).

### 2.4 The Key Differentiator

The single load-bearing question: **does the caller supply descendant views?**

- If no: **UI**.
- If yes (variadic children, named slots, or non-variadic child arguments):
  **View**.

## 3. Sub-classifications Within View

Views that accept caller-supplied content come in at least three shapes:

### 3.1 Variadic Children (`@@children`)

The View accepts any number of child views. The caller writes a block after
the View render:

```tao
view Card {
  | @@children |
  render Col [gap 12, pad 16] {
    @@children
  }
}

Card [margin 12] {
  Text "Title"
  Text "Subtitle"
  Button "Action", DoThing { }
}
```

### 3.2 Named Slots (Non-Variadic Named Children)

The View accepts a fixed set of named child parts:

```tao
view Dialog {
  | @title, @body, @actions |
  render Col [pad 24, gap 16] {
    @title
    @body
    Row [spread, gap 8] {
      @actions
    }
  }
}

Dialog {
  @title { Text "Confirm" }
  @body { Text "Are you sure?" }
  @actions {
    Button "Cancel", Cancel { }
    Button "OK", Confirm { }
  }
}
```

### 3.3 Renderer Slots (View Functions)

The View accepts a view function that it calls with data:

```tao
view List Items {
  | @row Item |
  render Col [gap 8] {
    for Item in Items {
      @row Item
    }
  }
}

List Tasks {
  @row Task {
    Row [gap 8] {
      Text Task.Title
      Text Task.Status
    }
  }
}
```

### 3.4 Single Child (Decorator Pattern)

The View wraps exactly one child view:

```tao
view Pressable Action {
  | @child |
  render Box {
    @child
  }
}
```

## 4. Layout Ownership Under This Model

The three-channel layout model from the Decision doc maps cleanly onto the
UI/View distinction.

### 4.1 Layout Channels (Recap)

| Channel         | Meaning                                      | Examples                                                                                                           |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Self placement  | How this node sits in its parent             | `width`, `height`, `margin`, `grow`, `shrink`, `basis`, `centered`, `absolute`, offsets, `z`                       |
| Interior        | How this node's box affects its content area | `pad`, `overflow`                                                                                                  |
| Child/container | How this node arranges children              | `row`, `column`, `wrap`, `gap`, child alignment (`top`, `left`, `center`, `stretch`, `spread`, `around`, `evenly`) |

### 4.2 Layout Rules for UI

| Who                     | Self placement                      | Interior              | Child/container       |
| ----------------------- | ----------------------------------- | --------------------- | --------------------- |
| UI declaration (author) | May set defaults on the root render | Fully owns            | Fully owns            |
| Call site (parent)      | May override per canonical key      | Rejected by validator | Rejected by validator |

Because a UI's children are author-specified, the interior and container layout
are the author's business. The parent only positions the UI as a unit.

Example:

```tao
ui ProfileLink User {
  render Row [gap 8, pad 8 12, center] {
    Avatar User
    Text User.Name
  }
}

Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320]
}
```

- `gap 8, pad 8 12, center` are declaration-owned interior/container layout.
- `margin 12, width 320` are call-site self-placement layout.
- Call-site `pad 2` would be rejected: interior layout is UI-owned.
- Call-site `gap 4` would be rejected: container layout is UI-owned.

### 4.3 Layout Rules for View

| Who                       | Self placement                      | Interior                                                        | Child/container                                                 |
| ------------------------- | ----------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| View declaration (author) | May set defaults on the root render | Fully owns (unless explicitly exposed)                          | Fully owns (unless explicitly exposed)                          |
| Call site (parent)        | May override per canonical key      | Rejected for custom Views; allowed for direct stdlib containers | Rejected for custom Views; allowed for direct stdlib containers |

For **custom Views**, the same ownership split as UI applies. The View author
owns interior and container layout.

For **direct stdlib containers** (`Row`, `Col`, `Box`), the caller chose the
container, so the caller owns the full layout surface:

```tao
Row [gap 12, spread, pad 8] {
  Text "A"
  Text "B"
}
```

Here `gap 12`, `spread`, and `pad 8` are all caller-owned because the caller
is directly rendering `Row`.

### 4.4 Four Syntax Positions for Layout

Layout can appear at four positions. The UI/View distinction clarifies what
each position means.

#### Position A: View declaration, outside the block

```tao
ui ProfileLink User [margin 8, width 320] {
  ...
}
```

This would declare the UI's **public self-placement defaults**. When a caller
renders `ProfileLink` without specifying margin or width, these defaults apply.
The caller can override them.

Status: not in MVP. Reserved for later if needed.

#### Position B: View declaration, inside the block (on the root render)

```tao
ui ProfileLink User {
  render Row [gap 8, pad 8 12, center] {
    Avatar User
    Text User.Name
  }
}
```

This is the **declaration's interior and container layout**. It lives on the
root `render` statement. The author fully owns it.

Status: this is the chosen model from the Decision doc.

#### Position C: View render, outside the block (call-site layout clause)

```tao
Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320]
}
```

This is the **parent's self-placement layout** for the rendered entity.
For UIs and custom Views: self-placement only.
For direct stdlib containers: full surface.

Status: this is the existing `[ ... ]` on `ViewRender`.

#### Position D: View render, inside the block (child-supplied layout)

```tao
Card [margin 12] {
  Text "Title" [centered]
  Row [gap 8] {
    Button "A", DoA [width 80]
    Button "B", DoB [width 80]
  }
}
```

This is **caller-owned layout on the supplied children**. Each child render
carries its own `[ ... ]` as usual. The child's layout interacts with the
container's layout (the `Card`'s `Col` root determines flex direction; the
child's `centered` resolves against that direction).

Status: already works.

### 4.5 Layout Property Classification by Entity Type

| Property class                              | Applies to UI?                  | Applies to View with children?  | Applies to direct stdlib container?        |
| ------------------------------------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| Self-placement (margin, size, grow, etc.)   | Yes, at call site               | Yes, at call site               | Yes, at call site                          |
| Interior (pad, overflow)                    | Declaration only                | Declaration only                | Caller or declaration                      |
| Container (gap, direction, child alignment) | Declaration only                | Declaration only                | Caller or declaration                      |
| Self-placement defaults                     | Declaration (position A, later) | Declaration (position A, later) | Not applicable (no declaration for stdlib) |

## 5. What Tao Would Look Like With `ui` and `view`

### 5.1 Standard Library

The std-lib splits into two groups:

```tao
// Views: containers whose children come from callers
share view Box { ... }
share view Col { ... }
share view Row { ... }
share view ScrollView { ... }

// UIs: self-contained visual elements
share ui Text Value text { ... }
share ui Number Value number { ... }
share ui Button Title text, Action action { ... }
share ui Image Source url { ... }
```

`Text` is a UI because it renders its own content (the text value) and does not
accept child views. `Button` is a UI because it renders a title and an action
target; it does not accept child views. `Row` is a View because its purpose is
to arrange caller-supplied children.

### 5.2 User-Defined UIs

```tao
use Text, Row, Col, Button, Image from @tao/ui

ui Avatar User {
  render Image User.Photo [width 40, height 40, radius full]
}

ui ProfileLink User {
  render Row [gap 8, pad 8, center] {
    Avatar User
    Text User.Name
  }
}

ui Divider {
  render Box [height 1, stretched] (bg divider_color)
}

ui NumberBadge Value number {
  render Box [pad 4 8, radius full] (bg accent, text white) {
    Number Value
  }
}

ui LoginForm OnSubmit action {
  state Username = ""
  state Password = ""
  action Submit {
    // validate, then...
    invoke OnSubmit
  }
  render Col [gap 16, pad 24] {
    TextInput Username, SetUsername [stretched]
    TextInput Password, SetPassword [stretched]
    Button "Log In", Submit [centered, width 200]
  }
}
```

Key observations:

- Every `ui` has a `render` block with a material root.
- The `render` block owns interior and container layout.
- Value and action parameters are on the declaration line.
- No `@@children`, no slots, no caller-supplied views.

### 5.3 User-Defined Views (Variadic Children)

```tao
view Card {
  | @@children |
  render Col [gap 12, pad 16, radius 12] (bg card_surface) {
    @@children
  }
}

view Section Title text {
  | @@children |
  render Col [gap 8] {
    Text Title (text section_header)
    @@children
  }
}

// Usage:
Card [margin 12, width 320] {
  Section "Profile" {
    ProfileLink CurrentUser
    ProfileLink Friend1
  }
  Section "Settings" {
    SettingsRow "Notifications", NotifToggle
    SettingsRow "Dark Mode", DarkModeToggle
  }
}
```

Key observations:

- `view` declarations have `| @@children |` (or named slots).
- `Card` is a View because callers supply its content.
- `Section` is a View because callers supply its content (with a fixed title).
- Call-site `[margin 12, width 320]` is self-placement only.

### 5.4 User-Defined Views (Named Slots)

```tao
view Dialog {
  | @title, @body, @actions |
  render Col [pad 24, gap 16, radius 16] (bg dialog_surface) {
    Box [pad bottom 8] {
      @title
    }
    @body
    Row [spread, gap 8, pad top 16] {
      @actions
    }
  }
}

Dialog [centered, width 360] {
  @title { Text "Delete Item?" (text heading) }
  @body { Text "This cannot be undone." }
  @actions {
    Button "Cancel", Cancel
    Button "Delete", ConfirmDelete (bg danger)
  }
}
```

### 5.5 User-Defined Views (Renderer Slots)

```tao
view List Items {
  | @row Item |
  render Col [gap 8] {
    for Item in Items {
      @row Item [margin horizontal 4]
    }
  }
}

List Tasks [margin 12] {
  @row Task {
    Row [gap 8, pad 8] {
      Text Task.Title
      Text Task.Status [packed]
    }
  }
}
```

### 5.6 The Full Kitchen Sink Under This Model

```tao
use Text, Col, Row, Button, Number from @tao/ui

app KitchenSink {
  ui AppView
}

state FileLevelDemoCounter = 0

action BumpFileLevelDemo {
  set FileLevelDemoCounter += 1
}

ui AppView {
  render Col [top left, gap 12, pad 16] {
    Text "Kitchen Sink"
    Text "Exercises types, state, scopes, objects..."
    Row [center spread, gap 8] {
      Text "File-level counter:" [packed]
      Number FileLevelDemoCounter [centered]
      Button "Top-level action", BumpFileLevelDemo [centered, width 180]
    }
    Divider
    StateDemo
    Divider
    ScopesDemo
  }
}

ui Divider {
  render Box [height 1, stretched] (bg divider_color)
}
```

`AppView` is a `ui` because it specifies all its own children. No caller
supplies content to it. `Divider` is a `ui` because it renders one visible
element and takes no children.

### 5.7 Edge Cases and Judgment Calls

#### A `Card` that takes no children

```tao
ui UserCard User {
  render Col [gap 8, pad 12, radius 8] (bg card_surface) {
    Avatar User
    Text User.Name
    Text User.Email (text secondary)
  }
}
```

This is a `ui` even though it looks "card-like." It specifies all its own
children. If the author later wants callers to supply children, it becomes a
`view`.

#### A `Card` that takes children

```tao
view Card {
  | @@children |
  render Col [gap 12, pad 16, radius 12] (bg card_surface) {
    @@children
  }
}
```

This is a `view` because callers supply the content.

#### State-only wrapper

```tao
// This does not fit either `ui` or `view` cleanly.
// It is a conceptual entity that holds state and renders one child.
// Options:
// 1. Make it a `ui` that renders its single child directly.
// 2. Defer conceptual wrappers to a future `fragment` or `helper` kind.
// 3. Allow `view` without children for conceptual wrappers.
```

This is a real gap. Section 7 addresses it.

## 6. What the Distinction Enables

### 6.1 Validator Precision

The validator can give different rules to `ui` and `view`:

| Rule                             | For `ui`                               | For `view`                                                         |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Must have `render` block         | Yes                                    | Yes                                                                |
| May have `@@children` / slots    | No                                     | Yes (at least one required)                                        |
| Call-site `[ ... ]` keys allowed | Self-placement only                    | Self-placement only (custom); full surface (direct stdlib)         |
| Call-site interior layout        | Rejected                               | Rejected (custom); allowed (direct stdlib)                         |
| Call-site container layout       | Rejected                               | Rejected (custom); allowed (direct stdlib)                         |
| Call-site `{ ... }` block        | Rejected                               | Required (for child-accepting Views)                               |
| Empty render block               | Warning (a UI should render something) | Allowed (a View with conditional children may be empty at runtime) |
| Literally empty call-site block  | N/A                                    | Warning (caller passed no children to a View that expects them)    |

### 6.2 IDE Guidance

- Autocomplete after a `ui` render: only self-placement layout keys.
- Autocomplete after a `view` render: self-placement keys for custom Views;
  full keys for direct stdlib containers.
- Hover on a `ui` name: "UI declaration; does not accept children."
- Hover on a `view` name: "View declaration; accepts @@children" (or shows
  the slot signature).
- Error on `MyUI { Text "extra" }`: "MyUI is a `ui` declaration and does
  not accept children. Remove the block, or change MyUI to a `view` with
  `@@children`."
- Error on `MyView` (no block): "MyView expects children. Add a `{ ... }`
  block with content."

### 6.3 Documentation and Pedagogy

The distinction maps to a mental model most developers already have:

- "I'm building a self-contained thing" -> `ui`
- "I'm building a container that other things go in" -> `view`

This is simpler than the three-keyword model (atom/view/container) because it
has only two keywords, and the split is based on one question (do callers
supply children?), not two (do callers supply children? and does it have a
root?).

### 6.4 Refactor Safety

Changing a `ui` to a `view` (adding `@@children`) or a `view` to a `ui`
(removing `@@children`) is a deliberate keyword change. The public contract
of the declaration changes visibly. This avoids the fragility of implicit
root inference (where adding a sibling silently changes the public surface).

### 6.5 Future-Proofing

- **Styling**: both `ui` and `view` can accept `( ... )` styling on their
  root render. The ownership rule is the same: declaration owns visual
  internals; callers see only the public surface.
- **Themes**: both can be theme boundaries.
- **Accessibility**: both have a material root for a11y props.
- **Animation**: both have a material root for animation hosts.
- **Library bridges**: imported components declare whether they are `ui`-like
  (no children) or `view`-like (accept children) in their bridge metadata.

## 7. Open Questions and Gaps

### 7.1 Renderer Slots: UI or View?

A `List` takes `Items` (data) and `@row Item` (a renderer slot). The renderer
slot is a view function, not direct children. Is `List` a View?

Arguments for View: the caller supplies a view function that determines what
appears inside the List. This is structurally "caller-supplied content."

Arguments for UI: the caller does not supply direct children; the caller
supplies a _function_ that the List calls. The List itself decides when and
how to call it. This is closer to a callback parameter than to children.

**Proposed resolution**: A declaration that accepts renderer slots is a View.
The renderer slot is a form of caller-supplied content, even though it is
invoked rather than inserted. This keeps the rule simple: if a caller
influences what descendant views appear, it is a View.

### 7.2 Conceptual Wrappers

A declaration that exists only to hold state, wrap a guard, or re-export
another view does not fit `ui` (it does not render something inherently
visible) or `view` (it does not accept children). Options:

1. **Allow `ui` for conceptual wrappers.** The wrapper must still have a
   `render` block, which means it gets a material root even though it "does
   not want one." Accept the extra React element as the cost of a simple
   two-keyword model.

2. **Add a third keyword later** (`fragment`, `helper`, `compose`). This is
   the three-keyword model from F3/A9 in the Design Doc. Defer it.

3. **Allow `view` without children for conceptual wrappers.** Weakens the
   "View means caller-supplied children" invariant.

**Proposed resolution**: option 1 for now. Conceptual wrappers are `ui`
declarations. They get a material root (a `Box` or similar). The extra
React element cost is acceptable because conceptual wrappers are
uncommon, and having a root makes them debuggable and testable. If the
pattern becomes common enough to warrant a third keyword, add it later.

### 7.3 How Does This Relate to the Root Model Decision?

The root model decision (targeted root `render <View>`) applies to both `ui`
and `view`. Both require exactly one root `render` statement. The difference
is only in whether callers can supply children.

The `ui`/`view` distinction is orthogonal to the root model. It answers a
different question: not "does the declaration have a root?" (both do), but
"who supplies the descendants?"

### 7.4 Does `view` Still Need `render`?

Under the root model decision, both `ui` and `view` need a `render` block.
A `view` with `@@children` renders its children inside the root:

```tao
view Card {
  | @@children |
  render Col [gap 12, pad 16] {
    @@children
  }
}
```

The `render` is where the container layout lives. Without it, the View has
no material root for layout to target.

### 7.5 What About `share view Row` in the Std-Lib?

Currently the std-lib declares `share view Row { inject ... }`. Under this
model, `Row` would become `share view Row { ... }` and remain a `view`
because it accepts `@@children` (callers supply children inside `Row { ... }`).

`Text` would become `share ui Text Value text { inject ... }` because it does
not accept children.

`Button` would become `share ui Button Title text, Action action { inject ... }`.

### 7.6 Syntax Weight

The new model adds one keyword (`ui`) and repurposes the existing keyword
(`view`). Total keyword surface for UI declarations goes from one to two.
This is less than the three-keyword model (atom/view/container) and carries
a cleaner single-axis distinction.

The keyword `ui` is short (two characters), visually distinct from `view`,
and maps to the most common intent: "I am building a self-contained piece
of UI."

### 7.7 Migration Cost

Every existing `view` declaration in `Apps/` and the std-lib would need to
be classified as either `ui` or `view`. In current code:

- Most user-defined views in `Apps/` are `ui` (they specify all their own
  children).
- `Box`, `Col`, `Row` in the std-lib are `view` (they accept children).
- `Text`, `Number`, `Button` in the std-lib are `ui` (they do not accept
  children).

The migration is mechanical: if the declaration uses `@@children`, named
slots, or renderer slots, it stays `view`. Otherwise it becomes `ui`.

## 8. Comparison With Prior Alternatives

| Criterion                | Current model (one `view` + root `render`)     | `ui`/`view` split                                 | Three keywords (A9)                |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| Keywords                 | 1                                              | 2                                                 | 3                                  |
| Distinction axis         | None (all are `view`)                          | Who supplies children?                            | Children + root + leaf             |
| Validator precision      | Medium (root model helps)                      | High (two distinct rule sets)                     | Highest (three rule sets)          |
| Pedagogy                 | Simple keyword, complex internal rules         | Two keywords, one simple question                 | Three keywords, two questions      |
| Refactor safety          | Root model already provides this               | Same, plus keyword change signals contract change | Same                               |
| Layout ownership clarity | Same three channels                            | Same, but validator can enforce per-keyword       | Same                               |
| Future extensibility     | Needs ad-hoc rules for children vs no-children | Clean extension point                             | Already has three extension points |
| Migration cost           | None (already chosen)                          | Moderate (classify each declaration)              | Higher (classify into three bins)  |
| Syntax weight            | Minimal                                        | Low (one new keyword)                             | Moderate (two new keywords)        |

## 9. Relationship to Layout Specification

### 9.1 How Layout Properties Map Under This Model

Every layout property from the Layout Design Doc falls into the three-channel
classification. The UI/View distinction does not change the classification; it
changes who can specify each channel at which syntax position.

**Self-placement properties** (margin, size, grow, shrink, basis,
self-alignment, positioning, offsets, z):

- Declaration can set defaults (position B).
- Call site can override (position C).
- Both `ui` and `view` follow this rule.

**Interior properties** (pad, overflow):

- Declaration owns (position B).
- Call site rejected for both `ui` and custom `view`.
- Call site allowed for direct stdlib containers.

**Container/child-arrangement properties** (row, column, wrap, gap, child
alignment, spread, around, evenly):

- Declaration owns (position B).
- Call site rejected for both `ui` and custom `view`.
- Call site allowed for direct stdlib containers.

### 9.2 The Pad Stress Case Under This Model

```tao
ui ProfileLink User {
  render Row [gap 8, pad 8 12, center] {
    Avatar User
    Text User.Name
  }
}

Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320, pad 2]
}
```

`ProfileLink` is a `ui`. The validator rejects `pad 2` at the call site
because interior layout is declaration-owned for `ui` declarations.

The rule is the same as the prior Decision doc's rule, but now the validator
can phrase it in terms of the declaration kind: "ProfileLink is a `ui`
declaration. Interior layout (`pad`) is owned by the declaration and cannot
be overridden at the call site."

### 9.3 Direct Stdlib Container Layout

```tao
Row [gap 12, spread, pad 8] {
  Text "A"
  Text "B"
}
```

`Row` is a `view` (stdlib container). Because the caller chose `Row` directly,
the full layout surface is available at the call site. This is unchanged from
the prior model.

### 9.4 Custom View Container Layout

```tao
view Card {
  | @@children |
  render Col [gap 12, pad 16] {
    @@children
  }
}

Card [margin 12, width 320] {
  Text "Title"
  Text "Body"
}
```

`Card` is a custom `view`. The validator rejects `Card [gap 4]` or
`Card [pad 8]` at the call site because interior and container layout are
declaration-owned.

### 9.5 Parameterized Layout

If a `ui` or `view` wants callers to influence interior layout, it exposes
a parameter:

```tao
ui ProfileLink User, HorizontalPad {
  render Row [gap 8, pad vertical 8, pad horizontal HorizontalPad, center] {
    Avatar User
    Text User.Name
  }
}

ProfileLink CurrentUser, 2 [margin 12, width 320]
```

The parameter mechanism is the same regardless of `ui`/`view`. The
distinction does not change parameterized layout; it just makes the
ownership rule explicit per declaration kind.

## 10. Summary of the Proposal

1. **Two declaration keywords**: `ui` and `view`.
2. **`ui`**: author-specified children, always has a material root, does not
   accept `@@children` or slots. Callers can only specify self-placement
   layout.
3. **`view`**: caller-specified children via `@@children`, named slots, or
   renderer slots. Always has a material root (via required `render` block).
   Callers can only specify self-placement layout for custom Views; full
   surface for direct stdlib containers.
4. **Both require a `render` block** per the root model decision.
5. **Layout ownership** follows the three-channel model. The UI/View
   distinction does not change the channels; it gives the validator a
   keyword-level signal for enforcing ownership.
6. **Conceptual wrappers** are `ui` for now (they get a material root).
   A third keyword may be added later if the pattern is common enough.
7. **Std-lib migration**: `Row`, `Col`, `Box`, `ScrollView` stay `view`;
   `Text`, `Number`, `Button`, `Image` become `ui`.
8. **User code migration**: mechanical; classify each declaration by whether
   callers supply children.

## 11. Recommended Full-Language Direction

If Tao is designing the first complete UI language rather than only the smallest
layout fix, the `ui`/`view` split is the strongest end-state currently on the
table.

The recommended full-language model is:

- `ui` for closed, self-contained components whose descendants are authored in
  the declaration;
- `view` for open containers whose descendants or renderers are supplied by the
  caller;
- required targeted root `render RootView` for both `ui` and `view`;
- self-placement layout at call sites for `ui` and custom `view` declarations;
- full container/interior layout at direct standard-library container render
  sites;
- explicit parameters, variants, theme values, named parts, or future forwarding
  contracts for any intentional interior customization;
- a possible future third kind, such as `fragment` or `scope`, only if rootless
  conceptual wrappers become common enough to justify it.

This changes the one-keyword recommendation from the peer root-model docs in one
important way: the targeted root `render` model still wins, but the declaration
taxonomy becomes two keywords instead of one overloaded `view`. The root model
answers "where does layout attach?" The `ui`/`view` split answers "who supplies
the descendants?"

The split should be adopted only if Tao is comfortable paying the keyword and
migration cost now in exchange for stronger long-term validation, clearer IDE
guidance, and a simpler mental model for ownership.

## 12. Questions for Decision

Before adopting this model, these questions need answers:

1. **Is `ui` the right keyword?** Alternatives: `element`, `atom`, `widget`,
   `component`. `ui` is the shortest and most natural in Tao's vocabulary.
   `element` echoes React. `atom` was used in the A9 alternative.

2. **Should renderer slots make a declaration a `view`?** (Section 7.1
   proposes yes.)

3. **Should conceptual wrappers be `ui` or require a third keyword?**
   (Section 7.2 proposes `ui` for now.)

4. **Is the keyword change justified by the value?** The root model decision
   already solves the layout target problem with one keyword. The `ui`/`view`
   split adds validator precision, IDE guidance, and pedagogic clarity. Is
   that enough value to justify a second keyword?

5. **Does this interact with `app`?** The `app` declaration already exists.
   Under this model, `app KitchenSink { ui AppView }` reads naturally: the
   app's entry point is a UI.

6. **Does this foreclose any future feature?** The split should not make it
   harder to add fragment declarations, `display: contents`, conditional
   roots, layout forwarding, or style customization APIs later.
