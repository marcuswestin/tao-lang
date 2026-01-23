import { NodePropName } from '@tao-compiler/compiler-utils'
import { AST } from '@tao-compiler/grammar'
import { AstNode, LangiumDocument } from 'langium'
import { AbstractFormatter, Formatting } from 'langium/lsp'
import { DocumentFormattingParams, TextEdit } from 'vscode-languageserver'
import { switchBindItemType_Exhaustive } from '../compiler-src/@shared/TypeSafety' // TODO: Fix this to be @shared/TypeSafety
import * as ast from '../compiler-src/_gen-tao-parser/ast'
import extensivelyFormatInjectionBlocks from './injectionFormatter'

const FORMAT_INJECTION_BLOCKS = true

/**
 * Tao Lang Formatter
 *
 * Formatting rules based on the Langium Node-Centric Model:
 * - format() is called for each AST node
 * - We only format the current node's direct children and tokens
 * - interior() is used for indentation between braces
 * - Injection blocks have their content re-indented post-formatting
 */
export default class TaoFormatter extends AbstractFormatter {
  // Override formatDocument to apply injection block re-indentation after standard formatting
  override async formatDocument(
    document: LangiumDocument,
    params: DocumentFormattingParams,
  ): Promise<TextEdit[]> {
    const edits = await super.formatDocument(document, params)

    if (FORMAT_INJECTION_BLOCKS) {
      return extensivelyFormatInjectionBlocks(document, edits, params)
    }

    return edits
  }

  protected format(node: ast.TaoLangAstType[keyof ast.TaoLangAstType]): void {
    return switchBindItemType_Exhaustive(node, this, {
      'TaoFile': this.formatTaoFile,
      'UseStatement': this.formatUseStatement,
      'AppDeclaration': this.formatAppDeclaration,
      'VisibilityMarkedDeclaration': this.formatVisibilityMarkedDeclaration,
      'AppStatement': this.formatAppStatement,
      'ViewDeclaration': this.formatViewDeclaration,
      'ViewRenderStatement': this.formatViewRenderStatement,
      'ViewBody': this.formatViewBody,
      'ArgsList': this.formatArgsList,
      'Argument': this.formatArgument,
      'Injection': this.formatInjection,
      'Parameter': this.formatParameter,
      'ParameterList': this.formatParameterList,
      'NumberLiteral': this.formatNumberLiteral,
      'StringLiteral': this.formatStringLiteral,
    })
  }

  private formatTaoFile(node: ast.TaoFile): void {
    const f = this.getNodeFormatter(node)
    const firstStatement = node.topLevelStatements[0]
    if (firstStatement) {
      f.node(firstStatement).prepend(Formatting.noSpace())
    }

    for (let i = 1; i < node.topLevelStatements.length; i++) {
      f.node(node.topLevelStatements[i]).prepend(Formatting.newLines(2))
    }
  }

  private formatUseStatement(node: ast.UseStatement): void {
    const f = this.getNodeFormatter(node)
    // Space after 'ui' keyword: "ui MyView"
    f.keyword('use').prepend(Formatting.noSpace()).append(Formatting.oneSpace())
    f.property('modulePath').append(Formatting.oneSpace())
    f.property('importedNames').append(Formatting.newLine())
    f.node(node).append(Formatting.newLine())
  }

  private formatAppDeclaration(node: ast.AppDeclaration): void {
    const f = this.getNodeFormatter(node)
    f.keyword('app').prepend(Formatting.noSpace())
    this._spaceAroundName(node)
    this._indentBlock(node, 'appStatements')
  }

  private formatAppStatement(node: ast.AppStatement): void {
    const f = this.getNodeFormatter(node)
    // Space after 'ui' keyword: "ui MyView"
    f.keyword('ui').append(Formatting.oneSpace())
  }

  private formatViewDeclaration(node: ast.ViewDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'parameterList')
    this._indentBlock(node, 'viewStatements')
  }

  private formatVisibilityMarkedDeclaration(node: ast.VisibilityMarkedDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'visibility')
    this._spaceAfterProperty(node, 'declaration')
  }

  private formatViewRenderStatement(node: ast.ViewRenderStatement): void {
    this._spaceBeforeProperty(node, 'args')
    this._spaceBeforeProperty(node, 'body')
  }
  private formatViewBody(node: ast.ViewBody): void {
    this._indentBlock(node, 'viewStatements')
  }

  private formatArgsList(node: ast.ArgsList): void {
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatArgument(node: ast.Argument): void {
    const f = this.getNodeFormatter(node)
    // Space between key and value: "value "hello""
    f.property('key').append(Formatting.oneSpace())
  }

  private formatParameterList(node: ast.ParameterList): void {
    this._spaceBetweenNodesInList(node, 'parameter')
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatParameter(node: ast.Parameter): void {
    this._spaceAfterProperty(node, 'key')
  }

  private formatNumberLiteral(_node: ast.NumberLiteral): void {
    // No formatting for number literals
  }

  private formatStringLiteral(_node: ast.StringLiteral): void {
    // No formatting for string literals
  }

  private formatInjection(node: ast.Injection): void {
    this._spaceAfterKeyword(node, 'inject')
  }

  // Private helpers
  //////////////////

  // Space around names, e.g "app MyApp {", "view MyView {", etc.
  private _spaceAroundName(node: AstNode): void {
    const f = this.getNodeFormatter(node)
    f.property('name').surround(Formatting.oneSpace())
  }

  private _spaceAfterProperty<NodeT extends AstNode>(
    node: NodeT,
    property: NodePropName<NodeT>,
  ): void {
    const f = this.getNodeFormatter(node)
    const prop = node[property] as AstNode | undefined
    if (prop !== undefined && prop !== null) {
      f.node(prop).append(Formatting.oneSpace())
    }
  }

  // _indentBlock takes a node and a property name, where the property is an array of AstNodes,
  // and indents the interior of the block.
  private _indentBlock<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const open = f.keyword('{')
    const close = f.keyword('}')

    if ((node[property] as NodeT[K] & AstNode[]).length === 0) {
      // Empty body: "{ }"
      open.append(Formatting.oneSpace())
    } else {
      // Populated body: indent interior
      f.interior(open, close).prepend(Formatting.indent())
      close.prepend(Formatting.newLine())
    }
  }

  private _spaceBeforeProperty<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode | undefined ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const prop = node[property] as AstNode | undefined
    if (prop !== undefined && prop !== null) {
      f.node(prop).prepend(Formatting.oneSpace())
    }
  }

  private _spaceAfterKeyword(node: AstNode, keyword: AST.TaoLangKeywordNames): void {
    const f = this.getNodeFormatter(node)
    f.keyword(keyword).append(Formatting.oneSpace())
  }

  private _spaceBetweenCommaSeperatedItems<NodeT extends AstNode>(node: NodeT): void {
    const f = this.getNodeFormatter(node)
    f.keywords(',').prepend(Formatting.noSpace()).append(Formatting.oneSpace())
  }
  private _spaceBetweenNodesInList<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const list = node[property] as AstNode[]
    for (let i = 1; i < list.length; i++) {
      f.node(list[i]).prepend(Formatting.oneSpace())
    }
  }
}
