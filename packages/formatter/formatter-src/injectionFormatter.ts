import { AST } from '@parser'
import { DocumentFormattingParams, TextEdit } from '@parser/vscode-languageserver'

/** extensivelyFormatInjectionBlocks materializes Langium’s edits into text, normalizes ```/''' injection block indent
 * relative to `inject`, then either returns the original edits (no injection change) or one edit replacing the whole file. */
export default function extensivelyFormatInjectionBlocks(
  document: AST.Document,
  edits: TextEdit[],
  params: DocumentFormattingParams,
): TextEdit[] {
  // Re-indent injection blocks
  const originalText = document.textDocument.getText()
  const firstFormattedText = applyEdits(originalText, edits)
  const tabSize = params.options?.tabSize ?? 4
  const reFormattedText = reindentInjectionBlocks(firstFormattedText, tabSize)

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
  code = code.replace(/\r\n/g, '\n')
  // Match inject blocks with either ``` or ''' markers
  // Capture: indent, opening marker, content lines (each ends with \n), spaces before closing fence, closing fence
  // Content uses (?:.*\n)*? so the closing ``` may sit on the line right after ```ts (no blank line required).
  // Use [ \t]* for indents — (\s*) would treat a blank line before `inject` as part of baseIndent (\\n + spaces).
  const injectPattern = /^([ \t]*)inject\s+(```\w*|'''\w*)\n((?:.*\n)*?)([ \t]*)(```|''')/gm

  return code.replace(
    injectPattern,
    (_match, injectIndent, openMarker, content, _closeIndent) => {
      const baseIndent = injectIndent as string
      const contentIndent = baseIndent + ' '.repeat(tabSize)

      // Determine which marker type we're using
      const markerType = (openMarker as string).startsWith("'''") ? "'''" : '```'

      // Split content into lines; trim leading/trailing newlines so statement spacing between injections
      // is not mistaken for blank lines inside the fence.
      const body = (content as string).replace(/^\n+/, '').replace(/\n+$/, '')
      const contentLines = body.split('\n').map((l: string) => l.replace(/^\n+/, ''))
      while (contentLines.length > 0 && contentLines[0]!.trim() === '') {
        contentLines.shift()
      }
      while (contentLines.length > 0 && contentLines[contentLines.length - 1]!.trim() === '') {
        contentLines.pop()
      }

      // Find minimum indent of non-empty lines
      const nonEmptyLines = contentLines.filter((l: string) => l.trim().length > 0)
      if (nonEmptyLines.length === 0) {
        // No content, just return with proper closing marker indent
        return `${baseIndent}inject ${openMarker}\n${baseIndent}${markerType}`
      }

      /** leadingSpaceLen returns the width of leading spaces/tabs only (not newlines). */
      const leadingSpaceLen = (line: string): number => {
        const m = line.match(/^[ \t]*/)
        return m?.[0].length ?? 0
      }

      const minIndent = Math.min(...nonEmptyLines.map(leadingSpaceLen))

      // Re-indent each line: strip minIndent, add contentIndent
      const reindentedLines = contentLines.map((line: string) => {
        if (line.trim().length === 0) {
          return '' // Keep empty lines empty
        }
        return contentIndent + line.slice(minIndent)
      })
      while (reindentedLines.length > 0 && reindentedLines[0] === '') {
        reindentedLines.shift()
      }
      while (reindentedLines.length > 0 && reindentedLines[reindentedLines.length - 1] === '') {
        reindentedLines.pop()
      }

      return `${baseIndent}inject ${openMarker}\n${reindentedLines.join('\n')}\n${baseIndent}${markerType}`
    },
  )
}
