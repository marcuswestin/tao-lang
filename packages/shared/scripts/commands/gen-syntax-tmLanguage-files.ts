import path from 'node:path'
import { merge } from 'object-deep-merge'
import { Log } from '../../shared-src/Log'

// TODO: Rename to reflect new additional functionality (copy markdown embed json file to output directory)
export async function genSyntaxTmLanguageFiles(
  tmJsonPath: string,
  mergeJsonPath: string,
  markdownEmbedJsonPath: string,
  outputDirPath: string,
) {
  tmJsonPath = path.resolve(tmJsonPath)
  mergeJsonPath = path.resolve(mergeJsonPath)
  const outputJsonPath = path.resolve(outputDirPath, 'tao-lang.tmLanguage.json')
  Log(`Read ${tmJsonPath}`)
  const tmJson = await Bun.file(tmJsonPath).json()
  Log(`Read ${mergeJsonPath}`)
  const mergeJson = await Bun.file(mergeJsonPath).json()
  Log(`Merge files`)
  const merged = merge(tmJson, mergeJson)
  Log(`Write ${outputJsonPath}`)
  Bun.write(outputJsonPath, JSON.stringify(merged, null, 2))
  Log.success(`Merged tm files and wrote ${outputJsonPath}`)

  const markdownEmbedOutputJsonPath = path.resolve(outputDirPath, 'tao-lang.markdown-embed.tmLanguage.json')
  Log(`Copy ${markdownEmbedJsonPath} to ${markdownEmbedOutputJsonPath}`)
  const markdownEmbedJson = Bun.file(markdownEmbedJsonPath)
  await Bun.write(markdownEmbedOutputJsonPath, markdownEmbedJson)
}
