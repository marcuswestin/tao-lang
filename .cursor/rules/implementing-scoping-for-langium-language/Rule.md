# Langium Scoping: The Definitive Guide

This guide covers implementing scoping in Langium—the mechanism that determines which symbols are visible at any point in your language.

> **Version note:** This guide targets **Langium v4.x** (API: `collectExportedSymbols` / `collectLocalSymbols`). This project uses Langium 4.1+.

> **In this project (Tao Lang):** Scoping is implemented under `packages/compiler/compiler-src/langium/` (`TaoScopeComputation`, `TaoScopeProvider`) and `packages/compiler/compiler-src/resolution/` (`ModuleResolution`). `TaoWorkspaceManager` loads the workspace (including stdlib); there is no custom `AstNodeDescriptionProvider`.

## Core Mental Model

Scoping in Langium is a **two-phase system**:

| Phase             | Class              | Question Answered                     | When It Runs                                   |
| ----------------- | ------------------ | ------------------------------------- | ---------------------------------------------- |
| **1. Export**     | `ScopeComputation` | "What symbols does this file expose?" | After parsing, during **Indexing**.            |
| **2. Resolution** | `ScopeProvider`    | "What symbols are visible here?"      | During **Linking**, when resolving references. |

> **Critical Rule:** You cannot resolve references before indexing completes. **Never** access `.ref` properties inside `ScopeComputation`. This triggers linking too early and can lead to cyclic dependencies. Build order: Indexing (exported symbols) → ComputedScopes (local symbols) → Linking (ScopeProvider).

---

## Architecture Overview

Scope-related classes are registered in your language module. Tao uses a split: **shared** module (workspace) and **language** module (references, LSP).

```typescript
// Shared module: workspace (e.g. load stdlib)
const sharedModule = inject(createDefaultSharedModule(context), {
  workspace: {
    WorkspaceManager: (services) => new MyLangWorkspaceManager(services, config.stdLibRoot),
  },
})

// Language module: references and LSP
const LangModule = inject(createDefaultModule({ shared: sharedModule }), {
  references: {
    ScopeComputation: (services) => new MyLangScopeComputation(services),
    ScopeProvider: (services) => new MyLangScopeProvider(services, config.stdLibRoot),
  },
})
```

Optional: override `AstNodeDescriptionProvider` in workspace to store metadata (e.g. visibility) on descriptions. Tao does not; it checks visibility on the AST node in `ScopeProvider` instead.

---

## Quick Reference

| Task                               | Class                        | Method                              |
| ---------------------------------- | ---------------------------- | ----------------------------------- |
| **Export symbols to other files**  | `ScopeComputation`           | `collectExportedSymbols()`          |
| **Define local variable scopes**   | `ScopeComputation`           | `collectLocalSymbols()`             |
| **Resolve a reference**            | `ScopeProvider`              | `getScope()`                        |
| **Store metadata on symbols**      | `AstNodeDescriptionProvider` | `createDescription()` (optional)    |
| **Load additional files (stdlib)** | `WorkspaceManager`           | `loadAdditionalDocuments()`         |
| **Read precomputed local scopes**  | —                            | `document.localSymbols` (Langium 4) |

---

## Phase 1: Exporting Symbols (ScopeComputation)

This phase populates the Global Index and defines local block scoping.

### Basic Pattern

```typescript
import { AST } from '@parser'
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
      if (AST.isFunctionDecl(node) && node.name) {
        if (node.visibility !== 'private') {
          exports.push(this.descriptions.createDescription(node, node.name, document))
        }
      }

      // Example: Export all Types
      if (AST.isTypeDecl(node) && node.name) {
        exports.push(this.descriptions.createDescription(node, node.name, document))
      }
    }
    return exports
  }

  /**
   * collectLocalSymbols: Symbols visible WITHIN this file (block scoping).
   * Stored on the document as localSymbols (precomputed scopes), not in the global index.
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
      if (AST.isFunctionDecl(node)) {
        for (const param of node.parameters) {
          if (param.name) {
            // Add parameters to the scope of the function node,
            // making them visible to children of the function.
            scopes.add(node, this.descriptions.createDescription(param, param.name, document))
          }
        }
      }

      // 2. Let bindings are visible in their containing block
      if (AST.isLetStatement(node) && node.name) {
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
import { AST } from '@parser'
import {
  AstNode,
  AstNodeDescription,
  DefaultAstNodeDescriptionProvider,
  LangiumDocument,
} from 'langium'

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

    if (AST.isFunctionDecl(node)) {
      desc.visibility = node.visibility ?? 'default'
    }

    return desc
  }
}
```

---

## Phase 2: Resolving References (ScopeProvider)

The **Scope Chain** is consulted during linking. Resolution walks from the current location upward through the document’s precomputed local scopes (`document.localSymbols`) and then the global index.

### Basic Pattern & Imports

```typescript
import { AST } from '@parser'
import {
  AstUtils,
  DefaultScopeProvider,
  EMPTY_SCOPE,
  LangiumDocument,
  ReferenceInfo,
  Scope,
} from 'langium'
import { dirname, join } from 'node:path'

export class MyLangScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    // Example: Custom handling for a "member call" / dot navigation:
    // Restrict the second+ segments to the members of the previous segment's type.
    if (context.property === 'element' && AST.isMemberCall(context.container)) {
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
    if (context.property === 'symbol' && AST.isImportRef(context.container)) {
      return this.getExportedSymbolsFromImports(context)
    }

    return super.getScope(context)
  }

  private getExportedSymbolsFromImports(context: ReferenceInfo): Scope {
    const referenceType = this.reflection.getReferenceType(context)
    const document = AstUtils.getDocument(context.container)
    const root = document.parseResult.value as AST.Program

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

### Tao Lang: use-statement and module scoping

Tao resolves `use ModulePath Name1, Name2` and same-module references. See `TaoScopeProvider` in `packages/compiler/compiler-src/langium/` and `ModuleResolution` in `packages/compiler/compiler-src/resolution/`:

- **Same-module:** `isSameModuleImport()` + `getSameModuleUris()` — symbols from other files in the same directory.
- **Cross-module:** `resolveModulePathToUris()` for relative or stdlib paths; only `share`-visible declarations are exposed (see `isImportAccessible`).
- **Local scope:** `getLocalScope()` walks `context.container` upward and collects from `document.localSymbols` (views, aliases, parameters, etc.).

Scope chain for view/ui/reference resolution: local scope first, then imported symbols from `use` statements.

### Visibility & Access Control Pattern

**Pattern:** Folder-Based Visibility (Internal vs Public).
Symbols are visible only within the same directory, unless marked `public`.

```typescript
import {
  AstNode,
  AstNodeDescription,
  AstUtils,
  DefaultScopeProvider,
  ReferenceInfo,
  Scope,
} from 'langium'
import { dirname } from 'node:path'
import { MyLangAstNodeDescription } from './my-lang-description-provider'

export class MyLangScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    const referenceType = this.reflection.getReferenceType(context)
    const document = AstUtils.getDocument(context.container)
    const localSymbols = document.localSymbols // Langium 4: precomputed scopes MultiMap

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
    const localsChain: AstNodeDescription[][] = []
    let current: AstNode | undefined = context.container
    while (current) {
      if (localSymbols.has(current)) {
        const locals = Array.from(localSymbols.getStream(current))
          .filter(d => this.reflection.isSubtype(d.type, referenceType))
        if (locals.length > 0) {
          localsChain.push(locals)
        }
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

### ✅ DO: Build documents in tests so scoping/linking run

Parsing alone does **not** run indexing or linking. Build documents so `ScopeComputation` and `ScopeProvider` run.

```typescript
// With raw Langium services
await services.shared.workspace.DocumentBuilder.build([document])

// In Tao: use TaoWorkspace
await workspace.buildDocument(doc, { validation: true, eagerLinking: true })
```
