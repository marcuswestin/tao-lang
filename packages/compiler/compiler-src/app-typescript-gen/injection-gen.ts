import { Compiled, compileNode, compileNodeProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'

/** compileInjection emits IIFE-wrapped injection code with an optional early return. */
export function compileInjection(injection: AST.Injection): Compiled {
  if (injection.isRaw) {
    const tsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFenceRaw)
    return compileNode(injection)`
      ${tsCodeBlock}
    `
  } else {
    const tsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFence)
    return compileNode(injection)`
      const injectionResult = (() => {
        ${tsCodeBlock}
      })()
      if (typeof injectionResult !== 'undefined') {
        return injectionResult
      }
    `
  }
}

/** trimTsFence normalizes ```ts fences to commented markers for embedding. */
function trimTsFence(content: string) {
  const fenced = content.replace(/^```ts/g, '\n/* ```ts */\n').replace(/ *```$/g, '\n/* ``` */')
  return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n/* ``` */', '\n/* ``` */')
}

/** trimTsFenceRaw normalizes ```ts fences, without comments. */
function trimTsFenceRaw(content: string) {
  const fenced = content.replace(/^```ts/g, '\n').replace(/ *```$/g, '\n')
  return fenced.replace('```ts\n\n', '\n').replace('\n\n', '\n')
}
