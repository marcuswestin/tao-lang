import { FS } from '@shared'
import { Log } from '@shared/Log'
import { merge } from 'object-deep-merge'

// TODO: Rename to reflect new additional functionality (copy markdown embed json file to output directory)
export async function genSyntaxTmLanguageFiles(
  tmJsonPath: string,
  mergeJsonPath: string,
  markdownEmbedJsonPath: string,
  outputDirPath: string,
) {
  tmJsonPath = FS.resolvePath(tmJsonPath)
  mergeJsonPath = FS.resolvePath(mergeJsonPath)
  const outputJsonPath = FS.resolvePath(outputDirPath, 'tao-lang.tmLanguage.json')
  Log.verbose(`Read ${tmJsonPath}`)
  const tmJson = await Bun.file(tmJsonPath).json()
  Log.verbose(`Read ${mergeJsonPath}`)
  const mergeJson = await Bun.file(mergeJsonPath).json()
  Log.verbose(`Merge files`)
  const merged = merge(tmJson, mergeJson)
  Log.verbose(`Write ${outputJsonPath}`)
  const serialized = JSON.stringify(merged, null, 2)
  await Bun.write(outputJsonPath, serialized)
  Log.verbose.success(`Merged tm files and wrote ${outputJsonPath}`)
  Log.success(`IDE TextMate grammar merged`)

  const markdownEmbedOutputJsonPath = FS.resolvePath(outputDirPath, 'tao-lang.markdown-embed.tmLanguage.json')
  Log.verbose(`Copy ${markdownEmbedJsonPath} to ${markdownEmbedOutputJsonPath}`)
  const markdownEmbedJson = Bun.file(markdownEmbedJsonPath)
  await Bun.write(markdownEmbedOutputJsonPath, markdownEmbedJson)
}
