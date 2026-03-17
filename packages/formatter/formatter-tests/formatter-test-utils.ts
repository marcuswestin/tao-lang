import { createTaoWorkspace } from '@compiler/tao-services'
import { expect, test } from 'bun:test'
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
  const workspace = createTaoWorkspace(NodeFileSystem)

  const uri = Langium.URI.parse('tao-string://v0/test.tao')
  const document = workspace.createDocumentFromString(code, uri)

  workspace.addDocument(document)
  await workspace.buildDocument(document)

  const edits = await workspace.formatDocument(document, {
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

/** dedent takes a string, computes the shortest leading whitespace among non-empty lines,
 * and returns a new string where every non-empty line has that prefix removed.
 * Whitespace-only lines are replaced with no indentation (empty line). */
export function dedent(text: string): string {
  const lines = text.split('\n')

  // Find the shortest leading whitespace in non-empty lines
  const shortestPrefix = Math.min(
    ...lines
      .filter(line => line.trim() !== '')
      .map(line => line.match(/^\s*/)?.[0].length ?? 0),
  )

  const resultLines = lines.map(line => {
    if (line.trim() !== '') {
      return line.slice(shortestPrefix)
    }
    // Whitespace-only lines get no indentation
    return ''
  })

  return resultLines.join('\n')
}

// Helper: Replaces invisible characters with visible symbols
export const visualize = (str: string) =>
  str
    .replace(/ /g, '·')
    .replace(/\t/g, '→')
    .replace(/\n/g, '↵\n')
