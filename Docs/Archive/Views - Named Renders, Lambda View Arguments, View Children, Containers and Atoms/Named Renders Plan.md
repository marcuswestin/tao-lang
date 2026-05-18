# Named Renders Plan

This document covers named slots, renderer slots, and variadic child passing.
The current source of truth for declaration-kind semantics is
[UI and View Declaration Design Spec](./UI%20and%20View%20Declaration%20Design%20Spec.md).

```tao
ui Header {
  render Row {
    ...
  }
}
```

## Named Renders And View Children Notes

This captures the current discussion state for passing rendered child elements and child renderer functions into views. It supersedes the older short notes under the general language syntax brainstorm, but keeps those notes as historical background.

## Core Distinctions

Tao needs to distinguish several overlapping concepts:

- **Declaration-owned UI**: a `ui` declaration owns its descendant structure and
  does not accept unnamed child UI.
- **Child-receiving view**: a `view` declaration accepts rendered child UI,
  named slots, renderer slots, or some combination.
- **Material root**: both `ui` and `view` declarations use one explicit render
  root under the current root model.
- **Named slot**: a named UI part supplied by a caller, such as `@header` or `@empty`.
- **Renderer slot**: a named view function supplied by a caller and invoked with data, such as `@row Task`.
- **Variadic children**: all unnamed top-level child renders, captured as `@@children`.

Under the current full-language direction, unnamed child passing belongs to
`view`; `ui` may accept caller-provided rendered content only through declared
named slots.

## Current Preferred Syntax

Use `@name` for named slot/render parameters and `@@children` for unnamed variadic child renders.

Declaration-side slot parameters should be explicit for now:

```tao
view List Items {
  |
    @row Item
    optional @empty
    @@children
  |

  Col [top left, gap 8] {
    if Items.empty {
      @empty
    }

    for Item in Items {
      @row Item
    }

    @@children
  }
}
```

Call-site named slots are supplied inside the render body:

```tao
List Tasks {
  @row Task -> Row [top left, gap 8] {
    Text Task.Title
  }

  @empty -> Text "No tasks"
}
```

Unnamed child renders become `@@children`:

```tao
view Col {
  | @@children |

  Box [column] {
    @@children
  }
}
```

## `@` Meaning

Anything named with `@` is part of the UI render surface, not an ordinary value parameter.

- `@header` means a named child UI slot.
- `@row Task` means a renderer slot that receives `Task`.
- `@@children` means the variadic unnamed child render bucket.

This makes slots visually distinct from ordinary value/data parameters.

## Named Slots

Named slots let a component receive specific rendered parts:

```tao
view Profile {
  @header Row { ... }
  @body Col { ... }
  @footer { ... }
}
```

A caller can replace or patch those named parts:

```tao
Profile {
  @header -> DiffRow { ... }
}
```

Open syntax question: whether the `->` is always required for supplied slots, or whether a block can be enough when the parameter shape is unambiguous.

## Renderer Slots

Renderer slots are view functions that receive values:

```tao
List Tasks {
  @row Task -> TaskRow Task [top left]
}
```

The declaration says what the renderer receives:

```tao
view List Items {
  |
    @row Item
  |

  for Item in Items {
    @row Item
  }
}
```

This covers common cases such as list rows, group headers, section footers, empty states, and per-item controls.

## Value Slots Versus Renderer Slots

The discussion used `@key Task -> Task.id` for list keys:

```tao
List Tasks {
  @key Task -> Task.id
  @row Task -> TaskRow Task
}
```

Current simplification: do views only for now and assume list items are identifiable, usually persisted database items with IDs.

Deferred question: whether `@key` should be a value slot, not a renderer slot, and how non-view slot return types are declared.

## Variadic Children

Use two at signs for the unnamed variadic child bucket:

```tao
view Stack {
  | @@children |

  Col [top left, gap 12] {
    @@children
  }
}
```

At call sites, ordinary child renders feed `@@children`:

```tao
Stack {
  Text "One"
  Text "Two"
  Button "Save", Save
}
```

Rules to decide:

- Can named slots and unnamed `@@children` appear in the same call body?
- If yes, should named slots be required before unnamed children?
- Can a view require exactly one child, at least one child, or a fixed number of children?
- How do `if` and `for` inside call bodies contribute to `@@children`?

## Example Shapes To Support

### One Fixed Child

```tao
view Frame {
  |
    @content
  |

  Box [pad 16] {
    @content
  }
}
```

### Three Named Children

```tao
view Page {
  |
    @header
    @body
    @footer
  |

  Col [top left] {
    @header
    @body
    @footer
  }
}
```

### Fixed Child Plus Variadic Children

```tao
view Menu {
  |
    @trigger
    @@items
  |

  Box {
    @trigger
    Col {
      @@items
    }
  }
}
```

### Data Renderer And Empty State

```tao
view List Items {
  |
    @row Item
    optional @empty
  |

  Col [top left, gap 8] {
    if Items.empty {
      @empty
    }

    for Item in Items {
      @row Item
    }
  }
}
```

## Matching And Inference

Initial implementation should require explicit slot declarations.

Future inference may infer:

- `@foo` is a view slot when invoked with no data.
- `@bar Item` is a renderer slot that receives `Item`.
- `@@children` is a variadic unnamed view slot.

Inference is attractive but tricky because slot usage may be conditional, repeated, or absent from some branches. Keep inference out of the first pass.

## Type Safety

Slot and renderer parameters should be typed.

- A named slot's type should say it renders UI.
- A renderer slot's type should include its input value types.
- Optional slots should require existence checks or defaults before invocation.
- A variadic child bucket should be typed as a list of renderable UI.
- If a slot returns a non-view value later, that return type must be explicit.

Open question: whether Tao needs a first-class `view ->` function type, or whether `@slot` declarations are a separate callable UI parameter system.

## Layout And Styling Interaction

Callers should be able to apply layout to supplied slots/renderers at the render site:

```tao
List Tasks {
  @row Task -> TaskRow Task [stretched]
}
```

Open questions:

- Can callers curry or partially apply layout/style to a supplied slot?
- Does layout on `@row` apply to the row root each time it is rendered?
- Can a callee add layout around a slot invocation without overwriting caller layout?
- How do single-layout-clause rules apply when both caller and callee want to modify the same rendered root?

## Testing And Debug Handles

Named slots can become stable names for test navigation and UI hierarchy inspection:

```tao
Profile {
  @header -> Header
  @body -> ProfileBody
}
```

Potential uses:

- Stable test IDs.
- Source-to-runtime UI hierarchy mapping.
- Accessibility identifier defaults where appropriate.
- Debug tree names in dev tools.

Important: testing/debug handles and accessibility labels are related but not identical. Do not automatically expose internal names as user-facing accessibility text without design review.

## React Native Mapping

This model maps naturally to React component props:

- `@header` can compile to a render prop or React node prop.
- `@row Item` can compile to a function prop such as `renderRow`.
- `@@children` can compile to `props.children`.
- Named slots can compile to named props and can also carry metadata for tests/debugging.

List keys:

- Persisted database items should usually provide IDs, so loops/lists can generate keys automatically.
- Non-identifiable values such as lists of strings or numbers are deferred until concrete examples prove they matter.
- If non-identifiable values are supported, they need explicit key policy, probably by index only when stable ordering is guaranteed.

## Validation Questions

- Does every required slot have a supplied implementation?
- Does every supplied slot correspond to a declared slot?
- Does every renderer slot receive the right value type and arity?
- Can optional slots be invoked without existence checks?
- Are unnamed child renders allowed when a view does not declare `@@children`?
- Are named slots allowed to appear multiple times?
- Do named slot blocks have to be first in the call body?
- Can a view with no `@@children` still render ordinary children as an error with a fix suggestion?
- How are slots inside `if`/`for` validated?

## Current Open Decisions

- Exact declaration grammar inside `| ... |`.
- Whether call-site `@slot` uses `->`, a block, or both.
- Whether `@view row Item` is clearer than `@row Item`; current preference is the shorter `@row Item`.
- Whether value-returning slots such as `@key` are part of this system or a later typed callback system.
- Whether a lower-level `element` concept is ever needed beyond `ui` and `view`.
- How to represent fixed child counts and variadic child constraints in type checking.
- How slot override/patching composes with default named parts declared inside a view.

## Current Recommendation

Start with explicit slot declarations and only rendered-UI-returning slots:

```tao
view List Items {
  |
    @row Item
    optional @empty
  |

  ...
}
```

Use `@@children` for unnamed variadic children:

```tao
view Col {
  | @@children |

  Box [column] {
    @@children
  }
}
```

Defer inference, value-returning slots, non-identifiable list keys, and any
lower-level `element` concept until the first implementation proves the basic
model.
