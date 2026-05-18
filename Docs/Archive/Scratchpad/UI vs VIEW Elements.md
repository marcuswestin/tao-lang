# UI vs VIEW Elements

Q: Can a value expression be: an action? a style spec? a layout spec?
Q: Do queries restrict to ui's only?

A neutral layout spec is for any element, e.g pad
A container layout spec is for any element with multiple subviews, e.g gap
A child layout spec is allowed only on children of a view.
A view accepts its container layout spec
A ui does NOT accept container layout specs
An element is a ui or a view
An element declares and accepts NameTyped expression arguments
An element declares named events and accepts named event-handler-actions
An element accepts neutral layout specs, and neutral style specs
An element may declare named render spots
An element receives named renders in its render block
A view accepts variadic-polymorphic subviews/children in its render block body
A ui does NOT accept variable subviews in its render block body

Layouts:
Neutral: pad, ...
Container:
gap
items <vert> <horz>:
[items top right]
[items spread top]
[items left spread-hug-tight]
[items spread-hug]
[items baseline left]
Child: stretched, centered,

"A caller of a view owns the layout of the unnamed children it provides. Therefore caller-specified container layout props are legal on view renders."

Well, kinda. A view

I think it might be true that all of this makes sense iff a view is NOT allowed to loop over its children, but ONLY pick where to render them. Why? Becuase otherwise, it could loop over the children and place each one inside of a ui/view, and therefore break the layout logic. If this is true, does it mean that a view must simply put `@@children` somewhere in its render body? If yes, then does our logic system hold up if that view puts its children inside of a nested tree?

```tao
ui U { ... }
view FramedView {
   render Col {
      U { ... }
      Text "Sup"
      // Row [gap 3] {
         // @@children
         // for child in @@children {
         //    Box [pad 10] { child {} }
         // }
      // }
   }
}

ui Example {
   render Col [gap 7] {
      Box { }
      Box { }
      FramedView [gap 10] {
         Text "hi"
         Text "hi 2"
         Text "hi 3"
      } // <- This SHOULD mean that the `@@children` inside of V are rendered with gap 10, right? HOWEVER! How does that make sense? Does it get merged into the layout specs of the Row in V? How, overwritten? Do we end up with gap 3, 10, or 13? (or something else?)
   }
}
```

Ok, I'd say that wherever the @@children is placed -- when the view is rendered, the container of @@children get the container layout spec of the view applied to it.
The neutral vanilla spec gets applited to the view node itself.

---

Element
An element is either a ui or a view.

An element render accepts inputs of five disctinct types, each with its own syntax:

typed expression arguments: `Text User.Name, ...`
named event handlers: `Button OnPress action { ... } ...`
neutral layout specs: `Button [pad 4] ...`
neutral style specs: `Button [bg white] ...`
named render fills: `Button { @icon Image IconURL }`

Additionally a view accepts subviews in its render block:

```tao
Col {
   Text "Hi"
   Button OnPress action { ... }
   ...
}
```

A view also accepts _container_ layout render specs: `Col [gap 2] { ...`
And a view's child accepts _child_ layout render specs: `Text [pad 4] ...`

---

ui vs view:

- caller of a view can set its container layout specs
- caller of a ui can NOT specify its container layout props

- Some Elements accept children
  - others don't.
- Some layout specs require children (gap)
  - others require being a child of a flex-container.
- Some Elements have customizable "Render Spots"
  - Eg a Button with @label and @icon.

Named Renders
Lambda-Views Arguments
View Children
Containers vs ____?

CONSIDER:
Does Data/State/Query fetching/declaring belong only in UI?

Passing in a rendered can only be done as a named render slot; or as a container child rendered view.
-> Views can NOT be set as state, passed as arguments, etc.

- Is this what we want?

views OFTEN paint no pixels

- Consider: ENFORCE no pixels from views.
- A background would require a ui wrapper. Ditto borders.
- Should a `view` be called a `frame` and have NO pixels, only logic, structure and layout?
- A view without content is a "No-Op" then.
  ui ALWAYS (actually? or usually) paints pixels

"5. **Primary role.** `view` is a structural/layout construct (its job is to arrange)."
"`ui` is a presentational construct (its job is to present a specific thing)."

LAYOUT RESPONSIBILITIES

- The CALLER of a VIEW is RESPONSIBLE FOR ITS CONTAINER LAYOUT SPECS
-

### Proposals

- Renderers? ("Visuals" or "Elements" or "Blocks" or "Frames")
  - `view` accepts a variable number of children in a block
    - `Col { ... }`, `Row { ... }`, etc
  - `ui` does not
    - `Button { Col { ... } }` <- doesn't make sense
  - both can use subviews
    - `ui Button { Row { ... } }` <- makes sense
    - `view Menu { Col { @@children } }`
      ?? - but only "view" accepts container-layout-specs
    - `Col [gap: 10] { ... }` <- makes sense
    - `Button [gap: 10] { ... }` <- does not
    - `ui Button { Row [gap 2] { ... } }` <- does
  - and only `ui` can have custom "Render Spots"
    - ```tao
      ui Button {
        Row [gap 10] { @icon, @label }
      }
      view Menu MenuItems, OnSelect action MenuItem {
        @header
        for MenuItem in MenuItems {
            Row [gap 10] {
                on press OnSelect
                @menu-item MenuItem
            }
        }
      }
      view Example {
        alias MenuItems []
        Menu OnPress action MenuItem { set SelectedMenuItem = MenuItem } {
            @header: Text "Menu"
            @menu-item MenuItem: Row { Text MenuItem.Text }
        }
      }
      ```
