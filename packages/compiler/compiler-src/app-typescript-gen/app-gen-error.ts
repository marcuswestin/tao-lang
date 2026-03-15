import { TaoErrorReport } from '@tao-compiler/parse-errors'

export function getErrorAppString(errorReport: TaoErrorReport) {
  const messages = errorReport.getHumanErrorMessage()
  return `// @ts-nocheck

  import * as RN from 'react-native'

  const message = \`${messages}\`.replace('\`', '\\\`')

  export default function CompiledTaoApp() {
    // Center view in parent
    return <RN.View style={{ backgroundColor: 'red', maxWidth: 400, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RN.Text>Error compiling file</RN.Text>
      <RN.Text>${messages}</RN.Text>
    </RN.View>
  }`
}
