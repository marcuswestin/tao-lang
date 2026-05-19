import { type ComponentType, createElement } from 'react'

declare const require: (path: string) => { default: ComponentType }

const CompiledTaoApp = require('./_gen/tao-app/app-bootstrap').default

/** ExpoRuntimeEntrypoint renders the generated Tao app bootstrap. */
export default function ExpoRuntimeEntrypoint() {
  return createElement(CompiledTaoApp)
}
