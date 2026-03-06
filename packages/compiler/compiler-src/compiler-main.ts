import * as LangiumGen from 'langium/generate'
import { Assert } from './@shared/TaoErrors'
import { switchItemType_Exhaustive } from './@shared/TypeSafety'
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
import { TaoErrorReport } from './parse-errors'
import { TaoParser } from './parser'

// export type File = {
//   path: string
// }

export type CompileResult = {
  code: string
  errorReport: TaoErrorReport
}

export type CompileOpts = {
  file: string
  stdLibRoot?: string
}

export async function compileTao(opts: CompileOpts): Promise<CompileResult> {
  const parsed = await TaoParser.parseFile(opts.file, { stdLibRoot: opts.stdLibRoot })
  if (parsed.errorReport.hasError()) {
    return { errorReport: parsed.errorReport, code: getErrorAppString(parsed.errorReport) }
  }
  Assert(parsed.taoFileAST, 'taoFileAST is defined', parsed)
  const result = generateTypescript(parsed.taoFileAST, parsed.usedFilesASTs)

  return { code: LangiumGen.toString(result), errorReport: parsed.errorReport }
}

function getErrorAppString(errorReport: TaoErrorReport) {
  const messages = errorReport.getHumanErrorMessage()
  return `
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

function generateTypescript(taoFile: AST.TaoFile, usedFilesASTs: AST.TaoFile[]): Compiled {
  const result = new LangiumGen.CompositeGeneratorNode()
  result.append(`import * as RN from 'react-native'\n\n`)
  for (const usedFile of usedFilesASTs) {
    const compiled = compileNode(usedFile)`
      // ${usedFile.$document!.uri}
      ${compileNodeListProperty(usedFile, 'topLevelStatements', compileTopLevelStatement)}
    `
    result.append(compiled)
  }

  result.append(compileNode(taoFile)`
    // ${taoFile.$document!.uri}
    ${compileNodeListProperty(taoFile, 'topLevelStatements', compileTopLevelStatement)}
  `)

  result.append(compileNode(taoFile)`
    export default function CompiledTaoApp() {
      return (
        <RN.View style={{ flex: 1, backgroundColor: 'red' }}>
          <AppUIView />
        </RN.View>
      )
    }
  `)

  return result
}
function compileTopLevelStatement(statement: AST.TopLevelStatement): Compiled {
  return switchItemType_Exhaustive(statement, {
    'UseStatement': compileUseStatement,
    'AppDeclaration': compileDeclaration,
    'ViewDeclaration': compileDeclaration,
    'Injection': compileInjection,
    'VisibilityMarkedDeclaration': (vmd) => compileDeclaration(vmd.declaration),
  })
}

function compileUseStatement(useStatement: AST.UseStatement): Compiled {
  const fromClause = useStatement.modulePath ? ` from ${useStatement.modulePath}` : ''
  return compileNode(useStatement)`
    // Tao: use ${useStatement.importedNames.join(', ')}${fromClause}
  `
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
    default:
      assertNever(declaration)
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
