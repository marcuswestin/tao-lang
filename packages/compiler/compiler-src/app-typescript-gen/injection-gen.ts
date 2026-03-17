import { Compiled, compileNode, compileNodeProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'

/** compileTopLevelInjection emits the trimmed ts block at file top level. */
export function compileTopLevelInjection(injection: AST.Injection): Compiled {
  const tsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFence)
  return compileNode(injection)`
    ${tsCodeBlock}
  `
}

/** compileInjection emits IIFE-wrapped injection code with an optional early return. */
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

/** trimTsFence normalizes ```ts fences to commented markers for embedding. */
function trimTsFence(content: string) {
  const fenced = content.replace(/^```ts/g, '\n// ```ts\n').replace(/ *```$/g, '\n// ```')
  return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n// ```', '\n// ```')
}
