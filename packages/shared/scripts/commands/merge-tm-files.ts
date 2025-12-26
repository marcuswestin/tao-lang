import path from 'node:path'
import { merge } from 'object-deep-merge'
import { Log } from '../../shared-src/Log'

export async function mergeTmFiles(tmJsonPath: string, mergeJsonPath: string, outputJsonPath: string) {
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
}
