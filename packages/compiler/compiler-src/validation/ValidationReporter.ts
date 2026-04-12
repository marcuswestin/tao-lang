import { NodePropName } from '@compiler/compiler-codegen'
import { AST } from '@parser'
import {
  AstNode,
  AstUtils,
  DiagnosticInfo,
  DocumentSegment,
  getDiagnosticRange,
  isAstNode,
  ValidationAcceptor,
} from 'langium'
import type { DiagnosticRelatedInformation } from 'vscode-languageserver-types'

/** makeValidater wraps a validation function with a Reporter for the Langium acceptor API. */
export function makeValidater<NodeT extends AstNode>(
  fn: (node: NodeT, report: Reporter<NodeT>) => void,
): (node: NodeT, accept: ValidationAcceptor) => void {
  return (node: NodeT, accept: ValidationAcceptor) => {
    fn(node, new Reporter<NodeT>(node, accept))
  }
}

/** nodeProperty returns a diagnostic location on a node property. */
export function nodeProperty<NodeT extends AstNode>(
  node: NodeT,
  property: NodePropName<NodeT>,
): Report.Location<NodeT> {
  return { node, property }
}

/** nodeKeyword returns a diagnostic location on a Tao keyword within a node. */
export function nodeKeyword<NodeT extends AstNode>(
  node: NodeT,
  keyword: AST.TaoLangKeywordNames,
): Report.Location<NodeT> {
  return { node, keyword }
}

/** nodeRange returns a diagnostic location on an explicit range within a node. */
export function nodeRange<NodeT extends AstNode>(
  node: NodeT,
  range: Report.Range,
): Report.Location<NodeT> {
  return { node, range }
}

type Location<NodeT extends AstNode, LocationNodeT extends AstNode = NodeT> =
  | Report.Location<LocationNodeT>
  | NodePropName<NodeT>
type ExtraInfo<NodeT extends AstNode> = Report.ExtraInfo<NodeT> | undefined

export class Reporter<NodeT extends AstNode> {
  constructor(
    private readonly node: NodeT,
    private readonly validationAcceptor: ValidationAcceptor,
  ) {}

  /** error reports a validation error at an optional location. */
  error<ErrorNodeT extends AstNode = NodeT>(
    message: string,
    location?: Location<NodeT, ErrorNodeT> | ErrorNodeT,
    extraInfo?: ExtraInfo<ErrorNodeT>,
  ) {
    this.validationAcceptor('error', message, this.diagnosticsInfo(location, extraInfo))
  }

  /** warning reports a validation warning. */
  warning<WarningNodeT extends AstNode = NodeT>(
    message: string,
    location: Location<NodeT, WarningNodeT>,
    extraInfo?: ExtraInfo<WarningNodeT>,
  ) {
    this.validationAcceptor('warning', message, this.diagnosticsInfo(location, extraInfo))
  }

  /** info reports an info-level diagnostic. */
  info<InfoNodeT extends AstNode>(
    message: string,
    location: Location<NodeT, InfoNodeT>,
    extraInfo?: ExtraInfo<InfoNodeT>,
  ) {
    this.validationAcceptor('info', message, this.diagnosticsInfo(location, extraInfo))
  }

  /** deprecated reports deprecation as an info diagnostic. */
  deprecated<DeprecatedNodeT extends AstNode>(
    message: string,
    location: Location<NodeT, DeprecatedNodeT>,
    extraInfo?: ExtraInfo<DeprecatedNodeT>,
  ) {
    this.validationAcceptor('info', message, this.diagnosticsInfo(location, extraInfo))
  }
  /** unnecessary reports unnecessary code as an info diagnostic. */
  unnecessary<UnnecessaryNodeT extends AstNode>(
    message: string,
    location: Location<NodeT, UnnecessaryNodeT>,
    extraInfo?: ExtraInfo<UnnecessaryNodeT>,
  ) {
    this.validationAcceptor('info', message, this.diagnosticsInfo(location, extraInfo))
  }

  /** diagnosticsInfo builds DiagnosticInfo from location and optional extra metadata. */
  private diagnosticsInfo<ForNodeT extends AstNode>(
    location?: Location<NodeT, ForNodeT> | ForNodeT,
    extraInfo?: Report.ExtraInfo<ForNodeT>,
  ): DiagnosticInfo<ForNodeT> {
    const relatedInformation = this.getRelatedInformation(extraInfo)

    if (isAstNode(location)) {
      return { node: location, relatedInformation }
    }

    let nodeLocation: Report.Location<ForNodeT> = (typeof location === 'string')
      ? nodeProperty(this.node, location) as Report.Location<ForNodeT>
      : location as Report.Location<ForNodeT>

    const { data, code } = extraInfo ?? {}
    const codeHref = code && Report.Codes[code]
    const codeDescription: CodeDescription = codeHref && { href: codeHref }
    const node = nodeLocation.node!

    return { relatedInformation, data, code, codeDescription, ...extraInfo, ...nodeLocation, node }
  }
  /** getRelatedInformation maps alsoCheck callbacks to LSP related information. */
  private getRelatedInformation<ForNodeT extends AstNode>(
    extraInfo?: Report.ExtraInfo<ForNodeT>,
  ): DiagnosticRelatedInformation[] {
    const alsoCheck = extraInfo?.alsoCheck
    const alsoCheckRes = alsoCheck ? alsoCheck() : null
    const alsoCheckInfo = !alsoCheckRes ? [] : !Array.isArray(alsoCheckRes) ? [alsoCheckRes] : alsoCheckRes
    return alsoCheckInfo?.map((checkLocation) => {
      const node = checkLocation.node
      const document = AstUtils.getDocument(node) || AstUtils.findRootNode(node).$document
      return {
        message: checkLocation.message,
        location: {
          uri: document!.uri.toString(),
          range: getDiagnosticRange({ ...checkLocation, node }),
        },
      }
    })
  }
}

export namespace Report {
  export type Code = keyof typeof Codes
  export enum Codes {
    'missing-required-statement' = 'https://example.com/#missing-required-statement',
  }

  export type Type = 'error' | 'warning' | 'info' | 'hint'

  export type Range = DocumentSegment['range']

  export type PropertyLocation<NodeT extends AstNode> = { property: NodePropName<NodeT>; index?: number }
  export type KeywordLocation = { keyword: AST.TaoLangKeywordNames }
  export type RangeLocation = { range: Range }
  export type Location<NodeT extends AstNode> =
    & (
      | PropertyLocation<NodeT>
      | KeywordLocation
      | RangeLocation
    )
    & { node?: NodeT }

  export type Diagnostics<NodeT extends AstNode> =
    & (
      | { deprecated: boolean; unnecessary?: never }
      | { unnecessary: boolean; deprecated?: never }
      | {}
    )
    & {
      data?: unknown
      code?: Code // TODO: Consider making this required
    }
    & {
      alsoCheck?: () => Report.AlsoCheckLocation<NodeT> | Report.AlsoCheckLocation<NodeT>[]
    }

  export type ExtraInfo<NodeT extends AstNode> = {
    alsoCheck?: () => Report.AlsoCheckLocation<NodeT> | Report.AlsoCheckLocation<NodeT>[]
    data?: unknown
    code?: Code // TODO: Consider making this required
  }

  export type AlsoCheckLocation<NodeT extends AstNode> = {
    node: AstNode
    message: string
    property?: NodePropName<NodeT>
    keyword?: AST.TaoLangKeywordNames
    range?: Range
  }
}
// Utils
////////

type CodeDescriptionURI = string
type CodeDescription = { href: CodeDescriptionURI } | undefined
