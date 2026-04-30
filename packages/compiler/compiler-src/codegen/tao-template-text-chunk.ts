/** decodeTaoTemplateTextChunk unescapes a lexer slice matched by the `TEMPLATE_TEXT` terminal (see
 * `packages/parser/src/tao-token-builder.ts`) inside Tao double-quoted template strings. Recognized escape
 * sequences are `\n`, `\r`, `\t`, `\\`, `\"`, `\$`; any other `\x` is passed through as the literal `x`. */
export function decodeTaoTemplateTextChunk(raw: string): string {
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!
    if (c === '\\' && i + 1 < raw.length) {
      i++
      const n = raw[i]!
      switch (n) {
        case 'n':
          out += '\n'
          break
        case 'r':
          out += '\r'
          break
        case 't':
          out += '\t'
          break
        case '\\':
          out += '\\'
          break
        case '"':
          out += '"'
          break
        case '$':
          out += '$'
          break
        default:
          out += n
          break
      }
    } else {
      out += c
    }
  }
  return out
}
