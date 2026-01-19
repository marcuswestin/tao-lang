# Scoping and Standard Library

Let's implement Tao Lang modules.

Take the information supplied here, and create a succinct plan for implementation. Distill the important parts, and only include what is necessary to create a plan for the implementation process.

Don't trust any of the supplied information blindly. It may be out of date, or incorrect.

Thorougly ask clarifying questions before proceeding with the implementation; and then again if you run into any ambiguities or questions along the way.

Use `implementing-scoping-for-langium-language` cursor rule for guidance.

## Goal

Implement module exports and imports, such that a file can share its declarations to other files and other files can import and reference declarations from other files.

### Module Format

A module is any of folder of tao files.

Any declaration in a module file is by default available to all other files in the same folder/module:

```tao
view ModuleView { } // All files in the same folder can reference this declaration without importing it.
```

To make a declaration private to a file:

```tao
file view PrivateView { } // No other files can reference this declaration.
```

To make a declaration available to files outside the module via `use ...`:

```tao
share view PublicView { } // Any file can import this declaration by name.
```

To import a declaration from a module:

```tao
use ./ui/views PublicView, ExampleView2 // <- makes `PublicView` and `ExampleView2` declarations in files from `./ui/views` directory visible and available to this file. They must both be declared and marked with `share`.
```

### Steps:

First create a feature branch for the implementation.

Then start by writing tests in `4-test-module-imports-exports.test.ts` to demonstrate the intended behavior.

Then implement the functionality, check tests, and repeat.
