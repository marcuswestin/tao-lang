# Scoping and Standard Library

Let's add Tao Lang scoping, and a standard library that can be imported.

Take the information supplied here, and create a succinct plan for implementation. Distill the important parts, and only include what is necessary to create a plan for the implementation process.

Don't trust any of the supplied information blindly. It may be out of date, or incorrect.

## Goal

Create the ability for the compiler to resolve references across files and folders.

Let's put the standard library in packages/std-lib/tao, along with std-lib/tao/ui.

In tao/ui/Views.tao,implement Col, Row, and Text.

### Requirements

In addition to what you can infer from below:

- Add validation where any used declaration that is not explicitly imported emits a warning.

### Module Format

A module is a folder of files. Any declarations in a module are available to other files in the module by default.

To make a declaration private to a file:

```tao
file view PrivateView { }
```

To make a declaration available outside the module:

```tao
share view PublicView { }
```

### Syntax:

To import a module:

```tao
use tao/ui // <- makes all shared declarations of tao/ui/* visible and available in this file.
```

A strict stage of the validator will require that any used declaration is explicitly imported.

```tao
use app/ui Col, Text // <- required in a custom validator stage

View Foo {
    Col {
        Text "Hello, World!"
    }
}
```

### Mapping

For now we will hard-code tao to be mapped to `packages/std-lib/tao` in the repo.

To import a relative module:

```tao
use ../path/to/module X, Y
```

### Name collisions

If a name declared and also imported; or if a name is imported from mutliple modules in one file, then the developer can choose to import it with an alias; OR to use a qualified name:

```tao
use ./example Col
use tao/ui Col as Col2, Row
```

```tao
use tao/ui Col
use tao/ui Row

view Col { }

ui.Col {} // <- qualified name necessary bc of file Col declaration
Row {}
```
