import { Command } from '@commander-js/extra-typings'
import { compile } from '@tao-compiler'

export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('<path>', 'The file to compile')
    .action((path) => {
      const result = compile({ file: { path } })
      Bun.write(__dirname + '/../../expo-runtime/app/_gen-tao-compiler/app-output.tsx', result.code)
    })

  program.parse(process.argv)
}
