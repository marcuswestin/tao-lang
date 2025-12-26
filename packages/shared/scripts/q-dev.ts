import { Command } from '@commander-js/extra-typings'
import { genMiseTasks } from './commands/gen-mise-tasks'
import { mergeTmFiles } from './commands/merge-tm-files'

const program = new Command()

function ideSynPath(path: string) {
  return __dirname + '/../../ide-extension/ide-syntaxes/' + path
}

program.command('gen-mise-tasks')
  .description('Generate mise tasks from Justfile recipes')
  .action(async () => {
    await genMiseTasks()
  })

program.command('merge-tm-files')
  .description('Merge tm files to include TS code blocks')
  .argument(
    '[tmJsonPath]',
    'The path to the tm json file',
    ideSynPath('_gen-syntaxes/tao-lang.tmLanguage.json'),
  )
  .argument(
    '[mergeJsonPath]',
    'The path to the merge json file',
    ideSynPath('tao-lang.ts-code-blocks-merge.tmLanguage.json'),
  )
  .argument(
    '[outputJsonPath]',
    'The path to the output json file',
    ideSynPath('_gen-syntaxes/tao-lang.tmLanguage.json'),
  )
  .action(async (tmJsonPath, mergeJsonPath, outputJsonPath) => {
    await mergeTmFiles(tmJsonPath, mergeJsonPath, outputJsonPath)
  })

program.parse(Bun.argv)
