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
    .format(`view Text value string {}`)
    .equals(`
        view Text value string { }
    `)
  testFormatter('view with multiple parameters')
    .format(`view Text value string, count number {}`)
    .equals(`
        view Text value string, count number { }
    `)
  testFormatter('view render with args')
    .format(`view MyView {Text value "hello" {}}`)
    .equals(`
      view MyView {
          Text value "hello" { }
      }
    `)
  testFormatter('view render with multiple args')
    .format(`view MyView {Text value "hello", count 42 {}}`)
    .equals(`
      view MyView {
          Text value "hello", count 42 { }
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
    .format(`view MyView {Text value"hello"{}}`)
    .equals(`
      view MyView {
          Text value "hello" { }
      }
    `)
  testFormatter('number literal spacing')
    .format(`view MyView {Text count 42{}}`)
    .equals(`
      view MyView {
          Text count 42 { }
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
    .format(`view MyView value string {}`)
    .equals(`
        view MyView value string { }
    `)
  testFormatter('argument key value spacing')
    .format(`view MyView {Text value"test"{}}`)
    .equals(`
      view MyView {
          Text value "test" { }
      }
    `)
  testFormatter('multiple arguments spacing')
    .format(`view MyView {Text value "hello",count 42{}}`)
    .equals(`
      view MyView {
          Text value "hello", count 42 { }
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
    .format(`action A msg string {inject \`\`\`ts void 0\`\`\`}`)
    .equals(`
      action A msg string {
          inject \`\`\`ts void 0\`\`\`
      }
    `)
  testFormatter('view render with inline action argument')
    .format(`view V {Btn title "a", Action action {}}`)
    .equals(`
      view V {
          Btn title "a", Action action { }
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
    .format(`view MyView {Text value msg{}}`)
    .equals(`
      view MyView {
          Text value msg { }
      }
    `)
})
