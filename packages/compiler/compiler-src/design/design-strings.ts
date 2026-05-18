import { AST } from '@parser'
import { decodeTaoTemplateTextChunk } from '../codegen/tao-template-text-chunk'

/** stringTemplateTextOnlyLiteral reads a plain non-interpolated Tao string template. */
export function stringTemplateTextOnlyLiteral(node: AST.StringTemplateExpression | undefined): string | undefined {
  if (!node || node.segments.length !== 1) {
    return undefined
  }
  const s = node.segments[0]!
  if (s.expression !== undefined || s.text === undefined) {
    return undefined
  }
  return decodeTaoTemplateTextChunk(s.text)
}
