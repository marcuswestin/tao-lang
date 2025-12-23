import { createTaoServices } from '@tao-compiler/tao-services'
import { expect, test } from 'compiler-tests/test-utils/test-harness'
import * as Langium from 'langium'
import { NodeFileSystem } from 'langium/node'

export function shouldFormat(code: string, expected: string) {
  return async () => {
    await testFormatCode(code, expected)
  }
}

export function testFormatter(feature: string) {
  return {
    format(code: string) {
      return {
        equals(expected: string) {
          test(feature, async () => {
            await testFormatCode(code, expected)
          })
        },
      }
    },
  }
}

export async function testFormatCode(code: string, expectedFormattedCode: string) {
  const rawFormattedCode = await formatCode(code)

  // TODO: Ensuring TaoFile ends in Newline is not working. Remove trimEnd() from both and Fix this!
  const formattedCode = dedent(rawFormattedCode).trimEnd()
  expectedFormattedCode = dedent(expectedFormattedCode).trimStart().trimEnd()

  // expect(formattedCode).toBe(expectedFormattedCode)
  if (formattedCode === expectedFormattedCode) {
    expect(formattedCode).toBe(expectedFormattedCode)
  } else {
    expect(visualize(formattedCode)).toBe(visualize(expectedFormattedCode))
  }
}

export async function formatCode(code: string) {
  const { shared, Tao } = createTaoServices(NodeFileSystem)

  const uri = Langium.URI.parse('tao-string://v0/test.tao')
  const documentFactory = Tao.shared.workspace.LangiumDocumentFactory
  const document = await documentFactory.fromString(code, uri)

  Tao.shared.workspace.LangiumDocuments.addDocument(document)
  await shared.workspace.DocumentBuilder.build([document])

  const formatter = Tao.lsp.Formatter
  if (!formatter) {
    throw new Error('Formatter not available')
  }
  const edits = await formatter.formatDocument(document, {
    textDocument: { uri: document.uri.toString() },
    options: {
      insertSpaces: true,
      tabSize: 4,
      trimFinalNewlines: true,
      insertFinalNewline: true,
    },
  })

  // console.log('edits', JSON.stringify(edits, null, 2))

  return Langium.TextDocument.applyEdits(document.textDocument, edits)
}

/**
 * dedent2 takes a string, computes the shortest prefix of non-empty lines,
 * and returns a new string with the same number of lines, where every line has that shortest prefix removed.
 * Whitespace-only lines are given the same length as the line before it (after dedenting).
 */
export function dedent(text: string): string {
  const lines = text.split('\n')

  // Find the shortest leading whitespace in non-empty lines
  const shortestPrefix = Math.min(
    ...lines
      .filter(line => line.trim() !== '')
      .map(line => line.match(/^\s*/)?.[0].length ?? 0),
  )

  let prevLength = 0
  const resultLines = lines.map(line => {
    // Only dedent non-empty lines
    if (line.trim() !== '') {
      const dedented = line.slice(shortestPrefix)
      prevLength = /^\s*/.exec(dedented)?.[0].length ?? 0
      return dedented
    } else {
      // For whitespace-only lines, use same length as previous line after dedenting
      return ' '.repeat(prevLength)
    }
  })

  return resultLines.join('\n')
}

// Helper: Replaces invisible characters with visible symbols
export const visualize = (str: string) =>
  str.replace(/ /g, '·')
    .replace(/\t/g, '→')
    .replace(/\n/g, '↵\n')
