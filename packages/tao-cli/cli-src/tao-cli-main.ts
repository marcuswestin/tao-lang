import { Command } from '@commander-js/extra-typings'
import { compile } from '@tao-compiler'
import chokidar from 'chokidar'
import { Log } from '../../compiler/compiler-src/@shared/Log'

export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('<path>', 'The file to compile')
    .option('--code', 'Compile the given string of text, rather than a file')
    .option('--watch', 'Watch the file and recompile when it changes')
    .option('--verbose', 'Verbose output')
    .action(async (path, { watch, verbose, code }) => {
      async function compileAndWrite() {
        try {
          if (verbose) {
            Log.info('Compiling ...')
          }
          const result = await (
            code
              ? compile({ code: path })
              : compile({ file: { path } })
          )
          Bun.write(__dirname + '/../../expo-runtime/app/_gen-tao-compiler/app-output.tsx', result.code)
        } catch (error) {
          if (verbose) {
            Log.error('Error compiling file', error)
          }
          const message = (error as Error).stack || (error as Error).message || typeof error === 'string'
            ? (error as string)
            : 'Unknown error'

          // message.replace(/</g, '&lt;').replace(/>/g, '&gt;')

          Bun.write(__dirname + '/../../expo-runtime/app/_gen-tao-compiler/app-output.tsx', getErrorAppString(message))
        }
        console.log('Done Compiling')
      }
      await compileAndWrite()
      if (watch) {
        chokidar.watch(path).on('change', compileAndWrite)
      }
    })

  program.parse(process.argv)
}

function getErrorAppString(message: string) {
  return `
  import * as RN from 'react-native'

  const message = \`${message}\`.replace('\`', '\\\`')

  export default function CompiledTaoApp() {
    // Center view in parent
    return <RN.View style={{ backgroundColor: 'red', maxWidth: 400, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RN.Text>Error compiling file</RN.Text>
      <RN.Text>\${message}</RN.Text>
    </RN.View>
  }`
}
