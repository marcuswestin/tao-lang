import { throwNotYetImplementedError } from '@tao-compiler/@shared/TaoErrors'
import * as AST from '@tao-compiler/_gen-tao-parser/AST'
import { AstNode } from 'langium'
import { AbstractFormatter, LangiumServices } from 'langium/lsp'

export default class TaoFormatter extends AbstractFormatter {
  protected format(node: AstNode): void {
    if (AST.isTaoFile(node)) {
      this.formatTaoFile(node)
    } else {
      throwNotYetImplementedError(`Formatting ${node.$type}`)
    }
  }

  private formatTaoFile(taoFile: AST.TaoFile): void {
    throwNotYetImplementedError('formatTaoFile')
  }
}

export const MyDslModule = {
  lsp: {
    Formatter: (services: LangiumServices) => new TaoFormatter(),
  },
}
