import { Command } from '@commander-js/extra-typings'
import { compile } from '@tao-compiler'

export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('<path>', 'The file to compile')
    .action((path) => {
      const result = compile({ file: { path } })
      console.log(result)
    })

  program.parse(process.argv)
}
