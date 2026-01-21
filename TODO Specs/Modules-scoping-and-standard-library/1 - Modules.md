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
  - [ ] Make tests non-todo, and ensure they pass.
- Imports
  - [ ] Add grammar for `use` imports with relative paths only:
  - [ ] Add test harness functions for parsing multiple files.
  - [ ] Write TODO tests for parsing `use` imports with multiple files.
  - [ ] Make tests non-todo, and ensure they pass.
- Resolution
  - [ ] Write TODO tests for resolving `use` imports to the corresponding module files.
  - [ ] Add logic for resolving `use` imports to the corresponding module files.
  - [ ] Make tests non-todo, and ensure they pass.

### TODO: Followups:

- Standard Library
- Scoping
- Module metadata
