import { Command } from '@commander-js/extra-typings'
import { FS } from '@shared'
import { genIdeSyntaxFiles } from './commands/gen-ide-syntax-files'

const program = new Command()

function genDefaultIdeSyntaxPathValue(forPath: string) {
  return FS.resolvePath(__dirname, '../../ide-extension/ide-syntaxes', forPath)
}

program.command('gen-ide-syntax-files')
  .description('Merge Tao tmLanguage with TS fragments and copy markdown-embed grammar into the output directory')
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
    await genIdeSyntaxFiles(tmJsonPath, mergeJsonPath, markdownEmbedJsonPath, outputDirPath)
  })

program.parse(Bun.argv)
