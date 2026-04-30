import { Formatter } from '@formatter/FormatterSDK'
import { expect, test } from 'bun:test'

export const dedent = Formatter.dedent

/** reindentExpectedFromFourSpaceTab maps each line’s leading spaces from 4-space steps to 3-space steps (relative to the block’s minimum indent) so legacy expectations match tabSize 3. */
function reindentExpectedFromFourSpaceTab(dedented: string): string {
  const lines = dedented.split('\n')
  const nonempty = lines.filter(line => line.trim() !== '')
  if (nonempty.length === 0) {
    return dedented
  }
  const m = Math.min(...nonempty.map(line => line.match(/^\s*/)?.[0].length ?? 0))
  return lines
    .map(line => {
      if (line.trim() === '') {
        return line
      }
      const lead = line.match(/^\s*/)?.[0].length ?? 0
      const rel = lead - m
      const newRel = rel === 0 ? 0 : Math.ceil((rel * 3) / 4)
      return `${' '.repeat(m + newRel)}${line.trimStart()}`
    })
    .join('\n')
}

export function shouldFormat(code: string, expected: string) {
  return async () => {
    await testFormatCode(code, expected)
  }
}

export function testFormatter(feature: string) {
  return {
    format(code: string, numberOfTimes: number = 1) {
      return {
        equals(expected: string) {
          test(feature, async () => {
            await testFormatCode(code, expected, numberOfTimes)
          })
        },
      }
    },
  }
}

export async function testFormatCode(code: string, expectedFormattedCode: string, numberOfTimes: number = 1) {
  let rawFormattedCode = await Formatter.formatCode(code, { tabSize: 3 })
  for (let i = 0; i < numberOfTimes; i++) {
    rawFormattedCode = await Formatter.formatCode(rawFormattedCode, { tabSize: 3 })
  }

  // TODO: Ensuring TaoFile ends in Newline is not working. Remove trimEnd() from both and Fix this!
  const formattedCode = Formatter.dedent(rawFormattedCode).trimEnd()
  expectedFormattedCode = reindentExpectedFromFourSpaceTab(
    Formatter.dedent(expectedFormattedCode).trimStart().trimEnd(),
  )

  if (formattedCode === expectedFormattedCode) {
    expect(formattedCode).toBe(expectedFormattedCode)
  } else {
    expect(visualize(formattedCode)).toBe(visualize(expectedFormattedCode))
  }
}

// Helper: Replaces invisible characters with visible symbols
export const visualize = (str: string) =>
  str
    .replace(/ /g, '·')
    .replace(/\t/g, '→')
    .replace(/\n/g, '↵\n')
