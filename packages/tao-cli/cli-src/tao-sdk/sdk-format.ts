import { Formatter } from '@formatter/FormatterSDK'
import { FS } from '@shared'

/** formatFile writes formatted Tao source to path when content changes and returns whether it did. */
export async function formatFile(path: string) {
  const before = FS.readTextFile(path)
  const after = await Formatter.formatFile(path)
  const didUpdate = before !== after

  if (didUpdate) {
    FS.writeFile(path, after)
  }

  return { didUpdate }
}
