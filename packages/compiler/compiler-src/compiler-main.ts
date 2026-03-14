import * as LangiumGen from 'langium/generate'
import { Assert } from './@shared/TaoErrors'
import { switchItemType_Exhaustive, switchProperty_Exhaustive } from './@shared/TypeSafety'
import * as ast from './_gen-tao-parser/ast'
import {
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

function generateTypescript(taoFile: AST.TaoFile, usedFilesASTs: AST.TaoFile[]): Compiled {
  const result = new LangiumGen.CompositeGeneratorNode('// @ts-nocheck\n')
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
    'Injection': compileInjection,
    'TopLevelDeclaration': (td) => compileDeclarationContent(td.declaration),
  })
}

function compileDeclarationContent(d: AST.AppDeclaration | AST.Declaration): Compiled {
  return switchItemType_Exhaustive(d, {
    'AppDeclaration': compileAppDeclaration,
    'ViewDeclaration': compileViewDeclaration,
    'AliasDeclaration': compileAliasDeclaration,
  })
}

function compileUseStatement(useStatement: AST.UseStatement): Compiled {
  const fromClause = useStatement.modulePath ? ` from ${useStatement.modulePath}` : ''
  return compileNode(useStatement)`
    // Tao: use ${useStatement.importedNames.join(', ')}${fromClause}
  `
}

function compileAppDeclaration(declaration: AST.AppDeclaration): Compiled {
  return compileNodeListProperty(declaration, 'appStatements', compileAppStatement)
}

function compileViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
  const preambleStatements = declaration.viewStatements.filter(
    n => ast.isAliasDeclaration(n) || ast.isInjection(n) || ast.isViewDeclaration(n),
  )
  const renderStatements = declaration.viewStatements.filter(ast.isViewRenderStatement)
  return compileNode(declaration)`
    export function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
      ${compileList(declaration, preambleStatements, compileViewStatement)}
      return <>${compileList(declaration, renderStatements, compileViewRenderStatement)}</>
    }
  `
}

function compileParameterList(parameterList?: AST.ParameterList): Compiled {
  if (!parameterList) {
    return undefined
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.name}: ${param.type}`
    })
  }}
  `
}

function compileViewRenderStatement(node: AST.ViewRenderStatement): Compiled {
  return genNodePropertyRef(node, 'view', view =>
    compileNode(view)`
      <${view.name} ${compileArgsListToProps(node.args)}>
        ${compileNodeListProperty(node, 'viewStatements', compileViewStatement)}
      </${view.name}>
    `)
}

function compileViewStatement(statement: AST.ViewStatement): Compiled {
  return switchItemType_Exhaustive(statement, {
    ViewRenderStatement: (n) => compileViewRenderStatement(n),
    AliasDeclaration: (n) => compileAliasDeclaration(n),
    Injection: (n) => compileInjection(n),
    ViewDeclaration: (n) => compileViewDeclaration(n),
  })
}

function compileAliasDeclaration(node: AST.AliasDeclaration): Compiled {
  return compileNode(node)`
    const ${node.name} = ${compileExpression(node.value)};
  `
}

function compileArgsListToProps(args?: AST.ArgsList): Compiled {
  if (!args) {
    return undefined
  }
  return compileNodeListProperty(args, 'args', argument => {
    return compileNode(argument)`
      ${argument.name} = {${compileExpression(argument.value)}}
    `
  })
}

function compileExpression(expression: AST.Expression): Compiled {
  return switchItemType_Exhaustive(expression, {
    'StringLiteral': (n) => compileNode(n)`${JSON.stringify(n.string)}`,
    'NumberLiteral': (n) => compileNode(n)`${JSON.stringify(n.number)}`,
    'NamedReference': (n) => compileNode(n)`${n.referenceName.$refText}`,
  })
}

function compileAppStatement(statement: AST.AppStatement): Compiled {
  return switchProperty_Exhaustive(statement, 'type', {
    ui: () =>
      compileNode(statement)`
      function AppUIView() {
        return <${statement.ui.ref!.name} />
      }
    `,
  })
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
