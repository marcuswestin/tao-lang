import { Formatter } from '@formatter/FormatterSDK'
import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'
import { dedent, testFormatter, visualize } from './formatter-test-utils'

describe('Formatter', () => {
  test('stub test', () => expect(true).toBe(true))

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
    .format(`view MyView {}`)
    .equals(`
        view MyView { }
    `)
  testFormatter('view with empty body statement')
    .format(`view MyView {Child {}}`)
    .equals(`
      view MyView {
          Child { }
      }
    `)
  testFormatter('view with single statement')
    .format(`view MyView {Child {}}`)
    .equals(`
      view MyView {
          Child { }
      }
    `)
  testFormatter('view with multiple statements')
    .format(`view MyView {Child1 {} Child2 {}}`)
    .equals(`
      view MyView {
          Child1 { }
          Child2 { }
      }
    `)
  testFormatter('view with parameter')
    .format(`view Text value text {}`)
    .equals(`
        view Text value text { }
    `)
  testFormatter('view with multiple parameters')
    .format(`view Text value text, count number {}`)
    .equals(`
        view Text value text, count number { }
    `)
  testFormatter('view render with args')
    .format(`view MyView {Text "hello" {}}`)
    .equals(`
      view MyView {
          Text "hello" { }
      }
    `)
  testFormatter('view render with multiple args')
    .format(`view MyView {Text "hello", 42 {}}`)
    .equals(`
      view MyView {
          Text "hello", 42 { }
      }
    `)
  testFormatter('view render with body')
    .format(`view MyView {Container {Child {}}}`)
    .equals(`
      view MyView {
          Container {
              Child { }
          }
      }
    `)
  testFormatter('top level declarations separated')
    .format(`app MyApp {}view MyView {}`)
    .equals(`
      app MyApp { }

      view MyView { }
    `)
  testFormatter('string literal spacing')
    .format(`view MyView {Text "hello"{}}`)
    .equals(`
      view MyView {
          Text "hello" { }
      }
    `)
  testFormatter('number literal spacing')
    .format(`view MyView {Text 42{}}`)
    .equals(`
      view MyView {
          Text 42 { }
      }
    `)
  testFormatter('empty body with space')
    .format(`view MyView {Child{}}`)
    .equals(`
      view MyView {
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
    .format(`view MyView {}`)
    .equals(`
        view MyView { }
    `)
  testFormatter('view with named parameter')
    .format(`view MyView value text {}`)
    .equals(`
        view MyView value text { }
    `)
  testFormatter('argument key value spacing')
    .format(`view MyView {Text "test"{}}`)
    .equals(`
      view MyView {
          Text "test" { }
      }
    `)
  testFormatter('multiple arguments spacing')
    .format(`view MyView {Text "hello",42{}}`)
    .equals(`
      view MyView {
          Text "hello", 42 { }
      }
    `)
  testFormatter('deep nesting')
    .format(`view MyView {A {B {C {D {}}}}}`)
    .equals(`
      view MyView {
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
    .format(`view MyView {Child {} inject \`\`\`ts\ncode\n\`\`\`}`)
    .equals(`
      view MyView {
          Child { }
          inject \`\`\`ts
              code
          \`\`\`
      }
    `)
  testFormatter('inject spacing')
    .format(`view MyView {inject \`\`\`ts\nx\n\`\`\`}`)
    .equals(`
      view MyView {
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
    .format(`view V {Btn Title "a", action {}}`)
    .equals(`
      view V {
          Btn Title "a", action { }
      }
    `)
  testFormatter('Advanced formatting')
    .format(`
      app MyApp {
      // comment
      ui MyView }

      view MyView { Child {} }
    `)
    .equals(`
      app MyApp {
          // comment
          ui MyView
      }

      view MyView {
          Child { }
      }
    `)

  testFormatter('use statement newline')
    .format(`
      use Button from ./ui/views
      view MyView {}
    `)
    .equals(`
      use Button from ./ui/views

      view MyView { }
    `)

  testFormatter('consecutive use statements')
    .format(`
      use KnifeBlock from ./counter
      use FridgeView
      view MyView {}
    `)
    .equals(`
      use KnifeBlock from ./counter
      use FridgeView

      view MyView { }
    `)

  testFormatter('consecutive same-module use statements')
    .format(`
      use Button
      use Label
      view MyView {}
    `)
    .equals(`
      use Button
      use Label

      view MyView { }
    `)

  testFormatter('use with multiple imports normalizes spacing')
    .format(`use Row ,   Col`)
    .equals(`
      use Row, Col
    `)

  testFormatter('use with multiple imports no spaces')
    .format(`use Row,Col,Text`)
    .equals(`
      use Row, Col, Text
    `)

  testFormatter('use with multiple imports and from path')
    .format(`use Row ,   Col from @tao/ui`)
    .equals(`
      use Row, Col from @tao/ui
    `)
})

describe('formatter edge cases', () => {
  testFormatter('deeply nested view structures')
    .format(`
      view Outer{Inner1{Inner2{Inner3{}}}}
    `)
    .equals(`
      view Outer {
          Inner1 {
              Inner2 {
                  Inner3 { }
              }
          }
      }
    `)

  testFormatter('visibility modifiers - share')
    .format(`
      share view   Button{}
    `)
    .equals(`
      share view Button { }
    `)

  testFormatter('visibility modifiers - hide')
    .format(`
      hide view   PrivateHelper{}
    `)
    .equals(`
      hide view PrivateHelper { }
    `)

  testFormatter('multiple declarations with visibility modifiers')
    .format(`
      share view Button{}
      hide view Helper{}
      view Default{}
    `)
    .equals(`
      share view Button { }

      hide view Helper { }

      view Default { }
    `)

  testFormatter('empty view body')
    .format(`view Empty{}`)
    .equals(`
      view Empty { }
    `)

  testFormatter('view with only whitespace in body')
    .format(`view Whitespace{   }`)
    .equals(`
      view Whitespace { }
    `)

  testFormatter('app with view reference')
    .format(`
      app MyApp{ui MainView}
      view MainView{}
    `)
    .equals(`
      app MyApp {
          ui MainView
      }

      view MainView { }
    `)

  testFormatter('multiple apps in file')
    .format(`
        app App1{ui View1}
        app App2{ui View2}
        view View1{}
        view View2{}
      `)
    .equals(`
        app App1 {
            ui View1
        }

        app App2 {
            ui View2
        }

        view View1 { }

        view View2 { }
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
    .format(`view MyView {alias age=1}`)
    .equals(`
      view MyView {
          alias age = 1
      }
    `)

  testFormatter('alias string literal')
    .format(`view MyView {alias name="hello"}`)
    .equals(`
      view MyView {
          alias name = "hello"
      }
    `)

  testFormatter('alias spacing normalization')
    .format(`view MyView {alias   name  =  "hello"}`)
    .equals(`
      view MyView {
          alias name = "hello"
      }
    `)

  testFormatter('alias with identifier reference value')
    .format(`view MyView {alias x=1 alias y=x}`)
    .equals(`
      view MyView {
          alias x = 1
          alias y = x
      }
    `)

  testFormatter('alias before render statement')
    .format(`view MyView {alias msg="hi" Child {}}`)
    .equals(`
      view MyView {
          alias msg = "hi"
          Child { }
      }
    `)

  testFormatter('alias in nested view body')
    .format(`view MyView {Container {alias n=42}}`)
    .equals(`
      view MyView {
          Container {
              alias n = 42
          }
      }
    `)

  testFormatter('alias with binary expression')
    .format(`view MyView { alias sum=1+2 }`)
    .equals(`
      view MyView {
          alias sum = 1 + 2
      }
    `)

  testFormatter('alias with unary minus')
    .format(`view MyView { alias n=-5 }`)
    .equals(`
      view MyView {
          alias n = -5
      }
    `)

  testFormatter('identifier reference in argument')
    .format(`view MyView {Text msg{}}`)
    .equals(`
      view MyView {
          Text msg { }
      }
    `)

  testFormatter('object literal in alias')
    .format(`view V { alias O = { x 1, y 2 } }`)
    .equals(`
      view V {
          alias O = {
              x 1,
              y 2
          }
      }
    `)

  testFormatter('object literal with trailing comma')
    .format(`view V { alias O = { x 1, y 2, } }`)
    .equals(`
      view V {
          alias O = {
              x 1,
              y 2,
          }
      }
    `)

  testFormatter('member access in view argument')
    .format(`view T value text { } view V { alias O = { x 1 } T O.x { } }`)
    .equals(`
      view T value text { }

      view V {
          alias O = {
              x 1
          }
          T O.x { }
      }
    `)

  testFormatter('nested set in action')
    .format(`view V { state S = { a 1 } action A { set S.a = 2 } }`)
    .equals(`
      view V {
          state S = {
              a 1
          }
          action A {
              set S.a = 2
          }
      }
    `)

  testFormatter('nested object literal in alias')
    .format(`view V { alias A = { a { b { c 1 } } } }`)
    .equals(`
      view V {
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
      view Main {
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
      view Main {
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
    .format(`view T value text { } view V { alias A = { x 1 } T A.x.y { } }`)
    .equals(`
      view T value text { }

      view V {
          alias A = {
              x 1
          }
          T A.x.y { }
      }
    `)

  testFormatter('set with three-level path')
    .format(`view V { state S = { x 1 } action A { set S.x.y.z = 3 } }`)
    .equals(`
      view V {
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
    .format(`type Person is { Name text, Age number } view V { alias Ro = Person {Name "Ro",Age 40} }`)
    .equals(`
      type Person is {
          Name text,
          Age number
      }

      view V {
          alias Ro = Person {
              Name "Ro",
              Age 40
          }
      }
    `)

  testFormatter('parameter typed by named struct')
    .format(`type Person is { Name text } view Profile P Person {}`)
    .equals(`
      type Person is {
          Name text
      }

      view Profile P Person { }
    `)

  testFormatter('nested type reference Person.Job in parameter position')
    .format(`type Person is { Name text, Job { Title text } } view ShowJob J Person.Job {}`)
    .equals(`
      type Person is {
          Name text,
          Job {
              Title text
          }
      }

      view ShowJob J Person.Job { }
    `)
})

describe('Formatter: real-app fixtures', () => {
  test('Objects and State.tao is a fixed point of the formatter', async () => {
    const fixture = FS.resolvePath(import.meta.dir, '../../../Apps/Test Apps/Objects and State/Objects and State.tao')
    const source = FS.readTextFile(fixture)
    const formatted = await Formatter.formatCode(source, { tabSize: 3 })
    if (formatted !== source) {
      expect(visualize(formatted)).toBe(visualize(source))
    } else {
      expect(formatted).toBe(source)
    }
  })
})

describe('Formatter — local parameter types:', () => {
  test('formats view with Title is text correctly', () => {
    testFormatter(
      `view   Badge   Title    is   text { }`,
      `view Badge Title is text { }`,
    )
  })

  test('formats view with multiple local types', () => {
    testFormatter(
      `view   Button   Title  is  text ,  Action  is  action { }`,
      `view Button Title is text, Action is action { }`,
    )
  })

  test('formats mixed local and explicit params', () => {
    testFormatter(
      `view  Card   Title   is   text ,   Size   number { }`,
      `view Card Title is text, Size number { }`,
    )
  })
})

describe('Formatter — dot-local type ref (Phase 2):', () => {
  test('formats Badge .Title "x" preserving dot shorthand', () => {
    testFormatter(
      `view Badge Title is text { } view Root { Badge .Title "x" }`,
      `view Badge Title is text { }\n\nview Root {\n  Badge .Title "x"\n}`,
    )
  })

  test('formats multiple dot-local args', () => {
    testFormatter(
      `view Badge Title is text, Subtitle is text { } view Root { Badge .Title "x", .Subtitle "y" }`,
      `view Badge Title is text, Subtitle is text { }\n\nview Root {\n  Badge .Title "x", .Subtitle "y"\n}`,
    )
  })
})

describe('Formatter — action local parameter types (Phase 3):', () => {
  test('formats action with Step is number correctly', () => {
    testFormatter(
      `action   Bump   Step    is   number { }`,
      `action Bump Step is number { }`,
    )
  })

  test('formats do Bump .Step 3 preserving dot shorthand', () => {
    testFormatter(
      `action Bump Step is number { } action Use { do Bump .Step 3 }`,
      `action Bump Step is number { }\n\naction Use {\n  do Bump .Step 3\n}`,
    )
  })
})
