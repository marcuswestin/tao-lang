import { Compiled, compileNode, compileNodeProperty } from '@tao-compiler/compiler-utils'
import { AST } from '@tao-compiler/grammar'

export function compileInjection(injection: AST.Injection): Compiled {
  const tsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFence)
  return compileNode(injection)`
    {
      const injectionResult = (() => {
        ${tsCodeBlock}
      })()
      if (typeof injectionResult !== 'undefined') {
        return injectionResult
      }
    }
  `
}

function trimTsFence(content: string) {
  const fenced = content.replace(/^```ts/g, '\n// ```ts\n').replace(/ *```$/g, '\n// ```')
  return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n// ```', '\n// ```')
}
