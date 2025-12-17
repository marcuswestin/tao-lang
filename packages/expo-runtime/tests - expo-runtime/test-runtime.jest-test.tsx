import { describe, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { exec, spawn } from 'node:child_process'
import { Text } from 'react-native'

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <Text>Hello Mock Test View</Text>
    await render(<MockTestView />).findByText('Hello Mock Test View')
  })

  test('compile and run with cli', async () => {
    // First compile the app
    const { code, needle } = getRandomUI()
    await cmd('just', ['tao', 'compile', '--code', `'${code}'`])

    // Then import the resulting app, and render it
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: CompiledTaoApp } = require('@/app/_gen-tao-compiler/app-output')
    await render(<CompiledTaoApp />).findByText(needle)
  })
})

function getRandomUI() {
  const needle = Math.random().toString(36).substring(2, 15)
  const code = `
    app KitchenSink { ui RootView }

    view RootView { Text value "${needle}" {} }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  return { code, needle }
}

async function cmd(cmd: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    spawn(cmd, args, {
      stdio: 'pipe',
    }).on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve()
      } else {
        reject(new Error(`Process exited with code ${exitCode}`))
      }
    })
  })
}
