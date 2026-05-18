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
