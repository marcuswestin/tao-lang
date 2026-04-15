---
name: ts-class-constructor-properties
description: When editing TypeScript class constructors or its properties, *always* prefer TypeScript parameter properties over manual this.x = x assignments.
---

# TypeScript Parameter Properties

## Preferred

```typescript
class TaoScopeProvider extends DefaultScopeProvider {
  constructor(
    services: LangiumServices,
    private readonly documents: LangiumDocuments,
    private readonly stdLibRoot?: string,
  ) {
    super(services)
  }
}
```

## Avoid

```typescript
class TaoScopeProvider extends DefaultScopeProvider {
  private readonly documents: LangiumDocuments
  private readonly stdLibRoot?: string

  constructor(
    services: LangiumServices,
    documents: LangiumDocuments,
    stdLibRoot?: string,
  ) {
    super(services)
    this.documents = documents
    this.stdLibRoot = stdLibRoot
  }
}
```

## When this doesn't apply

- Properties derived or computed from constructor arguments (not a direct assignment)
- Properties that need assignment after `super()` returns a modified value
- Error subclasses where `this.name` must be set to a string literal
