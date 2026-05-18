# View Root Model Decision

This document decides how Tao views expose a root render target for layout,
styling, accessibility, and React Native/Expo runtime mapping.

## Problem

Generated Tao views currently compile to React fragments. A fragment can group
multiple rendered children, but it cannot receive React Native `style`,
accessibility props, test IDs, event targets, or layout props.

That makes this shape ambiguous:

```tao
view Header User {
  Text User.Name
  Text User.Role
}

Row {
  Header CurrentUser [margin 12]
}
```

`Header` looks like a thing in Tao, but if it compiles to a fragment there is no
material React Native node for `[margin 12]` to target. Tao must either provide a
real root, reject the layout, or make the declaration explicitly fragment-like.
It must never silently ignore layout or styling.

## Terms

- **View**: a reusable Tao UI declaration.
- **Rootful view**: a view whose render result has one material root node.
- **Targeted root render statement**: a root `render` statement that names the
  material render target, such as `render Row { ... }`.
- **Bare root render block**: a special root `render { ... }` block whose
  material target is implied by the enclosing view declaration instead of named
  after `render`.
- **Fragment/composition view**: a view-like grouping that renders zero, one, or
  many siblings without adding a material root node.
- **Element/component**: possible names for a declaration that always renders one
  material root. This document rejects adding that keyword for MVP.
- **UI/View split**: a full-language alternative where `ui` means a closed,
  self-contained declaration whose descendants are authored inside the
  declaration, and `view` means an open container whose descendants or renderers
  are supplied by callers.
- **Container**: a material renderable that arranges child UI, such as `Row`,
  `Col`, `Box`, `ScrollView`, or a future bridged native component.
- **Child view**: UI supplied inside another render call's body.
- **Slot**: a named child UI part supplied by a caller, such as `@header`.
- **Renderer slot**: a supplied view function that is invoked with data, such as
  `@row Task`.
- **Conceptual UI boundary**: a UI construct that may affect rendering but is not
  itself a styleable visual box, such as `if`, `for`, a data/loading guard, a
  theme provider, a route outlet, a portal, a slot, or a renderer function.
- **Declaration-owned layout/style**: layout or style specified by the view
  itself for its root or internals.
- **Call-site-owned layout/style**: layout or style specified where the view is
  rendered by a parent.
- **Self placement layout**: layout that describes how a rendered root sits in
  its parent, such as size, margin, grow, shrink, basis, self alignment,
  positioning, offsets, and z order.
- **Interior layout**: layout that describes the rendered root's own content
  area, such as padding, overflow, and box sizing.
- **Child/container layout**: layout that describes how a container arranges its
  children, such as row/column direction, wrap, gap, and child alignment.

## Decision

Tao should keep one primary declaration keyword, `view`, and require each
rootful view to contain exactly one explicit targeted root `render` statement.

```tao
view Header User {
  render Row [gap 8, center] {
    Text User.Name
    Text User.Role
  }
}

Row {
  Header CurrentUser [margin 12]
}
```

The root `render` statement defines the view's material root. Call-site layout
and future call-site styling for the custom view target that root. Multiple
descendants are still allowed, but they must live inside the root render body.
For MVP, the root render statement names the material target. A bare
`render { ... }` block is a meaningful alternative, but it is not the chosen
first model.

MVP rules:

- A normal `view` is rootful.
- Each rootful `view` must have exactly one top-level `render` statement.
- The root `render` statement must render a material UI target: a standard
  library view, a bridged native component with a root, or another rootful Tao
  view.
- Top-level sibling renders outside the root are invalid.
- `if`, `for`, guards, providers, slots, and renderer calls may appear inside the
  root body, but they are not themselves the view root for MVP.
- Layout or styling on a custom view call site is valid only for the public
  surface the custom view exposes. For MVP, layout on a custom view call site is
  limited to self placement layout, not arbitrary interior layout.
- Direct renders of standard-library containers are different: the caller chose
  the concrete container, so that render site may specify self, interior, and
  child/container layout when the target supports those keys.
- Fragment/composition declarations are deferred. If Tao adds them later, they
  must be explicit and cannot accept layout or styling at their call site.

The full-language `ui`/`view` split is documented separately in
[UI vs View Distinction](./UI%20vs%20View%20Distinction.md). If adopted, it
refines this decision without changing the root rule: both `ui` and `view` still
need a material root; `ui` is closed over its own descendants, while `view`
accepts caller-supplied children, named slots, or renderer slots.

## Why `render` Earns The Syntax

The `render` statement is not only a keyword for "draw this." It creates a
distinct syntax location for the root contract of the view.

Useful root-level concerns include:

- root layout defaults, such as child arrangement, padding, and gap;
- future root styling defaults, such as background, radius, and text style;
- accessibility role, label, state, and hidden behavior;
- test IDs and debug tree names;
- future transition or motion hooks attached to the root;
- the root's layout role, such as row-like, column-like, scrollable, or
  self-only;
- bridge metadata for native components that need wrappers.

Value parameters should still belong to the `view` declaration and the view call
site. The root `render` statement should not introduce a second parameter system
unless a later feature proves a concrete need.

## Alternatives

### 1. Current Fragment Model

```tao
view Header User {
  Text User.Name
  Text User.Role
}

Row {
  Header CurrentUser [margin 12]
}
```

This keeps the current shape, but it makes custom views ambiguous. `Header`
looks styleable and layout-capable, while the runtime result may be a fragment.
Tao could reject `[margin 12]`, but then reusable views cannot participate in
normal layout unless authors manually add wrapper views everywhere.

This is not the chosen model.

### 2. Required Targeted Root `render` Statement

```tao
view Header User {
  render Row [gap 8, center] {
    Text User.Name
    Text User.Role
  }
}

Header CurrentUser [margin 12]
```

This is the chosen model. It makes the root explicit, keeps `view` as the single
main declaration kind, and gives the compiler a stable target for validation,
code generation, accessibility, and runtime props.

### 3. Bare Root `render` Block

```tao
view Header User {
  render {
    Text User.Name
    Text User.Role
  }
}

Header CurrentUser [margin 12]
```

In this model, the root render of a view is special. It does not render another
view by name. Instead, the enclosing view declaration supplies the public root
identity, so the generated output tree can expose `Header` as the root node.
Root-only parameters could also live on this block later:

```tao
view Header User {
  render [row, gap 8] {
    Text User.Name
    Text User.Role
  }
}
```

This is attractive because it gives custom views their own root identity instead
of making the source appear rooted in `Row`, `Col`, or `Box`. It also gives Tao a
single special place for root-specific metadata.

The drawback is that Tao still needs a material React Native host target. If the
target is implied, Tao must define what the implied host is, how row/column/scroll
roles are selected, whether the root can be text-like or button-like, and how
native library bridges avoid accidental wrappers. A bare root block tends to
become a default wrapper view with a custom display name. That is less hidden
than compiler-inserted wrappers, but it still makes the actual host primitive
less visible than `render Row { ... }`.

This is a serious later shorthand or abstraction candidate, but not the MVP
choice.

### 4. Separate `view` And `element`

```tao
view ProfileSummary User {
  Text User.Name
  FriendBadge User
}

element ProfileCard User {
  Row [gap 12] {
    ProfileSummary User
  }
}

ProfileSummary User [margin 12]
ProfileCard User [margin 12]
```

This makes the rootful/fragment split explicit, but it adds a second declaration
taxonomy before Tao has proven that it needs one. It also makes authors decide
between `view`, `element`, and possibly `component` before the rest of the child,
slot, renderer, and bridge model is settled.

This is a possible later refinement, not the MVP choice.

### 5. Implicit Root Inference

```tao
view Avatar User {
  Image User.Photo [width 40, height 40]
}

Avatar User [margin 8]

view NameAndRole User {
  Text User.Name
  Text User.Role
}

NameAndRole User [margin 8]
```

This allows `Avatar` to be styleable because it has one render, but rejects
`NameAndRole` because it has multiple sibling renders.

The downside is refactor fragility. Adding a sibling to a view silently changes
whether callers can lay it out. It also makes the root contract a derived fact
instead of an intentional declaration.

This is not the chosen model.

### 6. Compiler-Inserted Wrapper Root

```tao
view NameAndRole User {
  Text User.Name
  Text User.Role
}

NameAndRole User [margin 8]
```

The compiler could insert a wrapper `View` around `NameAndRole` when layout or
styling appears at the call site.

This is convenient, but hidden wrappers are too costly for Tao's default model.
They can change flex behavior, accessibility tree shape, event targeting, test
queries, z-order, measurement, and native performance. A wrapper should be a
visible choice in Tao source or explicit bridge metadata, not a surprise.

This is not the chosen model.

### 7. Explicit Root Contract Annotation

```tao
view Header User renders Row {
  Text User.Name
  Text User.Role
}

fragment Metadata User {
  Text User.Name
  Text User.Role
}
```

This makes the root contract compact, but it splits root selection away from the
actual rendered tree. It also introduces another keyword surface while still
needing rules for root layout, styling, accessibility, slots, and renderers.

This is less clear than an explicit targeted root `render` statement for MVP.

## Capability Matrix

| Option                 | Accepts children | Accepts renderers | Material root       | Call-site layout/style   | Declaration defaults          | Variants                     | Accessibility/test ID | RN/Expo mapping          | IDE validation           |
| ---------------------- | ---------------- | ----------------- | ------------------- | ------------------------ | ----------------------------- | ---------------------------- | --------------------- | ------------------------ | ------------------------ |
| Fragment model         | Yes              | Yes               | No                  | Must reject or ignore    | Only on inner nodes           | Possible but unclear         | No root target        | Fragile                  | Weak                     |
| Required root `render` | Yes, inside root | Yes, inside root  | Yes                 | Clear root target        | Clear root target             | Via params/theme/style model | Clear root target     | Direct                   | Strong                   |
| Bare root `render`     | Yes, inside root | Yes, inside root  | Yes, implied        | Clear root target        | Clear root target             | Via params/theme/style model | Clear view identity   | Needs implied host rules | Strong but abstract      |
| `view`/`element` split | Depends on kind  | Depends on kind   | Clear for `element` | Clear for `element` only | Clear for `element`           | Clear but split              | Clear for `element`   | Direct                   | Strong but more taxonomy |
| Implicit inference     | Yes              | Yes               | Sometimes           | Body-shape dependent     | Body-shape dependent          | Fragile                      | Body-shape dependent  | Direct when rootful      | Medium                   |
| Auto wrapper           | Yes              | Yes               | Hidden              | Always possible          | Wrapper-dependent             | Possible                     | Hidden target         | Risky                    | Weak                     |
| Root annotation        | Yes              | Yes               | Yes                 | Clear                    | Split between annotation/body | Possible                     | Clear                 | Direct                   | Strong but extra syntax  |

## Entity Taxonomy

Tao should distinguish these capabilities without making every capability a new
keyword:

- **Concrete leaf UI**: `Text`, `Button`, `Image`. These render a concrete node
  and may or may not accept children.
- **Concrete containers**: `Row`, `Col`, `Box`, `ScrollView`, `List`. These
  render a concrete node and arrange children or renderers.
- **Rootful custom views**: normal Tao `view` declarations with one root
  `render` statement.
- **Slots**: supplied UI parts such as `@header`, `@empty`, and `@@children`.
- **Renderer slots**: supplied UI functions such as `@row Task`.
- **Conceptual constructs**: `if`, `for`, guards, providers, route outlets,
  portals, fragments, and render functions. These may influence what appears,
  but they are not automatically styleable boxes.

`List` is both concrete and conceptual: the list itself may map to a concrete
native list or scroll view, while its row renderer is a conceptual function that
produces repeated row roots.

The full-language `ui`/`view` split would turn part of this taxonomy into syntax:

- `ui` would cover closed components such as `Button`, `Header`, `Avatar`,
  `ProfileLink`, `TaskRow`, and `Divider`.
- `view` would cover open containers such as `Row`, `Column`/`Col`, `Box`,
  `ScrollView`, `List`, `Card` with `@@children`, and any declaration with named
  slots or renderer slots.

That split is orthogonal to root materiality. Both kinds still need a root.
The split instead says who supplies descendants, which in turn makes layout
ownership easier to validate.

## Layout Ownership

Tao should split layout into three channels:

| Channel                | Meaning                                         | Examples                                                                                                                                      | Default owner                                                                  |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Self placement         | How this root participates in its parent layout | `width`, `height`, `min_width`, `max_width`, `grow`, `shrink`, `basis`, `margin`, `centered`, `stretched`, `packed`, `absolute`, offsets, `z` | Parent call site for custom view invocations; direct render site for built-ins |
| Interior layout        | How this root's box changes its content area    | `pad`, `pad horizontal`, `overflow`, future `box_sizing`                                                                                      | View declaration for custom views; direct render site for built-ins            |
| Child/container layout | How this root arranges child UI                 | `row`, `column`, `wrap`, `gap`, `top`, `left`, `center`, `stretch`, `spread`, `around`, `evenly`                                              | View declaration for custom views; direct render site for built-ins            |

This split is more important than the syntax position. The same root node may
receive all three channels at runtime, but Tao should treat them as different
ownership surfaces.

A view's root `render` owns the layout that describes its own contents:

```tao
view ProfileLink User {
  render Row [gap 8, pad 8, center] {
    Avatar User
    Text User.Name
  }
}
```

The parent call site owns how that view participates in the parent's layout:

```tao
Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320]
}
```

For custom view calls, Tao should treat call-site layout as self placement
layout by default. It should not let a caller casually rewrite the custom view's
interior or child/container layout with `gap`, `pad`, `row`, `column`, `wrap`,
`spread`, or similar directives unless the view explicitly exposes that control
through parameters or a later layout-forwarding API.

Padding is the important edge case. React Native represents padding as style on
the same root node, but Tao treats padding as interior layout because it changes
the child layout area. Therefore a parent cannot use call-site layout to rewrite
a custom view's root padding by default:

```tao
view ProfileLink User {
  render Row [gap 8, pad 8 12, center] {
    Avatar User
    Text User.Name
  }
}

Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320, pad 2]
}
```

The `pad 2` in the call site is invalid for MVP because it changes
`ProfileLink`'s interior layout. If removed, the runtime root style keeps the
declaration padding:

```tsx
{
  paddingVertical: 8,
  paddingHorizontal: 12,
  margin: 12,
  width: 320
}
```

If the view author wants callers to vary horizontal padding while preserving
vertical padding, the view should expose that as an explicit parameter, variant,
theme value, or future layout-forwarding contract:

```tao
view ProfileLink User, HorizontalPad {
  render Row [gap 8, pad vertical 8, pad horizontal HorizontalPad, center] {
    Avatar User
    Text User.Name
  }
}

ProfileLink CurrentUser, 2 [margin 12, width 320]
```

For allowed self placement keys, call-site layout applies after declaration defaults
on the public root and wins by canonical layout key. Implementations should
canonicalize shorthand values such as `pad 8 12` into explicit side or axis keys
before merging so React Native shorthand precedence never decides Tao behavior.

That same canonical merge rule is still useful for allowed self placement keys.
For example, a declaration default `margin 8 12` plus a call-site
`margin horizontal 4` should resolve by explicit edges:

```tsx
{
  marginTop: 8,
  marginRight: 4,
  marginBottom: 8,
  marginLeft: 4
}
```

The difference from `pad` is not the runtime representation. Both compile to
React Native style props. The difference is ownership: margin places the custom
view in the parent's layout, while padding changes the custom view's internal
content area.

Direct standard-library containers remain different:

```tao
Row [gap 12, spread] {
  Text "A"
  Text "B"
}
```

Here the caller is rendering `Row` directly, so child arrangement belongs at the
call site.

Root render syntax positions should follow the same ownership rule:

```tao
view ProfileLink User {
  render Row [gap 8, pad 8 12, center] {
    Avatar User [margin right 8]
    Text User.Name
  }
}
```

- Layout inside the root `render Row [ ... ]` is declaration-owned for
  `ProfileLink`.
- Layout on child renders inside the root block, such as `Avatar User [margin
  right 8]`, is also declaration-owned because the declaration is composing its
  own internals.
- Layout on the external call `ProfileLink CurrentUser [margin 12]` is
  parent-owned self placement layout.
- A future layout clause before the render block should be reserved, if used at
  all, for declaring the custom view's public layout interface or self-placement
  defaults. It should not be needed for MVP because the targeted root `render`
  already gives declaration-owned root layout a clear location.

## Styling Ownership

Styling should follow the same root-target rule as layout, but arbitrary styling
override should not become the default component customization model.

A reusable view should normally own its visual internals and expose variability
through typed parameters, variants, theme tokens, named style bundles, or future
named parts:

```tao
view ProfileLink User, Tone {
  render Row [gap 8, pad 8] (profile_link Tone) {
    Avatar User
    Text User.Name (profile_link_text Tone)
  }
}

ProfileLink CurrentUser, friend [margin 12]
```

The exact styling syntax is deferred, but the root model decision still matters:
when styling exists, a rootful custom view has a target and a fragment-like
composition does not.

## Slots And Renderers

Slots and renderers need the same root discipline.

```tao
view List Items {
  |
    @row Item
    optional @empty
  |

  render Col [gap 8] {
    if Items.empty {
      @empty
    }

    for Item in Items {
      @row Item [margin 4]
    }
  }
}
```

Rules to preserve:

- A slot supplied as UI must either be rootful or be used only where a fragment is
  allowed.
- Layout on `@row Item [margin 4]` applies to each rendered row root as self
  placement layout inside the callee's container.
- A callee can place a slot in its own layout, but it must not silently overwrite
  layout supplied with the slot unless a merge rule is explicit.
- A renderer slot's return contract should say whether it returns one rootful UI
  entity or fragment-like UI.

## Library Bridge Implications

Imported React Native/Expo components need metadata that answers:

- Does this component render a material root?
- Does it accept children?
- Does it accept named child props or render props?
- Does it expose a `style` prop directly?
- Does it require a wrapper for layout or style?
- Is it row-like, column-like, scrollable, text-like, image-like, or self-only?
- Which props are accessibility props, event handlers, test IDs, or visual style?

The root model should make bridges explicit. A bridged component can be rootful
even when it does not accept children, and a bridge can declare a required wrapper
when the native target cannot receive style directly.

## Validator And IDE Rules

Validation should enforce the root contract:

- A rootful `view` has exactly one top-level root `render` statement.
- A root `render` statement targets a material renderable.
- Sibling top-level UI statements outside the root are errors.
- Layout or styling on a fragment-like value is an error.
- Layout or styling on a conceptual construct is an error unless that construct
  explicitly forwards to a material root.
- Custom view call-site layout accepts only self placement layout keys until Tao has
  an explicit forwarding model. Interior/container keys such as `gap`, `pad`,
  `row`, `column`, `wrap`, and child arrangement words are declaration-owned on
  custom views by default.
- Allowed call-site and declaration defaults merge by canonical layout key after
  shorthand expansion. Banned keys fail before merge.
- Built-in containers accept both self layout and child-arrangement layout at
  their direct render sites.
- Diagnostics should name the missing root and suggest adding `render Row { ... }`
  or another appropriate root container.

The IDE can then autocomplete layout/style only where the target accepts it,
surface slot arity and return-root contracts, and show a stable debug tree that
matches runtime behavior.

## Rejected Alternatives

- **Status quo fragments**: too easy to write layout/style that has no target.
- **Separate `element` keyword now**: plausible later, but premature before Tao
  proves view children, slots, renderers, and bridge metadata.
- **Bare root `render` block now**: promising for custom view identity, but it
  still needs an implied host model and risks hiding the actual native primitive.
- **Implicit root inference**: convenient but makes call-site validity depend on
  internal body shape.
- **Auto wrappers**: hide runtime tree changes and can affect layout,
  accessibility, events, tests, and performance.
- **Root annotation instead of `render`**: compact, but less local to the actual
  rendered root and still needs a second syntax for root-specific concerns.

## Implementation Consequences

When this design is implemented later:

- The parser must represent the targeted root `render` statement distinctly from
  ordinary nested view renders.
- The formatter should preserve the root `render` keyword and should not drop it.
- The validator must reject rootless views, multiple roots, bare root `render`
  blocks for MVP, and layout/style on rootless constructs.
- Code generation should compile a rootful view to the generated root element,
  not a React fragment.
- Runtime layout/style props for a custom view invocation should be threaded to
  the generated root target, with no `_taoLayout` leaking to unsupported native
  components.
- Existing docs that say `render` can always be dropped inside a view must be
  updated when this design becomes implementation work.
