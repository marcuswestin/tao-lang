import { Command } from '@commander-js/extra-typings'
import console from 'node:console'
import path from 'node:path'
import { merge } from 'object-deep-merge'
import { Log } from '../shared-src/Log'

const program = new Command()

function ideSynPath(path: string) {
  return __dirname + '/../../ide-extension/ide-syntaxes/' + path
}

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
    tmJsonPath = path.resolve(tmJsonPath)
    mergeJsonPath = path.resolve(mergeJsonPath)
    outputJsonPath = path.resolve(outputJsonPath)
    Log(`Read ${tmJsonPath}`)
    const tmJson = await Bun.file(tmJsonPath).json()
    Log(`Read ${mergeJsonPath}`)
    const mergeJson = await Bun.file(mergeJsonPath).json()
    Log(`Merge files`)
    const merged = merge(tmJson, mergeJson)
    Log(`Write ${outputJsonPath}`)
    Bun.write(outputJsonPath, JSON.stringify(merged, null, 2))
    Log.success(`Merged tm files and wrote ${outputJsonPath}`)
  })

program.parse(Bun.argv)
