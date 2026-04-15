import { AST } from '@parser'
import { AbstractFormatter, Formatting, FormattingRegion } from '@parser/lsp'
import { NodePropName } from '@parser/parserASTExport'
import { DocumentFormattingParams, TextEdit } from '@parser/vscode-languageserver'
import { switch_safe } from '@shared'
import extensivelyFormatInjectionBlocks from './injectionFormatter'

const FORMAT_INJECTION_BLOCKS = true

/** TaoFormatter formats Tao sources with Langium’s node-centric model and optional injection re-indent. */
export default class TaoFormatter extends AbstractFormatter {
  /** formatDocument runs Langium’s formatter; when injection re-indent runs and changes text, the result is a single
   * full-document edit (see `extensivelyFormatInjectionBlocks`), otherwise the usual granular edits are returned. */
  override async formatDocument(
    document: AST.Document,
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
    return switch_safe.bind(node, this, {
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
      Debugger: (n) => this.formatDebugger(n),
      ParameterDeclaration: (n) => this.formatParameterDeclaration(n),
      ParameterList: (n) => this.formatParameterList(n),
      AssignmentDeclaration: (n) => this.formatAssignmentDeclaration(n),
      NamedReference: (n) => this.formatNamedReference(n),
      NumberLiteral: (n) => this.formatNumberLiteral(n),
      StringLiteral: (n) => this.formatStringLiteral(n),
      StateUpdate: (n) => this.formatStateUpdate(n),
    })
  }

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

  private formatUseStatement(node: AST.UseStatement): void {
    const f = this.getNodeFormatter(node)
    f.keyword('use').append(Formatting.oneSpace())
    this._spaceBetweenCommaSeperatedItems(node)
    if (node.modulePath) {
      f.keyword('from').prepend(Formatting.oneSpace()).append(Formatting.oneSpace())
    }
  }

  private formatAppDeclaration(node: AST.AppDeclaration): void {
    this._spaceAroundName(node)
    this._indentBlock(node, 'appStatements')
  }

  private formatAppStatement(node: AST.AppStatement): void {
    const f = this.getNodeFormatter(node)
    // Space after 'ui' keyword: "ui MyView"
    f.keyword('ui').append(Formatting.oneSpace())
  }

  private formatViewDeclaration(node: AST.ViewDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'parameterList')
  }

  private formatActionDeclaration(node: AST.ActionDeclaration): void {
    this._spaceAroundName(node)
    this._spaceAfterProperty(node, 'parameterList')
  }

  private formatModuleDeclaration(node: AST.ModuleDeclaration): void {
    this._spaceAfterProperty(node, 'visibility')
    this._spaceAfterProperty(node, 'declaration')
  }

  private formatBlock(node: AST.Block): void {
    this._indentBlock(node, 'statements')
  }

  private formatStateUpdate(node: AST.StateUpdate): void {
    const f = this.getNodeFormatter(node)
    f.keyword('set').append(Formatting.oneSpace())
    f.property('stateRef').append(Formatting.oneSpace())
    f.property('op').append(Formatting.oneSpace())
  }

  private formatViewRender(node: AST.ViewRender): void {
    this._spaceBeforeProperty(node, 'argumentList')
    if (node.block) {
      this._spaceBeforeProperty(node, 'block')
    }
  }

  private formatArgumentList(node: AST.ArgumentList): void {
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatArgument(node: AST.Argument): void {
    const f = this.getNodeFormatter(node)
    // Space between name and value: "name "hello""
    f.property('name').append(Formatting.oneSpace())
  }

  private formatParameterList(node: AST.ParameterList): void {
    this._spaceBetweenNodesInList(node, 'parameters')
    this._spaceBetweenCommaSeperatedItems(node)
  }

  private formatParameterDeclaration(node: AST.ParameterDeclaration): void {
    this._spaceAfterProperty(node, 'name')
  }

  private formatNumberLiteral(_node: AST.NumberLiteral): void {
    // No formatting for number literals
  }

  private formatStringLiteral(_node: AST.StringLiteral): void {
    // No formatting for string literals
  }

  private formatAssignmentDeclaration(node: AST.AssignmentDeclaration): void {
    const f = this.getNodeFormatter(node)
    f.keyword(node.type).append(Formatting.oneSpace())
    f.keyword('=').surround(Formatting.oneSpace())
  }

  private formatNamedReference(_node: AST.NamedReference): void {
  }

  private formatInjection(node: AST.Injection): void {
    const f = this.getNodeFormatter(node)
    f.keyword('inject').append(Formatting.oneSpace())
  }

  private formatDebugger(node: AST.Debugger): void {
    const f = this.getNodeFormatter(node)
    f.keyword('debugger').append(Formatting.oneSpace())
  }

  // Private helpers
  //////////////////

  private _spaceAroundName(node: AST.Node): void {
    const f = this.getNodeFormatter(node)
    f.property('name').surround(Formatting.oneSpace())
  }

  private _spaceAfterProperty<NodeT extends AST.Node>(
    node: NodeT,
    property: NodePropName<NodeT>,
  ): void {
    const f = this.getNodeFormatter(node)
    const prop = node[property] as AST.Node | undefined
    if (prop !== undefined && prop !== null) {
      f.node(prop).append(Formatting.oneSpace())
    }
  }

  private _indentBlock<NodeT extends AST.Node, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AST.Node[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const open = f.keyword('{')
    const close = f.keyword('}')
    this._indentBetween(node, property, open, close)
  }

  private _indentBetween<NodeT extends AST.Node, K extends keyof NodeT>(
    node: NodeT,
    property: K,
    openRegion: FormattingRegion,
    closeRegion: FormattingRegion,
  ): void {
    const f = this.getNodeFormatter(node)

    if ((node[property] as NodeT[K] & AST.Node[]).length === 0) {
      // Empty body: "{ }"
      openRegion.append(Formatting.oneSpace())
    } else {
      // Populated body: indent interior
      f.interior(openRegion, closeRegion).prepend(Formatting.indent())
      closeRegion.prepend(Formatting.newLine())
    }
  }

  private _spaceBeforeProperty<NodeT extends AST.Node, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AST.Node | undefined ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const prop = node[property] as AST.Node | undefined
    if (prop !== undefined && prop !== null) {
      f.node(prop).prepend(Formatting.oneSpace())
    }
  }

  private _spaceBetweenCommaSeperatedItems<NodeT extends AST.Node>(node: NodeT): void {
    const f = this.getNodeFormatter(node)
    f.keywords(',').prepend(Formatting.noSpace()).append(Formatting.oneSpace())
  }
  private _spaceBetweenNodesInList<NodeT extends AST.Node, K extends keyof NodeT>(
    node: NodeT,
    property: K & (NodeT[K] extends AST.Node[] ? K : never),
  ): void {
    const f = this.getNodeFormatter(node)
    const list = node[property] as AST.Node[]
    for (let i = 1; i < list.length; i++) {
      const item = list[i]
      if (item !== undefined) {
        f.node(item).prepend(Formatting.oneSpace())
      }
    }
  }
}
