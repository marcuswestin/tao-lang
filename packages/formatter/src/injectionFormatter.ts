import { LangiumDocument } from 'langium'
import { DocumentFormattingParams, TextEdit } from 'vscode-languageserver'

/** extensivelyFormatInjectionBlocks materializes Langium’s edits into text, normalizes ```/''' injection block indent
 * relative to `inject`, then either returns the original edits (no injection change) or one edit replacing the whole file. */
export default function extensivelyFormatInjectionBlocks(
  document: LangiumDocument,
  edits: TextEdit[],
  params: DocumentFormattingParams,
): TextEdit[] {
  // Re-indent injection blocks
  const originalText = document.textDocument.getText()
  const firstFormattedText = applyEdits(originalText, edits)
  const reFormattedText = reindentInjectionBlocks(firstFormattedText, params.options.tabSize)

  // If nothing changed, return original edits
  if (reFormattedText === firstFormattedText) {
    return edits
  }

  // Return a single edit replacing the whole document
  const range = {
    start: { line: 0, character: 0 },
    end: document.textDocument.positionAt(originalText.length),
  }
  return [{ range, newText: reFormattedText }]
}

/** applyEdits applies LSP text edits to a string in reverse position order. */
function applyEdits(text: string, edits: TextEdit[]): string {
  // Sort edits in reverse order by position to apply from end to start
  const sortedEdits = [...edits].sort((a, b) => {
    if (b.range.start.line !== a.range.start.line) {
      return b.range.start.line - a.range.start.line
    }
    return b.range.start.character - a.range.start.character
  })

  const lines = text.split('\n')

  for (const edit of sortedEdits) {
    const startLine = edit.range.start.line
    const startChar = edit.range.start.character
    const endLine = edit.range.end.line
    const endChar = edit.range.end.character

    // Get the text before and after the edit range
    const before = lines.slice(0, startLine).join('\n') + (startLine > 0 ? '\n' : '')
      + lines[startLine]?.slice(0, startChar)
    const after = (lines[endLine]?.slice(endChar) ?? '')
      + (endLine < lines.length - 1 ? '\n' + lines.slice(endLine + 1).join('\n') : '')

    // Apply the edit
    const newText = before + edit.newText + after
    lines.length = 0
    lines.push(...newText.split('\n'))
  }

  return lines.join('\n')
}

/** reindentInjectionBlocks normalizes inject fence indentation relative to the inject keyword.
 * - Deepest content line sits one tab under inject; closing fence aligns with inject. */
function reindentInjectionBlocks(code: string, tabSize: number): string {
  // Match inject blocks with either ``` or ''' markers
  // Capture: indent, opening marker (``` or '''), content, closing marker
  const injectPattern = /^(\s*)inject\s+(```\w*|'''\w*)\n([\s\S]*?)\n(\s*)(```|''')/gm

  return code.replace(
    injectPattern,
    (_match, injectIndent, openMarker, content, _closeIndent) => {
      const baseIndent = injectIndent as string
      const contentIndent = baseIndent + ' '.repeat(tabSize)

      // Determine which marker type we're using
      const markerType = (openMarker as string).startsWith("'''") ? "'''" : '```'

      // Split content into lines
      const contentLines = (content as string).split('\n')

      // Find minimum indent of non-empty lines
      const nonEmptyLines = contentLines.filter((l: string) => l.trim().length > 0)
      if (nonEmptyLines.length === 0) {
        // No content, just return with proper closing marker indent
        return `${baseIndent}inject ${openMarker}\n${baseIndent}${markerType}`
      }

      const minIndent = Math.min(
        ...nonEmptyLines.map((l: string) => l.match(/^\s*/)?.[0].length ?? 0),
      )

      // Re-indent each line: strip minIndent, add contentIndent
      const reindentedLines = contentLines.map((line: string) => {
        if (line.trim().length === 0) {
          return '' // Keep empty lines empty
        }
        return contentIndent + line.slice(minIndent)
      })

      return `${baseIndent}inject ${openMarker}\n${reindentedLines.join('\n')}\n${baseIndent}${markerType}`
    },
  )
}
