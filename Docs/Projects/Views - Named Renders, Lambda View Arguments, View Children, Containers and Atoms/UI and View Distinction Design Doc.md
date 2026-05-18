# UI and View Distinction — Design Doc

**Status.** Analytical. This document records the fixed decisions, the full conceptual model, and a complete trade-off analysis of the remaining forks. **It deliberately makes no recommendations** — the recommendation lives in the companion document `UI and View Distinction Recommendation.md`.

**Predecessors.** This doc draws on but does not edit:
- `View Root Model Decision.md` / `View Root Model Recommendation.md` / `View Root Element Design Doc.md`
- `Named Renders Plan.md`
- `../UI - Layout and Styling/UI Layout/UI Layout Design Doc.md`

Where this design diverges from those, the divergence is named in §13.

---

## 1. Context

Today Tao has one declaration keyword, `view`, doing two jobs: generic frames that arrange caller-supplied content (`Row`, `Col`, `Box`) and complete self-contained widgets (`Button`, `Text`, future `Header`/`Avatar`/`ProductCard`). That sameness has costs:

- Layout written at a call site has no well-defined target. `Button [gap 8]` silently no-ops instead of erroring; the same `[gap 8]` on `Row` is correct.
- The grammar can't tell the compiler whether a thing accepts children or is finished, so the validator can't reject a whole class of structural mistakes.
- "View root" is currently a fragment; the existing decision-doc work tries to patch this with a mandatory `render` statement, but that fix lives *underneath* the ui/view split rather than alongside it.

This document designs the **first full-version** (not MVP) split of UI-producing declarations into two keywords — `ui` and `view` — with a unified umbrella term **renderer** for either kind. The goal is one coherent specification for declarations, renderings, and layout-property placement across all four positions a layout clause can appear in.

---

## 2. Fixed decisions

These are non-variants. Subsequent forks (§8) are evaluated *under* these.

- **F1. Two renderer keywords.** Tao gains `ui` and `view` as UI-producing declaration keywords. `view` is redefined narrower than today.
- **F2. "Renderer" is the umbrella term.** A *renderer* is any UI-producing declaration — either a `ui` or a `view`. A renderer can be passed as a value into a named render slot.
- **F3. The cut is the open block.** A declaration is a `view` iff *rendering it* accepts an open/variadic block of caller sub-views in the rendering statement's block body. A `ui` does not. The cut is **syntactic at the call site**, not "do you accept any caller UI."
- **F4. Two and only two channels for caller-provided renderers.** Caller UI can be supplied *only* (a) as a named render slot fill, or (b) as a bare sub-view inside a `view`'s open render block. **There are no positional view-typed arguments.**
- **F5. Named render slots are orthogonal to the cut.** Both `ui` and `view` declarations may declare named render slots. Slots come in two forms, both available to both kinds:
  - *plain slot* — `@header` (a hole filled with one renderer)
  - *data-parameterised slot* — `@row Item` (a renderer the declaration invokes with data, e.g. once per collection item)
- **F6. Four distinct layout positions.** A layout clause `[ ... ]` may appear in four syntactically distinct positions:
  - **(b) declaration outside body** — `ui Card User [...]`, on the keyword line.
  - **(a) declaration inside body** — layout on statements inside the declaration body.
  - **(c) render outside body** — `Col [...] { ... }`, on a render statement before its block.
  - **(d) render inside body** — `Col { [...] ... }`, layout clause at the top of a render statement's block.

---

## 3. The conceptual model — full characteristic list

The distinction is a single discriminator (F3) with many consequences. Items 1–4 sharpen the original framing; 5–20 extrapolate.

1. **Child-content channel (the root distinction).** `view` accepts an open, ordered, variadic block of caller sub-views at its rendering statement. `ui` does not. Both may declare named render slots.
2. **What the caller supplies.** `view`: open-block sub-views + data args + slot fills. `ui`: data args + slot fills only — never bare child content.
3. **Completeness / standalone usability.** A `ui` is complete given its data args: `Button "Save", Save` is a finished thing; it can be an app root. A `view` is incomplete without caller content: an empty `Row` does nothing; it is a frame awaiting content and cannot meaningfully be an app root.
4. **Self-pixels — a tendency, not a definition.** `view`s *often* paint nothing of their own (Row/Col/List show only their children). But this is not definitional: `Box` with a background, `ScrollView`, a bordered `Card` are `view`s that do paint. The load-bearing trait is "incomplete without caller content," not "invisible." `ui`s always contribute visible pixels — a `ui` that renders nothing is degenerate.
5. **Primary role.** `view` is a structural/layout construct (its job is to arrange). `ui` is a presentational construct (its job is to present a specific thing).
6. **Layout authority over children.** A `view`'s children are caller-supplied → the caller owns how they are arranged (gap, distribution, wrap) at the call site. A `ui`'s internal arrangement is entirely declaration-owned.
7. **Container layout at the call site.** Legal on a `view` render; a **static error** on a `ui` render — a `ui` has no caller children to arrange. This makes a whole class of layout mistakes structurally impossible instead of silent no-ops.
8. **Abstraction level.** `view`s are low-level, generic, domain-agnostic, reused everywhere (Row works in any app). `ui`s range from generic atoms (`Text`, `Icon`) to app-specific composites (`ProductCard`) — but always "a specific thing."
9. **Theme / default-styling participation.** `view`s carry minimal-to-no default styling (a frame). `ui`s carry meaningful theme-driven defaults — a `Button` has background, radius, padding, text color.
10. **Composition direction.** `view` composes outside-in (pick the frame, pour content). `ui` composes as a unit (drop it in).
11. **Render-tree identity.** Both compile to real host nodes. `ui` has strong "thing" identity (`<Button>`, `<ProductCard>`); `view` identity is structural ("a row of stuff").
12. **App-root eligibility.** `app { ui AppView }` — the app root must be a `ui`. A bare `view` frame has nothing in it.
13. **The keyword is an explicit contract, not inferred.** Adding or removing a hole does not silently flip the kind. The validator enforces consistency: a `ui` that accepts an open block is an error; a `view` with no open block is an error (it should be a `ui`).
14. **Relationship to data.** A `view` takes data mainly when child count is data-driven (a `List`'s collection drives how many `@row` invocations happen). A `ui` takes data to fill its fixed declared structure.
15. **Nesting.** `view`-in-`view`, `ui`-in-`view`, `view`-in-`ui`, `ui`-in-`ui` are all fine — but for a `ui`, the nested renderers live *inside its declaration body*, never at its call site.
16. **Two arities of caller content.** The open block is variadic (0..* sub-views). Named render slots are fixed/named — each a distinct declared hole, optionally data-parameterised. "Fixed-arity child content" is expressed as named slots, *not* as a separate declaration kind.
17. **Renderers as values.** A renderer (ui or view) can be passed into a named render slot. That is the only way to pass a renderer "as an argument" (F4).
18. **Keyword-collision note.** `ui` already exists as the app-entry statement (`app { ui X }`); see §11.
19. **Runtime backing.** `ui` atoms typically bottom out in an `inject` block or a primitive (`Text` → `RN.Text`). `view`s bottom out in a layout primitive that places their children.
20. **Validation surface.** For a `ui`, the validator rejects call-site container layout and call-site bare child content. For a `view`, it validates open-block content and slot fills.

---

## 4. Taxonomy

The three "view kinds" originally framed (variadic / non-variadic / no children) are the cross-product of *{open block?}* × *{named slots?}*:

| | no named slots | has named slots |
|---|---|---|
| **no open block** → `ui` | plain `ui` — atom or composite (`Text`, `Header`, `Button`) | slotted `ui` (`SplitView` with `@left`/`@right`, `IconButton` with `@glyph`) |
| **has open block** → `view` | plain `view` (`Row`, `Col`, `Box`) | slotted `view` (`List` with `@row`/`@empty` + `@@children`) |

- *Variadic child views* → plain or slotted `view` (the open block).
- *Non-variadic child views* → any renderer with named slots — slotted `ui` *or* slotted `view`.
- *No descendant views* → plain `ui` (atom or composite).

The atom/composite distinction inside `ui` (atom = no inner tree, composite = inner tree of declared sub-views) is not a separate keyword. It falls out of whether the declaration's render body bottoms out in `inject`/a primitive or has further structure.

---

## 5. Syntax sketch (Variant-A neutral)

These examples don't presume a resolution for Variant A (§8.1); the root form is written as `«ROOT»`. Concrete forms appear in §9 (Kitchen Sink under each variant).

### Plain `ui` — atom

```tao
ui Text Value text {
  «ROOT» { inject ```ts ... ``` }
}
```

### Plain `ui` — composite

```tao
ui Header User {
  «ROOT-with-Row-arrangement» {
    Text User.Name
    Text User.Role
  }
}
```

### Slotted `ui`

```tao
ui IconButton Label text, Action action {
  | @glyph |
  «ROOT-with-Row-arrangement» {
    @glyph
    Text Label
  }
}

// call site — `ui` render: args + outer layout + slot fills. NO bare sub-views.
IconButton "Save", Save [margin 4] {
  @glyph -> SaveIcon
}
```

### Plain `view`

```tao
view Row {
  «ROOT-row» { @@children }
}

// call site — Row's own self-placement OUTSIDE; caller-set child arrangement INSIDE.
Row [margin 4] {
  [gap 8, center spread]
  Text "Open"
  Button "Save", Save
}
```

### Slotted `view` — `List`

```tao
view List Items {
  | @row Item, optional @empty |
  «ROOT-col» {
    if Items.empty { @empty }
    for Item in Items { @row Item }
    @@children
  }
}

// call site
List Tasks [margin 12] {
  [gap 8]
  @row Task -> TaskRow Task
  @empty   -> Text "No tasks yet"
  Divider                            // bare sub-view → @@children
}
```

---

## 6. Layout model — complete

### 6.1 Three channels, with sub-splits

- **P — interior** (`pad`, `overflow`). The renderer's own content box. *Applies to all renderers.*
- **S — self-placement** (`width`, `height`, `min_*`, `max_*`, `margin`, `grow`, `shrink`, `basis`, `centered`/`stretched`/`packed`, `relative`/`absolute`, offsets, `z`). How the renderer sits inside its parent. *Applies to being a child of a container.*
- **C — container / child-arrangement.** How a renderer arranges children it contains. *Applies only to containers.* Sub-split:
  - **C-flow** — `row`, `column`, `wrap`, `nowrap`
  - **C-distribute** — `gap`, `row_gap`, `column_gap`, `pack`, `spread`, `around`, `evenly` (need an open ≥2-child set to be meaningful)
  - **C-align** — bare container-level alignment words: `top`, `right`, `bottom`, `left`, `center`, `stretch`

**No new vocabulary** — the frozen v1 word list is unchanged. This is purely an ownership redistribution. See §10.

### 6.2 The four positions, organised as a 2×2

|  | OUTSIDE body (outer-facing) | INSIDE body (inner-facing) |
|---|---|---|
| **DECLARATION** | **(b)** `ui Card User [...]` | **(a)** layout on statements inside the body |
| **RENDER (call site)** | **(c)** `Card User [...]` | **(d)** `Card User { [...] ... }` |

The 2×2 has a clean reading: **OUTSIDE body = outer-facing (S, parent-perspective); INSIDE body = inner-facing (C, container-perspective).** The body-boundary is the syntactic line between parent-provided and self-provided layout, mirrored at declaration and render.

Padding (P) is interior — a property of the renderer itself, neither of its parent nor of its children. Where P attaches is decided by **Variant C** (§8.3).

### 6.3 The frozen-v1 morphology already maps onto outer/inner

The frozen v1 morphology rule — `center`/`stretch`/`pack` as container directives versus `centered`/`stretched`/`packed` as self directives — already maps directly onto the 2×2:

- **bare alignment words** (`top`/`left`/`center`/`stretch`/...) → C-align → INNER (a, d)
- **-ed alignment words** (`centered`/`stretched`/`packed`) → S → OUTER (b, c)

A word's grammatical form already tells the reader which side of the body boundary it goes on.

### 6.4 Full property-by-position-by-kind table

Legend: ✅ legal · ❌ static error · n/a position doesn't exist for this kind · *open* = Variant C decides.

| Property group | Channel | (b) decl outer | (a) decl inner | (c) render outer | (d) render inner |
|---|---|---|---|---|---|
| `row`, `column`, `wrap`, `nowrap` | C-flow | ❌ (renderer isn't a flex item along its own flow) | ✅ (declaration sets root flow) | ❌ on `ui` / `view`-with-intrinsic-flow; ✅ on direction-agnostic `view` (e.g. `Box`) | ✅ on `view`s with caller-settable flow; ❌ on `ui`s and on `view`s with intrinsic flow |
| `gap`, `row_gap`, `column_gap` | C-distribute | ❌ | ✅ (declaration sets default gap of its root) | ❌ on `ui`; ❌ on slot-only `ui`s; ✅ on `view`s with open block | ❌ on `ui` (no children to arrange); ✅ on `view`s |
| `pack`, `spread`, `around`, `evenly` | C-distribute | ❌ | ✅ | ❌ on `ui`; ✅ on `view`s with open block (needs ≥2 children) | ❌ on `ui`; ✅ on `view`s |
| bare `top`/`right`/`bottom`/`left`/`center`/`stretch` (container directive) | C-align | ❌ | ✅ | ❌ on `ui`; ✅ on `view`s | ❌ on `ui`; ✅ on `view`s |
| `centered`, `stretched`, `packed` | S | ✅ (default self-placement) | ✅ on inner sub-views | ✅ (caller setting renderer's self-placement) | n/a — *self* words, OUTER position only |
| `margin` (all forms) | S | ✅ | ✅ on inner sub-views | ✅ | n/a |
| `width`, `height`, `min_*`, `max_*` | S | ✅ | ✅ on inner sub-views | ✅ | n/a |
| `grow`, `shrink`, `basis` | S | ✅ | ✅ on inner sub-views | ✅ | n/a |
| `relative`, `absolute` | S | ✅ | ✅ on inner sub-views | ✅ | n/a |
| offset `top`/`right`/`bottom`/`left` (with number) | S | ✅ (paired with `absolute`/`relative`) | ✅ on inner sub-views | ✅ | n/a |
| `z` | S | ✅ | ✅ on inner sub-views | ✅ | n/a |
| `pad` (all forms) | P | *open* | *open* | *open* | *open* |
| `overflow` | P | *open* | *open* | *open* | *open* |

Read column by column:

- **(b) decl outer** — the renderer's own default S; P open. No C: C is about *children*, and (b) is about the renderer-as-child.
- **(a) decl inner** — full C on the root; S on each inner sub-view; P open. The declaration's "interior tree" position.
- **(c) render outer** — caller-set S always; caller-set C only when the renderer's child set is *open and caller-supplied* (= variadic `view`s); P open.
- **(d) render inner** — caller-set C for `view`s; *no S* (S is OUTER by morphology); P open. The position does not exist for `ui`s in the layout sense (the `{ }` of a slotted `ui` contains slot fills only — no `[...]` layout clause).

### 6.5 Mapping to the original property-category framing

- *"Apply to all views, such as padding"* → **P**.
- *"Apply only to being a child of a container"* → **S**.
- *"Apply only to containers of children views"* → **C** (all sub-channels).
- *"Apply only to views with variadic child view contents"* → **C-distribute** (`gap`, `pack`/`spread`/`around`/`evenly`) — meaningful only over an open set ≥2.
- *"Apply only to a view with specified sub-views"* → C-align and per-slot S on declared/named children — set inside (a) on specific sub-views by the author.

---

## 7. Frozen-v1 layout surface check

This design adds **zero** layout vocabulary. The v1 word list (`row`/`column`/`wrap`/`nowrap`, `top`/`right`/`bottom`/`left`/`center`/`stretch`/`pack`/`spread`/`around`/`evenly`, `centered`/`stretched`/`packed`, `gap`/`row_gap`/`column_gap`/`pad`/`margin`, `width`/`height`/`min_*`/`max_*`/`grow`/`shrink`/`basis`, `relative`/`absolute`/`top`/`right`/`bottom`/`left`/`z`) is untouched. This is a pure ownership redistribution — *where each existing word can syntactically appear, and what it means in that position* — not an extension of the vocabulary.

Two notes:

- The frozen v1 "one layout clause per render" rule extends naturally to "one outer (c) clause + at most one inner (d) clause" per render statement. The two clauses are syntactically distinct positions (before vs. inside the block), and they own disjoint property sets, so this is not a "two clauses on the same node."
- The frozen v1 deferred *declaration-level layout* is un-deferred by (b) and (a). The four-position model is exactly that deferred work, made symmetric across declaration and render.

---

## 8. The three forks — complete trade-off analysis

Each fork is analysed under the F6 four-position model. **No fork is decided in this document** — the recommendation lives in the companion `Recommendation` doc.

### 8.1 Variant A — root structure of a renderer's body

#### A1 — named root: `render «Container» [...] { ... }`

The author names a concrete renderer that *is* the root. This is the form proposed in `View Root Model Decision.md`.

```tao
ui Header User [/* (b): defaults */] {
  render Row [/* (a-on-render): C+P+S of the named root */] {
    Avatar User                          // (a-on-subview): S
    Text User.Name
  }
}
```

- *Layout placement under the 2×2.* (b) is the declaration's own outer S/P default; the render line carries the root's C/P/S (mixed); inner sub-views carry their own S. The (b) ↔ render-line distinction is **not the 2×2 outer-vs-inner boundary** — (b) is on the renderer's wrapper identity (`Header`), the render line is on the named root (`Row`). Two different host nodes.
- *Tree identity.* `<Header>` doesn't appear as a node — `<Row>` does. The named root is the host. Refactoring `Row` → `Col` changes the visible tree node name.
- *Codegen footprint.* Zero extra wrapper. No new host node per renderer.
- *Disadvantage.* (b) and the render line both look like "outer-facing" candidates, which blurs the outer/inner ownership story.
- *Disadvantage.* The named-root + the keyword+name double-name the root: `Header`'s identity is "a Row with avatar+name" — but `<Row>` is what appears in the tree.
- *Advantage.* Caller can read the source and know exactly what RN host they're styling.

#### A2 — unnamed `render`: `render [...] { ... }`

The `ui`/`view` keyword+name *is* the host node. `render` is the body-boundary marker.

```tao
ui Header User [/* (b): outer S/P defaults — Header's self in its parent */] {
  render [/* (a-on-render): inner C — Header's arrangement of its declared tree */] {
    Avatar User                           // (a-on-subview): S
    Text User.Name
  }
}
```

- *Layout placement under the 2×2.* (b) is the renderer's outer-facing layout (S, maybe P); the `render` clause is the renderer's inner-facing layout (C, maybe P). **The outer/inner boundary is the `render` keyword itself — the cleanest possible mapping onto the 2×2.** Mirrors at the call site: `Header User [...] { [...] }` → outer S, inner C.
- *Tree identity.* `<Header>` is the host node. Refactor-safe — internal restructure doesn't change the externally-visible node name.
- *Codegen footprint.* Every renderer is one real host node. No fragment flattening without an explicit `fragment` keyword later. (Same cost as alternative A11 in `View Root Element Design Doc.md`.)
- *Disadvantage.* Extra host node per renderer compared to A1.
- *Advantage.* (b) and (a-render) carry crisply distinct roles (outer S vs inner C).
- *Advantage.* The call-site (c) ↔ (d) mirrors the decl-side (b) ↔ (a-render) exactly.
- *Open sub-question.* If the body has only one top-level element, is the `render` line required or implicit? Both choices preserve the boundary semantics.

#### A3 — no required root: body as a sequence

```tao
ui Header User [/* (b): defaults */] {
  Avatar User                              // (a): a sub-view
  Text User.Name                           // (a): another sub-view
}
```

- *Layout placement under the 2×2.* No `render` line → no syntactic inner boundary. (b) would have to carry **both** the renderer's outer S/P **and** its inner C (split by the validator according to which channel each word belongs to). The outer/inner split is encoded *only by morphology* (`centered` vs `center`), not by position.
- *Tree identity.* Under A3 the keyword+name must be the host (otherwise multiple top-level elements have no wrapper) — same as A2. Tree identity matches A2.
- *Codegen footprint.* Same as A2 — one host per renderer.
- *Disadvantage.* Drops the stated decision criterion — there is no syntactic spot that separates parent-provided from self-provided layout. The morphology alone has to carry that load.
- *Disadvantage.* A single-element body and a multi-element body look the same; the conceptual model "one declared root" is lost.
- *Sub-question.* May a renderer emit zero elements? If yes, an empty body is degenerate (no pixels, no host); if no, `{ /* nothing */ }` is an error.
- *Advantage.* Least syntax. No `render` keyword to teach.
- *Advantage.* Mirrors current Tao body shape (no `render` exists today).

#### Cross-cutting trade-off matrix

| Criterion | A1 | A2 | A3 |
|---|---|---|---|
| Layout-placement clarity (the stated decision criterion) | weak — (b) and render line both outer-ish | **strong** — `render` boundary IS the outer/inner line | weak — boundary encoded only in morphology |
| Tree identity | named-root is host | keyword+name is host | keyword+name is host |
| Codegen footprint | smallest | extra wrapper per renderer | extra wrapper per renderer |
| Refactor safety (rename inner root) | fragile (changes tree-node name) | safe | safe |
| 2×2 outer/inner symmetry (decl ↔ render) | broken | **mirrored** | partial |
| Syntactic minimalism | medium | medium | smallest |
| Teaches "every renderer has a root" | strongly | strongly | not at all |

### 8.2 Variant B — does a `ui` render have a block body at all?

#### B1 — `ui` renders may have a `{ }` block, restricted to slot fills only

```tao
IconButton "Save", Save [margin 4] {        // outer layout outside block
  @glyph -> SaveIcon                        // slot fill inside block
}
```

- Uniform with `view` call syntax — every renderer can have `Name args [...] { ... }`.
- Validator enforces: inside a `ui`'s `{}` there are slot fills only, no bare sub-views, no `[...]` layout clause (no (d) layout on `ui`s, per §6.4).
- The `{ }` is a *slot-fill container*, not a layout/child position.

#### B2 — `ui` renders never take a `{ }`; slot fills use other syntax

```tao
IconButton "Save", Save, @glyph: SaveIcon [margin 4]
// or
IconButton "Save", Save [margin 4] (@glyph: SaveIcon)
```

- Syntactically distinguishes `ui` from `view` at the call site — at a glance you can tell which kind you're rendering.
- Forces a new delimiter for slot fills (or a new argument-style syntax).
- Loses syntactic uniformity; teaches two call-site shapes.

#### Trade-offs

| Criterion | B1 | B2 |
|---|---|---|
| Call-site uniformity | one shape | two shapes |
| Visual distinction `ui` vs `view` | weak (same `{ }`) | strong |
| New syntax cost | none | one new form |
| Refactor safety (turning `ui` into `view`) | trivial (just open the contract in the decl) | requires call-site rewrites |
| Validator complexity | enforces "no bare children" inside `ui` `{}` | enforces "no `{}` on `ui` calls" |

### 8.3 Variant C — padding (P) ownership

Padding is interior (P channel). The question is: at which of the four positions may `pad` appear, and may a caller override it?

- **C1 — declaration-owned only.** `pad` legal at (b) (declaration defaults) and (a) (inner tree). **Static error at (c) and (d).** Callers use `margin` for outside breathing room. Cleanest encapsulation.
- **C2 — declaration-owned for `ui`, caller-allowed for `view`.** A `view` is a frame around caller content, so padding it is the caller's "breathing room around my content." `ui` padding is locked. Asymmetric but justifiable.
- **C3 — declaration-owned for custom renderers; caller-allowed for direct std-lib container renders only.** Inherits the existing decision doc's principled carve-out: `Row [pad 16]` is legal because the caller chose the primitive; `MyCard [pad 16]` is not.
- **C4 — universal caller override.** `pad` at any of the four positions on any renderer. Merge rule required (e.g. caller (c) wins over default (b)). Maximum flexibility.

#### Trade-off matrix

| Criterion | C1 | C2 | C3 | C4 |
|---|---|---|---|---|
| Encapsulation | strongest | strong for `ui`, weak for `view` | strong (carve-out is principled) | weakest |
| Symmetry across `ui`/`view` | symmetric | asymmetric | symmetric (modulo std-lib carve-out) | symmetric |
| Consistency with `View Root Model Decision.md` | matches "interior is declaration-owned" | partial match | exact match | contradicts |
| Author control over visual design | maximal (no caller can break it) | maximal for `ui`, partial for `view` | maximal except direct std-lib | minimal |
| Caller ergonomics | use `margin`; expose `Pad` param to vary | direct on `view`s | direct on std-lib containers | direct anywhere |
| Merge semantics needed | no | no | no | yes (override or additive?) |
| Risk of silent surprise | low | low | low | medium (caller's `pad 2` quietly replaces `pad 16` interior) |

#### Worked example

```tao
ui ProfileLink User {
  «ROOT» [pad 8 12, gap 8, center] {
    Avatar User
    Text User.Name
  }
}

// at call site:
Col {
  [gap 16]
  ProfileLink CurrentUser [margin 12, width 320, pad 2]   // pad 2 here is…
}
```

- **C1**: static error on `pad 2`. Caller must use `margin`. If varying padding is needed, `ProfileLink` exposes a parameter (`ui ProfileLink User, Pad number`).
- **C2**: `ProfileLink` is a `ui` → static error. (Same outcome here.) But on `MyOpenContainer [pad 2]` (a custom `view`) it would be legal.
- **C3**: static error on `ProfileLink` (custom). `Row [pad 2]` is legal (direct std-lib).
- **C4**: legal. `pad 2` overrides `pad 8 12` (assuming "override" merge rule).

---

## 9. Worked example — Kitchen Sink under each Variant-A option

The source file:

```tao
view AppView {
   Text "Kitchen Sink"
   Text "Exercises types, state, scopes, objects, structs, expressions, actions, local param types, nested views, inject, and cross-folder `use`."
   Text "${ KitchenSinkVersion } · file-level state below"
   Col [top left, gap 12, pad 16] {
      Row [center spread, gap 8] {
         Text "File-level counter:" [packed]
         Number FileLevelDemoCounter [centered]
         Button "Top-level action", BumpFileLevelDemo [centered, width 180] { }
      }
      Divider { }
      TypeMatching { }
      Divider { }
      StateDemo { }
      // … further demos …
   }
}
```

Observations to keep in mind:

- `AppView` today emits **four** top-level siblings (three `Text` + one `Col`). It compiles to a fragment.
- The Col's clause `[top left, gap 12, pad 16]` is a mix of C-align (`top left`), C-distribute (`gap 12`), and P (`pad 16`) — all inner-facing by morphology.
- The Row's clause `[center spread, gap 8]` is C-align + C-distribute — all inner-facing.
- The Button's empty trailing `{ }` is current Tao boilerplate; under the split it disappears (Button is a `ui`).
- `Text "…" [packed]`, `Number … [centered]`, `Button … [centered, width 180]` are all `-ed` / dimensional words — all OUTER-facing by morphology.

### 9.1 Under A1 (named root)

A1 requires exactly one named root, so the four-sibling body must be wrapped. The intro `Text`s now share the wrapper's `gap` / `pad`, which is a real behavioural change — call this out as a teachable consequence of A1.

```tao
ui AppView {
  render Col [top left, gap 12, pad 16] {
    Text "Kitchen Sink"
    Text "Exercises types, state, scopes, objects, structs, expressions, actions, local param types, nested views, inject, and cross-folder `use`."
    Text "${ KitchenSinkVersion } · file-level state below"
    Row [center spread, gap 8] {
      Text "File-level counter:" [packed]
      Number FileLevelDemoCounter [centered]
      Button "Top-level action", BumpFileLevelDemo [centered, width 180]
    }
    Divider
    TypeMatching
    Divider
    StateDemo
    // … further demos …
  }
}
```

Notes:

- `view AppView` → `ui AppView` (sub-views are declared, not passed in by a caller — its only caller is `app { ui AppView }`).
- `Button … { }` loses its empty block.
- `Divider { }`, `TypeMatching { }`, etc. lose their empty blocks (assuming those declarations become `ui`s; if any take children, they'd keep `{ }`).
- `render Col` names `Col` as the root. `<Col>` is the host node; `<AppView>` does not appear in the tree.
- Both the call-site `Row [center spread, gap 8]` and the inner `Col [top left, gap 12, pad 16]` use the existing single-clause `[ … ]` form, mixing outer and inner words by morphology — exactly as today.

### 9.2 Under A2 (unnamed `render`)

A2's `render` is the body-boundary. Outer (b/c) carries S-and-only-S; inner (a-render/d) carries C-and-only-C (P depends on Variant C — shown here as if C3, with `pad` allowed at (a-render) inside a custom declaration).

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
    // … further demos …
  }
}
```

Notes:

- `render [column, top left, gap 12, pad 16]` — all inner-facing words on the render line. `column` is added because under A2 flow lives on the render line. (Today it's inferred from the `Col` keyword.)
- `<AppView>` is the host node — A2 makes the keyword+name the React-tree identity.
- The Row's child arrangement moves *inside* the block: `Row { [center spread, gap 8] … }`. The Row itself takes no outer clause here because it has no S-words to receive.
- `Text "Kitchen Sink"`, `Divider`, `TypeMatching` etc. are bare — no layout.
- All `-ed` and dimensional words (`packed`, `centered`, `width 180`) sit outside their target's block, as today.
- A2 collapses the four-sibling body into one render statement, just like A1. (This is forced by A2's "one render line per renderer" rule; an A2 variant that allows multiple top-level elements collapses into A3.)

### 9.3 Under A3 (no required root)

A3 has no `render` line. (b) carries both outer S and inner C; the validator splits by channel.

```tao
ui AppView [column, top left, gap 12, pad 16] {
  Text "Kitchen Sink"
  Text "Exercises types, state, scopes, objects, structs, expressions, actions, local param types, nested views, inject, and cross-folder `use`."
  Text "${ KitchenSinkVersion } · file-level state below"
  Row [center spread, gap 8] {
    Text "File-level counter:" [packed]
    Number FileLevelDemoCounter [centered]
    Button "Top-level action", BumpFileLevelDemo [centered, width 180]
  }
  Divider
  TypeMatching
  Divider
  StateDemo
  // … further demos …
}
```

Notes:

- `ui AppView [column, top left, gap 12, pad 16] { … }` — the layout that previously sat on the `Col` now sits on the declaration header. The `Col` keyword disappears entirely because the AppView host *is* the column-arranged container.
- Same observed behaviour as A1: AppView's host wraps everything, and the intro `Text`s share the pad/gap. But unlike A1, the wrapper is named after the declaration (`<AppView>`) rather than after a named root.
- The Row still uses the existing single-clause `[ … ]` form at its call site, mixing outer and inner words (same as today). A3 doesn't introduce a render-inside-body position; it doesn't introduce a render-line either, so the four positions reduce conceptually to two at the syntactic level (one per declaration header, one per render).
- Sub-question for A3: an empty `ui Foo { }` is either degenerate (zero-node host) or an error. Either choice is consistent with the rest of the design.

### 9.4 What this comparison demonstrates

The Kitchen Sink rewrite makes the trade-off concrete:

- **A1** keeps current Tao's single-clause `[ … ]` shape at every render site (mixed outer/inner words by morphology) and adds a `render` keyword that names a std-lib root. The reader knows `<Col>` is the host.
- **A2** splits the single-clause into outer-vs-inner *positionally*, mirroring at every site (declaration and call). Reading layout is more mechanical: where the clause sits tells you which channel it owns. The reader sees `<AppView>` as the host.
- **A3** flattens everything onto the declaration header and the render call site; the position-as-channel structure is replaced by morphology-as-channel.

---

## 10. Frozen layout vocabulary — explicit check

This design **introduces no new layout words**. The complete `LayoutValidator.ts` word set — direction (`row`/`column`), wrap (`wrap`/`nowrap`), child arrangement (`pack`/`spread`/`around`/`evenly`/`stretch`/`top`/`right`/`bottom`/`left`/`center`), self-alignment (`centered`/`stretched`/`packed`), position (`relative`/`absolute`), numeric heads (`gap`/`row_gap`/`column_gap`/`pad`/`margin`/`width`/`height`/`min_width`/`max_width`/`min_height`/`max_height`/`grow`/`shrink`/`basis`/`z`), and offset heads (`top`/`right`/`bottom`/`left`) — is preserved verbatim. The only changes are *where* a given word may syntactically appear and *which validator channel* it belongs to. The morphology principle stated in `UI Layout Design Doc.md` §7 (locatives vs property-headed nouns, bare vs `-ed` words for self vs container directives) is preserved and in fact *strengthened* by the four-position model: morphology and position now agree.

---

## 11. Keyword-collision note: `ui` already exists

The token `ui` is already used by the app-entry statement:

```tao
app KitchenSink {
   ui AppView
}
```

Today `ui` here is the keyword `AppUiStatement`, naming the root view to render. Under this design, `ui` becomes *also* a declaration keyword:

```tao
ui AppView {
   render [ … ] { … }
}
```

The two uses are grammatically distinguishable:

- `app { ui AppView }` — the keyword appears inside an `app` block, with an identifier and no body.
- `ui AppView { … }` — the keyword appears at the top level, with an identifier and a body.

Implementers should treat the reuse as intentional, not accidental: `app { ui X }` reads as *"the root UI is X"*, and the language enforces that `X` is a `ui` declaration (an app's root has no caller above it, therefore no caller-supplied content, therefore no open block — it must be a `ui`). The collision is a teaching opportunity, not a problem.

A future cleanup could rename the app statement (e.g. `app KitchenSink { root AppView }`) if confusion proves real, but no migration is required by this design.

---

## 12. Open-questions ledger

| ID | Fork / Question | Where decided |
|---|---|---|
| **A** | Root structure of a renderer's body — A1 named root, A2 unnamed `render`, A3 no render | `Recommendation` doc |
| **A.1** | If A2 is chosen: must single-element bodies still include `render`? | depends on A |
| **A.2** | If A3 is chosen: may a renderer emit zero elements? | depends on A |
| **B** | Does a `ui` render statement have a `{ }` block at all? — B1 yes (slot-fills only), B2 no | `Recommendation` doc |
| **C** | Padding ownership — C1 declaration-only, C2 view-only-caller, C3 std-lib-only-caller, C4 universal | `Recommendation` doc |
| **D** | C-flow ownership for direction-agnostic `view`s (e.g. `Box`): caller-settable at (c)/(d) only when the declaration leaves flow unset — recommended position, validated by §6.4. Final wording deferred. | future |
| **E** | Bridge-imported renderers (RN components imported via library bridges): how do they declare `ui` vs `view`, flow ownership, allowed P at (c)? | future, after bridges land |
| **F** | A `fragment` keyword for pixel-free conceptual constructs (route outlets, providers, guards) that should not produce a host node? Required if A2 is chosen and the codegen cost becomes a measured concern. | future |
| **G** | Forwarding API — how does a custom `ui` or `view` opt to expose its interior P/C to callers (beyond exposing typed parameters)? | future |

---

## 13. Relationship to existing docs

This document does **not** edit any existing file.

- **`View Root Model Decision.md`** decided "one keyword `view`" (this doc diverges — §2/F1) and "mandatory targeted `render Row { … }`" (this doc takes that as Variant A1 and analyses it alongside A2/A3, leaving the choice to the `Recommendation`). The decision doc's three-channel layout ownership (self / interior / child-container) is **inherited** as S / P / C (§6.1).
- **`View Root Model Recommendation.md`** is the rationale companion to the decision doc and is referenced rather than edited.
- **`View Root Element Design Doc.md`** catalogues eleven alternatives; A1 here corresponds to that doc's A1, A2 here corresponds roughly to its A11, and `ui`/`view` as two keywords is the merge of its A2 (`view` + `element`) and A9 (`atom`/`view`/`container`) into a cleaner two-keyword cut. This doc cites those alternatives without replacing the catalogue.
- **`Named Renders Plan.md`** supplies the slot mechanism (`@name`, `@@children`, `@row Item`). F5 adopts it verbatim. The "renderer slot" terminology there is consistent with this doc's umbrella "renderer" term (F2).
- **`../UI - Layout and Styling/UI Layout/UI Layout Design Doc.md`** froze the v1 layout vocabulary; this doc adds zero words (§7, §10). The deferred declaration-level layout from that doc is what (a)/(b) un-defer; the morphology principle (§6.3) is preserved and strengthened.

Per F6, none of these files are modified; the `Recommendation` doc states which conceptual divergences are explicit.
