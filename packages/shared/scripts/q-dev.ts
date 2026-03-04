import { Command } from '@commander-js/extra-typings'
import path from 'node:path'
import { genSyntaxTmLanguageFiles } from './commands/gen-syntax-tmLanguage-files'

const program = new Command()

function genDefaultIdeSyntaxPathValue(forPath: string) {
  return path.resolve(__dirname, '../../ide-extension/ide-syntaxes', forPath)
}

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
