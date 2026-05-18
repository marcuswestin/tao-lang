# UI Layout and Styling

Preserve this file. It is the durable discussion/archive for UI layout and styling syntax exploration, including options that are not chosen in the current preferred design. Do not delete or compress it into only current decisions; authoritative docs should link here when they need prior reasoning, rejected vocabulary, or open alternatives.

For a compressed and organized version of the layout approaches represented here, see the [UI layout rationale](../Projects/UI%20-%20Layout%20and%20Styling/UI%20Layout/UI%20Layout%20Design%20Doc.md#exploration-and-vocabulary-rationale). The styling, theming, color/spacing/radius scale, and design-system counterpart is [UI Styling and Theme Syntax Exploration](../Projects/UI%20-%20Layout%20and%20Styling/UI%20Styling/UI%20Styling%20Syntax%20Exploration.md).

Batch-moved notes from older roadmap material, especially the long "Design UI Appearance" section. Intentionally rough and comprehensive; refine later.

## Layout and styling priorities

- Parse UI theme definitions.
- Parse view layout.
- Parse view styling.
- Design animation and transition syntax.
- Define "beautiful by default" baseline styles.

## Alignment and distribution exploration

- Consider different syntax for self-alignment vs child alignment.
- Current direction includes:
  - Parent alignment and distribution (`align`, `items`, `spread`, `stretch`, etc).
  - Child self-alignment (`aligned ...`, `stretched`).
  - Axis-aware restrictions by container type (`Row` vs `Col`).
- Candidate examples from moved notes:

```tao
Col [items top left] {
  View [aligned right]
  Row [aligned center]
  View [stretched]
}
Row [items top] {
  View [aligned bottom]
}
```

```tao
Row [align top left] {}
Row [align center] {}
Col [align top spread] {}
Row [align bottom spread] {}
```

## Size model candidates

Width/height syntax still open.
Candidate forms:

- `width fill-parent`, `height 40px`
- Percent + grow/shrink combinations
- Basis semantics mapped to axis (`Row` basis -> width, `Col` basis -> height)
  Notes to preserve:
- Clarify `fill-parent` vs `hug-content`.
- Keep warnings/errors for impossible axis combinations.

## Spacing, border, margin, padding

Border/padding/margin syntax and consistency are open.

- Candidate compact forms:
  - `[border 4]`
  - `[border 6, 10]`
  - `[pad top right bottom left]`
  - `[gap 10]`
  - `[gap V H]`

## React Native behavior notes to preserve

- Empty views can disappear without width/height/flex.
- RN defaults differ from web:
  - `flexDirection: column`
  - `alignContent: flex-start`
  - `alignItems: stretch`
  - `flexShrink: 0`
- Tao may want defaults that keep layout visibly debuggable by default.

## Additional layout concerns

Overflow and clipping:

- `[clip hide/scroll]`
  Wrapping behavior and defaults.
  Min/max width and height.
  Offset vs margin semantics.
  z-index/layering and optional 3d-ish ordering.
  Flow direction and localization (`ltr`/`rtl`).
  Absolute positioning behavior.
  Optional `order`, `reverse`, `display: contents`, `aspectRatio`, measure functions.

## Themes and design system notes

Theme tokens for colors, spacing, and radius.
Naming hierarchy for token application (e.g. semantic slots like icon/brand/pressed).

- Possible default spacing/radius scales:
- spacers (`0`, `4`, `8`, `16`, ...).
- radii (`small`, `medium`, `large`, `full`).
- Related references in moved notes include Figma workflow and design-system links.

## Styling spec backlog

- List all element styling properties.
- List all text styling properties.
- Finalize theme declaration and application syntax.

## Related docs

- [Tao Features](../Tao%20Features.md)
- [App Routing and Navigation](../Projects/Design%20WIP/App%20Routing%20and%20Navigation.md)
- [Error Handling](../Projects/Design%20WIP/Error%20Handling.md)

## Appendix: verbatim from pre-cleanup roadmap notes

Source: pre-cleanup roadmap lines 302-612 (`### Design UI Appearance` through the section before `### Design App Routing and Navigation`).

### Design UI Appearance: Layout, Design, Styling, Animations

- [ ] Design: Beautiful By Default
  - [ ] Nice default styles
  - [ ] Easy layout
- [ ] Design: UI Themes
  - Misc
    - [ ] See This for examples of ctools and how to create a theme design system: https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/?fuid=154734308415698449
    - [ ] Also this, for examples of how to organize design variables etc: https://www.figma.com/blog/how-to-streamline-your-design-system-workflow-in-figma/?fuid=1547343084156984494
    - [ ] And this, for creating an opinionated starting point of defaults for a design system that is inherently cross platform: https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/
    - [ ] To see how Figma is going about connecting code and design, see https://www.figma.com/blog/introducing-code-connect/
    - [ ] For Figma's Dev Mode VSCode IDE integration for developers, see https://www.figma.com/blog/introducing-dev-mode/
  - [ ] Design: Colors & Theme
    - Example: https://cdn.sanity.io/images/599r6htc/regionalized/de5dbc54da1eef0d1e9a70ac7627a182c8c5a472-1608x904.png?w=804&q=75&fit=max&auto=format&dpr=2
    - Each color has many names (or weights?)
    - E.g "Blue", has names: 100, 200, 300, 400, 500 etc, which go from light value to dark value.
    - Then for each Color+name, e.g Blue-700, there is schemes - Light, Dark, FigJam (for branding?)
    - Then, the actual instances of applied color in UI, there are application names:
      - icon > brand/danger/default/etc > default/secondary/pressed/onbrand/etc
      - Each of these maps to a unique actual color value:
        - icon > brand > pressed > light theme = colors/blue/700
      - These are stored as figma variables
  - [ ] Design: Spacing in Theme
    - Then there is spacing: https://cdn.sanity.io/images/599r6htc/regionalized/e2d76c2d1807bd0d28eb77159d21946bd8cf5d3a-1876x1916.png?w=804&q=75&fit=max&auto=format&dpr=2
    - Spacers/Radius > Name (e.g spacer-0, spacer-1, spacer-2/3/4/5/6), mapping to values, e.g Default:
      - spacer-0 = 0, -1 = 4, -2 = 8, -3 = 16, -4 = 24, -5 = 32, =6 = 40
      - radius-small = 2, -medium = 5, -large = 13, -none = 0, -full = 9999
- [ ] Design Styling Spec
  - [ ] List out all the element properties - color, etc
  - [ ] List out all the text properties - size, family, etc
  - [ ] Design theme syntax and application
  - [ ] Spacers/Radius > Name (e.g spacer-0, spacer-1, spacer-2/3/4/5/6), mapping to values, e.g Default:
        - spacer-0 = 0, -1 = 4, -2 = 8, -3 = 16, -4 = 24, -5 = 32, =6 = 40
        - radius-small = 2, -medium = 5, -large = 13, -none = 0, -full = 9999
- [ ] Remaining Decisions: Layout. Design and implement?
  - [ ] border radius??
  - [ ] overflow: `[clip hide/scroll]`. Does scroll actually create a scrollview?
  - [ ] wrap: should this be included in overflow? Should default be wrap, instead of nowrap? Also `[wrap reverse]`
  - [ ] max/min-W/H also
  - [ ] Margin and Offset:
    - How are these different? Probably that margin push other items out
    - [ ] `[offset 10 -5%]` (top/bottom, left/right, pos or neg values, pixels/percentage)
  - [ ] `[3d [zIndex]]`
  - [ ] Flow direction, localed `[flow ltr/rtl]` (inherit default)
    - [ ] Try first to see if this can be used by switching ALL properties
    - [ ] If not, specify the instances where it should be ignore with a marker
  - [ ] absolute position. optional zIndex
    - layering only is applied with respect to sibling nodes (e.g zIndex)
  - [ ] `[order num]` -- where in layout it appears. Support?
  - [ ] `[reverse]` -- reverses content order. Support?
  - Unsure whether we want to support:
    - [ ] Support `position static`?
      - offset don't apply (insets in rn css)
      - child elements skip this node for containing block calculations (https://www.yogalayout.dev/docs/advanced/containing-block).
      - This seems complex ..
    - [ ] Support aspect ratio? https://reactnative.dev/docs/layout-props#aspectratio
    - [ ] Support measure functions? https://reactnative.dev/docs/layout-props#aspectratio
    - [ ] Support `display: contents`?
      - Is this perfect for SEMANTICALLY NAMED elements? eg "Foo Bar" { ... }
      - Could also infer name from content if not named explicitly (Similar to figma?)
    - [ ] Support box layout?
      - Is there a better name for the semantics here?
        `[box-layout content]`
        // defaults to border

- [ ] Learn about MEASURE FUNCTIONS: https://reactnative.dev/docs/layout-props#aspectratio

The rest of **Next and Advanced** and **Long-term Goals** from that roadmap lives under **RAW TRANSFER** in [Tao Features](../Tao%20Features.md).
