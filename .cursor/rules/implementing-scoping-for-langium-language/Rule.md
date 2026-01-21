# Langium Scoping: The Definitive Guide

This guide covers implementing scoping in Langium—the mechanism that determines which symbols are visible at any point in your language.

> **Version note:** This guide targets **Langium v4.x** (API: `collectExportedSymbols` / `collectLocalSymbols`).

## Core Mental Model

Scoping in Langium is a **two-phase system**:

| Phase             | Class              | Question Answered                     | When It Runs                                   |
| ----------------- | ------------------ | ------------------------------------- | ---------------------------------------------- |
| **1. Export**     | `ScopeComputation` | "What symbols does this file expose?" | After parsing, during **Indexing**.            |
| **2. Resolution** | `ScopeProvider`    | "What symbols are visible here?"      | During **Linking**, when resolving references. |

> **Critical Rule:** You cannot resolve references before indexing completes. **Never** access `.ref` properties inside `ScopeComputation`. This triggers linking too early and can lead to cyclic dependencies.

---

## Architecture Overview

Scope-related classes are registered in your language module (`my-lang-module.ts`).

```typescript
// my-lang-module.ts
import { Module } from 'langium'

export const MyLangModule: Module<MyLangServices, PartialLangiumServices> = {
  workspace: {
    // Responsible for storing metadata (visibility, types) in descriptions
    AstNodeDescriptionProvider: (services) => new MyLangDescriptionProvider(services),

    // Responsible for loading initial files (stdlib)
    WorkspaceManager: (services) => new MyLangWorkspaceManager(services),
  },
  references: {
    // Responsible for creating exports + local scopes (indexing/scopes)
    ScopeComputation: (services) => new MyLangScopeComputation(services),

    // Responsible for calculating the scope for a specific reference
    ScopeProvider: (services) => new MyLangScopeProvider(services),
  },
}
```

---

## Quick Reference

| Task                               | Class                        | Method                      |
| ---------------------------------- | ---------------------------- | --------------------------- |
| **Export symbols to other files**  | `ScopeComputation`           | `collectExportedSymbols()`  |
| **Define local variable scopes**   | `ScopeComputation`           | `collectLocalSymbols()`     |
| **Resolve a reference**            | `ScopeProvider`              | `getScope()`                |
| **Store metadata on symbols**      | `AstNodeDescriptionProvider` | `createDescription()`       |
| **Load additional files (stdlib)** | `WorkspaceManager`           | `loadAdditionalDocuments()` |

---

## Phase 1: Exporting Symbols (ScopeComputation)

This phase populates the Global Index and defines local block scoping.

### Basic Pattern

```typescript
import {
  AstNode,
  AstNodeDescription,
  AstUtils,
  Cancellation,
  DefaultScopeComputation,
  interruptAndCheck,
  LangiumDocument,
  LocalSymbols,
  MultiMap,
} from 'langium'
import * as ast from './generated/ast.js'

export class MyLangScopeComputation extends DefaultScopeComputation {
  /**
   * collectExportedSymbols: Symbols visible to OTHER files (cross-file references).
   * These enter the global IndexManager.
   */
  override async collectExportedSymbols(
    document: LangiumDocument,
    cancelToken = Cancellation.CancellationToken.None,
  ): Promise<AstNodeDescription[]> {
    const exports: AstNodeDescription[] = []
    const root = document.parseResult.value
    if (!root) {
      return exports
    }

    for (const node of AstUtils.streamAllContents(root)) {
      await interruptAndCheck(cancelToken)

      // Example: Export Functions that aren't private
      if (ast.isFunctionDecl(node) && node.name) {
        if (node.visibility !== 'private') {
          exports.push(this.descriptions.createDescription(node, node.name, document))
        }
      }

      // Example: Export all Types
      if (ast.isTypeDecl(node) && node.name) {
        exports.push(this.descriptions.createDescription(node, node.name, document))
      }
    }
    return exports
  }

  /**
   * collectLocalSymbols: Symbols visible WITHIN this file (block scoping).
   * These are stored in the document (precomputed scopes), not the global index.
   */
  override async collectLocalSymbols(
    document: LangiumDocument,
    cancelToken = Cancellation.CancellationToken.None,
  ): Promise<LocalSymbols> {
    const scopes = new MultiMap<AstNode, AstNodeDescription>()
    const root = document.parseResult.value
    if (!root) {
      return scopes
    }

    for (const node of AstUtils.streamAllContents(root)) {
      await interruptAndCheck(cancelToken)

      // 1. Function parameters are visible inside the function body
      if (ast.isFunctionDecl(node)) {
        for (const param of node.parameters) {
          if (param.name) {
            // Add parameters to the scope of the function node,
            // making them visible to children of the function.
            scopes.add(node, this.descriptions.createDescription(param, param.name, document))
          }
        }
      }

      // 2. Let bindings are visible in their containing block
      if (ast.isLetStatement(node) && node.name) {
        const container = node.$container
        if (container) {
          scopes.add(container, this.descriptions.createDescription(node, node.name, document))
        }
      }
    }
    return scopes
  }
}
```

### Storing Metadata (Type-Safe)

To filter symbols efficiently (e.g., checking `"visibility"` without loading and walking full ASTs), store metadata in the `AstNodeDescription`.

```typescript
import {
  AstNode,
  AstNodeDescription,
  DefaultAstNodeDescriptionProvider,
  LangiumDocument,
} from 'langium'
import * as ast from './generated/ast.js'

// 1. Define the custom interface
export interface MyLangAstNodeDescription extends AstNodeDescription {
  visibility?: string
}

export class MyLangDescriptionProvider extends DefaultAstNodeDescriptionProvider {
  // 2. Override createDescription to populate the metadata
  override createDescription(
    node: AstNode,
    name: string | undefined,
    document?: LangiumDocument,
  ): AstNodeDescription {
    const desc = super.createDescription(node, name, document) as MyLangAstNodeDescription

    if (ast.isFunctionDecl(node)) {
      desc.visibility = node.visibility ?? 'default'
    }

    return desc
  }
}
```

---

## Phase 2: Resolving References (ScopeProvider)

The **Scope Chain** is consulted during linking. Resolution walks from the current location upward through precomputed scopes and finally into the global scope.

### Basic Pattern & Imports

```typescript
import {
  AstUtils,
  DefaultScopeProvider,
  EMPTY_SCOPE,
  LangiumDocument,
  ReferenceInfo,
  Scope,
} from 'langium'
import { dirname, join } from 'node:path'
import * as ast from './generated/ast.js'

export class MyLangScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    // Example: Custom handling for a "member call" / dot navigation:
    // Restrict the second+ segments to the members of the previous segment's type.
    if (context.property === 'element' && ast.isMemberCall(context.container)) {
      const memberCall = context.container
      const previous = memberCall.previous
      if (!previous) {
        return super.getScope(context)
      }

      // This is language-specific (type inference), shown as a placeholder:
      // const previousType = inferType(previous)
      // if (isClassType(previousType)) return this.createScopeForNodes(previousType.literal.members)

      return EMPTY_SCOPE
    }

    // Example: Import-based scoping for a specific reference property
    if (context.property === 'symbol' && ast.isImportRef(context.container)) {
      return this.getExportedSymbolsFromImports(context)
    }

    return super.getScope(context)
  }

  private getExportedSymbolsFromImports(context: ReferenceInfo): Scope {
    const referenceType = this.reflection.getReferenceType(context)
    const document = AstUtils.getDocument(context.container)
    const root = document.parseResult.value as ast.Program

    const uris = new Set<string>()
    for (const importStmt of root.imports ?? []) {
      const targetUri = this.resolveImportUri(importStmt.path, document)
      if (targetUri) {
        uris.add(targetUri)
      }
    }

    if (uris.size === 0) {
      return EMPTY_SCOPE
    }

    const imported = this.indexManager.allElements(referenceType, uris).toArray()
    return this.createScope(imported)
  }

  /**
   * Resolve a relative import path to an absolute document URI (as string).
   * This mirrors the common pattern used in Langium's file-based scoping recipe.
   */
  private resolveImportUri(path: string, document: LangiumDocument): string | undefined {
    if (!path) {
      return undefined
    }
    try {
      const currentUri = document.uri
      const currentDir = dirname(currentUri.path)
      const filePath = join(currentDir, path)
      return currentUri.with({ path: filePath }).toString()
    } catch {
      return undefined
    }
  }
}
```

### Visibility & Access Control Pattern

**Pattern:** Folder-Based Visibility (Internal vs Public).
Symbols are visible only within the same directory, unless marked `public`.

```typescript
import {
  AstNode,
  AstUtils,
  DefaultScopeProvider,
  ReferenceInfo,
  Scope,
} from 'langium'
import { dirname } from 'node:path'
import { MyLangAstNodeDescription } from './my-lang-description-provider.js'

export class MyLangScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    const referenceType = this.reflection.getReferenceType(context)
    const document = AstUtils.getDocument(context.container)
    const precomputed = document.precomputedScopes

    // 1) Filter the global index by visibility rules
    const currentDir = dirname(document.uri.path)
    const visibleGlobals = this.indexManager.allElements(referenceType).filter(desc => {
      const custom = desc as MyLangAstNodeDescription
      const visibility = custom.visibility ?? 'default'
      if (visibility === 'public') {
        return true
      }

      const descDir = dirname(desc.documentUri.path)
      return descDir === currentDir
    })

    // Base scope = filtered globals
    let result: Scope = this.createScope(visibleGlobals)

    // 2) Add local scopes on top (outer-to-inner so closer scopes shadow outer ones)
    const localsChain = []
    let current: AstNode | undefined = context.container
    while (current) {
      const locals = precomputed.get(current)
      if (locals.length > 0) {
        localsChain.push(locals.filter(d => this.reflection.isSubtype(d.type, referenceType)))
      }
      current = current.$container
    }

    for (let i = localsChain.length - 1; i >= 0; i--) {
      result = this.createScope(localsChain[i], result)
    }

    return result
  }
}
```

---

## Common Patterns & Pitfalls

### ✅ DO: Use `createScope` for Chaining

Scopes are hierarchical. To shadow global symbols with local ones, pass the outer scope as the second argument.

```typescript
// Local shadows Imported, Imported shadows Global
return this.createScope(localSymbols, this.createScope(importedSymbols, globalScope))
```

### ❌ DON'T: Resolve References in ScopeComputation

Accessing `.ref` triggers linking. If you do this inside `ScopeComputation` (which runs before linking), you can create cyclic dependencies.

```typescript
// WRONG in ScopeComputation
const type = node.typeRef.ref // ❌ don't do this
```

### ✅ DO: Use `DocumentBuilder.build()` in tests

In unit tests, parsing produces the AST, but it does **not** necessarily run indexing/linking unless you build the documents.

```typescript
// In tests
await services.shared.workspace.DocumentBuilder.build([document])
```
