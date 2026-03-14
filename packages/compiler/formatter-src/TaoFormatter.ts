import { NodePropName } from '@tao-compiler/compiler-utils'
import { AST } from '@tao-compiler/grammar'
import { AstNode, LangiumDocument } from 'langium'
import { AbstractFormatter, Formatting, FormattingRegion } from 'langium/lsp'
import { DocumentFormattingParams, TextEdit } from 'vscode-languageserver'
import { switchBindItemType_Exhaustive } from '../compiler-src/@shared/TypeSafety'
import * as ast from '../compiler-src/_gen-tao-parser/ast'
import extensivelyFormatInjectionBlocks from './injectionFormatter'

const FORMAT_INJECTION_BLOCKS = true

// TaoFormatter formats Tao code using the Langium Node-Centric Model.
// format() is called for each AST node, formatting only direct children and tokens.
// Uses interior() for brace indentation and applies injection block re-indentation post-formatting.
export default class TaoFormatter extends AbstractFormatter {
  // formatDocument applies standard formatting then re-indents injection blocks.
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
      'TopLevelDeclaration': this.formatTopLevelDeclaration,
      'AppStatement': this.formatAppStatement,
      'ViewDeclaration': this.formatViewDeclaration,
      'ViewRenderStatement': this.formatViewRenderStatement,
      'ArgsList': this.formatArgsList,
      'Argument': this.formatArgument,
      'Injection': this.formatInjection,
      'ParameterDeclaration': this.formatParameterDeclaration,
      'ParameterList': this.formatParameterList,
      'AliasDeclaration': this.formatAliasDeclaration,
      'NamedReference': this.formatNamedReference,
      'NumberLiteral': this.formatNumberLiteral,
      'StringLiteral': this.formatStringLiteral,
    })
  }

  private formatTaoFile(node: ast.TaoFile): void {
    const f = this.getNodeFormatter(node)
    const stmts = node.topLevelStatements
    if (stmts[0]) {
      f.node(stmts[0]).prepend(Formatting.noSpace())
    }

    for (let i = 1; i < stmts.length; i++) {
      const consecutiveUse = ast.isUseStatement(stmts[i - 1]) && ast.isUseStatement(stmts[i])
      f.node(stmts[i]).prepend(consecutiveUse ? Formatting.newLines(1) : Formatting.newLines(2))
    }
  }

  private formatUseStatement(node: ast.UseStatement): void {
    const f = this.getNodeFormatter(node)
    f.keyword('use').append(Formatting.oneSpace())
    this._spaceBetweenCommaSeperatedItems(node)
    if (node.modulePath) {
      f.keyword('from').prepend(Formatting.oneSpace()).append(Formatting.oneSpace())
    }
  }

  private formatAppDeclaration(node: ast.AppDeclaration): void {
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

  private formatTopLevelDeclaration(node: ast.TopLevelDeclaration): void {
    this._spaceAfterProperty(node, 'visibility')
    this._spaceAfterProperty(node, 'declaration')
  }

  private formatViewRenderStatement(node: ast.ViewRenderStatement): void {
    this._spaceBeforeProperty(node, 'args')
    const f = this.getNodeFormatter(node)
    // Space before optional block brace (e.g. "value x { }"). No-op when block omitted.
    f.keyword('{').prepend(Formatting.oneSpace())
    // Format block (empty -> "{ }", non-empty -> indented). Omitted block has no braces so _indentBlock no-ops.
    this._indentBlock(node, 'viewStatements')
  }

  private formatArgsList(node: ast.ArgsList): void {
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatArgument(node: ast.Argument): void {
    const f = this.getNodeFormatter(node)
    // Space between name and value: "name "hello""
    f.property('name').append(Formatting.oneSpace())
  }

  private formatParameterList(node: ast.ParameterList): void {
    this._spaceBetweenNodesInList(node, 'parameters')
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatParameterDeclaration(node: ast.ParameterDeclaration): void {
    this._spaceAfterProperty(node, 'name')
  }

  private formatNumberLiteral(_node: ast.NumberLiteral): void {
    // No formatting for number literals
  }

  private formatStringLiteral(_node: ast.StringLiteral): void {
    // No formatting for string literals
  }

  private formatAliasDeclaration(node: ast.AliasDeclaration): void {
    const f = this.getNodeFormatter(node)
    f.keyword('alias').append(Formatting.oneSpace())
    f.keyword('=').surround(Formatting.oneSpace())
  }

  private formatNamedReference(_node: ast.NamedReference): void {
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

  private _indentBlock<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const open = f.keyword('{')
    const close = f.keyword('}')
    this._indentBetween(node, property, open, close)
  }

  // _indentBlock takes a node and a property name, where the property is an array of AstNodes,
  // and indents the interior of the block.
  private _indentBetween<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K,
    openRegion: FormattingRegion,
    closeRegion: FormattingRegion,
  ): void {
    const f = this.getNodeFormatter(node)

    if ((node[property] as NodeT[K] & AstNode[]).length === 0) {
      // Empty body: "{ }"
      openRegion.append(Formatting.oneSpace())
    } else {
      // Populated body: indent interior
      f.interior(openRegion, closeRegion).prepend(Formatting.indent())
      closeRegion.prepend(Formatting.newLine())
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
