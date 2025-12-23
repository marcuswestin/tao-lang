import { describe, expect, test } from '../compiler-tests/test-utils/test-harness'
import { dedent, formatCode, testFormatter, visualize } from './formatter-test-utils'

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
      `))
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

  test.todo('Postfix whitespace remove and newline insertion', async () => {
    const formattedCode = await formatCode(`app MyApp {}`)
    expect(formattedCode).toBe(
      dedent(`app MyApp { }`).trim() + '\n',
    )
    expect(
      await formatCode(`
        
        app MyApp {}
        
        `),
    ).toBe(dedent(`app MyApp { }`).trim() + '\n')
  })
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
  testFormatter('view with single parameter no key')
    .format(`view MyView string {}`)
    .equals(`
        view MyView string { }
    `)
  testFormatter('view with parameter key')
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
})
