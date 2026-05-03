# Language Syntax Brainstorm

Batch-dump of raw language-surface notes moved out of active roadmap/todo lists. Prefer moving over rewriting; refine later as focused project docs emerge.

## Functions and invocation shape

Moved from `Docs/Tao Lang Roadmap.md`:

- Parse functions, with positional arguments.
- Decide on outer vs inner parameters syntax.
- Decide how render functions are passed in as arguments to a view.
  - View definition: e.g. `List` view.
  - View rendering examples:
    - `List items: blogPosts { view BlogPost blogPost { ListItem { Text blogPost.title }} }`
  - Type inferred? e.g. `List` expects a view that returns `ListItem`.
  - Named parameters?
    - `List items: blogPosts { renderItem: blogPost { Text blogPost.title }}`
    - `renderItem: item, index { Text item.title + index }`
    - `renderItem: item -> blogPost, index { Text blogPost.title + index }`
    - `renderItem: item: blogPost, index { Text blogPost.title + index }`
  - Matched by named type?
    - `List { renderItem: post BlogPost, index Number { Text post.title } }`
  - Named and type?
    - `List { renderItem: post BlogPost, index { Text post.title } }`
    - `post` matched by type `BlogPost`; `index` matched by name.

## Expressions and assignments

Moved from `Docs/Tao Lang Roadmap.md`:

- Simple operators and conditionals (`if/for/while`).
- Object property access:
  - `foo.bar`
  - `foo[PROP_NAME]`
- Object literal syntax helpers, e.g.:

```tao
Text {
  anchors.centerIn: parent
  text: "Hello, QML!"
}
```

## Invocation, handler, and mutation notes

Moved from `Docs/Tao Lang Roadmap.md`:

- Design invocations.
- Design UI view statements.
- Design event handler statements.
- Event info passed to handlers:
  - `on press (info) { ... }`
  - `on press with info () { ... }`
- Mutation statement syntax candidates:
  - `mutate/update/change/upsert <ITEM> with foo={EXPRESSION}, bar={EXPRESSION}`
  - `<ITEM>.<PROPS ACCESS> = <expression>`
  - `set <ITEM>.<PROPS ACCESS> = <expression>`
  - `[<NAME> =] create <TABLE/COLLECTION/MODEL> foo={EXPRESSION}, bar={EXPRESSION}`
  - `[<ITEM> =] new <TABLE/COLLECTION/MODEL> with foo={EXPRESSION}, bar={EXPRESSION}`
  - `delete <ITEM>`
  - `delete <TABLE/COLLECTION/MODEL> where CONDITIONS`

## TODO-moved notes

Moved from `TODO.md`:

- Currying actions:
  - `action UpBy Count number { ... }` and `Button UpBy 2 -> { }`
  - `Button "Count 2", on press -> UpBy 2`
  - `Button on press UpBy.2 "Count 2"`
  - `Button UpBy.2 "Count 2"`
  - `Button "Count 2", -> UpBy 2`
  - Question: are args evaluated at registration time or event time?
- String operations:
  - Adjacency concatenation:
    - `"Year is " birthYear + age " today."`
    - Requires either newline-delimited statements OR view-render statements always ending in `{ ... }` AND the only non-keyword-prefixed view-body statement type is a view render AND keywords are reserved (cannot be alias names).
    - Without `{}` termination, `Text "hi " name \n Button title "click me" {}` is ambiguous — is it `"hi " + name + Button + ...` or `"hi " + name`; `Button` render; `...`?
  - Interpolation:
    - `"Hello, {name}!"`
    - `"A block starts with \\{ and {\"ends\"} with \\}."`
  - Consider removing `+` string concatenation until adjacency/interpolation direction is settled.

## Misc syntax candidates

Moved from `TODO.md`:

- `let` definitions — open question whether to add them, and what their scope rules would be.
- Require reference names to be uppercase? Open question.
- Whitespace/newline sensitivity in render bodies — `view TestView { Col \n Row }` is the question case. Candidate resolutions:
  - No-block + newline: rely on newlines, e.g. `view TestView { Col \n Row }` is two render statements.
  - Block-required: `view TestView { Col { } Row { } }` — every render statement always has a `{}`.
  - Comma-separated (with optional trailing comma): `view TestView { Col, Row }`, and:

    ```tao
    view TestView {
      Col,
      Row {
        Text "Hello, World!"
      },
    }
    ```

## Parking lot

Use this doc for raw syntax ideas that do not yet have dedicated project docs (`Type System`, `Data Schema and Queries`, etc).

## Related docs

- [Tao Lang Roadmap](../../Tao%20Lang%20Roadmap.md)
- [Error Handling](Error%20Handling.md)
- [UI Layout and Styling](UI%20Layout%20and%20Styling.md)

---

## RAW TRANSFER (from `Docs/Tao Lang Roadmap.md` @ git `HEAD`)

Verbatim excerpt: old roadmap lines **197–301** (`## Imported List from App Lang:` through **Design Types**, stopping before the **Design UI Appearance** section which lives in [UI Layout and Styling](UI%20Layout%20and%20Styling.md)).

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
