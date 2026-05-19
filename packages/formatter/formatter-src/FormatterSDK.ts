import { createTaoWorkspace, NodeFileSystem } from '@compiler'
import { LGM } from '@parser'
import { FS } from '@shared'

export const Formatter = {
  formatFile,
  formatCode,
  createSession,
  dedent,
}

type FormatOpts = { tabSize: number }

export type FormatterSession = {
  formatFile(path: string, opts?: FormatOpts): Promise<string>
  formatCode(code: string, opts?: FormatOpts): Promise<string>
}

/** formatFile reads Tao source at the given path and returns formatted text. */
async function formatFile(path: string, opts: FormatOpts = { tabSize: 3 }) {
  return createSession().formatFile(path, opts)
}

/** formatCode formats a Tao source string and returns formatted text. */
async function formatCode(code: string, opts: FormatOpts = { tabSize: 3 }) {
  return createSession().formatCode(code, opts)
}

/** createSession returns a reusable formatter workspace for callers formatting many independent Tao snippets. */
function createSession(): FormatterSession {
  const workspace = createTaoWorkspace(NodeFileSystem)

  return {
    async formatFile(path: string, opts: FormatOpts = { tabSize: 3 }) {
      const uri = LGM.URI.parse(path)
      const code = FS.readTextFile(path)
      return formatCodeWithWorkspace(workspace, code, uri, opts)
    },
    async formatCode(code: string, opts: FormatOpts = { tabSize: 3 }) {
      const uri = LGM.URI.parse('tao-string://v0/test.tao')
      return formatCodeWithWorkspace(workspace, code, uri, opts)
    },
  }
}

async function formatCodeWithWorkspace(
  workspace: ReturnType<typeof createTaoWorkspace>,
  code: string,
  uri: LGM.URI,
  opts: FormatOpts,
) {
  const document = workspace.createDocumentFromString(code, uri)

  workspace.addDocument(document)
  try {
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
  } finally {
    workspace.removeDocument(document)
  }
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
