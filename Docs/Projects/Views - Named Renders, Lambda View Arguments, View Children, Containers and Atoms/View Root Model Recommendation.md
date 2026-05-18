# View Root Model Recommendation

This document narrows the possible Tao view root models and recommends the
single model Tao should use first. It is a companion to
[View Root Model Decision](./View%20Root%20Model%20Decision.md).

## Decision Pressure

The root model must answer one core question: when a Tao author renders a custom
view, is there a real React Native node that can receive layout, styling,
accessibility props, event targets, debug names, and test IDs?

The answer must be visible in Tao source. A layout or style clause must never be
accepted if Tao cannot identify the material node it targets.

## Evaluation Criteria

- **Determinism**: the target for layout and styling is always knowable.
- **Source clarity**: the root contract is clear to the author and reviewer.
- **Refactor safety**: adding or removing internal children does not silently
  change whether callers can style or lay out a view.
- **React Native fidelity**: Tao does not hide wrapper nodes that affect flexbox,
  accessibility, event targeting, measurement, or performance.
- **Validation quality**: the compiler can reject invalid layout/style targets
  and offer a useful fix.
- **Library bridge fit**: imported components can declare whether they are
  rootful, accept children, expose style, or require wrappers.
- **Syntax weight**: Tao avoids extra declaration kinds until they carry enough
  value to justify themselves.
- **MVP cost**: the first implementation should fix layout without dragging in
  the full future component, slot, styling, and theme model.
- **Layout channel clarity**: Tao can distinguish self placement layout from
  interior and child/container layout, so ownership is not inferred from the fact
  that React Native stores all of them in `style`.
- **Descendant ownership clarity**: Tao can distinguish closed components whose
  descendants are authored internally from open containers whose descendants or
  renderers are supplied by callers.

## Full Option Set

### 1. Keep Current Fragment Behavior

```tao
view Header User {
  Text User.Name
  Text User.Role
}

Header CurrentUser [margin 12]
```

This is the simplest compiler shape, but it leaves layout with no target. Tao
would either ignore `[margin 12]` or need a special rule rejecting layout on
custom views. Ignoring is incorrect, and rejecting makes custom views second
class for UI composition.

Verdict: remove immediately.

### 2. Keep Fragments, Require Manual Wrappers

```tao
view Header User {
  Row [gap 8] {
    Text User.Name
    Text User.Role
  }
}

Header CurrentUser [margin 12]
```

The author manually adds a root-like wrapper, but Tao still cannot know whether
that wrapper is the public root unless the language gives it special meaning.
The source looks rootful to a human, while the compiler still sees a fragment
unless it infers the single child.

Verdict: useful as an internal authoring pattern, not a language rule.

### 3. Ban Layout And Styling On Custom Views

```tao
Header CurrentUser [margin 12] // invalid for all custom views
```

This is easy to validate, but it makes Tao custom views much less useful than
standard-library views. Reusable UI needs to participate in parent layout as a
single thing.

Verdict: too limiting.

### 4. Insert Hidden Wrappers Automatically

```tao
view Header User {
  Text User.Name
  Text User.Role
}

Header CurrentUser [margin 12]
```

The compiler could wrap the rendered output in an invisible `View`. This makes
layout convenient, but the hidden node becomes part of flexbox, measurement,
accessibility, event bubbling, z-order, and testing. Tao would be creating
runtime structure that the source does not show.

Verdict: too much hidden behavior.

### 5. Insert Wrappers Only When Needed

```tao
Header CurrentUser
Header CurrentUser [margin 12]
```

This is worse than always inserting a wrapper because the same view call has a
different runtime tree depending on whether the caller adds layout or styling.
That makes debugging and refactoring unpredictable.

Verdict: remove immediately.

### 6. Infer Root From One Rendered Child

```tao
view Avatar User {
  Image User.Photo [width 40, height 40]
}

Avatar User [margin 8]
```

This works for single-child views, but the contract is accidental. If the author
later adds a sibling, callers may become invalid or change behavior.

```tao
view Avatar User {
  Image User.Photo [width 40, height 40]
  Text User.Name
}
```

Root inference is tempting because it feels lightweight, but it makes a public
component contract depend on private body shape.

Verdict: plausible but too fragile.

### 7. Split `view` And `element`

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

ProfileCard User [margin 12]
```

This gives Tao a clean type distinction: `element` is rootful and styleable,
while `view` can remain fragment-like. It also gives validators and IDEs a clear
surface.

The cost is taxonomy. Authors now need to understand two UI declaration kinds
before Tao has settled children, slots, renderer functions, styling, themes, and
bridged library components. The split may still be useful later, but it is too
early as the first fix.

Verdict: strong contender, defer.

### 8. Use A Root Contract Annotation

```tao
view Header User renders Row {
  Text User.Name
  Text User.Role
}

Header CurrentUser [margin 12]
```

This makes the root explicit without adding a second declaration kind. It is
compact and statically useful.

The drawback is that the root contract is declared separately from the rendered
tree. Tao still needs a place for root layout, styling, accessibility, test IDs,
transitions, and wrapper metadata. Those concerns naturally live on an actual
root render statement.

Verdict: strong contender, but weaker than explicit root `render`.

### 9. Use A Bare Root `render` Block

```tao
view Header User {
  render {
    Text User.Name
    Text User.Role
  }
}

Header CurrentUser [margin 12]
```

In this option, the root render statement is special and cannot name another
view after `render`. The enclosing declaration supplies the public root identity:
`Header` can appear in the generated render tree as `Header`, and Tao can reserve
the root block for root-only metadata.

Possible root metadata could include layout, styling, accessibility, test IDs,
debug names, transitions, or bridge behavior:

```tao
view Header User {
  render [row, gap 8] {
    Text User.Name
    Text User.Role
  }
}
```

This is a meaningful contender because it treats a custom Tao view as the real
root concept, rather than making it look like a thin alias for `Row`, `Col`, or
`Box`.

The weakness is the material host. React Native still needs a concrete native
target. A bare root block must imply a default host, likely a View-like wrapper,
or it must grow another way to select row, column, scroll, text, button, image,
and bridged native roots. That makes the model more abstract before Tao has
settled bridge metadata and styling.

Verdict: serious contender, but weaker than targeted root `render` for MVP.

### 10. Require One Targeted Root `render` Statement

```tao
view Header User {
  render Row [gap 8, center] {
    Text User.Name
    Text User.Role
  }
}

Header CurrentUser [margin 12]
```

This makes the root contract explicit at the rendered root itself. It gives Tao
one visible node for declaration-owned layout and future declaration-owned
styling, while call-site layout can target the same public root as self
placement layout.

It also keeps the main UI declaration keyword as `view`, which avoids premature
taxonomy while still giving the compiler a real root to generate.

Verdict: best MVP choice.

### 11. Add Explicit Fragment Declarations Too

```tao
fragment NameAndRole User {
  Text User.Name
  Text User.Role
}

NameAndRole User [margin 12] // invalid
```

This is likely useful eventually. Tao will sometimes need a named composition
that does not add a material root: text fragments, route fragments, conditional
groups, render helpers, and slot defaults.

The danger is doing it too early. The first layout fix should establish rootful
views. Fragment-like declarations can be added later with a clear rule: they do
not accept layout or styling unless wrapped or rendered into a rootful target.

Verdict: keep as later work.

## Winnowing

The obvious weak options are:

- **Silent fragments**: layout/style has no target.
- **No custom view layout/style**: reusable UI becomes second class.
- **Hidden wrappers**: source and runtime tree diverge.
- **Needed-only wrappers**: the same view call changes tree shape based on
  caller props.
- **Pure manual wrappers**: humans can see a root, but Tao cannot validate it as
  the public contract.

After removing those, the real contenders are:

- targeted root `render RootView` statement;
- bare root `render { ... }` block;
- `view`/`element` declaration split;
- `ui`/`view` split by descendant ownership;
- `view ... renders Root` root annotation;
- later explicit fragment declarations.

Implicit root inference is close, but it should not make the shortlist because
it makes a public layout contract depend on body shape.

## Shortlist

### Contender A: Targeted Root `render RootView`

Best when Tao wants the root contract, root layout, future root styling,
accessibility, debug identity, and bridge metadata to live in one visible place.

Main cost: `render` becomes mandatory at the top of every normal view, and the
view source names an underlying root view such as `Row`, `Col`, or `Box`.

### Contender B: Bare Root `render { ... }`

Best when Tao wants the custom view itself to be the named root concept, with a
special root block for root-only metadata.

Main cost: Tao must define an implied material host model before React Native can
render it, and that risks becoming a wrapper abstraction too early.

### Contender C: `view` And `element`

Best when Tao wants a hard type distinction between fragment-like UI
composition and material renderable UI.

Main cost: new taxonomy before the rest of the component model is proven.

### Contender D: Root Annotation

Best when Tao wants compact syntax and strong validation without another
declaration keyword.

Main cost: root metadata lives away from the actual root render tree.

### Contender E: `ui` And `view`

Best when Tao wants the first complete language to distinguish closed,
self-contained UI components from open containers that receive caller-supplied
children, named slots, or renderer slots.

Main cost: one more keyword and a migration/classification pass over existing
declarations. It is more than the smallest root fix, but less taxonomy than the
three-keyword `atom`/`view`/`container` model.

## Final Recommendation Set

### Recommendation 1: Choose Targeted Root `render RootView` For MVP

Use one primary declaration keyword, `view`, and make normal views rootful by
requiring exactly one top-level targeted root `render` statement. This fixes the
layout target problem without introducing a second declaration kind or an
implicit host model. By default, custom view call-site layout should expose only
self placement layout, not the view's interior container layout.

### Recommendation 2: Preserve Bare Root `render { ... }` As Later Sugar

Do not choose the bare root block for MVP. It may be useful later if Tao defines
a first-class root host abstraction, but it should only be added when it can
desugar to explicit host behavior and still make bridge or wrapper semantics
visible.

### Recommendation 3: Defer Extra Declaration Kinds And Hidden Wrappers

Do not introduce `fragment`, `element`, or `component` as part of the first fix.
Wrappers may be explicit source code or explicit library bridge metadata, but Tao
should not secretly add wrapper nodes to satisfy layout/style on ordinary custom
views.

## Padding Stress Case

This case does not change the root-model winner, but it does clarify the
required ownership rule:

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

`pad 8 12` means vertical padding 8 and horizontal padding 12. The call-site
`margin 12` and `width 320` are self placement layout and may apply to the
custom view root. The call-site `pad 2` is different: it changes the root's child
layout area, so it is interior layout owned by `ProfileLink`.

Therefore the MVP validator should reject `pad 2` on the custom view call site.
If `pad 2` is removed, the runtime root style is effectively:

```tsx
{
  paddingVertical: 8,
  paddingHorizontal: 12,
  margin: 12,
  width: 320
}
```

If callers need to vary horizontal padding while keeping vertical padding, the
view declaration should expose that choice intentionally:

```tao
view ProfileLink User, HorizontalPad {
  render Row [gap 8, pad vertical 8, pad horizontal HorizontalPad, center] {
    Avatar User
    Text User.Name
  }
}

ProfileLink CurrentUser, 2 [margin 12, width 320]
```

This avoids an undefined merge between declaration `pad 8 12` and caller
`pad 2`. More generally, direct standard-library containers can accept full
container layout at their render sites, but custom view calls should not expose
interior container keys until Tao has an explicit forwarding API.

## Layout Channel Stress Cases

Tao should evaluate every layout spec in one of three channels:

| Channel                | Examples                                                                                     | Who owns it by default                       |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Self placement         | `width`, `height`, `margin`, `grow`, `shrink`, `basis`, `centered`, `absolute`, offsets, `z` | Parent call site for custom view invocations |
| Interior layout        | `pad`, `overflow`, future `box_sizing`                                                       | View declaration for custom views            |
| Child/container layout | `row`, `column`, `wrap`, `gap`, `top`, `left`, `center`, `stretch`, `spread`                 | View declaration for custom views            |

That gives these outcomes:

```tao
Row [gap 8, pad 8, width 320] {
  Text "A"
}
```

Direct standard-library render: valid. The caller chose `Row`, so the caller may
specify self, interior, and child/container layout on that concrete root.

```tao
view Card {
  render Col [gap 8, pad 16] {
    @@children
  }
}

Card [margin 12, width 320] {
  Text "A"
}
```

Custom view render: valid. `Card` owns its interior and child/container layout;
the parent owns how `Card` sits in the parent layout.

```tao
Card [gap 4]
Card [pad 4]
Card [row]
```

Custom view render: invalid for MVP. Those keys would rewrite the view's
interior contract instead of only placing the view.

```tao
view Card {
  render Col [gap 8, pad 16] {
    Text "Title" [margin bottom 8]
    @@children
  }
}
```

Child render inside the root block: declaration-owned. The view author is
composing Card's internals.

```tao
Card {
  Text "A" [centered]
}
```

Supplied child render: caller-owned for the supplied child. The child still has
to be accepted by `Card`'s slot/children contract, and any merge with callee
slot layout needs an explicit future rule.

A layout clause before the render block should not be part of MVP. If Tao adds
one later, it should declare public self-layout defaults or a public layout
interface, not duplicate the root render's interior/container layout:

```tao
view Card [public width 320] {
  render Col [gap 8, pad 16] {
    @@children
  }
}
```

The exact syntax above is illustrative only. The important rule is the split:
before-render layout would describe the custom view's public surface; inside the
root render describes the implementation root and its contents.

## Single Recommendation

Tao should require every normal `view` to declare exactly one material root with
a top-level targeted `render RootView` statement, and layout/style on custom view
calls should target the public surface of that root.

```tao
view ProfileLink User {
  render Row [gap 8, pad 8, center] {
    Avatar User
    Text User.Name
  }
}

Col [gap 16] {
  ProfileLink CurrentUser [margin 12, width 320]
}
```

This is the best choice because it makes the root target explicit, keeps custom
views first class in parent layout, preserves a simple `view` declaration model,
and avoids invisible runtime structure. It beats bare `render { ... }` for MVP
because it names the actual material host instead of requiring Tao to invent an
implied root host model now.

The recommendation depends on one additional rule: call-site layout for custom
views is not unrestricted root style merging. It is self placement layout by
default. Interior layout, child/container layout, and visual styling remain
declaration-owned unless the view exposes a parameter, variant, theme value,
named part, or future forwarding contract.

For the first complete Tao language, the stronger end-state may be the
[`ui`/`view` split](./UI%20vs%20View%20Distinction.md): `ui` for closed
components whose descendants are authored inside the declaration, and `view` for
open containers whose descendants or renderers are supplied by callers. That
does not replace targeted root `render`; it layers a clearer declaration
taxonomy on top of it. In that version, the single recommendation becomes:
targeted root `render RootView` for both `ui` and `view`, with call-site layout
ownership determined by the declaration kind and the three layout channels.

The bare root block's best idea should still be preserved: custom views should
have stable debug identity. Tao can give the generated component the view name
and still render a targeted root internally. Root-only metadata can also live on
the targeted root render statement.

The key design principle is: if Tao accepts layout or styling, Tao must be able
to point to the exact material root that receives it. A required targeted root
`render` statement is the smallest rule that makes that true for custom views.
