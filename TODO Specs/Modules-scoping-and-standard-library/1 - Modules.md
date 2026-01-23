# Tao Lang Declarations, Scoping, and Modules

## Declarations & Scoping Spec

Declarations come in multiple types, e.g `let`, `view`, `app`, and so on:

```tao
// A Cookbook App example

app Cookbook {
  // ...
}

view Recipe { 
  // ...
}

view IngredientList {
  // ...
}
```

Declarations are used by _references_ from code in other places:

```tao
view RecipeList {
  Recipe { } // <- reference to the `Recipe` view declaration
  Recipe { }
  Recipe { }
}
```

When a reference is made, Scoping helps us determine which declaration it refers to in ambiguous cases:

```tao
let name = "Ro's Cookbook"

view MainView {
  Text name // <- This becomes "Ro's Cookbook"
  RecipeList { }
}

view RecipeList {
  let name = "Ro's Recipes"
  let country = "Sweden"

  Text name // <- This becomes "Ro's Recipes"

  Recipe {
    // This `name` declaration "shadows" the previous one.
    // Instead of changing the "Ro's Recipes" name declaration above,
    // or affecting any other blocks that reference `name`,
    // this one creates a *new* one for *this* block and any blocks inside it.
    let name = "Weekend Sourdough Loaf"
    
    // This name references becomes "Weekend Sourdough Loaf".
    // *Not* "Ro's Cookbook" or "Ro's Recipes"
    Text name  // <- "Weekend Sourdough Loaf"

    // Here `country` references the outer declaration.
    Text "(Brought to you from ${country})" // <- "(Brought to you from Sweden)"
  }

  Recipe {
    let name = "Ro's version of Lamb Curry"
    // Here `country` is declared again, and it shadows the previous declaration.
    let country = "India"
    
    Text name // <- "Ro's version of Lamb Curry"; *not* "Ro's Recipes"
    Text "(Brought to you from ${country})" // <- "(Brought to you from India)", *not* Sweden
  }

  Recipe {
    let name = "Cucumber Macka"
    
    Text name // <- "Cucumber Macka"; *not* "Ro's Recipes"
    Text "(Brought to you from ${country})" // <- "(Brought to you from Sweden)" again, because it's in the same scope as the `let country = "Sweden"` declaration rather than `let country = "India"`.
  }

  Recipe {
    Text name // <- "Ro's Cookbook". This is probably not what would be intended, unless you'd want a recipe that's named "Ro's Cookbook".
  }

  Footer {
    Text "That's all of ${name}" // <- "That's all of Ro's Recipes"
    Text "(Made in ${country})" // <- "(Made in Sweden)"
  }
}
```

====================

The scope is either: Top-Level statements of a Tao File, or Block-Level statements inside of a Block: `{ ... }`.

Blocks may also declare Parameters, which are references visible inside that block.

Scoping works the same for all declaration types: A declaration is visible for all _subsequent_ statements inside the same Scope; and to all statements inside blocks that exist within that Scope.

## Scoping Spec

Scoping in Tao is pretty straight forward.

## Modules Spec

Modules allow for compartmentalizing tao files into functional units with explicit declarations of shared functionality.

### Module Visibility

Any declaration in a module file is by default available to all other files in the same folder/module:

```tao
// module-a/file-a.tao
view ModuleView { } // All files in this module can reference this declaration without importing it.
```

```tao
// module-a/file-b.tao
view ModuleView { } // All files in this module can reference this declaration without importing it.
```

### Private Declarations: `file ...` keyword

To make a declaration private to a file:

```tao
file view PrivateView { } // No other files can reference this declaration.
```

### Module Exports: `share ...` syntax

To make a declaration available to files outside the module (via `use ...` syntax):

```tao
share view PublicView { } // Any file can import this declaration by name.
```

### Module Imports: `use ...`

To import a declaration from a module:

```tao
use ./ui/views PublicView, ExampleView2 // <- makes `PublicView` and `ExampleView2` declarations in files from `./ui/views` directory visible and available to this file. They must both be declared and marked with `share`.
```

## Implementation Guide:

### Part 1

Goal: Implement the basic parsing and resolution of `file`, `share`, and `use` declarations and imports.

- Declarations
  - [x] Write TODO tests for parsing `file`, `share` declarations.
  - [x] Add grammar for `file`, `share` declarations.
  - [x] Make tests non-todo, and ensure they pass.
- Imports
  - [x] Add grammar for `use` imports with relative paths only:
  - [x] Add test harness functions for parsing multiple files.
  - [x] Write TODO tests for parsing `use` imports with multiple files.
  - [x] Make tests non-todo, and ensure they pass.
- Resolution
  - [x] Write TODO tests for resolving `use` imports to the corresponding module files.
  - [x] Add TaoScopeComputation to export `share` declarations.
  - [x] Add TaoScopeProvider for resolving `use` imports.
  - [x] Make tests non-todo, and ensure they pass (11 pass, 3 todo for UseStatement validation).
- Scoped declarations
  - [ ] Use eslint to make switch statements exhaustive in `just lint`
  - [ ] Duplicate declarations in a module should give an error.
  - [ ] Fix ALL doc comments to be in the correct format
    - [ ] Add AGENTS.md or cursor rule for how to write doc comments
    - [ ] Make commends optional for private and internal functions
  - [ ] Add "let" definitions
  - [ ] REALLY review UseStatementValidator.ts
    - [ ] Make "file" visibility into "hide".
  - [ ] Fix shared module tsconfigs so that all can import each other
  - [ ] Combine, or restructure, validators. (UseStatement and TaoLangValidator)
  - [ ] Require shared declarations to be explained in some way (e.g text describing its functionality, intended use, and expected behavior)
  - [ ] Examine whitespace newline sensitivity necessary or not. `view TestView { Col \n Row }` should be valid, without `view TestView { Col { } Row }`
    - OR, do we require rendering block for now? `view TestView { Col { } Row { } }`
    - OR, do we require a comma? `view TestView { Col, Row }`, and
      ```tao
      view TestView {
        Col,
        Row {
          Text "Hello, World!"
        },
      }
      ```
  - [ ] Add view arguments
  - [ ] BIIIIG lift: make grammar more permissive, and do more checking in validation. E.g:
    ```tao
    view TestView { share let name = "Ro" }
    ```
    should give an error message saying "share" can only be done at the top level, rather than a less clear parsing error message.

### TODO: Followups:

- Cleanups:
  - [x] "This activation event can be removed as VS Code generates these automatically from your package.json contribution declarations."
    - This is for "activationEvents": ["onLanguage:tao"]
  - [ ] TaoScopeProvider has a lot of super-specific logic that should be generalized for references.
    - [ ] Add Let declarations.
  - [x] Remove these:
    ```
    TODO: Use shared for .. what? imports?
    TODO: Which function to use
    TODO: ADD Standard Library and Document Imports
    ```
  - [ ] Newline whitespace sensitivity?:
    ```tao
    view MainView {
        Button
        TextInput
    }
    ```
- [ ] Fix `test.todo('error when importing non-existent declaration'`
- [ ] Standard Library: Add a standard library of declarations that are importable to all modules.
- [ ] Scoping
- [ ] Module metadata: Add a way to add metadata to a module.
