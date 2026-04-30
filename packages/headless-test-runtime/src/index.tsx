// In clean state, the generated app files are missing.
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import CompiledTaoApp from '../_gen/tao-app/app-bootstrap'

export default function HeadlessTestRuntimeEntrypoint() {
  return <CompiledTaoApp />
}
