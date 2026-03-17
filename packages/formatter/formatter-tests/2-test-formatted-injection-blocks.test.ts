import { describe, test } from 'bun:test'
import { testFormatter } from './formatter-test-utils'

describe('Format Injections', () => {
  testFormatter('injection formatting')
    .format(`
      view MyView {inject \`\`\`ts
      return <div/>\n\`\`\`}`)
    .equals(`
      view MyView {
          inject \`\`\`ts
              return <div/>
          \`\`\`
      }
    `)
  test.todo('injection formatting 1', () => {
    testFormatter('injection formatting 1')
      .format(`
      inject '''ts
            const foo = '';
            function bar() {
                console.log('hi')
            }
            '''
    `)
      .equals(`
        inject '''ts
            const foo = '';
            function bar() {
                console.log('hi')
            }
        '''
    `)
  })
  testFormatter('inject formatting 2')
    .format(`
      inject \`\`\`ts
              function foo() {
                  const a = 1;
      \`\`\`
    `)
    .equals(`
      inject \`\`\`ts
          function foo() {
              const a = 1;
      \`\`\`
    `)
  testFormatter('inject formatting 3')
    .format(`
      inject \`\`\`ts
                  return a
              }
      \`\`\`
    `)
    .equals(`
      inject \`\`\`ts
              return a
          }
      \`\`\`
    `)
  testFormatter('inject formatting 4')
    .format(`
      inject \`\`\`ts
                      function foo() {
                          const a = 1;
      \`\`\`
    `)
    .equals(`
      inject \`\`\`ts
          function foo() {
              const a = 1;
      \`\`\`
    `)
  testFormatter('inject formatting 5')
    .format(`
      inject \`\`\`ts
  return a
}
      \`\`\`
    `)
    .equals(`
      inject \`\`\`ts
            return a
          }
      \`\`\`
    `)
})
