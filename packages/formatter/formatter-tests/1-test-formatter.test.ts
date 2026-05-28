import { FS } from '@shared'
import {
  SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_FORMATTED,
  SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_RAW,
  SNIPPET_ACTION_BUMP_STEP_NUMBER,
} from '@shared/testing/tao-snippets'
import { describe, expect, test } from 'bun:test'
import { dedent, formatCodeForTest, testFormatter, visualize } from './formatter-test-utils'

type FormatterCase = { title: string; raw: string; expected: string }

/** runFormatterCases registers one testFormatter round-trip per uniform `{ title, raw, expected }` row. */
function runFormatterCases(cases: FormatterCase[]): void {
  for (const { title, raw, expected } of cases) {
    testFormatter(title).format(raw).equals(expected)
  }
}

const formatterUseStatementCases: FormatterCase[] = [
  {
    title: 'use statement newline',
    raw: `
      use Button from ./ui/views
      ui MyView {}
    `,
    expected: `
      use Button from ./ui/views

      ui MyView { }
    `,
  },
  {
    title: 'consecutive use statements',
    raw: `
      use KnifeBlock from ./counter
      use FridgeView
      ui MyView {}
    `,
    expected: `
      use KnifeBlock from ./counter
      use FridgeView

      ui MyView { }
    `,
  },
  {
    title: 'consecutive same-module use statements',
    raw: `
      use Button
      use Label
      ui MyView {}
    `,
    expected: `
      use Button
      use Label

      ui MyView { }
    `,
  },
]

const formatterUseImportSpacingCases: FormatterCase[] = [
  {
    title: 'use with multiple imports normalizes spacing',
    raw: `use Row ,   Col`,
    expected: `
      use Row, Col
    `,
  },
  {
    title: 'use with multiple imports no spaces',
    raw: `use Row,Col,Text`,
    expected: `
      use Row, Col, Text
    `,
  },
  {
    title: 'use with multiple imports and from path',
    raw: `use Row ,   Col from @tao/ui`,
    expected: `
      use Row, Col from @tao/ui
    `,
  },
]

describe('Formatter', () => {
  test('dedent', () => {
    expect(visualize(dedent(``))).toBe(visualize(``))
  })
  test('dedent 2', () => {
    expect(visualize(dedent(`
        `))).toBe(visualize(`
`))
  })
  test('dedent', () => {
    expect(visualize(dedent(`
        1
         2
          3`))).toBe(visualize(`\n1\n 2\n  3`))
    expect(visualize(dedent(`
   2

 1
       3
    `))).toBe(visualize(`
  2

1
      3
` // No whitespace on last line
    ))
  })

  testFormatter('empty file')
    .format(``)
    .equals(`\n`)
  testFormatter('Whitespace prefix removal')
    .format(`

    app MyApp {}
    `)
    .equals(`
    app MyApp { }
    `)

  testFormatter('Postfix whitespace remove and newline insertion')
    .format(`
    app MyApp {}
    `)
    .equals(`
    app MyApp { }
    `)
  testFormatter('empty body')
    .format(`app foo {}`)
    .equals(`
        app foo { }
    `)
  testFormatter('empty app')
    .format(`app MyApp {}`)
    .equals(`
        app MyApp { }
    `)
  testFormatter('app with single ui')
    .format(`app MyApp {ui MyView}`)
    .equals(`
      app MyApp {
          ui MyView
      }
    `)
  testFormatter('app with multiple ui statements')
    .format(`app MyApp {ui View1 ui View2}`)
    .equals(`
      app MyApp {
          ui View1
          ui View2
      }
    `)
  testFormatter('empty view')
    .format(`ui MyView {}`)
    .equals(`
        ui MyView { }
    `)
  testFormatter('view with empty body statement')
    .format(`ui MyView {Child {}}`)
    .equals(`
      ui MyView {
          Child { }
      }
    `)
  testFormatter('control syntax mini slice')
    .format(
      `function Label Count number{if Count=0{return null}else{return "Count: \${Count}"}} ui V{render Text call Label Count if Count>0{Text "non-empty"}else{Text "empty"}}`,
    )
    .equals(`
      function Label Count number {
          if Count = 0 {
              return null
          } else {
              return "Count: \${ Count }"
          }
      }

      ui V {
          render Text call Label Count
          if Count > 0 {
              Text "non-empty"
          } else {
              Text "empty"
          }
      }
    `)
  testFormatter('view with single statement')
    .format(`ui MyView {Child {}}`)
    .equals(`
      ui MyView {
          Child { }
      }
    `)
  testFormatter('view with multiple statements')
    .format(`ui MyView {Child1 {} Child2 {}}`)
    .equals(`
      ui MyView {
          Child1 { }
          Child2 { }
      }
    `)
  testFormatter('view with parameter')
    .format(`ui Text value text {}`)
    .equals(`
        ui Text value text { }
    `)
  testFormatter('view with multiple parameters')
    .format(`ui Text value text, count number {}`)
    .equals(`
        ui Text value text, count number { }
    `)
  testFormatter('view declaration with layout defaults')
    .format(`ui Pill Label text [ pad   8 , rigid ] {render Box{}}`)
    .equals(`
        ui Pill Label text [pad 8, rigid] {
            render Box { }
        }
    `)
  testFormatter('app design block')
    .format(`app MyApp{design{description "Quiet app"}ui Root}`)
    .equals(`
      app MyApp {
          design {
              description "Quiet app"
          }
          ui Root
      }
    `)
  testFormatter('compact variant declaration')
    .format(`variant   PrimaryHome   =   Home   <"primary home">`)
    .equals(`
      variant PrimaryHome = Home <"primary home">
    `)
  testFormatter('view declaration design spec before layout defaults')
    .format(`ui Pill Label text <"primary action"> [ pad   8 , rigid ] {render Box{}}`)
    .equals(`
      ui Pill Label text <"primary action"> [pad 8, rigid] {
          render Box { }
      }
    `)
  testFormatter('view render with args')
    .format(`ui MyView {Text "hello" {}}`)
    .equals(`
      ui MyView {
          Text "hello" { }
      }
    `)
  testFormatter('view render with multiple args')
    .format(`ui MyView {Text "hello", 42 {}}`)
    .equals(`
      ui MyView {
          Text "hello", 42 { }
      }
    `)
  testFormatter('view render with body')
    .format(`ui MyView {Container {Child {}}}`)
    .equals(`
      ui MyView {
          Container {
              Child { }
          }
      }
    `)
  testFormatter('view render with layout clause')
    .format(`ui MyView {Row [ items   top   left , gap   8 ]{Child [ aligned   center ]{}}}`)
    .equals(`
      ui MyView {
          Row [items top left, gap 8] {
              Child [aligned center] { }
          }
      }
    `)
  testFormatter('material render root with args, layout, and body')
    .format(`ui MyView {render Row "title" [ items   center   left , gap   8 ]{Text "hello"{}}}`)
    .equals(`
      ui MyView {
          render Row "title" [items center left, gap 8] {
              Text "hello" { }
          }
      }
    `)
  testFormatter('caller children splice')
    .format(`frame Card {render Stack [ gap   12 ]{@@children}}`)
    .equals(`
      frame Card {
          render Stack [gap 12] {
              @@children
          }
      }
    `)
  testFormatter('view render with multiline layout clause')
    .format(`
      ui MyView {
          Row [
              items center spread,
              gap 12
          ] {}
      }
    `)
    .equals(`
      ui MyView {
          Row [items center spread, gap 12] { }
      }
    `)
  testFormatter('top level declarations separated')
    .format(`app MyApp {}ui MyView {}`)
    .equals(`
      app MyApp { }

      ui MyView { }
    `)
  testFormatter('string literal spacing')
    .format(`ui MyView {Text "hello"{}}`)
    .equals(`
      ui MyView {
          Text "hello" { }
      }
    `)
  testFormatter('number literal spacing')
    .format(`ui MyView {Text 42{}}`)
    .equals(`
      ui MyView {
          Text 42 { }
      }
    `)
  testFormatter('empty body with space')
    .format(`ui MyView {Child{}}`)
    .equals(`
      ui MyView {
          Child { }
      }
    `)
  testFormatter('comment preservation')
    .format(`
      app MyApp {
      // comment
      ui MyView}
    `)
    .equals(`
      app MyApp {
          // comment
          ui MyView
      }
    `)
  testFormatter('multiple comments')
    .format(`
      app MyApp {
      // one
      // two
      ui MyView}
    `)
    .equals(`
      app MyApp {
          // one
          // two
          ui MyView
      }
    `)
  testFormatter('view with no parameters')
    .format(`ui MyView {}`)
    .equals(`
        ui MyView { }
    `)
  testFormatter('view with named parameter')
    .format(`ui MyView value text {}`)
    .equals(`
        ui MyView value text { }
    `)
  testFormatter('argument key value spacing')
    .format(`ui MyView {Text "test"{}}`)
    .equals(`
      ui MyView {
          Text "test" { }
      }
    `)
  testFormatter('multiple arguments spacing')
    .format(`ui MyView {Text "hello",42{}}`)
    .equals(`
      ui MyView {
          Text "hello", 42 { }
      }
    `)
  testFormatter('deep nesting')
    .format(`ui MyView {A {B {C {D {}}}}}`)
    .equals(`
      ui MyView {
          A {
              B {
                  C {
                      D { }
                  }
              }
          }
      }
    `)
  testFormatter('mixed statements and injections')
    .format(`ui MyView {Child {} inject \`\`\`ts\ncode\n\`\`\`}`)
    .equals(`
      ui MyView {
          Child { }
          inject \`\`\`ts
              code
          \`\`\`
      }
    `)
  testFormatter('inject spacing')
    .format(`ui MyView {inject \`\`\`ts\nx\n\`\`\`}`)
    .equals(`
      ui MyView {
          inject \`\`\`ts
              x
          \`\`\`
      }
    `)
  testFormatter('action with parameter and inject body')
    .format(`action A msg text {inject \`\`\`ts void 0\`\`\`}`)
    .equals(`
      action A msg text {
          inject \`\`\`ts void 0\`\`\`
      }
    `)
  testFormatter('view render with inline action argument')
    .format(`ui V {Btn Title "a", action {}}`)
    .equals(`
      ui V {
          Btn Title "a", action { }
      }
    `)
  testFormatter('Advanced formatting')
    .format(`
      app MyApp {
      // comment
      ui MyView }

      ui MyView { Child {} }
    `)
    .equals(`
      app MyApp {
          // comment
          ui MyView
      }

      ui MyView {
          Child { }
      }
    `)

  runFormatterCases(formatterUseStatementCases)
  runFormatterCases(formatterUseImportSpacingCases)
})

describe('formatter edge cases', () => {
  testFormatter('deeply nested view structures')
    .format(`
      ui Outer{Inner1{Inner2{Inner3{}}}}
    `)
    .equals(`
      ui Outer {
          Inner1 {
              Inner2 {
                  Inner3 { }
              }
          }
      }
    `)

  testFormatter('visibility modifiers - share')
    .format(`
      share ui   Button{}
    `)
    .equals(`
      share ui Button { }
    `)

  testFormatter('visibility modifiers - hide')
    .format(`
      hide ui   PrivateHelper{}
    `)
    .equals(`
      hide ui PrivateHelper { }
    `)

  testFormatter('multiple declarations with visibility modifiers')
    .format(`
      share ui Button{}
      hide ui Helper{}
      ui Default{}
    `)
    .equals(`
      share ui Button { }

      hide ui Helper { }

      ui Default { }
    `)

  testFormatter('empty view body')
    .format(`ui Empty{}`)
    .equals(`
      ui Empty { }
    `)

  testFormatter('view with only whitespace in body')
    .format(`ui Whitespace{   }`)
    .equals(`
      ui Whitespace { }
    `)

  testFormatter('app with view reference')
    .format(`
      app MyApp{ui MainView}
      ui MainView{}
    `)
    .equals(`
      app MyApp {
          ui MainView
      }

      ui MainView { }
    `)

  testFormatter('multiple apps in file')
    .format(`
        app App1{ui View1}
        app App2{ui View2}
        ui View1{}
        ui View2{}
      `)
    .equals(`
        app App1 {
            ui View1
        }

        app App2 {
            ui View2
        }

        ui View1 { }

        ui View2 { }
      `)

  testFormatter('use statement stability')
    .format(`use Col, Row, Text from @tao/ui`)
    .equals(`use Col, Row, Text from @tao/ui`)

  testFormatter('use statement spacing')
    .format(`use     Col,Row,    Text      from  @tao/ui`)
    .equals(`use Col, Row, Text from @tao/ui`)
})

describe('alias statement formatting', () => {
  testFormatter('alias number literal')
    .format(`ui MyView {alias age=1}`)
    .equals(`
      ui MyView {
          alias age = 1
      }
    `)

  testFormatter('alias string literal')
    .format(`ui MyView {alias name="hello"}`)
    .equals(`
      ui MyView {
          alias name = "hello"
      }
    `)

  testFormatter('alias spacing normalization')
    .format(`ui MyView {alias   name  =  "hello"}`)
    .equals(`
      ui MyView {
          alias name = "hello"
      }
    `)

  testFormatter('alias with identifier reference value')
    .format(`ui MyView {alias x=1 alias y=x}`)
    .equals(`
      ui MyView {
          alias x = 1
          alias y = x
      }
    `)

  testFormatter('alias before render statement')
    .format(`ui MyView {alias msg="hi" Child {}}`)
    .equals(`
      ui MyView {
          alias msg = "hi"
          Child { }
      }
    `)

  testFormatter('alias in nested view body')
    .format(`ui MyView {Container {alias n=42}}`)
    .equals(`
      ui MyView {
          Container {
              alias n = 42
          }
      }
    `)

  testFormatter('alias with binary expression')
    .format(`ui MyView { alias sum=1+2 }`)
    .equals(`
      ui MyView {
          alias sum = 1 + 2
      }
    `)

  testFormatter('alias with unary minus')
    .format(`ui MyView { alias n=-5 }`)
    .equals(`
      ui MyView {
          alias n = -5
      }
    `)

  testFormatter('identifier reference in argument')
    .format(`ui MyView {Text msg{}}`)
    .equals(`
      ui MyView {
          Text msg { }
      }
    `)

  testFormatter('object literal in alias')
    .format(`ui V { alias O = { x 1, y 2 } }`)
    .equals(`
      ui V {
          alias O = {
              x 1,
              y 2
          }
      }
    `)

  testFormatter('object literal with trailing comma')
    .format(`ui V { alias O = { x 1, y 2, } }`)
    .equals(`
      ui V {
          alias O = {
              x 1,
              y 2,
          }
      }
    `)

  testFormatter('member access in view argument')
    .format(`ui T value text { } ui V { alias O = { x 1 } T O.x { } }`)
    .equals(`
      ui T value text { }

      ui V {
          alias O = {
              x 1
          }
          T O.x { }
      }
    `)

  testFormatter('nested set in action')
    .format(`ui V { state S = { a 1 } action A { set S.a = 2 } }`)
    .equals(`
      ui V {
          state S = {
              a 1
          }
          action A {
              set S.a = 2
          }
      }
    `)

  testFormatter('nested object literal in alias')
    .format(`ui V { alias A = { a { b { c 1 } } } }`)
    .equals(`
      ui V {
          alias A = {
              a {
                  b {
                      c 1
                  }
              }
          }
      }
    `)

  testFormatter('nested object literal in state with comma-separated properties')
    .format(dedent(`
      ui Main {
          state Pet = {
              name "cat", age 0, owner {
              name "Ro", address {
              city "NYC"
          }
          }
          }
          Col { }
      }
    `))
    .equals(`
      ui Main {
          state Pet = {
              name "cat",
              age 0,
              owner {
                  name "Ro",
                  address {
                      city "NYC"
                  }
              }
          }
          Col { }
      }
    `)

  testFormatter('chained member access')
    .format(`ui T value text { } ui V { alias A = { x 1 } T A.x.y { } }`)
    .equals(`
      ui T value text { }

      ui V {
          alias A = {
              x 1
          }
          T A.x.y { }
      }
    `)

  testFormatter('set with three-level path')
    .format(`ui V { state S = { x 1 } action A { set S.x.y.z = 3 } }`)
    .equals(`
      ui V {
          state S = {
              x 1
          }
          action A {
              set S.x.y.z = 3
          }
      }
    `)

  testFormatter('flat struct type declaration')
    .format(`type Person is {Name text,Age number}`)
    .equals(`
      type Person is {
          Name text,
          Age number
      }
    `)

  testFormatter('struct type declaration with nested struct field')
    .format(`type Person is {Name text,Job {Title text}}`)
    .equals(`
      type Person is {
          Name text,
          Job {
              Title text
          }
      }
    `)

  testFormatter('typed struct literal')
    .format(`type Person is { Name text, Age number } ui V { alias Ro = Person {Name "Ro",Age 40} }`)
    .equals(`
      type Person is {
          Name text,
          Age number
      }

      ui V {
          alias Ro = Person {
              Name "Ro",
              Age 40
          }
      }
    `)

  testFormatter('parameter typed by named struct')
    .format(`type Person is { Name text } ui Profile P Person {}`)
    .equals(`
      type Person is {
          Name text
      }

      ui Profile P Person { }
    `)

  testFormatter('nested type reference Person.Job in parameter position')
    .format(`type Person is { Name text, Job { Title text } } ui ShowJob J Person.Job {}`)
    .equals(`
      type Person is {
          Name text,
          Job {
              Title text
          }
      }

      ui ShowJob J Person.Job { }
    `)
})

describe('Formatter: real-app fixtures', () => {
  test('Objects and State.tao is a fixed point of the formatter', async () => {
    const fixture = FS.resolvePath(import.meta.dir, '../../../Apps/Test Apps/Objects and State/Objects and State.tao')
    const source = FS.readTextFile(fixture)
    const formatted = await formatCodeForTest(source, { tabSize: 3 })
    if (formatted !== source) {
      expect(visualize(formatted)).toBe(visualize(source))
    } else {
      expect(formatted).toBe(source)
    }
  })
})

describe('Formatter — local parameter types:', () => {
  testFormatter('formats view with Title is text correctly')
    .format(`ui   Badge   Title    is   text { }`)
    .equals(`ui Badge Title is text { }`)

  testFormatter('formats view with multiple local types')
    .format(`ui   Button   Title  is  text ,  Action  is  action { }`)
    .equals(`ui Button Title is text, Action is action { }`)

  testFormatter('formats mixed local and explicit params')
    .format(`ui  Card   Title   is   text ,   Size   number { }`)
    .equals(`ui Card Title is text, Size   number { }`)
})

describe('Formatter — dot-local type ref (Phase 2):', () => {
  testFormatter('formats Badge .Title "x" preserving dot shorthand')
    .format(`ui Badge Title is text { } ui Root { Badge .Title "x" }`)
    .equals(`ui Badge Title is text { }\n\nui Root {\n   Badge .Title "x"\n}`)

  testFormatter('formats multiple dot-local args')
    .format(`ui Badge Title is text, Subtitle is text { } ui Root { Badge .Title "x", .Subtitle "y" }`)
    .equals(`ui Badge Title is text, Subtitle is text { }\n\nui Root {\n   Badge .Title "x", .Subtitle "y"\n}`)
})

describe('Formatter — action local parameter types (Phase 3):', () => {
  testFormatter('formats action with Step is number correctly')
    .format(`action   Bump   Step    is   number { }`)
    .equals(SNIPPET_ACTION_BUMP_STEP_NUMBER)

  testFormatter('formats do Bump .Step 3 preserving dot shorthand')
    .format(SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_RAW)
    .equals(SNIPPET_ACTION_BUMP_AND_USE_DOT_STEP_FORMATTED)
})

describe('Formatter — navigation:', () => {
  testFormatter('formats app navigation and stack destinations')
    .format(`
      app   Rooms { navigation   MainNavigation }
      navigator   MainNavigation {
      stack  {
      screen   Home
      screen   Room    RoomScreen { title  "Room" path "/rooms/:RoomId" param   RoomId   text }
      }
      }
    `)
    .equals(`
      app Rooms {
          navigation MainNavigation
      }

      navigator MainNavigation {
          stack {
              screen Home

              screen Room RoomScreen {
                  title "Room"
                  path "/rooms/:RoomId"
                  param RoomId text
              }
          }
      }
    `)

  testFormatter('formats tab destinations and icons')
    .format(`
      navigator MainNavigation{tabs{tab Home { title "Home" icon   system   house } tab Settings SettingsView{icon system settings}}}
    `)
    .equals(`
      navigator MainNavigation {
          tabs {
              tab Home {
                  title "Home"
                  icon system house
              }

              tab Settings SettingsView {
                  icon system settings
              }
          }
      }
    `)

  testFormatter('formats navigation action payloads')
    .format(`
      action Go RoomId text {
      navigation   push   Room { RoomId   RoomId Count   1 }
      navigation   pop
      navigation   tab   Search { Query   "recent" }
      }
    `)
    .equals(`
      action Go RoomId text {
          navigation push Room {
              RoomId RoomId
              Count 1
          }
          navigation pop
          navigation tab Search {
              Query "recent"
          }
      }
    `)

  testFormatter('navigation formatting is idempotent')
    .format(
      `
      navigator MainNavigation {
          tabs {
              tab Home {
                  title "Home"
                  icon system house
              }

              tab Settings {
                  title "Settings"
                  icon system settings
              }
          }
      }
    `,
      2,
    )
    .equals(`
      navigator MainNavigation {
          tabs {
              tab Home {
                  title "Home"
                  icon system house
              }

              tab Settings {
                  title "Settings"
                  icon system settings
              }
          }
      }
    `)
})

describe('Formatter — data schema:', () => {
  testFormatter('formats minimal data block')
    .format(`data    MyData   {  }`)
    .equals(`
      data MyData { }
    `)

  testFormatter('formats app provider block')
    .format(`
      app  MyApp {
      provider   InstantDB   {  appId    "test-app"   }
      ui Root
      }
    `)
    .equals(`
      app MyApp {
          provider InstantDB {
              appId "test-app"
          }
          ui Root
      }
    `)

  testFormatter('formats data-scoped type declaration')
    .format(`
      data  MyData {
      type   Status   is    text
      }
    `)
    .equals(`
      data MyData {
          type Status is text
      }
    `)

  testFormatter('formats entity with fields and commas')
    .format(`
      data  MyData {
      Events  Event {
      Title    text ,
      Ordering    number ,
      }
      }
    `)
    .equals(`
      data MyData {
          Events Event {
              Title text,
              Ordering number,
          }
      }
    `)

  testFormatter('formats entity with field metadata')
    .format(`
      data  MyData {
      People  Person {
      Email   text  optional   unique ,
      Status   text  default   "going" ,
      }
      }
    `)
    .equals(`
      data MyData {
          People Person {
              Email text optional unique,
              Status text default "going",
          }
      }
    `)

  testFormatter('formats entity with to-many array field')
    .format(`
      data  MyData {
      Events Event { Title text }
      People  Person {
      Events   [  Event  ] ,
      }
      }
    `)
    .equals(`
      data MyData {
          Events Event {
              Title text
          }
          People Person {
              Events [Event],
          }
      }
    `)

  testFormatter('formats shorthand fields')
    .format(`
      data  MyData {
      Events Event { Title text }
      People Person { Name text }
      Rsvps  Rsvp {
      Event ,
      Person ,
      }
      }
    `)
    .equals(`
      data MyData {
          Events Event {
              Title text
          }
          People Person {
              Name text
          }
          Rsvps Rsvp {
              Event,
              Person,
          }
      }
    `)

  testFormatter('formats full target app data block')
    .format(`
      data MeetupData {
      type Status is text
      People Person {
      Name   text,
      Email  text optional unique,
      Events [Event],
      Rsvps  [Rsvp],
      }
      Events Event {
      Title text,
      Host Person,
      Ordering number,
      Rsvps [Rsvp],
      }
      Rsvps Rsvp {
      Event,
      Person,
      Status default "going",
      }
      }
    `)
    .equals(`
      data MeetupData {
          type Status is text
          People Person {
              Name text,
              Email text optional unique,
              Events [Event],
              Rsvps [Rsvp],
          }
          Events Event {
              Title text,
              Host Person,
              Ordering number,
              Rsvps [Rsvp],
          }
          Rsvps Rsvp {
              Event,
              Person,
              Status default "going",
          }
      }
    `)

  testFormatter('formats for loop and create statement')
    .format(`
      data D {
        Items Item { N text }
      }
      query D.Items as Rows { N }
      action A {
        create  D.Item  {  N  "a"  }
      }
      ui V {
        for  It  in  Rows  {
          Text "x"
        }
      }
    `)
    .equals(`

      data D {
          Items Item {
              N text
          }
      }

      query D.Items as Rows {
          N
      }

      action A {
          create D.Item {
              N "a"
          }
      }

      ui V {
          for It in Rows {
              Text "x"
          }
      }

    `)

  testFormatter('formats selection-block queries')
    .format(`
      data D {
        Households Household { Name text }
        People Person { Age number, Status text, Email text, Household Household }
      }
      query   D  .  People   as   Everyone
      query   D  .  People   as   Youth   {  Age>=18 , Email, Household { Name } }
      query D.Person { Email = "ro@example.test", }
    `)
    .equals(`

      data D {
          Households Household {
              Name text
          }
          People Person {
              Age number,
              Status text,
              Email text,
              Household Household
          }
      }

      query D.People as Everyone

      query D.People as Youth {
          Age >= 18,
          Email,
          Household {
              Name
          }
      }

      query D.Person {
          Email = "ro@example.test",
      }

    `)

  testFormatter('formats query where order and update syntax')
    .format(`
      data D {
        Events Event { Title text, Active boolean, Ordering number indexed, StartsAt date indexed, Rsvps [Rsvp] }
        Rsvps Rsvp { Status text, CreatedAt date indexed, Event }
      }
      query D.Events as Upcoming { Title, StartsAt exists, where Active=true and(Title!="draft" or StartsAt missing) order by Ordering desc Rsvps { Status, where Status!="no" or Status missing order by CreatedAt } }
      action MarkGoing Rsvp {
        update Rsvp { Status "going", Event }
      }
    `)
    .equals(`

      data D {
          Events Event {
              Title text,
              Active boolean,
              Ordering number indexed,
              StartsAt date indexed,
              Rsvps [Rsvp]
          }
          Rsvps Rsvp {
              Status text,
              CreatedAt date indexed,
              Event
          }
      }

      query D.Events as Upcoming {
          Title,
          StartsAt exists,
          where Active = true and (Title != "draft" or StartsAt missing)
          order by Ordering desc
          Rsvps {
              Status,
              where Status != "no" or Status missing
              order by CreatedAt
          }
      }

      action MarkGoing Rsvp {
          update Rsvp {
              Status "going",
              Event
          }
      }

    `)
})
