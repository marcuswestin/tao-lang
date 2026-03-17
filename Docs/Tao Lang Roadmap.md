# Tao Language Roadmap

## Likely order

- [x] Alias Statements
- [ ] Actions - events (ui interaction, time, network), state mutation, datasource updates, network requests
- [ ] Composite expressions
- [ ] Minimal basic Type System
- [ ] Functions
- [ ] Control statements - if/else,

## Relationship to LLMs

- [ ] Instructions for LLMs to use Tao Lang
- [ ] Instructions for LLMs to build Tao Lang
- [ ] Design MCPs? Skills?
- [ ] Integration with Studio/Editor?
- [ ] Explicit declaration and support for users to edit specified parts of the app they're using directly?

## Syntax & grammar specifically

- [ ] Feature flags
- [ ] Error handling
- [ ] Data sources
- [ ] Authentication & Authorization
- [ ] Expression transformations - e.g pipes, waiting for async, more?
- [ ] Declarations and Invocations
  - [ ] Parameters, outside and inside block. Match by name, type
  - [ ] Function parameters; e.g rendering an Item in a List.
    - [ ] Optional parameters
    - [ ] Multiple type signatures, to ensure no incorrect invotations
  - [ ] Arguments of invocations - inline args; block args
  - [ ] Explicit vs implicit statement and expression types (e.g function return type)
- [ ] Functions
- [ ] Handlers
- [ ] Views
- [ ] Types

## Server-side language ...?

- Could this be just data declarations, handlers, and bridges to data sources/rpcs?
- Compile to webassembly for sandboxing?
- [ ] Automatic containerization of apps
- [ ] Edge computing. Use your chosen provider

## Foundational Blocks

### Alias Statements

- [x] Declare "alias age = 1"
- [x] Reference e.g "Text value age"

### Functions

Project: ` /create-project Lets create a project for "Basic Functions":

    - Declare function (takes parameters, returns value, no side effects)
    - Invoke function (arguments)

`

- [ ] Parse functions, with positional arguments
- [ ] Decide on outer vs inner parameters syntax
- [ ] Decide how render functions are passed in as arguments to a view.
  - [ ] View definition: E.g `List` view
  - [ ] View renderings: E.g `List items: blogPosts { view BlogPost blogPost { ListItem { Text blogPost.title }} }`
  - Type inferred? E.g List expects a view that returns ListItem, like in example on previous line.
    - For header, groupheader, etc, it could expect a view returning a ListHeader, or a ListGroupHeader, etc
  - Named parameters?
    - Eg: `List items: blogPosts { renderItem: blogPost { Text blogPost.title }}`
    - Eg: `renderItem: item, index { Text item.title + index }`
    - Eg: `renderItem: item -> blogPost, index { Text blogPost.title + index }`
    - Or: `renderItem: item: blogPost, index { Text blogPost.title + index }`
  - Or! Matched by named type?
    - Eg: `List { renderItem: post BlogPost, index Number { Text post.title } }`
  - Or; Named _and_ type?
    - Eg: `List { renderItem: post BlogPost, index { Text post.title } }`
      - post is matched by type BogPost; index is matched by name

### Type system

- [ ] Make work inside vscode extension
- [ ] Design Type system
  - Declaring named types
  - Function types
  - Matching function arguments by type
  - Matching switch statements by type
    - `if item is BlogPost -> Text item.title is Person person -> Text person.name`
    - `if item is BlogPost: Text item.title \n  is Person person: Text person.name`
  - Matching statements by type
- [ ] Parse type definitions
- [ ] Design and implement generics
- [ ] Type checker

### Misc tooling

- [ ] Debugger, step through code, breakpoints, etc
- [ ] Profiler, performance measurement, benchmarking
- [ ] Networking, simulate latency/patchy connection/randomly offline/out-of-order delivery, etc
- [ ] Request tracing
- [ ] Logging, local and remote
- [ ] Offline development

### Testing

- [ ] Design and testing system
- [ ] Performance measurement, Benchmarking

### Previews

- [ ] Create studio app that allows for any view to be previewed with multiple state definitions (from a library)
- [ ] Similarly for error states

### Handlers

- [ ] Parse handlers

### Data sources

- [ ] Parse datasource definitions
- [ ] Parse queries
- [ ] Data caching declarations
- [ ] Datasource providers
  - [ ] Feature support declarations
  - [ ] Authentication declarations
  - [ ] RPC declarations

### Authentication & Authorization

- [ ] Declare user, and links to entities
- [ ] Also allow for non-user based, that only queries more manually

### UI styling

- [ ] Parse ui theme definitions
- [ ] Parse view layout
- [ ] Parse view styling

### Error handling

- [ ] Design error handling: syntax, enforcement, ...
- [ ] Parse error handlers

### Documentation

- [ ] Auto-generate documentation from a module folder, from comments before definitions
  - [ ] Allow for sections demarcated in code?

### Compiler

- [ ] Compile functions

### Runtime

- [ ] Create TL.render/query/etc
- [ ] Get langium compiler tracing to work and track runtime errors back to the original tao code

### Standard library

- [ ] ui: Views, Themes, Layout, Styling
- [ ] data: Data sources, queries, caching
- [ ] common: currency, time, locale, left-to-right, light/dark mode, accessibility, internationalization,, resizing text for sight, etc
- [ ] API for programmatic compiler functionality: parse, compile, type check, format, documentation, etc

### Concurrency

- [ ] Always await statements by default in handlers; and render by default with default loading or error views in views (but warn if not specified)
- [ ] Handler syntax for async invocation and awaits
- [ ] Handler syntax for concurrent invocations and awaits

### Formatter

- [ ] Re-order code: All consecutive use statements should be in alphabetical order
  - [ ] Use statements alphabetically
  - [ ] Object keys alphabetically

### Module system

- [ ] Implement named module imports and dependency declarations
- [ ] Remote modules
- [ ] Versioning, locking, deterministic builds, secutiry

### Security

- [ ] Automatic module review for security vulnerabilities before publication happens?

### Editor

- [ ] AST-supported editing?

### Runtime

- **Multi-platform Support**: Expand runtime support to more platforms
- **Performance Optimizations**: Implement JIT compilation or other performance improvements
- **Native Modules**: Enable integration with native platform modules
- **Hot Reloading**: Implement hot reloading for development

### App release and management

- [ ] Auto-update
- [ ] Feature flags
- [ ] Cloud managed app releases, feature flags, a/b/c testing, stats and analytics, etc
- [ ] Tracing of requests and responses

## Long-term Goals (18+ months)

### Language Features

- **Language Server Protocol**: Full LSP implementation for IDE integration
- **Distributed Computing**: Support for distributed programming patterns
- **AI Integration**: Integration with AI/ML frameworks and tools
- **Cross-compilation**: Support for compiling to multiple target platforms

### Ecosystem

- **Standard Library**: Expand standard library with more utility functions
- **Community Tools**: Develop community-driven tools and extensions
- **Education Resources**: Create comprehensive learning materials and tutorials
- **Enterprise Support**: Develop enterprise-grade features and support

```
```

```
```
