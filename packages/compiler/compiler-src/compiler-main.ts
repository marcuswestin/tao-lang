import { LangiumDocument } from 'langium'
import * as LangiumGen from 'langium/generate'
import { Assert } from './@shared/TaoErrors'
import { isInjection, isViewRenderStatement } from './_gen-tao-parser/ast'
import {
  assertNever,
  Compiled,
  compileList,
  compileNode,
  compileNodeListProperty,
  compileNodeProperty,
  genNodePropertyRef,
} from './compiler-utils'
import { AST } from './grammar'
import { ErrorReport } from './parse-errors'
import { TaoParser } from './parser'

// export type File = {
//   path: string
// }

export type CompileResult = {
  code: string
  errorReport?: ErrorReport
  document?: LangiumDocument<AST.TaoFile>
}

export type CompileOpts = { file: string }

export async function compileTao(opts: CompileOpts): Promise<CompileResult> {
  const parsed = await TaoParser.parseFile(opts.file)
  Assert(parsed.taoFileAST, 'Expected TaoFileAST, but got none.')
  if (parsed.errorReport) {
    return { errorReport: parsed.errorReport, code: getErrorAppString(parsed.errorReport.humanErrorMessage) }
  }
  const result = generateTypescript(parsed.taoFileAST)
  return { code: LangiumGen.toString(result), errorReport: parsed.errorReport, document: parsed.document }
}

function getErrorAppString(message: string) {
  return `
  import * as RN from 'react-native'

  const message = \`${message}\`.replace('\`', '\\\`')

  export default function CompiledTaoApp() {
    // Center view in parent
    return <RN.View style={{ backgroundColor: 'red', maxWidth: 400, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RN.Text>Error compiling file</RN.Text>
      <RN.Text>${message}</RN.Text>
    </RN.View>
  }`
}

function generateTypescript(taoFile: AST.TaoFile): Compiled {
  return compileNode(taoFile)`
    import * as RN from 'react-native'

    export default function CompiledTaoApp() {
      return (
        <RN.View style={{ flex: 1, backgroundColor: 'red' }}>
          <AppUIView />
        </RN.View>
      )
    }
    
    ${compileNodeListProperty(taoFile, 'topLevelStatements', compileTopLevelStatement)}
  `
}
function compileTopLevelStatement(statement: AST.TopLevelStatement): Compiled {
  switch (statement.$type) {
    case 'AppDeclaration':
    case 'ViewDeclaration':
      return compileDeclaration(statement)
    case 'Injection':
      return compileInjection(statement)
    case 'VisibilityMarkedDeclaration':
      return compileDeclaration(statement.declaration)
    default:
      assertNever(statement)
  }
}

function compileDeclaration(declaration: AST.Declaration): Compiled {
  switch (declaration.type) {
    case 'app':
      return compileNodeListProperty(declaration, 'appStatements', compileAppStatement)
    case 'view':
      const renderStatements = declaration.viewStatements.filter(isViewRenderStatement)
      const injectionStatements = declaration.viewStatements.filter(isInjection)
      return compileNode(declaration)`
        export function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
          ${compileList(declaration, injectionStatements, compileInjection)}
          return <>${compileList(declaration, renderStatements, compileViewRenderStatement)}</>
        }
      `
  }
}

function compileParameterList(parameterList?: AST.ParameterList): Compiled {
  if (!parameterList) {
    return undefined
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.key ? `${param.key}: ` : ''}${param.type}`
    })
  }}
  `
}

function compileViewRenderStatement(node: AST.ViewRenderStatement): Compiled {
  return genNodePropertyRef(node, 'view', view =>
    compileNode(view)`
      <${view.name} ${compileArgsListToProps(node.args)}>
        ${compileNodeListProperty(node.body, 'viewStatements', compileViewStatement)}
      </${view.name}>
    `)
}

function compileViewStatement(statement: AST.ViewStatement): Compiled {
  switch (statement.$type) {
    case 'ViewRenderStatement':
      return compileViewRenderStatement(statement)
    case 'Injection':
      return compileInjection(statement)
    default:
      assertNever(statement)
  }
}

function compileArgsListToProps(args?: AST.ArgsList): Compiled {
  if (!args) {
    return undefined
  }
  return compileNodeListProperty(args, 'args', argument => {
    return compileNode(argument)`
      ${argument.key} = {${compileExpression(argument.value)}}
    `
  })
}

function compileExpression(expression: AST.Expression): Compiled {
  switch (expression.$type) {
    case 'StringLiteral':
      return compileNode(expression)`
        ${JSON.stringify(expression.string)}
      `
    case 'NumberLiteral':
      return compileNode(expression)`
        ${JSON.stringify(expression.number)}
      `
    default:
      assertNever(expression)
  }
}

function compileAppStatement(statement: AST.AppStatement): Compiled {
  switch (statement.type) {
    case 'ui':
      return compileNode(statement)`
        function AppUIView() {
          return <${statement.ui.ref!.name} />
        }
      `
    default:
      assertNever(statement.type)
  }
}

function trimTsFence(content: string) {
  const fenced = content.replace(/^```ts/g, '\n// ```ts\n').replace(/ *```$/g, '\n// ```')
  return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n// ```', '\n// ```')
}

function compileInjection(injection: AST.Injection): Compiled {
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
