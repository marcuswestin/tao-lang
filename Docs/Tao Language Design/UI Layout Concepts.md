# UI Layout Concepts

Purpose: explain the intended Tao layout experience for humans.

This document is conceptual and example-driven. It should help a designer or developer understand what Tao layout words mean, why they exist, and how layout should feel to read and write. It does not define build scope, validation details, or every edge-case behavior. The deterministic lowering contract lives in [UI Layout Specification](./UI%20Layout%20Specification.md).

## Core Idea

Tao layout should let a designer and developer say what they mean in screen terms, then let the compiler and runtime lower that intent to React Native/Yoga flexbox.

The common path should be small:

```tao
layout ProfileScreen {
  render Col [gap 16, pad 20] {
    Header User.Name
    ProfileSummary User
    ActivityFeed User
  }
}
```

More complex behavior should still be possible, but it should look appropriately more explicit when you reach for it.

## Three View Kinds

`view` is the umbrella type for all renderers: `ui`, `frame` and `layout`:

```text
ui | frame | layout
```

They answer three different questions:

```text
ui     = presents one specific thing
frame  = frames caller-provided content
layout = create an expanding area and arranges caller-provided content in it
```

Examples:

```tao
ui Button Label text {
  render Box [pad 10] {
    Text Label
  }
}

frame Card {
  render Stack [pad 16, gap 8] {
    @@children
  }
}

layout Page {
  render Col [fill, gap 20, pad 24] {
    @@children
  }
}
```

The mental model:

```text
ui     is closed: callers pass arguments and slots, not arbitrary unnamed children.
frame  is object-like: it usually hugs content and keeps its designed shape.
layout is area-like: it usually expands to occupy useful space.
```

So a button, icon, text line, avatar, and image are usually `ui`.

A card, toolbar, header bar, field group, popover frame, tab bar, profile header, feed item, or command palette frame is often a `frame`.

A page, screen, side panel, dashboard region, split pane, kanban board, inspector panel, or calendar grid is often a `layout`.

## Standard Building Blocks

Tao's core standard-library layout views are directional. There is no directionless core box for normal-flow children.

```text
Row         = horizontal layout
Col         = vertical layout
Box         = horizontal frame
Stack       = vertical frame
WrappingRow = horizontal layout that wraps onto new lines
```

`Row` and `Col` are for areas that arrange content.

```tao
layout AppShell {
  render Col [gap 12] {
    HeaderBar
    Row [gap 16] {
      Sidebar
      MainContent
    }
  }
}
```

`Box` and `Stack` are for framed things that usually hug their contents.

```tao
frame Toolbar {
  render Box [gap 8, pad 8] {
    @@children
  }
}

frame Card {
  render Stack [gap 10, pad 16] {
    @@children
  }
}
```

`Box` means a horizontal frame, not a generic neutral container. That is intentional: when something has several normal-flow children, Tao wants the author to choose whether those children flow horizontally or vertically.

## Defaults

Defaults are part of the language design, not inherited from React Native.

```text
Row         -> items baseline left
Col         -> items top stretch
Box         -> items center left
Stack       -> items top center
WrappingRow -> items baseline left
```

Self-sizing defaults:

```text
layout -> compress + fill
frame  -> rigid + hug
ui     -> rigid + hug, unless it declares a public size
```

Plain-language reading:

```text
fill     = take available space
hug      = size to content
compress = may shrink under pressure
rigid    = keep intended size, even when space is tight
```

This makes layouts good placeholders while an app is being built: a `layout` tends to occupy visible space, while a `frame` or `ui` tends to keep its own designed shape.

```tao
layout ArticleScreen {
  render Col {
    Header [hug]
    Body
    Footer [hug]
  }
}
```

Here `Body` can simply be a layout that fills the middle.

## Arranging Children With `items`

`items` describes how a container places its children.

```tao
Row [items baseline left] {
  Avatar User
  Text User.Name
}

Col [items top stretch] {
  SearchBox
  ResultsList
}

Box [items center left] {
  Icon "search"
  Text "Search"
}
```

The words are visual:

```text
top | bottom | left | right | center | baseline | stretch
spread | spread-inset | spread-balanced
```

The order does not carry meaning. Tao infers which word belongs to which axis.

```tao
Row [items center left]  // vertical center, horizontal left
Row [items center top]   // vertical top, horizontal center
Col [items right top]    // horizontal right, vertical top
```

`center` fills the empty slot:

```text
items center      = center center
items center left = center left
items center top  = top center
```

`stretch` and `spread` are direction-aware:

```tao
Row [items stretch left]  // children fill row height, packed left
Row [items bottom spread] // children rest at bottom, spread horizontally

Col [items top stretch]   // children fill column width, packed top
Col [items spread right]  // children spread vertically, aligned right
```

The spread variants describe edge behavior:

```text
spread          = first and last items reach the container edges
spread-inset    = items spread out, but the group keeps a small edge gutter
spread-balanced = inside gaps and edge gutters are equal
```

`baseline` is for horizontal flows where text and controls should sit on a shared typographic line.

```tao
Row [items baseline left] {
  Text "Total"
  Text "$42"
  Icon "info"
}
```

## Self Alignment

A child can override the cross-axis alignment its parent gives it.

```tao
Col [items top stretch] {
  Toolbar
  Card [aligned center]
  Footer [stretched]
}

Row [items baseline left] {
  Avatar User
  Badge [aligned top]
}
```

Use `aligned X` for position. Use `stretched` for fill.

```text
aligned top | aligned bottom | aligned left | aligned right | aligned center | aligned baseline
stretched
```

`aligned stretch` is not a Tao phrase because stretch is not a position.

## Size And Pressure

Size can be physical:

```tao
[width 320]
[height 44]
[width min 240 max 420]
[height hug min 32 max 80]
```

Or intent-based:

```tao
[fill]
[hug]
[grow]
[grow 2]
[compress]
[rigid]
[stretched]
```

Useful readings:

```text
width fill  = fill horizontal space
height fill = fill vertical space
fill        = grow + stretched
grow        = claim available main-axis space
grow 2      = claim twice the weighted main-axis space
stretched   = fill the cross axis
compress    = allowed to shrink on the main axis
rigid       = do not shrink just because the parent is tight
```

Examples:

```tao
Col {
  Header [hug]
  Body [fill]
  Footer [hug]
}

Row {
  Sidebar [width 280, rigid]
  Main [fill, compress]
}

Row {
  Primary [grow 2]
  Secondary [grow]
}
```

`fill` takes no number. If the amount matters, use `grow`.

## Text Pressure

Tao should not make every author manually combine text wrapping, clipping, line limits, and ellipses. Common text behaviors become named text views.

```text
Text                  = one line, tail ellipsis
TextLabel             = one line, hard clip
MultiLineText         = wraps naturally, unlimited lines
MultiLineText Lines N = wraps to N lines, then tail ellipsis
```

Examples:

```tao
Text User.DisplayName
TextLabel StatusCode
MultiLineText Article.Summary
MultiLineText Article.Summary Lines 3
```

If multiline text becomes too short vertically, it clips normally. It does not invent a height-based ellipsis.

## Wrapping

Tao avoids a generic `[wrap]` property as the everyday surface. Use a named view when wrapping is the actual design.

```tao
WrappingRow [gap 8] {
  Tag "Design"
  Tag "Compiler"
  Tag "Runtime"
  Tag "Mobile"
}
```

This says something stronger than "turn on flexWrap." It says: this is a row of items that may continue onto new lines.

If a design wraps vertically into columns, that should also be expressed by a named view rather than a raw property.

## Spacing

Use `gap` for space between arranged children.

```tao
Row [gap 8] {
  Icon "mail"
  Text "Inbox"
}
```

Use `pad` for space inside a view's own box.

```tao
frame Card {
  render Stack [pad 16, gap 8] {
    @@children
  }
}
```

`pad` can be broad, then refined:

```tao
[pad 10]
[pad 10 horizontal 4]
[pad top 10 bottom 20 horizontal 40]
```

`margin` is not the preferred everyday concept. Tao should first reach for `gap`, `pad`, and named layout views. Outside spacing, auto spacing, and negative movement should be named by intent instead of being collapsed into one generic margin knob.

## Children In Frames And Layouts

`frame` and `layout` receive caller children through `@@children`.

```tao
frame Section {
  render Stack [gap 12, pad 16] {
    @@children
  }
}

Section [gap 8] {
  Text "Profile"
  Text "Billing"
}
```

The caller's container specs, such as `gap` and `items`, apply where `@@children` is placed.

If a frame has fixed internal content around the caller children, make the host explicit.

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

Here caller `gap` applies to the inner `Stack`, not to the label.

`@@children` is opaque: a view places the caller's children; it does not inspect or loop over them.

## Public Defaults

A declaration can set overridable defaults on its public surface.

```tao
ui Pill Label text [compress, pad 8] {
  render Box {
    Text Label
  }
}

Pill "Beta"
Pill "Beta" [rigid, pad 4]
```

Put a layout value on the declaration line when callers should be allowed to override it. Put it on the internal render node when it is private implementation.

## Nudge And Overlay

Some designs need visual movement that should not change normal layout.

```tao
Badge [nudge up 4 right 4]
```

Some designs need positioned content above a normal view.

```tao
frame HelpPanel {
  render Stack {
    @@children
  }

  overlay {
    anchor top left HelpButton "?"
    anchor bottom 10 right 20 Box {
      Text "Drawer"
    }
  }
}
```

`nudge` and `overlay` are preferred over exposing raw absolute positioning as the common surface.

## Separate Concepts

Tao layout should not expose every React Native/Yoga knob as everyday syntax. Some behaviors belong to other Tao concepts:

```text
outside spacing | border/radius | scroll containers | raw overflow | raw wrap
raw absolute positioning | z/layer | order/reverse | aspect ratio
display contents | measure functions | animations/transitions
general unit syntax | design tokens | localization mirroring
```

They should enter Tao through human-facing concepts that are clearer than simply copying the underlying runtime property name.

## Style Boundary

Layout uses `[ ... ]`.

Design specs currently use `<"description">` on declarations and variants. A future explicit appearance syntax has not been chosen.

`bg`, `radius`, `border`, `color`, `font`, `shadow`, `opacity`, and `transform` are style concerns, not layout vocabulary.

Border and radius remain styling concepts even when they affect geometry.
