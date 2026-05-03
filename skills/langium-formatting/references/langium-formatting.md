# Langium Formatting Reference

Formatting in Langium is imperative. The formatter walks the AST and each `format(node)` call queues whitespace edits for the current node's direct children and tokens.

## Core API

- `f.keyword("x")` selects one static token.
- `f.keywords(",")` selects all matching static tokens.
- `f.property("body")` selects assigned child nodes.
- `f.interior(open, close)` selects the region between two tokens.
- `Formatting.oneSpace()` forces one space.
- `Formatting.noSpace()` removes whitespace.
- `Formatting.newLine()` forces a newline.
- `Formatting.indent()` indents relative to the parent.
- `Formatting.fit(n)` keeps content on one line when it fits.

## Production Patterns

- Indent interiors, not individual children, so comments attached to children move correctly.
- Empty blocks with comments should not be collapsed with `noSpace()`.
- Use plural selectors for separators such as commas.
- Guard optional properties when syntax errors can produce partial AST nodes.
- Keep range formatting stateless; do not rely on mutable formatter history.

## Comment Trap

Langium comments are hidden tokens attached to the following visible token. `Formatting.noSpace()` before a token that may start on the next line can pull that token into the previous comment. Prefer `oneSpace()`, `newLine()`, or `fit()` at statement boundaries.

## Testing

Formatter changes should prove the first formatting pass produces the expected output and the second pass is unchanged.
