import { Command } from '@commander-js/extra-typings'
import { genMiseTasks } from './commands/gen-mise-tasks'
import { genSyntaxTmLanguageFiles } from './commands/gen-syntax-tmLanguage-files'

const program = new Command()

function genDefaultIdeSyntaxPathValue(path: string) {
  return __dirname + '/../../ide-extension/ide-syntaxes/' + path
}

program.command('gen-mise-tasks')
  .description('Generate mise tasks from Justfile recipes')
  .action(async () => {
    await genMiseTasks()
  })

program.command('gen-syntax-tmLanguage-files')
  .description('Merge tm files to include TS code blocks')
  .argument(
    '[mergeJsonPath]',
    'The path to the merge json file',
    genDefaultIdeSyntaxPathValue('tao-lang.ts-code-blocks-merge.tmLanguage.json'),
  )
  .argument(
    '[markdownEmbedJsonPath]',
    'The path to the markdown embed json file',
    genDefaultIdeSyntaxPathValue('tao-lang.markdown-embed.tmLanguage.json'),
  )
  .argument(
    '[tmJsonPath]',
    'The path to the tm json file',
    genDefaultIdeSyntaxPathValue('_gen-syntaxes/tao-lang.tmLanguage.json'),
  )
  .argument(
    '[outputDirPath]',
    'The path to the output directory',
    genDefaultIdeSyntaxPathValue('_gen-syntaxes'),
  )
  .action(async (mergeJsonPath, markdownEmbedJsonPath, tmJsonPath, outputDirPath) => {
    await genSyntaxTmLanguageFiles(tmJsonPath, mergeJsonPath, markdownEmbedJsonPath, outputDirPath)
  })

program.parse(Bun.argv)
