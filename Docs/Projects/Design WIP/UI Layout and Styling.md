# UI Layout and Styling

Batch-moved notes from `Docs/Tao Lang Roadmap.md` (especially the long "Design UI Appearance" section). Intentionally rough and comprehensive; refine later.

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

- Width/height syntax still open.
- Candidate forms:
  - `width fill-parent`, `height 40px`
  - Percent + grow/shrink combinations
  - Basis semantics mapped to axis (`Row` basis -> width, `Col` basis -> height)
- Notes to preserve:
  - Clarify `fill-parent` vs `hug-content`.
  - Keep warnings/errors for impossible axis combinations.

## Spacing, border, margin, padding

- Border/padding/margin syntax and consistency are open.
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

- Overflow and clipping:
  - `[clip hide/scroll]`
- Wrapping behavior and defaults.
- Min/max width and height.
- Offset vs margin semantics.
- z-index/layering and optional 3d-ish ordering.
- Flow direction and localization (`ltr`/`rtl`).
- Absolute positioning behavior.
- Optional `order`, `reverse`, `display: contents`, `aspectRatio`, measure functions.

## Themes and design system notes

- Theme tokens for colors, spacing, and radius.
- Naming hierarchy for token application (e.g. semantic slots like icon/brand/pressed).
- Possible default spacing/radius scales:
  - spacers (`0`, `4`, `8`, `16`, ...).
  - radii (`small`, `medium`, `large`, `full`).
- Related references in moved notes include Figma workflow and design-system links.

## Styling spec backlog

- List all element styling properties.
- List all text styling properties.
- Finalize theme declaration and application syntax.

## Related docs

- [Tao Lang Roadmap](../../Tao%20Lang%20Roadmap.md)
- [App Routing and Navigation](App%20Routing%20and%20Navigation.md)
- [Error Handling](Error%20Handling.md)

## Appendix: verbatim from `Docs/Tao Lang Roadmap.md` (git HEAD, pre-cleanup)

Source: `git show HEAD:Docs/Tao Lang Roadmap.md` lines 302–612 (`### Design UI Appearance` … before `### Design App Routing and Navigation`).

### Design UI Appearance: Layout, Design, Styling, Animations

- [ ] Design ANIMATIONs and TRANSITIONs
- [ ] Design Layout and Styling
  - [ ] CONSIDER: DIFFERENT Syntax for self alignment and child alignment??
    ```tao
    row [strech, spread, gap 10] <pad 40, aligned left stretched, fill>
    col <width fill-parent, height 40px> {
      row <height 40px 50% 20%, width fill-parent>
    }
    ```
  - [ ] Implement. Current choice:
        ~~ `Row [items <stretched/spread> <vert/horz>]`~~
        ~~ `Row [items bottom right]`~~
        ~~ `Row [items stretch left]`~~
        ~~ `Row [items stretch left]`~~
        ~~ `Row [items spread-hug top]`~~
        ~~ `Row [items spread-hug-tight top]`~~
        ~~ `Row [items baseline left]`~~
        `Col [items baseline left] // warning (error?): baseline only applies to Row (RN doesn't have text-direction for Vert flow of text)`
        `Row [items spread left] // warning (error?): Row spread overwrites horizontal alignment (left)`
        `Row [items stretch top] // warning (error?): Row stretch overwrites vertical alignment (top)`
        `Col [items stretch bottom] // warning (error?): Col stretch overwrites vertical alignment (bottom)`
        `Col [items spread right] // warning (error?): Col spread overwrites horizontal alignment (right)`
        `Col [items spread top]`
        `Col [items spread-hug-tight left]`
        `Row [items spread top]`
  - [ ] align-self: `aligned` and `stretched`
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
  - [ ] width/height:
    - Possible syntaxes:
      ```tao
      // REJECTED:`[HORZ VERT]`:
      row [fill hug]
      // THIS ISN'T GREAT:
      row [100px 50% 20% 20px] // basis 100px grow 0.5 shrink 0.2; width 20px
      [width HORZ, height VERT]:
      // <number+(px, rem, %)>, fill-parent, hug-content
      col [width fill-parent, height 40px] {
        col [height 40px 50% 20%, width fill-parent]
        col [width 40rem 30%] // warning (error?): parent is COL, can only grow/shrink cross-axis (height)
      }
      ```
  - [ ] border, padding and margin -- all the same?
    - pixel units only,
      `[border 4]`
      `[border 6, 10]`
    - `[border/pad(ding)/margin top right bottom left]`
      - also: `[pad VH]`, `[pad V Right0]`, `[pad Top H Bottom]`, `[pad Top Right Bottom Left]`
      - This doesn't feel completely good to me
  - [ ] gaps:
        `[gap VH]` OR `[gap V H]`
        `[gap 10] // 10 px unit gap`
  - [ ] Review: Layout: Choice Exploration, Thinking, Justification
    - ALIGNMENT
      - This is governed by align-items and justify-content
        ~~- What if we combine them?~~
        ~~- `[align top left]`, `[align center]`, `[align center right]`, `[align bottom]`~~
        ~~- ## What are other possible names?~~
        ~~- What of align-items stretch?~~
        ~~- What of justify-content space-between, space-around, space-evenly?~~
        ~~- How about call it spread/spread-hug/spread-hug-tight~~

        - Observations
          - BASIS is the SAME AS WIDTH inside a Row
          - BASIS is the SAME AS HEIGHT inside a Col
          - GROW/SHRINK only applies to WIDTH inside a Row
          - GROW/SHRINK only applies to HEIGHT inside a Col
          - In RN, views hug content TO 0 by default
            - If two children with flexGrow = 1/3, they will take up only 2/3 of parent size
          - In a Row with non-0 height:
            - a child FILLES parent height (because alignItems=stretch by default)
          - In a row with 0 height:
            - A child HUGS and becomes its own content's height
          - In a row with alignItems: 'flex-start':
            - A child HUGS and becomes its own content's height
          - If a row child
            - height is set to 50 w/o, it will be 50 no matter what
            - width is set to 50
          - In a WRAPPED row
            - Each line becomes its own "mini flex container on the main axis"

        Row
        Vertical: align-items (top, bottom, center, stretch, baseline)
        When WRAPPED
        Each wrapped LINE is a MINI FLEXBOX container
        Align-Content distributes space BETWEEN/AROUND lines
        RN Default is "flex-start" instead of "stretch"!

        - Alignment spec:
          - What are ALL THE LAYOUT properties to consider?
            - align, wrap, basis/width/height, minW/H, flexGrow/Shrink, margin, padding, border\*Width, offset, gap, position, aspectRatio, (zIndex), display:none, overflow hidden/scroll/visible, transform*, translate*, scale*, rotate*, boxSizing, writingDirection, text: (lineHeight, numberOfLines, textAlign), Android:elevation, iOS:direction, flexWrap, alignItems, measure(),
            - flexDirection
              •	flexWrap
              •	justifyContent
              •	alignItems
              •	alignContent
              •	gap
            - results: hug-content, fill-parent, align-items, spread-items, align-self, 3d
            - Concepts to consider:
              - Fill-ratio/-space, claim-ratio/-space, resize-ratio
          - TODO!
            - alignContent:
              - only applies when wrap is true
              - in a row, when items wrap to second line, align-content distributes items on each row
              - in a col, for wrapped items in second col, align-content distributes items on each col
              - how do we support this in our layout system?
                - Syntax
                - Default (should it be CENTER, vs rn START or web STRETCH?)
                  - this means in web, a row has rows of wrapped items _stretch out to fill container_
                  - and in react native, rows of wrapped items _pack to the top or left_ of container
                  - center would have all wrapped rows items cluster in center
          - React Native behavior:
            - Without flex-grow or a width/height, empty views disappear in the UI!
              - They are `hug` by default
              - They expand only if e.g `flex: 1`, `width: 100%`, or `alignSelf: stretch`, etc
            - RN Defaults:
              - flexDirection is column (instead of row in web)
              - alignContent is flex-start (instead of stretch in web)
              - alignItems is stretch
              - flexShrink is 0 (instead of 1 in web)
              - `flex` property supports only one single number
            - OUR Defaults:
              - It would be nice if elements are ALWAYS visible by default
                - This will require
                  - flexGrow > 0
                  - OR, empty elements are special cased with min widht/height
                  - OR, there are multiple modes:
                    - a PRODUCTION mode, in which empty elements can be hidden
                    - a LAYOUT DEVELOPMENT mode, in which empty elements are grow 1 or minWH
                  - OR, CONTAINER elements like Row and Col MUST HAVE CONTENT and are otherwise parse validation error.
                - In Figma, this is achieved by ALWAYS HAVING A WIDTH AND HEIGHT for an item, even when hugging, and if it is empty then it uses its W/H
                  - However, this is because it is VISUAL and needs to be this way
                  - We COULD do this too, and require that elements are set to INVISIBLE if needed to be fully empty
                  - Should we EVER have a fully empty Row/Col visible?
          - Property name: `align`
          - Positioning: `top`, `bottom`, `left`, `right`, `center`, `baseline` (row only)
          - Distribution: `stretch` and `spread-*`
          - Examples:
            - `Row [top left wrap gap10 width20]`
            - `Row [align top left, wrap, gap 10, width 20]`
            - Basic directional alignments:
            - `Row [align top left] {}`
              - Items hug their content, are stacked left, and aligned to top edge
            - `Row [align left top] {}`
              - Same
            - `Row [align left center] {}`
              - Items hug their content, are stacked left, and centered vertically
            - `Row [align top] {}`
              - Possibilities:
                - Vertical:
                  - Either Stretched (Fill parent)
                  - Orrrrr Hug their content vertically and align to top edge
                    - (For Vertically stretched AND text baseline-aligned, LLM says you need to wrap each child and set baseline alignment on them)
                - Horizontal: (Hug their content by default?)
                  - Either Stacked left
                  - Orrrrr Squished together center
                  - Orrrrr Stacked right
                  - Orrrrr Spread from Left Edge to Right Edge (could spread/-hug/hug-tight too)
            - `Row [align right] {}`
            - `Row [align left] {}`
            - `Row [align center center] {}`
            - `Row [align center] {}` // equivalent to `[center center]`
            - Stretched and spread alignments:
            - `Col [align top stretch] {}`
            - `Col [align spread left] {}`
            - `Row [align bottom spread] {}`
            - `Row [align right stretch] {}`
            - `Row/Col
            - // ERROR - no Col vertical stretch: `Col [align left stretch] {}`
            - // ERROR - no Col horizontal spread: `Col [align top spread] {}`
            - // ERROR - no Row vertical spread: `Row [align left spread] {}`
            - // ERROR - no Row horizontal stretch: `Row [align left spread] {}`
          - Self-alignment:
            - In Rows, `aligned top/center/bottom` or `stretched` (never both)
            - In Cols, `aligned left/center/right` or `stretched` (never both)
          - Restrictions:
            - Row: No VERTICAL SPREAD; no HORIZONTAL STRETCH
            - Col: No VERTICAL STRETCH; no HORIZONTAL SPREAD; no BASELINE positioning
            - Row children: No `aligned left/right`
            - Col children: No `aligned top/bottom`
        - Default value of align-items is STRETCH
        - We say `spread`/`spread-hug`/`spread-hug-tight` for justify-content space-between/space-around/ space-evenly.
        - `Col [items top spread]` is impossible. Shows WARNING, and ERROR in strict.
          - (`top` claims vertical alignment, and you can't `spread` a column's content horizontally.)
            ~~- Possible names for~~
            ~~- property name: parent alignment of children: ~~
            ~~- items, align, layout, flow, distribute, gravity, content `[top left]`, `[right bottom]`~~
            ~~- value names: distribution of children:~~
            ~~- stretch, stretched, distribute, distributed, spread/-hug/-hug-tight~~
            ~~- What of `[Col top spread]`? Impossible value (can't "justify-content" row's horizontal items)~~
            ~~ - Show this as a warning, and error in strict?~~
            ~~- What about `[align top/center/bottom]`, and `[distribute left/center/right/space-*]`~~
            ~~- Or: Row center/left/right/space-* `[align top]`~~
            ~~- values to distribute items: stretched, distributed; spread, spread-hug, spread-hug-tight for space-between (default), space-around, space-evenly~~
      - child self alignment: aligned VH + stretched (no "spread")
      - Parent align children vertically/horizontally.
        `Row [align top] // Row (arranged left-to-right) all pushed to the top and left of Row's edges`
        `Row [align top, spread] // Row, items all pushed to the top of row, and spread from left to right edges`
        `Row [align top, spread space-around] // Row, items up top, and spread, w space left+right of items to edges`
        `Row [align left, stretch] // items fill vertical space of Row`
        `Row [stretch, spread]`
        `Row [align left, spread] // warning (error?): spread overwrites horizontal alignment for Row (left)`
        `Row [align top, stretch]`
        `Col [align top, spread]`
        `Col [align left, stretch] // warning`
        `Col [align top left]`
        `Col [align right, spread]`
        `Col [align center, spread] // spread vertically, bunched in center`
      - Variation:
        `Row [items top left]`
        `Col [items spread top]`
        `Col [items top spread]`
        `Row [content top left]`
        `Row [items left stretched]`
        `Row [items spread stretched]`
        `Col [items left top]`
      - Variation: just alignment names, possibly north/west/south
        `Row [top left]`
        `Row [tr]`
        `Row [t, stretch]`
        `Row [north west]`
        `Row [nw]`
        `Row [align top/bot/center left/right/center/spread, spread space-between/space-around/space-evenly]`
        SPREAD overwrites left/right/center for Row, and top/bottom/center for Col
    - items: `[align-items row: top/bottom/center and/or left/right/center]`. Or `[flow ...]`
    - pos: `[pos ...? align self ...? ]` (align self)
    - distribute: `[distribute start/center/space-between] (justify-content)`
    - This is basically, for row (and reverse for col):
      - JUSTIFY CONTENT: Left, Center, Right; PLUS spread from center (space-between, -around, -evenly). Left, Center, Spread, Right?
      - ALIGN ITEMS: Top, Bottom, FILL (Flex value: Stretch - Move to something else?), Center (middle of child on torso middle of parent), or ALIGN BY TEXT, e.g items are moved vertically to align first line of text. ONLY ALLOWED FOR ROWS
        - https://css-tricks.com/snippets/css/a-guide-to-flexbox/#aa-align-items
    - flex, sets flexGrow and flexShrink
    - ? `[resize [width/height, restricted to parent direction] [grow] 0/10/10%/100%/auto [shrink]]`
    - `[claim-space [width/height] X%]`
    - `[claim-ratio ...]`
    - `[resize-ratio]`
      - Should resize and width/height both be allowed at the same time?
    - `[width (sets flexBasis in Row) px/%/auto 0/10/10%/100%/auto]`
    - `[height (sets flexBasis in Col) ---=----]`
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

## RAW TRANSFER — roadmap “Next and Advanced” layout note (git `HEAD`)

Single bullet preserved from old `Docs/Tao Lang Roadmap.md` **§ Next and Advanced** (line ~684) that is explicitly about **layout/measure**, not duplicated in the UI Appearance appendix above:

- [ ] Learn about MEASURE FUNCTIONS: https://reactnative.dev/docs/layout-props#aspectratio

The rest of **Next and Advanced** and **Long-term Goals** from that roadmap lives under **RAW TRANSFER** in [Tao Features](../../../Tao%20Language%20Design/Features/Features.md).
