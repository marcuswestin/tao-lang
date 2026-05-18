# UI and View Declaration Design Spec

This document specifies a proposed full-language distinction between `ui` and
`view` declarations in Tao. It is a design specification, not an
implementation plan. It should help a reader understand both the intended
language shape and the design variables that had to be considered to arrive at
that shape.

Related documents:

- [UI vs View Distinction](./UI%20vs%20View%20Distinction.md)
- [Named Renders Plan](./Named%20Renders%20Plan.md)
- [View Root Model Decision](./View%20Root%20Model%20Decision.md)
- [View Root Model Recommendation](./View%20Root%20Model%20Recommendation.md)
- [UI Layout Design Doc](../UI%20-%20Layout%20and%20Styling/UI%20Layout/UI%20Layout%20Design%20Doc.md)

## Status

This is the intended design direction for a complete Tao UI declaration model,
subject to final syntax review. It should not be read as a request to change the
parser, validator, formatter, compiler, or runtime immediately.

For declaration-kind semantics, this is the current source of truth. The related
documents capture supporting rationale, alternative models, and slot-specific
details.

The key proposal is:

- `ui` declares a self-contained UI element or component whose descendant
  structure is owned by the declaration.
- `view` declares a child-receiving layout or composition surface whose
  descendants are supplied by the caller.
- A `ui` call body does not pass unnamed child subviews. If a `ui` accepts
  caller-provided rendered content, that content is passed only through declared
  named render slots.
- A `view` call body is the normal place where caller-provided child subviews
  are passed.
- Tao has no user-facing fragment syntax or fragment type. The generated React
  code may still use fragments internally where no public layout, style,
  accessibility, event, or test target is needed.

## Core Distinction

The load-bearing distinction is: **who supplies the descendant views?**

If the declaration supplies its own descendants, it is a `ui`.

```tao
ui Header User {
  render Row [center spread, gap 12, pad horizontal 16] {
    Text User.Name
    Button "Settings", OpenSettings
  }
}
```

If the caller supplies the descendants, it is a `view`.

```tao
view Column {
  | @@children |

  render Box [column] {
    @@children
  }
}

Column [top left, gap 12, pad 16] {
  Text "Title"
  Text "Body"
  Button "Save", Save
}
```

The distinction is not "visible vs invisible." A `view` can draw background,
border, separators, scroll indicators, loading chrome, or empty states. The
distinction is not "has a root vs has no root" either. Under the root model,
both `ui` and `view` declarations have a material public root. The distinction
is only about whether the declaration or the caller owns the descendant
structure.

## Chosen Direction

### `ui`

A `ui` declaration is a material, declaration-owned UI surface.

Properties:

- It owns the descendant render structure inside its declaration.
- It may take value, action, data, and configuration parameters.
- It may declare named render slots such as `@actions`, `@leading`, or
  `@footer`.
- It does not accept unnamed children in its render call body.
- It does not accept variadic `@@children`.
- It does not accept row/item renderer slots by default.
- It has exactly one material public root, preferably through a targeted
  `render <Root>` statement.
- It is expected to make visual or semantic sense without caller-supplied child
  subviews.

Examples:

- `Text`
- `Button`
- `Image`
- `Divider`
- `Badge`
- `Header`
- `TaskRow`
- `ProfileLink`
- `LoginForm`

### `view`

A `view` declaration is a child-receiving layout or composition surface.

Properties:

- It exists to receive rendered content from the caller.
- It may accept variadic child views through `@@children`.
- It may accept fixed named slots such as `@header`, `@body`, and `@footer`.
- It may accept renderer slots such as `@row Item`.
- It may also take ordinary value, action, data, and configuration parameters.
- It has a material public root when layout, styling, accessibility, events,
  measurement, scrolling, or virtualization need one.
- Its render call body is the normal place for child subviews to be supplied.

Examples:

- `Row`
- `Column` / `Col`
- `Box`
- `Stack`
- `Frame`
- `Card` when it accepts caller content
- `List`
- `ScrollView`
- `Page`

## Render Bodies

The same visual syntax, a block after a render call, has different meaning based
on the declaration kind.

For a `view`, the body passes descendant child subviews.

```tao
Column [gap 8] {
  Text "One"
  Text "Two"
}
```

For a `ui`, the body is not a child-content block. It is only a place to bind
declared named render slots.

```tao
Header CurrentUser {
  @actions -> Button "Edit", EditProfile
}
```

This is invalid:

```tao
Header CurrentUser {
  Text "Extra"
}
```

Reason: `Header` is a `ui`. Unnamed child subviews cannot be passed to a `ui`
call. If `Header` wants caller content, it must declare named render slots, and
callers must bind those slots explicitly.

## Named Render Slots on `ui`

A `ui` may accept named render slots. This is the only way a `ui` can receive
caller-provided rendered content.

```tao
ui Header User {
  |
    optional @actions
  |

  render Row [center spread, gap 12, pad horizontal 16] {
    Text User.Name
    @actions
  }
}

Header CurrentUser {
  @actions -> Button "Edit", EditProfile
}
```

The slot is named because the `ui` owns where the content goes. The caller
does not get to append arbitrary children or rearrange the `ui` internals.

Short inline slot binding remains an open syntax option:

```tao
Header CurrentUser, @actions -> Button "Edit", EditProfile
```

The inline form is convenient for small slots, but it may complicate parsing and
readability. The block form is the baseline because it scales to larger slot
bodies.

## Child Content on `view`

A `view` exists to receive child content from the caller. Different child
contracts are possible.

### Variadic Children

```tao
view Stack {
  | @@children |

  render Column [gap 12] {
    @@children
  }
}

Stack {
  Text "One"
  Text "Two"
  Button "Save", Save
}
```

### Fixed Named Slots

```tao
view Dialog {
  |
    @title
    @body
    @actions
  |

  render Column [gap 16, pad 24] {
    @title
    @body
    Row [right, gap 8] {
      @actions
    }
  }
}

Dialog {
  @title -> Text "Delete item?"
  @body -> Text "This cannot be undone."
  @actions {
    Button "Cancel", Cancel
    Button "Delete", DeleteItem
  }
}
```

### Renderer Slots

```tao
view List Items {
  |
    @row Item
    optional @empty
  |

  render Column [gap 8] {
    if Items.empty {
      @empty
    }

    for Item in Items {
      @row Item [stretched]
    }
  }
}

List Tasks {
  @row Task {
    Row [center spread, gap 8, pad 8] {
      Text Task.Title
      Text Task.Status
    }
  }

  @empty -> Text "No tasks"
}
```

Renderer slots are currently classified as `view`-only in this proposal because
the caller supplies a renderer that determines descendant UI. This is still an
open decision; see [Open Decisions](#open-decisions).

## Root Model

Both `ui` and `view` declarations need a material public root. The leading
model is the targeted root render statement:

```tao
ui ProfileLink User {
  render Row [center, gap 8, pad 8 12] {
    Avatar User
    Text User.Name
  }
}
```

The root target is explicit. The author can choose `Row`, `Column`, `Box`,
`Pressable`, `ScrollView`, a bridged native component, or another rootful
declaration. The `render` keyword adds no hidden host of its own; it identifies
the public root contract of the declaration.

The alternatives considered are recorded below:

- bare implied root, such as `ui Header [row, gap 8] { ... }`;
- declaration-level root layout, such as `ui Header [row, gap 8] { ... }`;
- one broad `view` keyword with capabilities;
- a three-kind taxonomy such as `atom`, `view`, and `container`.

The explicit host model remains the leading option because it maps most directly
to React Native/Expo and avoids hidden wrappers.

## Internal Fragments

Tao should not have fragment syntax or a user-facing fragment type in this
model. Authors should not write `fragment`, should not target a fragment with
layout or styling, and should not need to reason about fragment values.

Generated code may still use React fragments internally when useful:

- expanding an `if` branch that yields multiple render nodes;
- expanding a `for` loop;
- grouping slot output;
- returning multiple generated children inside an already-material root;
- preserving JSX codegen convenience where no public target is implied.

Internal fragments have no public Tao identity. They cannot receive `_taoLayout`,
style, accessibility props, test IDs, event handlers, gesture handlers, theme
boundaries, or animation hosts. If a language feature needs one of those, it
must target a material root.

Example:

```tao
view List Items {
  | @row Item |

  render Column [gap 8] {
    for Item in Items {
      @row Item
    }
  }
}
```

The compiler may use fragments while expanding the loop or the slot invocation.
The Tao-level target remains the `Column` root and the row roots returned by
`@row`.

## Layout Ownership

Layout is split into three channels:

| Channel | Meaning | Examples |
| --- | --- | --- |
| Self placement | How a root sits in its parent | `width`, `height`, `margin`, `grow`, `shrink`, `basis`, `centered`, `stretched`, `packed`, `absolute`, offsets, `z` |
| Interior layout | How a root's box affects its content area | `pad`, future `overflow`, future `box_sizing` |
| Child/container layout | How a root arranges child UI | `row`, `column`, `wrap`, `gap`, `top`, `left`, `center`, `stretch`, `pack`, `spread`, `around`, `evenly` |

### Custom `ui` Calls

For a custom `ui`, call-site layout is self-placement only by default.

```tao
ProfileLink CurrentUser [margin 12, width 320]
```

This is valid. The parent is deciding how `ProfileLink` sits inside the parent
layout.

```tao
ProfileLink CurrentUser [gap 4]
ProfileLink CurrentUser [pad 4]
```

These are invalid by default. `gap` changes the `ui` child/container layout.
`pad` changes the `ui` interior layout. Both are owned by the declaration unless
the `ui` exposes a public customization API.

### Custom `view` Calls

For a custom `view`, call-site layout is also self-placement only by default.

```tao
Card [margin 12, width 320] {
  Text "Title"
  Text "Body"
}
```

This is valid. The caller places the `Card` as a unit and supplies the child
content.

```tao
Card [gap 4] {
  Text "Title"
}
```

This is invalid unless `Card` explicitly exposes `gap` as part of its public
layout API. The `Card` declaration owns how its children are arranged.

### Direct Standard-Library Containers

Direct standard-library container renders are different. If the caller writes
`Row`, `Column`, or `Box` directly, the caller chose the concrete container and
can use the full layout surface supported by that container.

```tao
Row [center spread, gap 12, pad 8] {
  Text "A"
  Button "B", DoB [centered]
}
```

This is valid because the caller directly owns this `Row` render site.

### Declaration-Owned Layout

Interior and child/container layout normally belong on the root render inside
the declaration:

```tao
ui ProfileLink User {
  render Row [center, gap 8, pad 8 12] {
    Avatar User
    Text User.Name
  }
}
```

If callers need to influence interior or container layout, the declaration
should expose that intentionally through a parameter, variant, theme value,
named part, or future layout-forwarding contract.

```tao
ui ProfileLink User, HorizontalPad {
  render Row [center, gap 8, pad vertical 8, pad horizontal HorizontalPad] {
    Avatar User
    Text User.Name
  }
}

ProfileLink CurrentUser, 2 [margin 12]
```

## Syntax Positions

Layout can appear in four places. The declaration kind determines what each
position means.

### Declaration Outside the Block

Example candidate:

```tao
ui ProfileLink User [width 320] {
  ...
}
```

This could declare public self-placement defaults or a public layout interface.
It is not part of the immediate design. It should not duplicate the root render
layout.

### Declaration Inside the Block

```tao
ui ProfileLink User {
  render Row [gap 8, pad 8] {
    Avatar User
    Text User.Name
  }
}
```

This is the primary location for declaration-owned root, interior, and
child/container layout.

### Render Outside the Block

```tao
Column [gap 16] {
  ProfileLink CurrentUser [margin 12]
}
```

For custom `ui` and custom `view` declarations, this is self-placement layout.
For direct standard-library containers, this may include the full supported
layout surface.

### Render Inside the Block

```tao
Card {
  Text "Title" [stretched]
  Button "Save", Save [centered]
}
```

This is layout on child renders supplied inside a `view` call body, or layout on
internal renders written by a `ui` declaration author. The normal layout rules
apply to each rendered child.

## Examples

### Closed `ui`

```tao
ui Header User {
  render Row [center spread, gap 12, pad horizontal 16] {
    Text User.Name
    Button "Settings", OpenSettings
  }
}

Header CurrentUser [margin bottom 12]
```

The caller cannot add arbitrary children to `Header`. The caller can place
`Header` in the parent layout.

### `ui` with Named Slot

```tao
ui Header User {
  |
    optional @actions
  |

  render Row [center spread, gap 12, pad horizontal 16] {
    Text User.Name
    @actions
  }
}

Header CurrentUser {
  @actions -> Button "Edit", EditProfile
}
```

The caller provides rendered content, but only into the named `@actions` slot.
The `Header` declaration owns where that slot appears.

### Invalid `ui` Children

```tao
Header CurrentUser {
  Text "Unexpected"
}
```

This should be a validation error:

> `Header` is a `ui` declaration and does not accept unnamed child subviews.
> Bind a declared named render slot, or change `Header` to a `view`.

### `view` with Variadic Children

```tao
view Column {
  | @@children |

  render Box [column] {
    @@children
  }
}

Column [top left, gap 12, pad 16] {
  Text "Title"
  Text "Body"
}
```

The render body is child content because `Column` is a `view`.

### `view` with Renderer Slot

```tao
view TaskList Tasks {
  |
    @row Task
    optional @empty
  |

  render Column [gap 8] {
    if Tasks.empty {
      @empty
    }

    for Task in Tasks {
      @row Task [stretched]
    }
  }
}

TaskList Tasks {
  @row Task {
    Row [center spread, gap 8, pad 8] {
      Text Task.Title
      Text Task.Status
    }
  }

  @empty -> Text "No tasks"
}
```

The list owns the container and repetition. The caller owns the row render
function.

## Variants Considered

### One Keyword with Capabilities

Use only `view`, and classify declarations by capabilities: has `@@children`,
has named slots, has renderer slots, has no child inputs, etc.

Benefits:

- Minimal keyword surface.
- Lower migration cost from the current language.
- Keeps `view` as the single reusable UI declaration concept.

Costs:

- The most important distinction is hidden in the declaration body.
- A `view` call body can mean child content for some views and no content for
  others.
- Diagnostics and IDE guidance must explain many per-declaration capabilities.
- The word `view` remains overloaded between leaves, containers, and composites.

Reason not chosen: the caller-owned vs declaration-owned descendant distinction
is important enough to be visible at the keyword level.

### Real `ui` / `view` Syntax

Use `ui` for declaration-owned UI and `view` for caller-child-receiving
surfaces.

Benefits:

- The keyword tells the reader whether caller child content is expected.
- The validator can reject unnamed children on `ui` immediately.
- IDE completion can expose different layout and slot surfaces.
- Migration is mostly mechanical: declarations with child contracts become
  `view`; others become `ui`.

Costs:

- Adds a new declaration keyword.
- Requires deciding what happens to current `app { ui Root }` syntax.
- Some edge cases, such as conceptual wrappers, may feel less natural.

Reason chosen: it gives the cleanest long-term language model while avoiding a
larger three-kind taxonomy.

### Three-Kind Taxonomy

Use three declaration kinds, such as `atom`, `ui`, and `view`, or
`atom`, `view`, and `container`.

Possible split:

- leaf/material no-child declaration;
- composite declaration-owned UI;
- child-receiving container.

Benefits:

- Very precise validation.
- Strongest terminology for leaf vs composite vs container.
- Could give a crisp home to elements like `Text`, `Button`, and `Divider`.

Costs:

- More syntax to learn.
- More migration decisions.
- The middle kind still needs a clear rule for slots and roots.
- Many declarations would feel like they could fit two categories.

Reason not chosen: two kinds capture the main ownership distinction without
forcing every declaration into a more elaborate taxonomy.

### Explicit Root Host

Use `render <Root>` in both `ui` and `view` declarations.

```tao
ui Header User {
  render Row [gap 8] {
    Text User.Name
  }
}
```

Benefits:

- The material React Native/Expo target is visible.
- No hidden wrapper is inserted by the language.
- Layout, styling, accessibility, events, and animation have a concrete target.
- Fits the existing root-model decision.

Costs:

- More ceremony than implicit roots.
- The runtime tree may show the root host (`Row`, `Box`) more prominently than
  the higher-level declaration name unless tooling preserves both.

Reason chosen as leading model: it is the most direct and least surprising
mapping to React Native/Expo.

### Bare Implied Root

Use the declaration itself as the root, with layout words selecting geometry.

```tao
ui Header User [row, gap 8] {
  Text User.Name
}
```

Benefits:

- Shorter syntax.
- The declaration name is the obvious root identity.
- The author does not repeat `render Row`.

Costs:

- Tao must define an implied native host model.
- Bridge components and special hosts become harder to see.
- The language risks hiding wrappers again.
- The relationship between `row` and `Row` becomes less direct.

Reason not chosen for the baseline: useful later, but too abstract before the
root/bridge model is fully proven.

### Declaration-Level Root

Put root layout on the declaration line and render children directly in the
body.

```tao
ui Header User [row, gap 8, pad 16] {
  Text User.Name
}
```

Benefits:

- Compact.
- The root contract is visible on the declaration header.
- Good scanning for simple components.

Costs:

- Splits root identity from actual rendered host.
- Adds another place where layout can live.
- Conflicts with the existing decision to keep layout on render sites.
- Leaves bridge/root host selection under-specified.

Reason not chosen: targeted `render <Root>` keeps root metadata local to the
actual root render.

### No Slots on `ui`

Make `ui` completely closed: only values, data, actions, variants, and theme
inputs are allowed.

Benefits:

- Very simple rule.
- Strongest separation between `ui` and `view`.
- A `ui` render call never needs a body.

Costs:

- Common UI patterns like `Header` with custom `@actions` become awkward.
- Authors may have to promote simple self-contained components to `view` just
  to accept one named part.
- The distinction becomes too rigid.

Reason not chosen: named slots are useful for declaration-owned UI without
turning the call body into variadic children.

### Named Slots on `ui`

Allow a `ui` to declare named render slots. A `ui` call body can bind only those
slots.

Benefits:

- Supports common composition points such as `@actions`, `@icon`, `@leading`,
  and `@footer`.
- Keeps the `ui` author in control of structure and placement.
- Makes unnamed child content invalid, preserving the distinction from `view`.

Costs:

- A `ui` call body has a special meaning: slot bindings only.
- Requires clear parser and formatter rules for slot binding blocks.
- Requires diagnostics that distinguish "slot binding" from "child content."

Reason chosen: it balances closed UI ownership with practical customization.

### Unnamed Default Slot on `ui`

Allow a `ui` to declare a default slot so unnamed children can flow into it.

```tao
ui Header User {
  | @default |
  ...
}

Header CurrentUser {
  Button "Edit", EditProfile
}
```

Benefits:

- Convenient for single-slot customization.
- Looks natural for small examples.

Costs:

- Collapses the distinction between `ui` call bodies and `view` child bodies.
- Makes `Header { Text "x" }` sometimes valid and sometimes invalid depending
  on hidden declaration details.
- Weakens diagnostics and IDE expectations.

Reason not chosen: unnamed children should be the defining surface of `view`,
not `ui`.

### Tao-Level Fragments

Add a user-facing fragment construct for rootless grouping.

Benefits:

- Gives conceptual wrappers a clean home.
- Avoids unnecessary material roots where grouping should be invisible.
- Maps to React fragments directly.

Costs:

- Adds another UI concept to teach.
- Fragments cannot receive layout, style, a11y, events, test IDs, gestures, or
  animation hosts.
- Reintroduces the exact "no material target" problem the root model is trying
  to avoid.

Reason not chosen: useful internally, but not a good first-class Tao concept in
this design.

### Internal-Codegen-Only Fragments

Do not expose fragments in Tao. Allow generated code to use React fragments
where no public target exists.

Benefits:

- Preserves codegen flexibility.
- Keeps Tao syntax and mental model simpler.
- Avoids pretending fragments can receive layout or styling.
- Supports loops, conditionals, and slot expansion naturally.

Costs:

- Debugging generated output may reveal React fragments that Tao source does not
  name.
- Codegen must be careful never to attach public props to fragments.

Reason chosen: it keeps fragments where they are useful without making them a
language-level abstraction.

## Decision Matrix

| Variant | Clarity | Validation quality | Layout safety | Syntax weight | Migration cost | RN/Expo fidelity | Extensibility |
| --- | --- | --- | --- | --- | --- | --- | --- |
| One `view` keyword | Medium | Medium | Medium | Low | Low | High with root model | Medium |
| Real `ui` / `view` syntax | High | High | High | Medium | Medium | High | High |
| Three-kind taxonomy | High | Very high | High | High | High | High | High |
| Explicit root host | High | High | High | Medium | Medium | Very high | High |
| Bare implied root | Medium | Medium | Medium | Low | Medium | Medium | Medium |
| Declaration-level root | Medium | Medium | Medium | Low | Medium | Medium | Medium |
| No slots on `ui` | High | High | High | Low | Medium | High | Medium |
| Named slots on `ui` | High | High | High | Medium | Medium | High | High |
| Unnamed default slot on `ui` | Medium | Medium | Medium | Low | Medium | High | Medium |
| Tao-level fragments | Medium | Medium | Low for layout targets | High | High | Medium | Medium |
| Internal fragments only | High | High | High | Low | Low | High | High |

## Open Decisions

### Exact Inline Named-Slot Syntax

The block form is the baseline:

```tao
Header User {
  @actions -> Button "Edit", Edit
}
```

The inline form is still undecided:

```tao
Header User, @actions -> Button "Edit", Edit
```

The inline form should be accepted only if it remains readable, parseable, and
consistent with ordinary argument binding.

### Whether Renderer Slots Are Strictly `view`-Only

The current recommendation is yes: renderer slots are `view`-only because they
let the caller decide rendered descendants, even if indirectly.

Counterargument: a renderer slot is similar to an action callback or value
callback. A `ui` could own the timing and placement while accepting a renderer
for a named region.

If Tao allows renderer slots on `ui`, they should be named and region-like, not
variadic child content.

### App Entry Syntax

Current Tao uses:

```tao
app AppName {
  ui RootView
}
```

If `ui` becomes a declaration keyword, this should probably become:

```tao
app AppName {
  root AppRoot
}
```

This avoids overloading `ui` as both declaration kind and app entry property.

### Public Interior or Container Layout Overrides

By default, custom `ui` and custom `view` calls accept self-placement layout
only.

Future language design may let a declaration expose specific interior or
container layout keys:

```tao
view Card exposes pad, gap {
  | @@children |

  render Column [pad 16, gap 12] {
    @@children
  }
}
```

The exact syntax is undecided. The important rule is that interior/container
override must be explicit, not an accidental merge into the root style.

## Validator Expectations

Validation should enforce:

- A `ui` declaration has one material root.
- A `view` declaration has one material root.
- A `ui` declaration may declare named render slots.
- A `ui` declaration may not declare `@@children`.
- A `ui` call may not contain unnamed child renders.
- A `ui` call body may contain only bindings for declared named render slots.
- A `view` call body must satisfy the view's child contract.
- Extra slot bindings are errors.
- Missing required slot bindings are errors.
- Optional slots require a fallback or optional invocation rule.
- Layout on custom `ui` and custom `view` calls is self-placement only by
  default.
- Interior/container layout on custom calls is rejected unless explicitly
  exposed.
- Internal generated fragments are never public layout/style targets.

Diagnostics should name the declaration kind and the invalid surface. Example:

> `Header` is a `ui`, so this block can only bind named render slots. `Text
> "Extra"` is unnamed child content. Move it into a declared slot, or change
> `Header` to a `view`.

## Implementation Implications

This document is not an implementation plan, but the design implies these future
compiler changes:

- Add `ui` declarations or a declaration-kind field.
- Change app entry syntax from `ui` to `root` if the keyword conflict is
  accepted.
- Represent slot declarations explicitly in the AST.
- Represent slot-binding blocks separately from child-content blocks.
- Validate declaration kind before validating render-call body contents.
- Preserve targeted root render statements for both `ui` and `view`.
- Restrict layout keys based on declaration kind and target type.
- Allow React fragments in generated code only where no public target is needed.

## Summary

The proposed full-language model is:

- `ui` is for declaration-owned UI.
- `view` is for caller-child-receiving UI.
- `ui` calls do not accept unnamed child subviews.
- `ui` calls may bind declared named render slots.
- `view` calls pass child subviews through their render body.
- Both `ui` and `view` use an explicit material root.
- Custom call-site layout is self-placement only by default.
- Interior and child/container layout belong to the declaration unless exposed.
- Direct standard-library containers allow full render-site layout.
- React fragments may exist in generated output, but Tao has no fragment syntax
  or fragment concept.

This design costs one new declaration keyword and a migration pass, but it gives
Tao a clearer long-term model for ownership, validation, layout, slots, and UI
composition.
