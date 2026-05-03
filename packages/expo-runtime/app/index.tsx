import type { ComponentType } from 'react'

declare const require: (path: string) => { default: ComponentType }

// TODO: REMOVE? Runtime app files are generated and can be absent in a clean tree.
const CompiledTaoApp = require('../_gen/tao-app/app-bootstrap').default

export default function ExpoRuntimeEntrypoint() {
  return <CompiledTaoApp />
}
