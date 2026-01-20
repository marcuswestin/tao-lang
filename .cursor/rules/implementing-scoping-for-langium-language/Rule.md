---
description: Use these instructions when implementing scoping and modules in Langium.
alwaysApply: false
------------------

# Langium Scoping & Modules: The Expert’s Handbook

This guide is for engineers building production-grade module systems in langium. It bypasses the defaults to focus on **Folder-Based Scoping**, **Strict Visibility**, **StdLib Mapping**, and **Import Validation**.

When making changes, always write tests in `4-test-module-imports-exports.test.ts` to demonstrate the intended behavior.

Use `bun test packages/compiler/scoping-tests` to run scoping tests.

## 1. The Mental Model

Scoping in Langium is a conversation between the **Index** (Export) and the **Provider** (Resolution).

- **The Indexer (`ScopeComputation`):** Runs on parse. Decides what symbols enter the Index.

  - _Tao Rule:_ `file` is private (do not index). `share` is public. Default is folder-protected.

- **Lifecycle:** Parsed → indexed → linked → validated. You cannot resolve references before the document is indexed.

- **The Metadata:** Never parse a file inside `ScopeProvider`, it is too slow. To avoid re-parsing files during resolution and to filter exports without parsing files, we must store `visibility` in the `AstNodeDescription` (`share`, `file` and `default`).

- **The Resolver (`ScopeProvider`):** `ScopeProvider.getScope(context)` is where you implement “what names exist here?” logic.When resolving a reference langium calls `ScopeProvider.getScope(context, reference)`. You return a `Scope` which chains scopes containing visible symbols:

  - **Local** (Variables) → **Siblings** (Same folder) → **Imports** (Explicit) → **Global**.

  - _Shadowing:_ Siblings shadow Imports. This forces the user to use Qualified Names (e.g., `ui.Col`) if local collision exists.

- ** The Standard Library:** lives in `packages/std-lib`. We must load all stdlib `.tao` files automatically.

## 2. Code Patterns

### Workspace Manager

E.g **`src/language/tao-module.ts`**:

```typescript
export const TaoModule: Module<X> = {
  // ...
  references: {
    ScopeComputation: (services) => new TaoScopeComputation(services),
    ScopeProvider: (services) => new TaoScopeProvider(services),
  },
  workspace: {
    WorkspaceManager: (services) => new TaoWorkspaceManager(services),
    AstNodeDescriptionProvider: (services) => new TaoDescriptionProvider(services), // to store visibility metadata
  },
  validation: {
    TaoValidator: (services) => new TaoValidator(services),
  },
  // ...
}
```

### Indexer

E.g **`src/language/tao-index.ts`**:

```typescript
export class TaoDescriptionProvider extends DefaultAstNodeDescriptionProvider {
  override createDescription(node: AstNode, name: string, document: LangiumDocument): AstNodeDescription {
    const desc = super.createDescription(node, name, document)

    // Capture visibility in the lightweight description
    if (ast.isView(node)) {
      desc.metadata = {
        visibility: node.visibility,
      }
    }
    return desc
  }
}
```

### Scope Computation

E.g **`src/language/tao-scope-computation.ts`**:

```typescript
import { AstNodeDescription, DefaultScopeComputation, LangiumDocument } from 'langium'
import * as ast from './generated/ast'

export class TaoScopeComputation extends DefaultScopeComputation {
  override async computeExports(document: LangiumDocument): Promise<AstNodeDescription[]> {
    const exports: AstNodeDescription[] = []

    // For each root level declaration:
    //  - If it is marked file, skip it
    //  - If it is marked share, add it to the exports as shared
    //  - If it is marked default, add it to the exports as module-local

    return exports
  }
}
```

### Scope Provision: The Layered Logic

We override `getGlobalScope` (not `getScope`) to ensure Local Scope takes precedence over Global Scope.

E.g **`src/language/tao-scope-provider.ts`**:

```typescript
import { AstNodeDescription, DefaultScopeProvider, MapScope, ReferenceInfo, Scope, UriUtils } from 'langium'
import { URI, Utils } from 'vscode-uri'

export class TaoScopeProvider extends DefaultScopeProvider {
  // Override Global Scope to implement Modules.
  // Chain: Siblings (Inner) -> Imports (Outer) -> Pre-existing Globals
  protected override getGlobalScope(referenceType: string, context: ReferenceInfo): Scope {
    const siblings: AstNodeDescription[] = []
    const imports: AstNodeDescription[] = []

    // 1. Process Siblings
    // 2. Process Imports
    //    - Calculate implicit alias for Qualification (e.g. "tao/ui" -> "ui")
    //    - Add Unqualified and Qualified names to scope (`Col` + `ui.Col`)
    //    - Add wildcard imports to scope (`use tao/ui`)

    // 3. Create Chain: Siblings (Inner) -> Imports (Outer)
    // Siblings shadow Imports.
    return this.createScope(siblings, this.createScope(imports, super.getGlobalScope(referenceType, context)))
  }

  // PATH MAPPING
  public resolveImportUri(path: string, baseDir: URI): URI | undefined {
    if (path.startsWith('tao/')) {
      // Map "tao/ui" -> "packages/std-lib/tao/ui"
    }
  }
}
```

### Standard Library Loading

Load the `.tao` files in `packages/std-lib` automatically.

**`src/language/tao-workspace-manager.ts`**

```typescript
import { DefaultWorkspaceManager, LangiumDocument } from 'langium'
import { WorkspaceFolder } from 'vscode-languageserver'

export class TaoWorkspaceManager extends DefaultWorkspaceManager {
  override async loadAdditionalDocuments(
    folders: WorkspaceFolder[],
    collector: (document: LangiumDocument) => void,
  ): Promise<void> {
    await super.loadAdditionalDocuments(folders, collector)
    // Load StdLib ...
      // await this.loadDocumentsInFolder(...)
  }
}
```
---

## 5. The Expert’s Edge: Validation & Errors

### A. The "Explicit Import" Warning

We allow Wildcards in the scope for flexibility (and Qualified Names), but enforce strictness via the Validator.

**`src/language/tao-validator.ts`**

```typescript
export class TaoValidator {
  checkExplicitImports(ref: Reference, accept: ValidationAcceptor): void {
    // PSEUDO CODE:

    // If not resolved, ignore (linking error handles this)

    // If same module, ignore (sibling/local)

    // Ignore if qualified access (e.g. ui.Col) - that is explicit enough

    // Check if the name appears in an explicit import list

    if (!nameAppearsInExplicitImportList) {
      accept('warning', `Symbol '${ref.$refText}' is used via wildcard. Import explicitly for clarity.`, { node: ref })
    }
  }
}
```

---

## 6. Testing Strategy

**`test/scoping.test.ts`**

```typescript
import { expectScope } from 'langium/test'

test('Sibling visibility is implicit', async () => {
  await expectScope(services)({
    source: `share view Neighbor {}`,
    reference: `view App { Neighbor }`, // Should resolve
  })
})

test('Private "file" views are invisible to siblings', async () => {
  await expectScope(services)({
    source: `file view Secret {}`,
    reference: `view App { Secret }`,
  }, (scope) => {
    expect(scope.getElement('Secret')).toBeUndefined()
  })
})
```

---

# Example Implementation Plan

These are a rough outline of the types of steps that would be included in an implementation.

### 1. Grammar (`tao.lang`)

- [ ] Add `Visibility` rule (`share` | `file`).
- [ ] Add `Import` rule (`use path elements`).
- [ ] Update `Declaration` to use `Visibility`.
- [ ] Add `QualifiedName` rule (`ID ('.' ID)*`) to `Reference`.

### 2. Architecture (`tao-module.ts`)

- [ ] Register `TaoScopeComputation`, `TaoScopeProvider`, `TaoWorkspaceManager`, `TaoDescriptionProvider`.

### 3. Indexing (`tao-index.ts`, `tao-scope-computation.ts`)

- [ ] **Computation:** If `visibility == 'file'`, skip indexing.
- [ ] **Index:** Store `{ visibility: node.visibility }` in `desc.metadata`.

### 4. Resolution (`tao-scope-provider.ts`)

- [ ] **Override:** `getGlobalScope`.
- [ ] **Siblings:** Filter Index by `dir(doc) == dir(target)`.
- [ ] **Imports:**
- Map `tao/` -> `packages/std-lib/tao/`.
- Filter Index by `dir(target)` AND `visibility == 'share'`.
- Add Qualified Names (`ui.Col`) to scope automatically based on path suffix.

- [ ] **Chain:** Return `createScope(Siblings, createScope(Imports, super...))`.

### 5. Workspace (`tao-workspace-manager.ts`)

- [ ] **Load:** Scan `packages/std-lib` and load documents on startup.

### 6. Validation (`tao-validator.ts`)

- [ ] **Check:** If reference resolved via Wildcard Import (not in named list) and is unqualified, emit `warning`.
