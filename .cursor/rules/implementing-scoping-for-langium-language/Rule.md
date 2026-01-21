# Langium Scoping: The Definitive Guide

This guide covers implementing scoping in Langium—the mechanism that determines which symbols are visible at any point in your language.

## Core Mental Model

Scoping in Langium is a **two-phase system**:

| Phase             | Class              | Question Answered                     | When It Runs                                   |
| ----------------- | ------------------ | ------------------------------------- | ---------------------------------------------- |
| **1. Export**     | `ScopeComputation` | "What symbols does this file expose?" | After parsing, during **Indexing**.            |
| **2. Resolution** | `ScopeProvider`    | "What symbols are visible here?"      | During **Linking**, when resolving references. |

> **Critical Rule:** You cannot resolve references before indexing completes. **Never** access `.ref` properties inside `ScopeComputation`. This causes circular dependencies and deadlocks.

---

## Architecture Overview

Scope-related classes are registered in your language module (`my-lang-module.ts`).

```typescript
// my-lang-module.ts
import { Module } from 'langium'

export const MyLangModule: Module<MyLangServices, PartialLangiumServices> = {
  workspace: {
    // Responsible for creating the Global Scope Index
    ScopeComputation: (services) => new MyLangScopeComputation(services),

    // Responsible for storing metadata (visibility, types) in the Index
    AstNodeDescriptionProvider: (services) => new MyLangDescriptionProvider(services),

    // Responsible for loading initial files (stdlib)
    WorkspaceManager: (services) => new MyLangWorkspaceManager(services),
  },
  references: {
    // Responsible for calculating the scope for a specific reference
    ScopeProvider: (services) => new MyLangScopeProvider(services),
  },
}
```

---

## Quick Reference

| Task                               | Class                        | Method                      |
| ---------------------------------- | ---------------------------- | --------------------------- |
| **Export symbols to other files**  | `ScopeComputation`           | `computeExports()`          |
| **Define local variable scopes**   | `ScopeComputation`           | `computeLocalScopes()`      |
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
  DefaultScopeComputation,
  Interruptable,
  LangiumDocument,
  MultiMap,
  PrecomputedScopes,
} from 'langium'
import { CancellationToken } from 'vscode-languageserver'
import * as ast from './generated/ast.js'

export class MyLangScopeComputation extends DefaultScopeComputation {
  /**
   * computeExports: Symbols visible to OTHER files (cross-file references).
   * These enter the global IndexManager.
   */
  override async computeExports(
    document: LangiumDocument,
    cancelToken?: CancellationToken,
  ): Promise<AstNodeDescription[]> {
    const exports: AstNodeDescription[] = []
    const root = document.parseResult.value
    if (!root) {
      return exports
    }

    for (const node of AstUtils.streamAllContents(root)) {
      await Interruptable.check(cancelToken)

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
   * computeLocalScopes: Symbols visible WITHIN this file (block scoping).
   * These are stored in the document, not the global index.
   */
  override async computeLocalScopes(
    document: LangiumDocument,
    cancelToken?: CancellationToken,
  ): Promise<PrecomputedScopes> {
    const scopes = new MultiMap<AstNode, AstNodeDescription>()
    const root = document.parseResult.value
    if (!root) {
      return scopes
    }

    for (const node of AstUtils.streamAllContents(root)) {
      await Interruptable.check(cancelToken)

      // 1. Function parameters are visible inside the function body
      if (ast.isFunctionDecl(node)) {
        for (const param of node.parameters) {
          if (param.name) {
            // We add the parameter to the scope of the *Function Node*
            // This makes it visible to all children of the function
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

To filter symbols efficiently (e.g., checking "visibility" without parsing the file), store metadata in the `AstNodeDescription`.

```typescript
import { AstNode, AstNodeDescription, DefaultAstNodeDescriptionProvider, LangiumDocument } from 'langium'
import * as ast from './generated/ast.js'

// 1. Define the custom interface
export interface MyLangAstNodeDescription extends AstNodeDescription {
  visibility?: string
}

export class MyLangDescriptionProvider extends DefaultAstNodeDescriptionProvider {
  // 2. Override createDescription to populate the metadata
  override createDescription(node: AstNode, name: string, document: LangiumDocument): AstNodeDescription {
    // Create the standard description
    const desc = super.createDescription(node, name, document) as MyLangAstNodeDescription

    // Add custom properties
    if (ast.isFunctionDecl(node)) {
      desc.visibility = node.visibility ?? 'default'
    }

    return desc
  }
}
```

---

## Phase 2: Resolving References (ScopeProvider)

The **Scope Chain** is consulted during linking. Resolution walks:
`Local Scope` → `File Scope` → `Global Scope`.

### Basic Pattern & Imports

```typescript
import {
  AstNodeDescription,
  AstUtils,
  DefaultScopeProvider,
  MapScope,
  ReferenceInfo,
  Scope,
  UriUtils, // Added missing import
} from 'langium'
import * as ast from './generated/ast.js'
// Fixed import path to match the class implementation
import { MyLangAstNodeDescription } from './my-lang-scope-computation.js'

export class MyLangScopeProvider extends DefaultScopeProvider {
  override getScope(context: ReferenceInfo): Scope {
    // 1. Custom handling for specific properties (e.g., Types)
    if (context.property === 'type' && ast.isParameter(context.container)) {
      // return this.getTypeScope(context); // Implement custom logic
    }

    // 2. Handle Member Access (e.g., myModule.myFunction)
    if (ast.isMemberAccess(context.container) && context.property === 'member') {
      const receiver = context.container.receiver
      // Note: We access .ref here because we are in the Linking phase!
      if (ast.isReference(receiver) && receiver.ref) {
        // Return a scope containing only elements strictly inside that receiver
        // Note: You must implement createScopeForNode or similar custom logic
        return this.createScopeForNode(receiver.ref)
      }
    }

    return super.getScope(context)
  }

  /**
   * Override Global Scope to handle Imports.
   * By default, Langium makes EVERYTHING in the index visible.
   * We want to restrict it to imports.
   */
  protected override getGlobalScope(referenceType: string, context: ReferenceInfo): Scope {
    const document = AstUtils.getDocument(context.container)
    const root = document.parseResult.value as ast.Program

    // If no imports, use default global scope (everything) OR just built-ins
    if (!root.imports || root.imports.length === 0) {
      return super.getGlobalScope(referenceType, context)
    }

    const importedSymbols: AstNodeDescription[] = []

    for (const importStmt of root.imports) {
      // Resolve the path to a URI
      const targetUri = this.resolveImportUri(importStmt.path, document)
      if (!targetUri) {
        continue
      }

      // Filter the IndexManager for symbols from that specific file
      const exported = this.indexManager
        .allElements(referenceType)
        .filter(d => d.documentUri.toString() === targetUri.toString())

      importedSymbols.push(...exported)
    }

    // Create a scope chain:
    // Imported Symbols -> Empty (stops looking globally) or StdLib
    // Using super.getGlobalScope here would defeat the purpose of "restricting" imports
    return this.createScope(importedSymbols, Scope.EMPTY)
  }

  /** * Helper to resolve string paths to URIs
   */
  private resolveImportUri(path: string, document: LangiumDocument): string | undefined {
    if (!path) {
      return undefined
    }
    try {
      return UriUtils.resolvePath(document.uri, path).toString()
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
protected override getGlobalScope(referenceType: string, context: ReferenceInfo): Scope {
    const document = AstUtils.getDocument(context.container);
    // Get the folder of the current file
    const currentDir = document.uri.path.substring(0, document.uri.path.lastIndexOf('/'));

    const visible = this.indexManager.allElements(referenceType).filter(desc => {
        // Cast to our custom description to read the metadata
        const customDesc = desc as MyLangAstNodeDescription;
        const visibility = customDesc.visibility ?? 'default';

        if (visibility === 'public') return true;
        
        // If private/default, allow only if in same directory
        const descDir = desc.documentUri.path.substring(0, desc.documentUri.path.lastIndexOf('/'));
        return descDir.startsWith(currentDir);
    });

    return this.createScope(visible);
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

Accessing `.ref` triggers the `ScopeProvider`. If you do this inside `ScopeComputation` (which runs before the scope is ready), you crash the linker.

```typescript
// WRONG in ScopeComputation
const type = node.typeRef.ref // CRASH
```

### ✅ DO: Use `DocumentBuilder.build()` in tests

In unit tests, parsing produces the AST, but it does **not** run scope computation automatically unless you use the builder or the `parseHelper` with validation enabled.

```typescript
// In tests
await services.shared.workspace.DocumentBuilder.build([document])
```
