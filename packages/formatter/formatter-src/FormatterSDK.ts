import { createTaoWorkspace, NodeFileSystem } from '@compiler'
import { LGM } from '@parser'
import { FS } from '@shared'

export const Formatter = {
  formatFile,
  formatCode,
  dedent,
}

/** formatFile reads Tao source at the given path and returns formatted text. */
async function formatFile(path: string, opts: { tabSize: number } = { tabSize: 3 }) {
  const uri = LGM.URI.parse(path)
  const code = FS.readTextFile(path)
  return formatCodeWithUri(code, uri, opts)
}

/** formatCode formats a Tao source string and returns formatted text. */
async function formatCode(code: string, opts: { tabSize: number } = { tabSize: 3 }) {
  const uri = LGM.URI.parse('tao-string://v0/test.tao')
  return formatCodeWithUri(code, uri, opts)
}

async function formatCodeWithUri(code: string, uri: LGM.URI, opts: { tabSize: number }) {
  const workspace = createTaoWorkspace(NodeFileSystem)
  const document = workspace.createDocumentFromString(code, uri)

  workspace.addDocument(document)
  await workspace.buildDocument(document)

  const edits = await workspace.formatDocument(document, {
    textDocument: { uri: document.uri.toString() },
    options: {
      insertSpaces: true,
      tabSize: opts.tabSize,
      trimFinalNewlines: true,
      insertFinalNewline: true,
    },
  })

  return LGM.TextDocument.applyEdits(document.textDocument, edits)
}

/** dedent removes the shortest common leading whitespace from every non-empty line; blank lines become empty. */
export function dedent(text: string): string {
  const lines = text.split('\n')
  const shortestPrefix = Math.min(
    ...lines
      .filter(line => line.trim() !== '')
      .map(line => line.match(/^\s*/)?.[0].length ?? 0),
  )
  return lines.map(line => line.trim() === '' ? '' : line.slice(shortestPrefix)).join('\n')
}
