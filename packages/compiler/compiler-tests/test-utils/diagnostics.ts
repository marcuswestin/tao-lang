import type { ParseError } from '@compiler/validation/parse-errors'

/** formatParseErrorHumanMessages joins every human diagnostic line with a clear separator for failure dumps. */
export function formatParseErrorHumanMessages(report: ParseError): string {
  return report.getHumanErrorMessages().join('\n---\n')
}

/** expectHumanMessagesContain asserts every substring in `needles` appears in at least one human diagnostic message. */
export function expectHumanMessagesContain(report: ParseError, ...needles: string[]): void {
  const messages = report.getHumanErrorMessages()
  const joined = formatParseErrorHumanMessages(report)
  for (const n of needles) {
    if (!messages.some(m => m.includes(n))) {
      throw new Error(`Expected human message containing ${JSON.stringify(n)}.\n\nAll messages:\n${joined}`)
    }
  }
}

/** expectAnyHumanMessageSubstring asserts at least one message contains one of the `needles` substrings. */
export function expectAnyHumanMessageSubstring(report: ParseError, needles: string[]): void {
  const messages = report.getHumanErrorMessages()
  const ok = needles.some(n => messages.some(m => m.includes(n)))
  if (!ok) {
    throw new Error(
      `Expected one of ${JSON.stringify(needles)} as a substring of some message.\n\nAll messages:\n${
        formatParseErrorHumanMessages(report)
      }`,
    )
  }
}

/** expectDuplicateIdentifier asserts a duplicate-identifier diagnostic for `name`. */
export function expectDuplicateIdentifier(report: ParseError, name: string): void {
  expectHumanMessagesContain(report, `Duplicate identifier '${name}'`)
}

/** expectTypeAssignabilityError asserts a Typir-style assignability mismatch message is present. */
export function expectTypeAssignabilityError(report: ParseError): void {
  expectAnyHumanMessageSubstring(report, ['not assignable', 'does not match'])
}

/** expectSomeHumanMessageSatisfies asserts `predicate` holds for at least one human diagnostic message. */
export function expectSomeHumanMessageSatisfies(report: ParseError, predicate: (m: string) => boolean): void {
  const messages = report.getHumanErrorMessages()
  if (!messages.some(predicate)) {
    throw new Error(
      `Expected some message to satisfy the predicate.\n\nAll messages:\n${formatParseErrorHumanMessages(report)}`,
    )
  }
}

/** expectHasHumanErrors asserts at least one human diagnostic message exists. */
export function expectHasHumanErrors(report: ParseError): void {
  const messages = report.getHumanErrorMessages()
  if (messages.length === 0) {
    throw new Error(`Expected at least one human diagnostic, but got none (errorCount=${report.errorCount()}).`)
  }
}

/** expectNoHumanMessageContains asserts no human message includes `needle`. */
export function expectNoHumanMessageContains(report: ParseError, needle: string): void {
  const messages = report.getHumanErrorMessages()
  if (messages.some(m => m.includes(needle))) {
    throw new Error(
      `Expected no human message to contain ${JSON.stringify(needle)}.\n\nAll messages:\n${
        formatParseErrorHumanMessages(report)
      }`,
    )
  }
}

/** expectHumanErrorCount asserts report.errorCount() equals `expected`. */
export function expectHumanErrorCount(report: ParseError, expected: number): void {
  const n = report.errorCount()
  if (n !== expected) {
    throw new Error(
      `Expected errorCount() === ${expected}, got ${n}.\n\nAll messages:\n${formatParseErrorHumanMessages(report)}`,
    )
  }
}

/** expectHumanErrorCountAtLeast asserts report.errorCount() is at least `min`. */
export function expectHumanErrorCountAtLeast(report: ParseError, min: number): void {
  const n = report.errorCount()
  if (n < min) {
    throw new Error(
      `Expected errorCount() >= ${min}, got ${n}.\n\nAll messages:\n${formatParseErrorHumanMessages(report)}`,
    )
  }
}
