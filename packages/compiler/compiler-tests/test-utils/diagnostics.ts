import type { ParseError } from '@compiler/validation/parse-errors'

function formatHumanMessages(report: ParseError): string {
  return report.getHumanErrorMessages().join('\n---\n')
}

/** expectHumanMessagesContain asserts every substring in `needles` appears in at least one human diagnostic message. */
export function expectHumanMessagesContain(report: ParseError, ...needles: string[]): void {
  const messages = report.getHumanErrorMessages()
  const joined = formatHumanMessages(report)
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
        formatHumanMessages(report)
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
      `Expected some message to satisfy the predicate.\n\nAll messages:\n${formatHumanMessages(report)}`,
    )
  }
}
