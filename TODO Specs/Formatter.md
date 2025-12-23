# Formatter

Let's add a very basic formatter.

Take the information supplied here, and create a succinct plan for implementing the formatter. Distill the important parts, and only include what is necessary to create a plan for the implementation process.

Don't trust any of the supplied information blindly. It may be out of date, or incorrect.

## Goal

Add a formatter

- It should be possible to parse code and have it re-printed in one canoical way, regardless of original whitespace.
- Comments must be preserved. See [Formatter Comments](Formatter Comments.md) for more information.
- The body of inject `ts <BODY>` statements is left unformatted for now, and just re-printed as is.

### Process

Currently there's a stub TaoFormatter.ts, and a formatter test that's failing (as it should be right now).

Register the formatter in tao-services.ts, then out the formatter, based on langium best practices, until the test passes.

## Langium Reference information

Here is an overview of how formatting works:

### General implementation information

#### Example 1

```
Here are Langium formatter examples and concrete code you can use as references — with formatting implemented (or showing how to implement one yourself).

1) Official Langium formatter API Example (Domain Model)

Langium has a built-in formatting API you can extend by subclassing AbstractFormatter, and the official docs include a formatted Domain Model example you can adapt. 
Langium

Here is a real code sample adapted from the DomainModelFormatter recipe:

import { AstNode } from 'langium';
import { AbstractFormatter, Formatting } from 'langium/lsp';
import * as ast from './generated/ast.js';

export class DomainModelFormatter extends AbstractFormatter {

    protected format(node: AstNode): void {

        // Format model root if needed
        if (ast.isDomainmodel(node)) {
            const formatter = this.getNodeFormatter(node);
            // de-indent top-level children
            formatter.nodes(...node.elements).prepend(Formatting.noIndent());
        }

        // Format entities and package declarations
        if (ast.isEntity(node) || ast.isPackageDeclaration(node)) {
            const formatter = this.getNodeFormatter(node);

            // Indent interior of braces
            const open = formatter.keyword('{');
            const close = formatter.keyword('}');
            formatter.interior(open, close).prepend(Formatting.indent());

            // Move newline onto closing brace
            close.prepend(Formatting.newLine());

            // Surround property names with spaces
            formatter.property('name').surround(Formatting.oneSpace());
        }
    }
}


How it works:

AbstractFormatter.format(node) is called for every AST node in a file.

Use getNodeFormatter(node) to format specific regions:

keyword('{'), keyword('}')

property('name')

nodes(...list)

Use methods from Formatting, e.g.,:

Formatting.indent() – indent interior blocks

Formatting.newLine() – add newline

Formatting.noIndent() – remove indent

Formatting.oneSpace() – add a space

Bind the formatter via dependency injection in your language’s module.ts. 
Langium

2) Community Formatter Implementation (Entities DSL)

There’s a formatter implementation for a custom Entities DSL showing real formatter logic with rules for entity definitions, braces, and attribute formatting (extended from the official formatting API). 
GitHub

export class EntitiesFormatter extends AbstractFormatter {

    protected format(node: AstNode): void {

        if (ast.isModel(node)) {
            const lastEntity = node.entities[node.entities.length - 1];
            node.entities.forEach(entity => {
                const fmt = this.getNodeFormatter(entity);
                const n = fmt.node(entity);
                if (entity === lastEntity) {
                    n.append(Formatting.newLine());
                } else {
                    n.append(Formatting.newLines(2));
                }
            });
        } else if (ast.isEntity(node)) {
            const fmt = this.getNodeFormatter(node);

            // Put a space around keyword and type
            fmt.keyword('extends').surround(Formatting.oneSpace());

            // Format braces interior
            const open = fmt.keyword('{');
            const close = fmt.keyword('}');
            open.append(Formatting.newLine());
            fmt.interior(open, close).prepend(Formatting.indent());

            // Format attributes
            node.attributes.forEach(attr => {
                const attrFmt = this.getNodeFormatter(attr.type);
                attrFmt.keyword(';').surround(Formatting.noSpace());
                attrFmt.node(attr).append(Formatting.newLine());
            });
        }
    }
}


This example shows how to:

Tailor formatting for specific AST node types

Inject spaces around keywords (extends)

Indent contents inside { … }

Append/modify whitespace after elements

Format child nodes specifically

This gives you an actual formatter logic pattern you can adapt for your own grammar. 
GitHub

3) How to Bind Your Formatter in a Langium Language

Once you’ve implemented your formatter class (e.g., DomainModelFormatter or EntitiesFormatter), you bind it into your Langium language services via the module:

import { Module } from 'langium';
import { YourLanguageServices, YourAddedServices } from './your-language-module.js';
import { CustomFormatter } from './your-formatter.js';

export const YourCustomModule: Module<YourLanguageServices, Partial<YourAddedServices>> = {
  lsp: {
    Formatter: () => new CustomFormatter()
  }
};


Then merge it into your language’s services in your-language-module.ts so VS Code or the LSP will use it for formatting.

4) Tips When Implementing a Formatter

The abstract format(node) is called for every AST node — inside it you check the type with ast.isXXX(node).

Formatter helpers like formatter.keyword() and formatter.property() let you select exact text positions.

The Formatting helpers (indent, newLine, noSpace, oneSpace, etc.) define edits applied to the document on Format Document.

You may need to define tests for repeatable formatting to ensure idempotence. 
GitHub
```

#### Example 2

This is from the official documentation:

```
Formatting
Langium’s formatting API allows to easily create formatters for your language. We start building a custom formatter for our language by creating a new class that inherits from AbstractFormatter.

import { AstNode } from 'langium';
import { AbstractFormatter, Formatting } from 'langium/lsp';

export class CustomFormatter extends AbstractFormatter {
    protected format(node: AstNode): void {
        // This method is called for every AstNode in a document
    }
}
...
// Bind the class in your module
export const CustomModule: Module<CustomServices, PartialLangiumServices> = {
    lsp: {
        Formatter: () => new CustomFormatter()
    }
};
The entry point for the formatter is the abstract format(AstNode) method. The AbstractFormatter calls this method for every node of our model. To perform custom formatting for every type of node, we will use pattern matching. In the following example, we will take a closer look at a formatter for the domain-model language. In particular, we will see how we can format the root of our model (DomainModel) and each nested element (Entity and PackageDeclaration).

To format each node, we use the getNodeFormatter method of the AbstractFormatter. The resulting generic NodeFormatter<T extends AstNode> provides us with methods to select specific parts of a parsed AstNode such as properties or keywords.

Once we have selected the nodes of our document that we are interested in formatting, we can start applying a specific formatting. Each formatting option allows to prepend/append whitespace to each note. The Formatting namespace provides a few predefined formatting options which we can use for this:

newLine Adds one newline character (while preserving indentation).
newLines Adds a specified amount of newline characters.
indent Adds one level of indentation. Automatically also adds a newline character.
noIndent Removes all indentation.
oneSpace Adds one whitespace character.
spaces Adds a specified amount of whitespace characters.
noSpace Removes all spaces.
fit Tries to fit the existing text into one of the specified formattings.
We first start off by formatting the Domainmodel element of our DSL. It is the root node of every document and just contains a list of other elements. These elements need to be realigned to the root of the document in case they are indented. We will use the Formatting.noIndent options for that:

if (ast.isDomainmodel(node)) {
    // Create a new node formatter
    const formatter = this.getNodeFormatter(node);
    // Select a formatting region which contains all children
    const nodes = formatter.nodes(...node.elements);
    // Prepend all these nodes with no indent
    nodes.prepend(Formatting.noIndent());
}
Our other elements, namely Entity and PackageDeclaration, can be arbitrarily deeply nested, so using noIndent is out of the question for them. Instead we will use indent on everything between the { and } tokens. The formatter internally keeps track of the current indentation level:

if (ast.isEntity(node) || isPackageDeclaration(node)) {
    const formatter = this.getNodeFormatter(node);
    const bracesOpen = formatter.keyword('{');
    const bracesClose = formatter.keyword('}');
    // Add a level of indentation to each element
    // between the opening and closing braces.
    // This even includes comment nodes
    formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent());
    // Also move the newline to a closing brace
    bracesClose.prepend(Formatting.newLine());
    // Surround the name property of the element
    // With one space to each side
    formatter.property("name").surround(Formatting.oneSpace());
}
Note that most predefined Formatting methods accept additional arguments which make the resulting formatting more lenient. For example, the prepend(newLine({ allowMore: true })) formatting will not apply formatting in case the node is already preceeded by one or more newlines. It will still correctly indent the node in case the indentation is not as expected.

Full Code Sample
import { AstNode } from 'langium';
import { AbstractFormatter, Formatting } from 'langium/lsp';
import * as ast from './generated/ast.js';

export class DomainModelFormatter extends AbstractFormatter {

    protected format(node: AstNode): void {
        if (ast.isEntity(node) || ast.isPackageDeclaration(node)) {
            const formatter = this.getNodeFormatter(node);
            const bracesOpen = formatter.keyword('{');
            const bracesClose = formatter.keyword('}');
            formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent());
            bracesClose.prepend(Formatting.newLine());
            formatter.property('name').surround(Formatting.oneSpace());
        } else if (ast.isDomainmodel(node)) {
            const formatter = this.getNodeFormatter(node);
            const nodes = formatter.nodes(...node.elements);
            nodes.prepend(Formatting.noIndent());
        }
    }
}
```

#### Example 3

And a final third example:

```
Below is a minimal but realistic Langium formatter implementation showing how to define formatting rules and register them in a language service.

1. Formatter implementation
// src/language/my-dsl-formatter.ts
import {
  AbstractFormatter,
  Formatting,
  LangiumServices,
} from 'langium';
import {
  Model,
  Entity,
  Property,
} from './generated/ast';

export class MyDslFormatter extends AbstractFormatter {

  protected override format(node: unknown, formatter: Formatting): void {
    switch (node.$type) {

      case Model:
        this.formatModel(node as Model, formatter);
        break;

      case Entity:
        this.formatEntity(node as Entity, formatter);
        break;

      case Property:
        this.formatProperty(node as Property, formatter);
        break;
    }
  }

  private formatModel(model: Model, f: Formatting): void {
    for (const entity of model.entities) {
      f.format(entity)
        .prepend(Formatting.newLine())
        .append(Formatting.newLine());
    }
  }

  private formatEntity(entity: Entity, f: Formatting): void {
    const keywords = this.keyword(entity, '{');

    f.surround(keywords, Formatting.space());
    f.indent(entity.properties, Formatting.indent());

    f.append(entity, Formatting.newLine());
  }

  private formatProperty(property: Property, f: Formatting): void {
    if (property.type) {
      f.surround(this.keyword(property, ':'), Formatting.space());
    }
    f.append(property, Formatting.newLine());
  }
}

2. Register the formatter in your services
// src/language/my-dsl-module.ts
import { LangiumServices, DefaultSharedModuleContext } from 'langium';
import { MyDslFormatter } from './my-dsl-formatter';

export const MyDslModule = {
  lsp: {
    Formatter: (services: LangiumServices) => new MyDslFormatter()
  }
};

3. Ensure formatting is enabled in the LSP

Langium enables formatting automatically when a Formatter is present. In VS Code, this will respond to Format Document (Shift+Option+F).
```

### Formatting Comments

# Comment formatting in Langium

This information may not be 100% accurate. Don't trust it blindly.

## References

1. Langium Formatter Doesn’t Have Built-in Comment Rules

Langium’s formatting API doesn’t provide a special built-in rule just for comments (unlike some other tools). Instead comments are treated like regular nodes/tokens in the AST, and your custom formatter logic must explicitly include them where you want formatting applied.
Langium

2. Grammar: Make Comments Hidden Tokens

In your .langium grammar you typically declare comment tokens as hidden terminals (so they are recognized but don’t show up as parser nodes unless you explicitly include them):

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]_?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]_/;

This ensures comments exist in the token stream but don’t build AST nodes.
Langium

3. Include Comments in Formatting Regions

When you write a formatter by subclassing AbstractFormatter, you select regions you want to format. Comments will be included if they fall in the formatting region you match.

Example for a block with braces:

if (ast.isSomeNode(node)) {
const formatter = this.getNodeFormatter(node);
const open = formatter.keyword('{');
const close = formatter.keyword('}');
// This interior region includes whitespace **and** comment tokens
formatter.interior(open, close)
.prepend(Formatting.indent());
close.prepend(Formatting.newLine());
}

Because the formatter’s interior region includes all tokens between { and }, comment tokens inside that region will be formatted along with code.
Langium

4. Ensuring Comments Are Not Lost

Because comments are hidden terminals, Langium’s formatter won’t always preserve spacing around them unless you explicitly handle them. To make sure your formatting rules don’t remove or misplace comments, use:

formatter.nodes(...nodes) — allows you to format a list of nodes including inserted hidden tokens

Formatting.newLine({ allowMore: true }) — avoid removing newlines before comments that already have them
Langium

For example:

const nodes = formatter.nodes(...node.members);
nodes
.betweenNodes(
Formatting.newLine({ allowMore: true }),
Formatting.indent()
);

This helps preserve existing comment spacing.

5. If You Need Special Comment Rules

Langium doesn’t provide native comment directives (e.g., “keep comment lines aligned”). If you want special behavior (like aligning // comments or separating comment blocks), you must write custom logic in your formatter:

detect comment tokens via formatter.token(...)

manually inject whitespace/newlines before/after them

apply special spacing rules

### Example: preserving comments and enforcing a blank line before block comments

Below is a minimal, concrete Langium formatter example that shows how to preserve comments and enforce a blank line before block comments (/* … */) while leaving line comments intact.

Assumptions

Comments are hidden terminals in the grammar.

You want:

Existing comment spacing preserved

One blank line before block comments

No special alignment rules

Grammar (comments as hidden terminals)
hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /\/\/[^\n\r]_/;
hidden terminal ML_COMMENT: /\/\*[\s\S]_?\*\//;

Formatter implementation
import {
AbstractFormatter,
Formatting,
type AstNode,
type LangiumDocument
} from 'langium';
import { isMyBlock } from './ast';

export class MyFormatter extends AbstractFormatter {

override format(node: AstNode, doc: LangiumDocument): void {
if (!isMyBlock(node)) return;

    const f = this.getNodeFormatter(node);

    const open = f.keyword('{');
    const close = f.keyword('}');

    // Indent everything inside the block (includes comments)
    f.interior(open, close)
      .prepend(Formatting.indent());

    close.prepend(Formatting.newLine());

    // ---- Comment handling ----

    // Enforce a blank line before block comments
    f.tokens('ML_COMMENT').prepend(
      Formatting.newLine({ count: 2, allowMore: true })
    );

    // Preserve spacing for line comments
    f.tokens('SL_COMMENT').prepend(
      Formatting.newLine({ allowMore: true })
    );

}
}

What this actually does

Comments are preserved because they are hidden tokens and included in the formatter regions.

ML_COMMENT:

Ensures at least one blank line before block comments

Does not collapse existing spacing

SL_COMMENT:

Keeps user-written spacing intact

No AST changes required.

Key takeaway

In Langium:

Comments = tokens, not nodes

Formatting comments means:

Matching them via formatter.tokens(...)

Using allowMore: true to avoid destroying user spacing

You opt-in to comment behavior explicitly

If you want next:

grouping consecutive comments

“doc comment” detection

comment-aware alignment

or formatter behavior driven by semantic nodes

#### Follow-up fixes:

Great. Let's continue with:

- [ ] Write a bunch of _super small_ tests for the formatter.
- [ ] Ensure they pass.
