---
description: Use these instructions when implementing code formatting rules in TaoFormatter.ts
alwaysApply: false
---

# Langium Formatting: The Expert’s Handbook

This guide is for architects building production-grade language servers. It bypasses the basics to focus on the imperative **Node-Centric Model**, advanced **CST manipulation**, and the edge cases that break naive formatters.

When making changes, always write tests in `1-test-formatter.test.ts` demonstrate the intended behavior.

Use `bun test packages/compiler/formatter-tests` to run all formatter tests; or `bun test packages/compiler/formatter-tests --test-name-pattern "Name of test"` to run a specific test.

## 1. The Mental Model

Formatting in Langium is **imperative**, not declarative.

1. **The Walker:** Langium walks the AST recursively. Your `format(node)` method is called once for every node.
2. **The Responsibility:** You are responsible _only_ for the formatting of the current node's direct children and tokens.
3. **The Queue:** You do not modify text. You queue instructions (`prepend`, `append`) which are applied atomically.
4. **Conflict Resolution:** **Last-One-Wins**. If a parent rule says "New Line" and a child rule says "No Space", the child (visited later) overrides the parent.

---

## 2. Setup & Configuration

To access user preferences (e.g., Tab Size) or handle file-wide settings, you must override the `formatDocument` entry point.

**`src/language/tao-lang-formatter.ts`**

```typescript
import { AbstractFormatter, AstNode, Formatting, FormattingOptions, LangiumDocument } from 'langium'
import { TextEdit } from 'vscode-languageserver'
import * as ast from './generated/ast'

export class TaoLangFormatter extends AbstractFormatter {
  // Store user settings (default to 4 spaces)
  protected options: FormattingOptions = { tabSize: 4, insertSpaces: true }

  // 1. Capture Options at the Entry Point
  public override formatDocument(document: LangiumDocument, options: FormattingOptions): TextEdit[] {
    this.options = options
    return super.formatDocument(document, options)
  }

  // 2. The Recursive Walker
  protected format(node: AstNode): void {
    // Gatekeeper: Check for @formatter:off
    if (this.isFormattingSuppressed(node)) {
      return
    }

    const f = this.getNodeFormatter(node)

    if (ast.isApp(node)) {
      // ... formatting logic
    }
  }
}
```

---

## 3. The API Cheat Sheet

All operations start with `const f = this.getNodeFormatter(node)`.

| Selector         | Usage                | Description                                            |
| ---------------- | -------------------- | ------------------------------------------------------ |
| `keyword(str)`   | `f.keyword('class')` | Selects a specific static token.                       |
| `keywords(str)`  | `f.keywords(',')`    | **Plural**. Selects _all_ occurrences in the CST.      |
| `property(name)` | `f.property('body')` | Selects child node(s) assigned to an AST property.     |
| `interior(a, b)` | `f.interior(op, cl)` | **Critical**. Selects the region _between_ two tokens. |

| Directive               | Effect                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `Formatting.oneSpace()` | Forces exactly one space ``.                                     |
| `Formatting.noSpace()`  | Removes whitespace. **Warning:** See "Comment Trap" below.       |
| `Formatting.newLine()`  | Forces `\n`.                                                     |
| `Formatting.indent()`   | Increases indentation level relative to parent.                  |
| `Formatting.fit(n)`     | **Conditional:** Keeps content on one line if it fits `n` chars. |

---

## 4. Production Patterns

### 1. The Protected Interior (Indentation)

**The Golden Rule:** Never indent children manually. Indent the _interior_ of the container. This ensures that comments "riding along" with children are indented correctly.

```typescript
if (ast.isBlock(node)) {
  const open = f.keyword('{')
  const close = f.keyword('}')

  // 1. Indent the region strictly BETWEEN the braces
  // This captures children AND their attached comments
  f.interior(open, close).prepend(Formatting.indent())

  // 2. Format the braces themselves
  open.prepend(Formatting.oneSpace())
  close.prepend(Formatting.newLine())
}
```

### 2. The "Empty Block" Trap

Standard logic collapses empty blocks to `{}`. If that block contains a comment `{ // comment }`, `noSpace()` will crush the comment or detach it.

```typescript
if (ast.isBlock(node)) {
  const open = f.keyword('{')
  const close = f.keyword('}')

  // Heuristic: Check if the block is truly empty (no statements)
  if (node.statements.length === 0) {
    // SAFEGUARD: Check for hidden comments before collapsing
    if (this.hasComments(node)) {
      f.interior(open, close).prepend(Formatting.indent())
      close.prepend(Formatting.newLine())
    } else {
      // Truly empty: Collapse to "{ }"
      f.interior(open, close).prepend(Formatting.noSpace())
      open.append(Formatting.oneSpace())
    }
  } else {
    // Populated: Standard Indent
    f.interior(open, close).prepend(Formatting.indent())
    open.append(Formatting.newLine())
  }
}
```

### 3. List Management

Handle separators (commas) in bulk.

```typescript
if (ast.isArgList(node)) {
  // "arg1, arg2" -> Tight left, Space right
  f.keywords(',').prepend(Formatting.noSpace())
    .append(Formatting.oneSpace())
}
```

---

## 5. The Expert’s Edge: Missing Topics

The standard docs often omit these critical implementation details.

### A. The "Comment Trap" (Attachment Rule)

In Langium, comments are **Hidden Tokens** attached to the **following** visible token.

- **The Danger:** `noSpace()` is aggressive.
- _Code:_ `val x = 1 // comment`
- _Bad Rule:_ `f.keyword(';').prepend(Formatting.noSpace())` (applied to next line's semicolon).
- _Result:_ `val x = 1 // comment;` (The semicolon is pulled _into_ the comment).

- **The Fix:** Use `Formatting.oneSpace()` or `Formatting.fit()` at statement boundaries. Never use `noSpace()` before a token that might start a new line.

### B. Manual Suppression (`// @formatter:off`)

Langium has no built-in suppression. You must implement a "Gatekeeper".

```typescript
private isFormattingSuppressed(node: AstNode): boolean {
    const cst = node.$cstNode;
    if (!cst) return false;
    
    // Inspect the text immediately preceding the node
    // (A rough heuristic, but efficient)
    const start = Math.max(0, cst.offset - 50);
    const context = cst.root.text.substring(start, cst.offset);
    return context.includes('@formatter:off');
}
```

### C. Syntax Error Resilience

If the parser returns a partial AST (due to syntax errors), optional properties will be `undefined`. **Your formatter will crash** if you don't guard against this.

```typescript
// BAD: Crashes if 'type' is missing
f.property('type').prepend(Formatting.oneSpace())

// GOOD: Safe navigation
if (node.type) {
  f.property('type').prepend(Formatting.oneSpace())
}
```

### D. Raw Strings (Template Literals)

If your language embeds raw code (SQL, Markdown), you must ensure `indent()` does not touch the inner content.

```typescript
if (ast.isSqlBlock(node)) {
  const open = f.keyword('sql')
  const close = f.keyword('end')

  // Format the delimiters only
  open.prepend(Formatting.newLine())
  close.prepend(Formatting.newLine())

  // CRITICAL: Do NOT apply f.interior(open, close)
  // Leaving the interior undefined tells Langium "Hands off", preserving the user's string.
}
```

### E. Range Formatting & Statelessness

When a user formats a _selection_, Langium still runs your walker but filters the edits.

- **The Rule:** Your formatter must be **Stateless**.
- **Why:** You cannot rely on `this.lastNodeWasImport = true` because the walker might start in the middle of the file (optimization) or the filter might discard the edit that "sets" the state. Always calculate formatting based on `node.$cstNode` (CST) geometry.

---

## 6. Testing Strategy

A formatter is broken if it is not **idempotent**. Running it twice on the same code must result in zero changes on the second pass.

```typescript
// tests/formatting.test.ts
import { expectFormatting } from 'langium/test'

test('Formatter is idempotent', async () => {
  const input = 'app  MyApp  { }'
  const expected = 'app MyApp { }'

  // Pass 1: Raw -> Formatted
  await expectFormatting(services)({
    before: input,
    after: expected,
  })

  // Pass 2: Formatted -> Formatted (Must be identical)
  await expectFormatting(services)({
    before: expected,
    after: expected,
  })
})
```
