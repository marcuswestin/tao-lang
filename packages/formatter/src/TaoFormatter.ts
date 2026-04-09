import { AST, NodePropName } from '@parser'
import { switchBindItemType_Exhaustive } from '@shared/TypeSafety'
import { AstNode, LangiumDocument } from 'langium'
import { AbstractFormatter, Formatting, FormattingRegion } from 'langium/lsp'
import { DocumentFormattingParams, TextEdit } from 'vscode-languageserver'
import extensivelyFormatInjectionBlocks from './injectionFormatter'

const FORMAT_INJECTION_BLOCKS = true

/** TaoFormatter formats Tao sources with Langium’s node-centric model and optional injection re-indent. */
export default class TaoFormatter extends AbstractFormatter {
  /** formatDocument runs Langium’s formatter; when injection re-indent runs and changes text, the result is a single
   * full-document edit (see `extensivelyFormatInjectionBlocks`), otherwise the usual granular edits are returned. */
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

  /** format dispatches to per-node formatters. */
  protected format(node: AST.TaoLangAstType[keyof AST.TaoLangAstType]): void {
    return switchBindItemType_Exhaustive(node, this, {
      TaoFile: (n) => this.formatTaoFile(n),
      UseStatement: (n) => this.formatUseStatement(n),
      ModuleDeclaration: (n) => this.formatModuleDeclaration(n),
      AppDeclaration: (n) => this.formatAppDeclaration(n),
      AppStatement: (n) => this.formatAppStatement(n),
      ViewDeclaration: (n) => this.formatViewDeclaration(n),
      ActionDeclaration: (n) => this.formatActionDeclaration(n),
      ViewRender: (n) => this.formatViewRender(n),
      Block: (n) => this.formatBlock(n),
      ArgumentList: (n) => this.formatArgumentList(n),
      Argument: (n) => this.formatArgument(n),
      Injection: (n) => this.formatInjection(n),
      ParameterDeclaration: (n) => this.formatParameterDeclaration(n),
      ParameterList: (n) => this.formatParameterList(n),
      AssignmentDeclaration: (n) => this.formatAssignmentDeclaration(n),
      NamedReference: (n) => this.formatNamedReference(n),
      NumberLiteral: (n) => this.formatNumberLiteral(n),
      StringLiteral: (n) => this.formatStringLiteral(n),
      StateUpdate: (n) => this.formatStateUpdate(n),
    })
  }

  /** formatTaoFile applies spacing between top-level statements. */
  private formatTaoFile(node: AST.TaoFile): void {
    const f = this.getNodeFormatter(node)
    const stmts = node.statements
    if (stmts[0]) {
      f.node(stmts[0]).prepend(Formatting.noSpace())
    }

    for (let i = 1; i < stmts.length; i++) {
      const curr = stmts[i]
      if (curr === undefined) {
        continue
      }
      const consecutiveUse = AST.isUseStatement(stmts[i - 1]) && AST.isUseStatement(curr)
      f.node(curr).prepend(consecutiveUse ? Formatting.newLines(1) : Formatting.newLines(2))
    }
  }

  /** formatUseStatement formats use, commas, and from-clause spacing. */
  private formatUseStatement(node: AST.UseStatement): void {
    const f = this.getNodeFormatter(node)
    f.keyword('use').append(Formatting.oneSpace())
    this._spaceBetweenCommaSeperatedItems(node)
    if (node.modulePath) {
      f.keyword('from').prepend(Formatting.oneSpace()).append(Formatting.oneSpace())
    }
  }

  /** formatAppDeclaration formats the name and indented app block. */
  private formatAppDeclaration(node: AST.AppDeclaration): void {
    this._spaceAroundName(node)
    this._indentBlock(node, 'appStatements')
  }

  /** formatAppStatement adds space after the ui keyword. */
  private formatAppStatement(node: AST.AppStatement): void {
    const f = this.getNodeFormatter(node)
    // Space after 'ui' keyword: "ui MyView"
    f.keyword('ui').append(Formatting.oneSpace())
  }

  /** formatViewDeclaration formats name, parameters; block body is formatted via `Block`. */
  private formatViewDeclaration(node: AST.ViewDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'parameterList')
  }

  /** formatActionDeclaration formats name, parameters; block body is formatted via `Block`. */
  private formatActionDeclaration(node: AST.ActionDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'parameterList')
  }

  /** formatModuleDeclaration formats optional visibility and inner declaration. */
  private formatModuleDeclaration(node: AST.ModuleDeclaration): void {
    this._spaceAfterProperty(node, 'visibility')
    this._spaceAfterProperty(node, 'declaration')
  }

  /** formatBlock formats `{ statements }` interiors (when the block node is formatted). */
  private formatBlock(node: AST.Block): void {
    this._indentBlock(node, 'statements')
  }

  /** formatStateUpdate formats `set name <op> value`. */
  private formatStateUpdate(node: AST.StateUpdate): void {
    const f = this.getNodeFormatter(node)
    f.keyword('set').append(Formatting.oneSpace())
    f.property('stateRef').append(Formatting.oneSpace())
    f.property('op').append(Formatting.oneSpace())
  }

  /** formatViewRender formats argument list and spacing before an optional child `Block`. */
  private formatViewRender(node: AST.ViewRender): void {
    this._spaceBeforeProperty(node, 'argumentList')
    if (node.block) {
      this._spaceBeforeProperty(node, 'block')
    }
  }

  /** formatArgumentList applies comma spacing between arguments. */
  private formatArgumentList(node: AST.ArgumentList): void {
    this._spaceBetweenCommaSeperatedItems(node)
  }

  /** formatArgument adds space between argument name and value. */
  private formatArgument(node: AST.Argument): void {
    const f = this.getNodeFormatter(node)
    // Space between name and value: "name "hello""
    f.property('name').append(Formatting.oneSpace())
  }

  /** formatParameterList applies spaces in the parameter list. */
  private formatParameterList(node: AST.ParameterList): void {
    this._spaceBetweenNodesInList(node, 'parameters')
    this._spaceBetweenCommaSeperatedItems(node)
  }

  /** formatParameterDeclaration adds space after the parameter name. */
  private formatParameterDeclaration(node: AST.ParameterDeclaration): void {
    this._spaceAfterProperty(node, 'name')
  }

  /** formatNumberLiteral is a no-op for number literals. */
  private formatNumberLiteral(_node: AST.NumberLiteral): void {
    // No formatting for number literals
  }

  /** formatStringLiteral is a no-op for string literals. */
  private formatStringLiteral(_node: AST.StringLiteral): void {
    // No formatting for string literals
  }

  /** formatAssignmentDeclaration formats `alias` / `state` and `=` spacing (name uses default CST gaps). */
  private formatAssignmentDeclaration(node: AST.AssignmentDeclaration): void {
    const f = this.getNodeFormatter(node)
    f.keyword(node.type).append(Formatting.oneSpace())
    f.keyword('=').surround(Formatting.oneSpace())
  }

  /** formatNamedReference is a no-op for references. */
  private formatNamedReference(_node: AST.NamedReference): void {
  }

  /** formatInjection adds space after the inject keyword. */
  private formatInjection(node: AST.Injection): void {
    const f = this.getNodeFormatter(node)
    f.keyword('inject').append(Formatting.oneSpace())
  }

  // Private helpers
  //////////////////

  /** _spaceAroundName adds one space around the name property. */
  private _spaceAroundName(node: AstNode): void {
    const f = this.getNodeFormatter(node)
    f.property('name').surround(Formatting.oneSpace())
  }

  /** _spaceAfterProperty adds one space after the child node if present. */
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

  /** _indentBlock formats brace-block interiors for an array property. */
  private _indentBlock<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const open = f.keyword('{')
    const close = f.keyword('}')
    this._indentBetween(node, property, open, close)
  }

  /** _indentBetween formats empty "{ }" or an indented interior between open and close regions. */
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

  /** _spaceBeforeProperty adds one space before the child node if present. */
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

  /** _spaceBetweenCommaSeperatedItems ensures comma has no space before and one space after. */
  private _spaceBetweenCommaSeperatedItems<NodeT extends AstNode>(node: NodeT): void {
    const f = this.getNodeFormatter(node)
    f.keywords(',').prepend(Formatting.noSpace()).append(Formatting.oneSpace())
  }
  /** _spaceBetweenNodesInList adds one space before each list item after the first. */
  private _spaceBetweenNodesInList<NodeT extends AstNode, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AstNode[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const list = node[property] as AstNode[]
    for (let i = 1; i < list.length; i++) {
      const item = list[i]
      if (item !== undefined) {
        f.node(item).prepend(Formatting.oneSpace())
      }
    }
  }
}
