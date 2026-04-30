# Tao Language Roadmap

## Likely order

- [x] Alias Statements
- [ ] Composite expressions
- [ ] Minimal basic Type System
- [ ] Functions
- [ ] Control statements - if/else,

Design notes for the type system live under **`Docs/Projects/Type System/`** — start with [Type Design - Preferred](Projects/Type%20System/Type%20Design%20-%20Preferred.md) and [Type Design - Alternatives](Projects/Type%20System/Type%20Design%20-%20Alternatives.md); staged implementation in [Type Implementation - Execution plan](Projects/Type%20System/Type%20Implementation%20-%20Execution%20plan.md); long-form language surface in [Language surface - Type System Design](Projects/Type%20System/Language%20surface%20-%20Type%20System%20Design.md) (moved from _Tao Language Design_).

## Relationship to LLMs

- [ ] Instructions for LLMs to use Tao Lang
- [ ] Instructions for LLMs to build Tao Lang
- [ ] Design MCPs? Skills?
- [ ] Integration with Studio/Editor?
- [ ] Explicit declaration and support for users to edit specified parts of the app they're using directly?

## Syntax & grammar specifically

- [ ] Feature flags
- [ ] Error handling
- [ ] Data sources
- [ ] Authentication & Authorization
- [ ] Composite expressions
  - [x] Arithmetic — `+` / `-` / `*` / `/` with strict type rules (text+text, number+number, text*number); see [Type Implementation - Execution plan](Projects/Type%20System/Type%20Implementation%20-%20Execution%20plan.md) (Stage 1) and compiler tests
  - [x] String interpolation — `"…${Expression}…"` via multi-mode lexer + `StringTemplateExpression`; holes must be text / number / boolean
  - [ ] Objects, Arrays and Tuples
    - "Thing"s/"Item"s/"Object"s w properties/fields/attributes/characteristics; Lists; Pairs
      - I think I like Item.
- [ ] Expression transformations - e.g pipes, waiting for async, more?
- [ ] Declarations and Invocations
  - [ ] Parameters, outside and inside block. Match by name, type
  - [ ] Function parameters; e.g rendering an Item in a List.
    - [ ] Optional parameters
    - [ ] Multiple type signatures, to ensure no incorrect invocations
  - [ ] Arguments of invocations - inline args; block args
  - [ ] Explicit vs implicit statement and expression types (e.g function return type)
- [ ] Functions
- [ ] Handlers
- [ ] Views
- [ ] Types

## Server-side language ...?

- Could this be just data declarations, handlers, and bridges to data sources/rpcs?
- Compile to webassembly for sandboxing?
- [ ] Automatic containerization of apps
- [ ] Edge computing. Use your chosen provider

## Foundational Blocks

### Alias Statements

- [x] Declare "alias age = 1"
- [x] Reference e.g "Text value age"

### Functions

Project: ` /create-project Lets create a project for "Basic Functions":

    - Declare function (takes parameters, returns value, no side effects)
    - Invoke function (arguments)

`

- [ ] Parse functions, with positional arguments
- [ ] Decide on outer vs inner parameters syntax
- [ ] Decide how render functions are passed in as arguments to a view.
  - [ ] View definition: E.g `List` view
  - [ ] View renderings: E.g `List items: blogPosts { view BlogPost blogPost { ListItem { Text blogPost.title }} }`
  - Type inferred? E.g List expects a view that returns ListItem, like in example on previous line.
    - For header, groupheader, etc, it could expect a view returning a ListHeader, or a ListGroupHeader, etc
  - Named parameters?
    - Eg: `List items: blogPosts { renderItem: blogPost { Text blogPost.title }}`
    - Eg: `renderItem: item, index { Text item.title + index }`
    - Eg: `renderItem: item -> blogPost, index { Text blogPost.title + index }`
    - Or: `renderItem: item: blogPost, index { Text blogPost.title + index }`
  - Or! Matched by named type?
    - Eg: `List { renderItem: post BlogPost, index Number { Text post.title } }`
  - Or; Named _and_ type?
    - Eg: `List { renderItem: post BlogPost, index { Text post.title } }`
      - post is matched by type BogPost; index is matched by name

### Misc tooling

- [ ] Debugger, step through code, breakpoints, etc
- [ ] Profiler, performance measurement, benchmarking
- [ ] Networking, simulate latency/patchy connection/randomly offline/out-of-order delivery, etc
- [ ] Request tracing
- [ ] Logging, local and remote
- [ ] Offline development

### Testing

- [ ] Design and testing system
- [ ] Performance measurement, Benchmarking

### Previews

- [ ] Create studio app that allows for any view to be previewed with multiple state definitions (from a library)
- [ ] Similarly for error states

### Handlers

- [ ] Parse handlers

### Data sources

- [ ] Parse datasource definitions
- [ ] Parse queries
- [ ] Data caching declarations
- [ ] Datasource providers
  - [ ] Feature support declarations
  - [ ] Authentication declarations
  - [ ] RPC declarations

### Authentication & Authorization

- [ ] Declare user, and links to entities
- [ ] Also allow for non-user based, that only queries more manually

### UI styling

- [ ] Parse ui theme definitions
- [ ] Parse view layout
- [ ] Parse view styling

### Error handling

- [ ] Design error handling: syntax, enforcement, ...
- [ ] Parse error handlers

### Documentation

- [ ] Auto-generate documentation from a module folder, from comments before definitions
  - [ ] Allow for sections demarcated in code?

### Compiler

- [ ] Compile functions

### Runtime

- [ ] Create TL.render/query/etc
- [ ] Get langium compiler tracing to work and track runtime errors back to the original tao code

### Standard library

- [ ] ui: Views, Themes, Layout, Styling
- [ ] data: Data sources, queries, caching
- [ ] common: currency, time, locale, left-to-right, light/dark mode, accessibility, internationalization,, resizing text for sight, etc
- [ ] API for programmatic compiler functionality: parse, compile, type check, format, documentation, etc

### Concurrency

- [ ] Always await statements by default in handlers; and render by default with default loading or error views in views (but warn if not specified)
- [ ] Handler syntax for async invocation and awaits
- [ ] Handler syntax for concurrent invocations and awaits

### Formatter

- [ ] Re-order code: All consecutive use statements should be in alphabetical order
  - [ ] Use statements alphabetically
  - [ ] Object keys alphabetically

### Module system

- [ ] Implement named module imports and dependency declarations
- [ ] Remote modules
- [ ] Versioning, locking, deterministic builds, security

### Security

- [ ] Automatic module review for security vulnerabilities before publication happens?

### Editor

- [ ] AST-supported editing?

### Runtime

- **Multi-platform Support**: Expand runtime support to more platforms
- **Performance Optimizations**: Implement JIT compilation or other performance improvements
- **Native Modules**: Enable integration with native platform modules
- **Hot Reloading**: Implement hot reloading for development

### App release and management

- [ ] Auto-update
- [ ] Feature flags
- [ ] Cloud managed app releases, feature flags, a/b/c testing, stats and analytics, etc
- [ ] Tracing of requests and responses

## Imported List from App Lang:

### Expressions & assignments

- [ ] Simple Operators:
  - simple operators: <EXPRESSION> + <EXPRESSION> (-, *)
- [ ] Conditionals for bool assignments and branching statements:
  - if/for/while ... (expression < expression) (<=, =, =>, >, !)
    `if (<EXPRESSION> < <EXPRESSION>) { ... }`
- [ ] Object property access
      `foo.bar`
  - anything else?
  - Variable name access?
    `foo[PROP_NAME]`?
  - [ ] Have object literal syntax helpers? This might be nice:
    ````tao
    Text {
      anchors.centerIn: parent
      text: "Hello, QML!"
    }
    ```
    ````
- [ ] Error and Exception states
  - External data may be LOADING or ERRORed
  - External data must be type checked at entry
  - Does current total syntax and system allow for any other errors?
  - [ ] Design Data NULL/Loading guards/checks
        `foo.bar?.cat` <- evaluates to `Not A Value (NaN) | typeof cat`
    - `check`: Data is NaV in block, and HALTS if NaN. Data is guaranteed to NOT be NaV below this statement
      - Does `check ...` or `guard ...` feel best?
      - [ ] Need to decide on way to _Handle Error_ but _Still rendering old content if present_!
            `check foo.bar.cat (info) => { Here foo.bar.cat is NaV, and MISSING or ERROR. Next line is guaranteed to NOT be NaN }`
            `check foo.bar.cat Missing, Refreshing (info) => { Here foo.bar.cat is initial loading or being updated with a refresh-request to server }`
            `guard foo.bar.cat Loading { Here the expression is INITIAL LOADING or REFRESHING }`
            `guard foo.bar.cat { Here foo.bar.cat IS NaV, and executes before halting }`
    - [ ] data state boundaries? Evaluates to TRUE when any child statement below this current line HALTS (from e.g `check/guard`)
          `boundary Missing { <STATEMENTS> }`
          or general guard?
          `guard { ... }` HALTS whenever a child HALTs
- [ ] Design Invocations
  - state views
    `func Greeting (string Greeting, variable string Name) { return "${greeting} ${name}"`
    `Greeting("Hi", Name)`
    - Do we need to support query argument types?
      `func ItemIDs (query <XYZ??> Query) { return Query.map(item => item.id)}`
      `func checkData (data: queryData) { if (data.error) { ... } else if loading { ... } }`
- [ ] Design UI View statements
      `view ViewName (params) { <VIEW STATEMENTs> }`
      `state Foo = ""`
      `func Bar = () => XYZ`
      `Col prop1, propName propVal, prop3 [layout & styles> { [layout & styles> <VIEW STATEMENTs> }`
      `Col Prop1, propName PropVal, Prop3 [layout] <styles> { [layouts] <styles> | Long args? Children? Render fns? | { <VIEW STATEMENTS> } }`
      - Enforce layout and styles before view statements
      - Allow for layout inside block?
      - Allow for styles outside block?
      `if/for/switch { <VIEW STATEMENTs> }`
- [ ] Design Event Handler statements
      `<STATE VAR> = <EXPRESSION>`
      `if/for/switch { <VIEW STATEMENTs> }`
      `<MUTATION STATEMENT>`
  - Syntax for Event information passed to handler?
    `on press (info) { ... }` Always one arg?
    `on press with info () { ... }`
  - [ ] Design Mutation Statements
    - I think this will maybe depend on the type of data source
    - Some possibilities:
      `mutate/update/change/upsert <ITEM> with foo={EXPRESSION}, bar={EXPRESSION},`
      or
      `<ITEM>.<PROPS ACCESS> = <expression>`
      or
      `set <ITEM>.<PROPS ACCESS> = <expression>`
      or something else
      ...
      `[<NAME> =] create <TABLE/COLLECTION/MODEL> foo={EXPRESSION}, bar={EXPRESSION},`
      or
      `[<ITEM> =] new <TABLE/COLLECTION/MODEL> with foo={EXPRESSION}, bar={EXPRESSION},`
      or does ITEM always need to be checked for error etc, and is required in syntax?
      ...
      or something else
      `delete <ITEM>`
      or
      `delete <TABLE/COLLECTION/MODEL> where CONDITIONS`
  - [ ] Design Assignments:
    - Simple equal settings?
      <STATE VAR> -= <EXPRESSION> (=, +=, *=)
    - Object assignment helpers?
      `{ foo.bar: 1 }`
    - Decide on syntax
  - [ ] Design
  - [ ] MODALs Design
  - [ ] Do we need any of advanced react hook equivalents?
    - E.g useEffect, useMemo, more modern ones I didn't learn
- [ ] Design QUERIES statements
  - [ ] Do we need queries in handlers?
    - e.g to fetch additional data to proceed w handler
      `item = <QUERY SYNTAX>`
      `guard if item?.foo { <CREATE SYNTAX> }`
- [ ] Design Types
  - [ ] Inferred function/element argument positions by Type, if only one
  - [ ] Named types (also to make Inferred argument positions more ergonimic)
  - [ ] Type percolation
  - [ ] Type check async data access - detect Loading/Error state
    - [ ] In UI
    - [ ] In Handlers

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

### Design App Routing and Navigation

- [ ] Design Routing and Navigation

#### Layout: Choice exploration, thinking & justification

- [ ] Design: Data Sources: Declaration, Schema, Queries, Authentication, Offline-first, Providers
  - Goal:
    - Authentication
    - Model definitions
      - Relations between models
        - Cascading deletes
      - Access permissions
    - Reactive queries
      - Defined on models?
    - Mutations
      - Defined on models?
      - Do mutations describe the mutation code?
      - Or do they just specify the endpoints to sync to?
      - They need to define conflict resolutions. At least "last-write" strategy as a lowest common denominator
    - Offline first
      - Realtime sync
      - Conflict resolutions

  - [ ] Study schema definition targets
    - [ ] Relational
    - [ ] Event based
      - [ ] https://github.com/livestorejs/livestore/blob/main/examples/standalone/web-todomvc/src/livestore/schema.ts
        - This could map directly to schema definitions!
      - [ ] A first data driver
      - [ ] Pick target driver .. tanstack w ElectricDB/TxDB? supabase with powersync? instantdb? zerodb? localStorage/localOnly? https://tanstack.com/db/latest/docs/overview#localstoragecollection
        - Supabase
          - Not offline-first
          - Might be able to get there with watermelonDB or powersync
        - Tanstack DB
          - Can persist to ElectricDB, RxDB, or custom via Tanstack Query -> backend.
        - Tanstack Query
          - Works by mapping a useQuery => e.g a REST endpoint, GraphQL, etc
          - Requires manual query invalidation ...
          - NOT great
        - oRPC? OpenAPI rpc ...
          - Live queries? https://orpc.unnoq.com/docs/integrations/tanstack-query#live-query-options
        - LiveStore?
          - Event source!
            - Do I want to support different sorts of databases?
            - Relational
            - Eventlog
            - Etc ..
            - How is this modeled in the schema?
              - This is really cool! https://github.com/livestorejs/livestore/blob/main/examples/standalone/web-todomvc/src/livestore/schema.ts
          - Offline first!
          - Looks promising maybe?
          - https://livestore.dev
        - Prisma?
          - Hmmm
      - [ ] app datasource clause
        - Using a generic bridge interface?
        - Or does the datasource definition itself generate the code?
          - THIS is probably easier in the beginning!
          - Maybe a light mix of both?
          - Do we even have datasource-specific querying language?
            - This would be improved supported by type percolation
      - [ ] Pick another datasource, and make that work too

### Next and Advanced

- [ ] Decide which to incorporate:
  - [ ] Localization?!
  - [ ] Percolated Theme and Schema dependencies
  - [ ] Consider TanStack as a layer for all data bridges?
  - [ ] Learn about MEASURE FUNCTIONS: https://reactnative.dev/docs/layout-props#aspectratio
  - [ ] Inferred function/element argument positions by Type, if only one. E.g e.g {Text "hi", xyz asd} vs {Text value "hi, xyz asd}
    - [ ] Named types, with validation and semantic matching, for this to be more ergonomic and useful
  - [ ] Data access loading/error/fetching state handling
    - [ ] UI
    - [ ] Event handlers
  - [ ] Type percolations
  - [ ] Sandboxed dev env
  - [ ] Object prop helpers? foo = { bar.cat= 123 }

## Long-term Goals (18+ months)

### Language Features

- **Language Server Protocol**: Full LSP implementation for IDE integration
- **Distributed Computing**: Support for distributed programming patterns
- **AI Integration**: Integration with AI/ML frameworks and tools
- **Cross-compilation**: Support for compiling to multiple target platforms

### Ecosystem

- **Standard Library**: Expand standard library with more utility functions
- **Community Tools**: Develop community-driven tools and extensions
- **Education Resources**: Create comprehensive learning materials and tutorials
- **Enterprise Support**: Develop enterprise-grade features and support
