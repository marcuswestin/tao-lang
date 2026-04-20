import { ParseError } from '@compiler/validation/parse-errors'

/** getErrorAppString returns TSX source for a minimal error screen from a ParseError. */
export function getErrorAppString(errorReport: ParseError) {
  const messages = errorReport.getHumanErrorMessage()
  return `// @ts-nocheck

  import * as RN from 'react-native'

  const message = \`${messages.replace(/`/g, '\\`')}\`.replace('\`', '\\\`')

  export default function CompiledTaoApp() {
    // Center view in parent
    return <RN.View style={{ backgroundColor: 'black', maxWidth: 400, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RN.Text style={{ color: 'white' }}>Error compiling file</RN.Text>
      <RN.Text style={{ color: 'white' }}>${messages}</RN.Text>
    </RN.View>
  }`
}
