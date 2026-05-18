# UI and View Distinction — Recommendation

**Status.** Recommendation. Companion to `UI and View Distinction Design Doc.md`. That document records the fixed decisions, the full conceptual model, and the complete trade-off analysis of the three open forks (A: root structure; B: `ui` call-site block; C: padding ownership) *without recommending*. This document records the recommended resolution of each fork and the unified design that results.

The fixed decisions (F1–F6) from the Design Doc are taken as background; this doc does not re-state them, only the resolutions and their consequences.

---

## 1. The decision criterion

The criterion for resolving these forks is the one stated during design: **where layout parameters attach syntactically and conceptually.** The four-position 2×2 model (declaration × outside/inside) gives that criterion a sharp shape — *OUTSIDE body = outer-facing (S, parent-perspective); INSIDE body = inner-facing (C, container-perspective)* — and each pick below is selected to keep that 2×2 symmetric and predictable.

---

## 2. Recommendations

### 2.1 Variant A — root structure: **A2, unnamed `render [...] { ... }`**

The `render` keyword is the body-boundary marker. Outside the keyword line (declaration position **b**) carries the renderer's outer-facing layout — self-placement defaults (S, maybe P). Inside the `render` clause (declaration position **a**) carries the renderer's inner-facing layout — container arrangement of its declared tree (C, maybe P). The `ui`/`view` keyword + name *is* the host node, so `<Header>` is what shows up in the React tree, not a named inner root.

At the call site the same boundary appears: `Card User [...] { [...] }` → outside the block is caller-set S, inside is caller-set C (where the renderer admits it). The call-site (c) ↔ (d) mirrors the declaration-side (b) ↔ (a-render) exactly. The frozen v1 morphology — `-ed` for self/outer, bare alignment words for container/inner — maps onto the boundary naturally, so reading layout becomes mechanical: where the clause sits tells you which channel it owns.

The competing options fail this criterion. **A1** (named root, `render Row [...] { ... }`) double-names the root and creates two outer-facing positions (the keyword line and the render line) that blur ownership. **A3** (no required root) drops the boundary entirely; only morphology disambiguates, and a single-element body becomes indistinguishable from a multi-element body, losing the "every renderer has one declared root" invariant.

The codegen cost of A2 — one real host node per renderer, no fragment flattening — is acceptable and matches the cost of alternative A11 in `View Root Element Design Doc.md`. A future `fragment` keyword (Open Question F in the Design Doc) can address pixel-free conceptual constructs (route outlets, providers, guards) without retrofitting.

**Resolution of A's sub-questions:**

- **A.1** — Single-element bodies still include `render`. The `render` line is mandatory for every `ui`/`view`. Keeps "every renderer has one declared root" as a teachable invariant; removes the special case of "is `render` required here or not?"
- **A.2** — Empty bodies (zero top-level elements) are errors. Pixel-free conceptual constructs are deferred to a future `fragment` keyword.

### 2.2 Variant B — `ui` call-site block: **B1, `{ }` block restricted to slot fills only**

Every renderer's call site has the same shape — `Name args [outer] { inner }`. For a `view`, the inside-block contains caller-set inner layout (`[...]`), bare sub-views, and named slot fills. For a `ui`, the inside-block contains only named slot fills — no bare sub-views and no `[...]` layout clause. The validator enforces those rules.

This preserves the single call-site shape — uniform syntax to teach, uniform syntax to format. The contract difference between `ui` and `view` is exactly F3 ("does the open block accept bare sub-views?"), restated at the call site. No new delimiters or argument-position syntax for slot fills.

A renderer can be opened up later — a `ui` that grows an open block becomes a `view`. Under B1 that is a contract change inside the declaration; call sites that didn't supply bare children remain valid. Under the alternative B2 the same refactor would require rewriting every call site to add `{ }`. B1 is refactor-safe; B2 is not.

### 2.3 Variant C — padding ownership: **C3, declaration-owned for custom renderers; caller-allowed for direct std-lib container renders only**

For any custom `ui` or `view`, `pad` at the call site (positions c and d) is a static error. `pad` lives in the declaration — at (b) as a default of the renderer-as-a-whole, and at (a) inside the `render` clause as the root's own interior. Callers use `margin` for outside breathing room. Authors who want padding to vary expose a typed parameter (`ui ProfileLink User, Pad number`).

The carve-out preserves the existing `Row [pad 16] { … }` ergonomics: when the caller is rendering a std-lib container directly (`Row`, `Col`, `Box`), the caller chose the primitive and therefore owns its interior — this is the same exception articulated in `View Root Model Decision.md`. C3 inherits that carve-out unchanged.

The alternatives leak in different ways. **C1** is strongest but breaks the existing `Row [pad 16]` idiom. **C2** is asymmetric (`view`s allow caller `pad`, `ui`s don't) and tempts a `pad` clause that the `view`'s author cannot anticipate; the asymmetry doesn't pay for itself because the std-lib carve-out (C3) already covers the practical case. **C4** is maximally flexible but requires merge semantics for declaration-default vs call-site `pad` and creates silent override surprises.

---

## 3. The unified design

Under A2 + B1 + C3, the design is:

### 3.1 Declarations

```tao
ui Card User [margin 8] {              // (b) outer S defaults — Card-as-child
  render [pad 16, gap 12, column] {     // (a-render) inner P+C — Card's tree
    Avatar User [grow 0]                // (a-subview) per-child S
    Text User.Name
  }
}
```

```tao
view Row {
  render [row] { @@children }
}
```

```tao
view List Items {
  | @row Item, optional @empty |
  render [column] {
    if Items.empty { @empty }
    for Item in Items { @row Item }
    @@children
  }
}
```

```tao
ui IconButton Label text, Action action {
  | @glyph |
  render [row, center, gap 6] {
    @glyph
    Text Label
  }
}
```

### 3.2 Call sites

```tao
// `ui` render — outer S only; the optional `{ }` holds slot fills only.
Card CurrentUser [margin 12, width 320]

IconButton "Save", Save [margin 4] {
  @glyph -> SaveIcon
}
```

```tao
// `view` render — outer S outside; caller-set C inside; bare sub-views and/or slot fills.
Col {
  [gap 16]
  Row [margin 4] {
    [gap 8, center spread]
    Text "Open"
    Button "Save", Save                  // no `{ }` — Button is a `ui` with no slots
  }
}
```

```tao
// Slotted `view`
List Tasks [margin 12] {
  [gap 8]
  @row Task -> TaskRow Task
  @empty   -> Text "No tasks yet"
  Divider                                // bare sub-view → @@children
}
```

### 3.3 Layout rule of thumb

- **S words go OUTSIDE the body** — positions (b) and (c). `margin`, `width`, `height`, `min_*`/`max_*`, `grow`/`shrink`/`basis`, `centered`/`stretched`/`packed`, `relative`/`absolute`, offsets, `z`.
- **C words go INSIDE the body** — positions (a-render) and (d). `row`/`column`/`wrap`/`nowrap`, `gap`/`row_gap`/`column_gap`, `pack`/`spread`/`around`/`evenly`, bare `top`/`right`/`bottom`/`left`/`center`/`stretch`.
- **`pad` lives only inside the declaration.** Direct std-lib container renders (`Row`/`Col`/`Box`) are the sole exception at (c).
- **Morphology agrees with position.** `-ed` form = self/outer; bare alignment = container/inner.

### 3.4 Validation rules implied

- A `ui` declaration cannot include `@@children`; a `view` declaration must (or its body must include a hole reachable as an open block).
- A `ui` render statement may have a `{ }` block, and if so it contains only named slot fills — no bare sub-views, no `[...]` layout clause inside.
- A `view` render statement's inside-block may contain bare sub-views, named slot fills, and at most one `[...]` clause at the top (position d).
- C-channel words on a `ui` call site (c) are a static error.
- C-distribute words on a slotted-only `ui` (no open block) are a static error at every call-site position.
- `pad` on any custom-renderer call site (c or d) is a static error; only direct std-lib container renders may carry `pad` at (c).
- Every renderer body has exactly one `render` line (mandatory); the `render` line's `{ }` block is non-empty.
- Bare alignment words (`top`/`left`/`center`/`stretch`/...) at outer positions (b, c) are a static error; `-ed` words at inner position (d) are a static error.

---

## 4. Kitchen Sink, under the unified design

```tao
ui AppView {
  render [column, top left, gap 12, pad 16] {
    Text "Kitchen Sink"
    Text "Exercises types, state, scopes, objects, structs, expressions, actions, local param types, nested views, inject, and cross-folder `use`."
    Text "${ KitchenSinkVersion } · file-level state below"
    Row {
      [center spread, gap 8]
      Text "File-level counter:" [packed]
      Number FileLevelDemoCounter [centered]
      Button "Top-level action", BumpFileLevelDemo [centered, width 180]
    }
    Divider
    TypeMatching
    Divider
    StateDemo
    Divider
    ScopesDemo
    Divider
    ObjectsDemo
    Divider
    StructsDemo
    Divider
    ExpressionsDemo
    Divider
    ActionsDemo
    Divider
    LocalParamsDemo
    Divider
    NestedViewsDemo
  }
}
```

Concrete differences from today:

- `view AppView` → `ui AppView` (its only caller is `app { ui AppView }`; no caller-supplied content).
- The four-sibling body (three intro `Text`s + one `Col`) is wrapped into a single `render [...] { ... }`. The `Col` keyword is gone — `AppView` itself is the column-arranged container under A2.
- All inner-facing words (`column`, `top left`, `gap 12`, `pad 16`) sit *inside* the `render` clause. All outer-facing words (`packed`, `centered`, `width 180`) sit outside their target's block.
- `Row [center spread, gap 8] { ... }` becomes `Row { [center spread, gap 8] ... }` — the C-words move into the inside position, matching the rule of thumb.
- `Button … { }` loses its trailing empty block (Button is a `ui` with no slots).
- `Divider { }`, `TypeMatching { }`, etc. lose their trailing empty blocks if they're declared as `ui`s with no slots; if they're declared as `view`s with an open block (e.g. `Divider` could remain a `view` for thematic chrome wrapping), they'd keep `{ ... }` for that reason — that is a separate declaration-by-declaration decision, not a Kitchen-Sink-level one.
- `<AppView>` is the host node — A2 makes the keyword+name the React-tree identity.

The reader can derive every layout placement decision from the rule of thumb in §3.3 alone.

---

## 5. Conceptual divergence from existing decision docs

This recommendation differs from `View Root Model Decision.md` on two explicit points:

1. **The single-keyword decision.** The decision doc concluded that Tao should keep one `view` keyword and defer the `view`/`element` split as premature. This recommendation introduces `ui` and `view` as two keywords (F1). The decision doc itself flagged the single-keyword choice as MVP-shaped — "premature… before Tao has proven view children, slots, renderers, and bridge metadata" — and those mechanisms are now being designed in the same batch. The split is no longer premature.
2. **The named-`render` decision.** The decision doc required `render Row { ... }` (Variant A1 in the Design Doc). This recommendation adopts unnamed `render [...] { ... }` (A2). The motivation is the 2×2 outer/inner symmetry: A1's named root breaks the symmetry by adding a second outer-facing position; A2 makes the body-boundary the clean ownership line.

This recommendation **inherits** the decision doc's three-channel layout ownership (self / interior / child-container ≈ S / P / C) and its std-lib-container P carve-out, which becomes C3 here.

Per the project policy of leaving existing docs intact, neither the decision doc nor the recommendation doc is edited; this companion document is the canonical recording of the new direction.

---

## 6. What this enables next

The unified design is sufficient to start implementation work, but several adjacent decisions are left to future passes:

- **C-flow ownership for direction-agnostic `view`s** (e.g. `Box`) — recommended position: caller-settable at (d) only when the declaration leaves flow unset. Final wording deferred.
- **Bridge-imported renderers** (RN components from library bridges) — how each declares `ui` vs `view`, flow ownership, allowed P at (c). Deferred until library bridges are designed.
- **A `fragment` keyword** for pixel-free conceptual constructs (route outlets, providers, guards) that should not produce a host node. Required only if the codegen cost of A2 becomes a measured concern.
- **A forwarding API** for custom renderers that want to expose interior P/C to callers beyond exposing typed parameters. Deferred — typed parameters cover the practical cases.
- **Migration plan** — the std lib (`Box`/`Col`/`Row`/`Text`/`Number`/`Button`) and the Kitchen Sink test app need to be migrated to `ui` / `view` with `render` lines. Out of scope for this design pass.
