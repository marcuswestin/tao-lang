# UI Declaration and Render Slots Specification

Purpose: define Tao's active design for UI-producing declarations, render roots, caller-provided content, and render slots.

This document covers the structural declaration model around layout. The normative geometry, validation, and React Native/Yoga lowering contract lives in [UI Layout Specification](./UI%20Layout%20Specification.md). The human-facing layout model lives in [UI Layout Concepts](./UI%20Layout%20Concepts.md).

## 1. Status

This is an active design specification for the complete declaration model. It is not a claim that every rule is implemented in the current compiler.

The current compiler still has a transitional `view`-only implementation. When implementation catches up, this document should be used with `UI Layout Specification` as the source of truth for declaration kind, child-content, slot, root, and fragment behavior.

## 2. View Kinds

`view` is the umbrella category for all UI-producing declarations:

```text
view = ui | frame | layout
```

The concrete declaration kind answers who supplies descendant views and what default layout pressure the declaration carries.

| Kind     |   Caller unnamed children | Main role                                                        | Default self profile                            |
| -------- | ------------------------: | ---------------------------------------------------------------- | ----------------------------------------------- |
| `ui`     |                        no | presents a specific complete thing                               | `rigid + hug`, unless it declares a public size |
| `frame`  | yes, through `@@children` | frames caller-provided content as an object                      | `rigid + hug`                                   |
| `layout` | yes, through `@@children` | creates an expanding region and arranges caller-provided content | `compress + fill`                               |

The distinction is not "visible versus invisible." All three kinds may paint pixels. The load-bearing distinction is child ownership:

```text
ui     = declaration owns its descendant structure
frame  = caller supplies content, declaration frames it
layout = caller supplies content, declaration creates useful space for it
```

Examples:

```tao
ui Header User {
  render Row [items center spread, gap 12, pad horizontal 16] {
    Text User.Name
    Button "Settings", OpenSettings
  }
}

frame Card {
  render Stack [gap 12, pad 16] {
    @@children
  }
}

layout Page {
  render Col [fill, gap 20, pad 24] {
    @@children
  }
}
```

## 3. Material Root

Every `ui`, `frame`, and `layout` declaration has one material public root.

The root is declared by a top-level `render` statement:

```tao
ui ProfileLink User {
  render Box [items center left, gap 8, pad 8] {
    Avatar User
    Text User.Name
  }
}
```

The `render` statement creates no hidden wrapper of its own. The rendered target is the public root. Caller self-layout and declaration-line public defaults target that public root according to `UI Layout Specification`.

MVP root rules:

- exactly one public root per declaration;
- no implicit compiler-inserted wrapper roots;
- no public rootless declaration kind;
- no Tao-level fragment syntax;
- the root must be a material renderable that can receive layout/style/accessibility/test/event targets when those surfaces exist.

Generated React code may still use fragments internally where no public Tao target is implied.

## 4. `@@children`

`frame` and `layout` receive unnamed caller children through `@@children`.

```tao
frame Section {
  render Stack [gap 12, pad 16] {
    @@children
  }
}
```

Rules:

- `@@children` is illegal in a `ui` body.
- A `frame` or `layout` must place exactly one static `@@children` reference.
- `@@children` is opaque: do not inspect, loop over, reorder, duplicate, or individually wrap the caller's children.
- Caller container specs target the host that directly contains `@@children`, as defined by `UI Layout Specification`.

If declaration-owned siblings should not be affected by caller container specs, place `@@children` inside an explicit child host:

```tao
frame LabeledSection Label text {
  render Stack [gap 12, pad 16] {
    Text Label
    Stack [gap 8] {
      @@children
    }
  }
}
```

## 5. Named Render Slots

Named render slots are caller-provided rendered parts with explicit names.

They use a single `@` name:

```tao
ui Header User {
  |
    optional @actions
  |

  render Row [items center spread, gap 12] {
    Text User.Name
    @actions
  }
}

Header CurrentUser {
  @actions -> Button "Edit", EditProfile
}
```

Named slots are allowed because they do not make a `ui` accept arbitrary child content. The declaration still owns where the slot appears.

Rules:

- required slots must be supplied;
- optional slots need an invocation or fallback rule before implementation;
- supplied slot names must correspond to declared slots;
- a `ui` call body may contain named slot fills only, not unnamed child renders;
- a `frame` or `layout` call body may contain slot fills plus unnamed child renders if the declaration permits both.

The block form is the baseline call-site syntax. Inline slot binding is unresolved.

## 6. Renderer Slots

Renderer slots are named render functions supplied by a caller and invoked with data.

```tao
layout List Items {
  |
    @row Item
    optional @empty
  |

  render Col [gap 8] {
    if Items.empty {
      @empty
    }

    for Item in Items {
      @row Item [stretched]
    }
  }
}

List Tasks {
  @row Task -> TaskRow Task
  @empty -> Text "No tasks"
}
```

Renderer slots are the intended surface for list rows, section headers, empty states, and other repeated caller-provided render fragments.

Rules to carry into implementation:

- renderer slots are explicit declarations, not inferred from usage;
- the slot declaration names the values passed to the renderer;
- renderer slot return values must be renderable UI;
- layout on a renderer invocation applies to each returned root if that return contract is rootful;
- value-returning slots such as keys are deferred until the type system needs them.

## 7. Layout And Ownership

Layout ownership follows `UI Layout Specification`.

Summary:

- `ui` calls reject unnamed children and container specs.
- `frame` and `layout` calls accept unnamed children and route caller container specs to the `@@children` host.
- Self-layout applies to the public root.
- Declaration-owned internal layout belongs on the internal render nodes.
- Direct standard-library layout views such as `Row`, `Col`, `Box`, `Stack`, and `WrappingRow` expose their full documented layout surface at their render site.

Declaration authors should expose interior or container variation intentionally through parameters, design variants, named parts, or a later layout-forwarding API.

## 8. Internal Fragments

Tao has no user-facing fragment syntax in this model.

Internal generated fragments are allowed for implementation convenience:

- expanding `if` branches;
- expanding `for` loops;
- grouping slot output;
- returning multiple generated children inside an already material root.

Internal fragments cannot receive layout, styling, accessibility props, test IDs, event handlers, gesture handlers, design/style targets, or animation hosts. Any feature needing one of those targets must use a material root.

## 9. Validation Expectations

Validation should enforce:

- a declaration kind is one of `ui`, `frame`, or `layout`;
- every declaration has exactly one material public root;
- `ui` declarations do not use `@@children`;
- `frame` and `layout` declarations place exactly one static `@@children`;
- `ui` calls do not contain unnamed child renders;
- `ui` call bodies contain only declared named slot fills;
- `frame` and `layout` calls satisfy their child and slot contracts;
- required slots are supplied and extra slot fills are errors;
- renderer slot arity and value types match the declaration;
- internal fragments are never public layout/style targets.

Diagnostics should name the declaration kind and the invalid surface. Example:

```text
Header is a ui declaration, so this block can only bind named render slots.
Text "Extra" is unnamed child content. Move it into a declared slot, or change
Header to a frame or layout.
```

## 10. Open Decisions

These are not normative until reviewed and promoted:

- exact grammar for slot declarations inside `| ... |`;
- inline named-slot binding syntax;
- whether renderer slots are allowed on `ui` or only on `frame`/`layout`;
- fixed child counts and non-variadic child constraints;
- composition rules when named slot fills and `@@children` appear in the same call body;
- merge rules when both caller and callee want layout on the same slotted root;
- value-returning slots such as `@key`;
- app entry syntax if `ui` becomes both a declaration kind and an app-root keyword.
