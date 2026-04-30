import type { IMultiModeLexerDefinition, TokenType, TokenVocabulary } from 'chevrotain'
import { DefaultTokenBuilder } from 'langium'
import type { TokenBuilderOptions } from 'langium'
import type { GrammarAST } from 'langium'

/**
 * TaoTokenBuilder extends Langium's `DefaultTokenBuilder` to produce a Chevrotain `IMultiModeLexerDefinition`
 * with three modes (`default`, `string`, `interp`), implementing native string-template lexing for Tao.
 *
 * Modes:
 * - `default`: all Tao keywords and terminals. `"` is `STRING_START` with `PUSH_MODE: 'string'`.
 * - `string`: only `STRING_END` (`POP_MODE`), `INTERP_START` (`PUSH_MODE: 'interp'`), and `TEMPLATE_TEXT`.
 *   Characters inside `"…"` can only be escape sequences, literal chars, or the start of an interpolation hole.
 * - `interp`: a copy of the default token list, with `{` / `}` cloned into `BraceOpenInterp` (`PUSH_MODE: 'interp'`)
 *   and `BraceCloseInterp` (`POP_MODE`). The clones use `CATEGORIES: [origBraceKeyword]` so the parser accepts
 *   them as the normal `'{'` / `'}'` keywords in any expression context (object literals, blocks, etc.).
 *   `STRING_START` is intentionally excluded from `interp` mode — nested string templates inside `${…}` are
 *   deferred and will fail with a lex error until explicitly supported.
 *
 * The grammar declares synthetic terminals (`STRING_START`, `STRING_END`, `INTERP_START`, `TEMPLATE_TEXT`) with
 * placeholder unmatchable patterns. This builder rewrites their `PATTERN` and attaches mode directives.
 */
export class TaoTokenBuilder extends DefaultTokenBuilder {
  override buildTokens(grammar: GrammarAST.Grammar, options?: TokenBuilderOptions): TokenVocabulary {
    const base = super.buildTokens(grammar, options)
    if (!Array.isArray(base)) {
      throw new Error('TaoTokenBuilder: DefaultTokenBuilder returned a non-array TokenVocabulary')
    }
    const all = base as TokenType[]
    const byName = (name: string): TokenType => {
      const t = all.find(t => t.name === name)
      if (!t) {
        throw new Error(`TaoTokenBuilder: required token '${name}' not found in grammar output`)
      }
      return t
    }

    // Rewrite synthetic terminals: real patterns and mode directives.
    const STRING_START = byName('STRING_START')
    const STRING_END = byName('STRING_END')
    const INTERP_START = byName('INTERP_START')
    const TEMPLATE_TEXT = byName('TEMPLATE_TEXT')
    const braceOpen = byName('{')
    const braceClose = byName('}')

    STRING_START.PATTERN = /"/
    STRING_START.PUSH_MODE = 'string'
    STRING_END.PATTERN = /"/
    STRING_END.POP_MODE = true
    INTERP_START.PATTERN = /\$\{/
    INTERP_START.PUSH_MODE = 'interp'
    TEMPLATE_TEXT.PATTERN = /(?:\\.|\$(?!\{)|[^"\\$])+/
    TEMPLATE_TEXT.LINE_BREAKS = true

    // Cloned `{` and `}` for interp mode. CATEGORIES keeps them parser-compatible with the regular keywords.
    const braceOpenInterp: TokenType = {
      name: 'BraceOpenInterp',
      PATTERN: /\{/,
      PUSH_MODE: 'interp',
      CATEGORIES: [braceOpen],
    }
    const braceCloseInterp: TokenType = {
      name: 'BraceCloseInterp',
      PATTERN: /\}/,
      POP_MODE: true,
      CATEGORIES: [braceClose],
    }

    // `default` mode: everything except string-mode-only tokens. `STRING_START` is included (so `"` opens a string).
    const stringOnly = new Set<TokenType>([STRING_END, TEMPLATE_TEXT])
    const defaultMode = all.filter(t => !stringOnly.has(t))

    // `string` mode: the exactly-three tokens valid inside a `"…"` string.
    const stringMode: TokenType[] = [STRING_END, INTERP_START, TEMPLATE_TEXT]

    // `interp` mode: copy of default with `{` / `}` swapped for the mode-aware clones. `STRING_START` is removed
    // to defer nested string templates; users who write them get a Chevrotain lex error at the inner `"`.
    const interpMode = defaultMode
      .filter(t => t !== STRING_START)
      .map(t => (t === braceOpen ? braceOpenInterp : t === braceClose ? braceCloseInterp : t))

    const multiModeDef: IMultiModeLexerDefinition = {
      defaultMode: 'default',
      modes: {
        default: defaultMode,
        string: stringMode,
        interp: interpMode,
      },
    }
    return multiModeDef
  }
}
