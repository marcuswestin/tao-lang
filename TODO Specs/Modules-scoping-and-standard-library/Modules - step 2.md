A strict stage of the validator will require that any used declaration is explicitly imported.

```tao
use app/ui Col, Text // <- required in a custom validator stage

View Foo {
    Col {
        Text "Hello, World!"
    }
}
```

Let's put the standard library in packages/std-lib/tao, along with std-lib/tao/ui.

In tao/ui/Views.tao,implement Col, Row, and Text.

, and a standard library that can be imported by any file.

Alias: `use ./foo Col, Row as Row2`

Standard library

Any imports: `use tao/ui *`

### Mapping

For now we will hard-code tao to be mapped to `packages/std-lib/tao` in the repo.

To import a relative module:

```tao
use ../path/to/module X, Y
```

### Name collisions

If a name is declared and also imported, or if a name is imported in one file from mutliple different modules, then the developer can choose to import it with an alias; OR to use a qualified name:

```tao
use ./example-ui Col, Row
use ./example-ui-2 Col as Col2
use tao/ui Col, Row, Box
use ./example/ui as exampleUi
```

```tao
use tao/ui Col
use tao/ui Row

view Col {
    example.Col {} // <- qualified name necessary bc of Col declaration in the importing tao file.

    ui.Col {} // <- ditto

    exampleUi.Col {} // <- qualified module name necessary bc of tao/ui import

    Row {} // <- no qualified name necessary

}
```
