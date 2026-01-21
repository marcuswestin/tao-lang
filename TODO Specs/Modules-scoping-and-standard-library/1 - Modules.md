# Tao Lang Modules

A module is a folder with tao files.

## Specs

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

### TODO: Followups:

- Cleanups:
  - [x] "This activation event can be removed as VS Code generates these automatically from your package.json contribution declarations."
    - This is for "activationEvents": ["onLanguage:tao"]
  - [ ] TaoScopeProvider has a lot of super-specific logic that should be generalized for references.
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
