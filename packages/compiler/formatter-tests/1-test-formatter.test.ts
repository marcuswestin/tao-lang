import { createTaoServices } from '@tao-compiler/tao-services'
import { NodeFileSystem } from 'langium/node'
import { describe, expect, test } from '../compiler-tests/test-utils/test-harness'

describe('Formatter', () => {
  test('stub test', () => expect(true).toBe(true))

  test('Basic formatting', async () => {
    await testFormatCode(
      `
app KitchenSink {
    // ui KitchenSink


// ui Text
    ui RootView }

view RootView { Text value "Standing on the edge of the worlds!" {}
    
    MyView {}
}

view Text value string {
    inject \`\`\`ts
        return <RN.Text>{props.value}</RN.Text>
    \`\`\`
}

view MyView { Text value "wooos" {} }
`,
      `
app KitchenSink {
    // ui KitchenSink
    
    // ui Text
    ui RootView
}

view RootView {
    Text value "Standing on the edge of the worlds!" { }
    
    MyView { }
}

view Text value string {
    inject \`\`\`ts
        return <RN.Text>{props.value}</RN.Text>
    \`\`\`
}

view MyView {
    Text value "wooos" { }
}
`,
    )
  })
})

export async function testFormatCode(code: string, expectedFormattedCode: string) {
  // TODO: Format the code
  const _services = createTaoServices(NodeFileSystem)
  console.log(!!_services)

  const formattedCode = ''
  expect(formattedCode).toBe(expectedFormattedCode)
}
