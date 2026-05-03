# Tao Language Roadmap

This roadmap is intentionally thin and scannable. Detailed design notes live in project docs and Design WIP docs.

## Now

- **Schemas and Queries**: finish MVP schema/query flow and one provider; details in [Data Schema and Queries](Projects/Data%20Schema%20and%20Queries/).
- **Core language fit-and-finish**: member/pipeline access, arrays/tuples, and invocation ergonomics.
- **Test/runtime quality**: tighten harnesses and keep compiler/runtime behavior stable as language features land.

## Soon

- **Functions and invocation syntax**: settle parameter and call shape details; raw notes in [Language Syntax Brainstorm](Projects/Design%20WIP/Language%20Syntax%20Brainstorm.md).
- **Event and handler syntax**: finalize handler/event payload/mutation statement surface.
- **Layout and styling system**: align grammar, validation, and runtime behavior for layout/styling; notes in [UI Layout and Styling](Projects/Design%20WIP/UI%20Layout%20and%20Styling.md).
- **Error and loading semantics**: unify guard/check/boundary behavior; notes in [Error Handling](Projects/Design%20WIP/Error%20Handling.md).
- **Routing and navigation**: centralize route model and guard integration; notes in [App Routing and Navigation](Projects/Design%20WIP/App%20Routing%20and%20Navigation.md).

## Later

- **Module system and package semantics**: named imports, remote modules, versioning/locking/security.
- **Concurrency model**: async defaults, explicit parallelism, and render-time loading/error behavior.
- **Studio and preview workflows**: richer preview states, scenario UX, and design-time feedback loops.
- **Compiler/source mapping ergonomics**: stronger tracing and error mapping from runtime back to Tao source.
- **Security and app release tooling**: release controls, tracing, feature flags, and managed rollout capabilities.

## Horizon

- **Server-side Tao shape**: evaluate data/handler-focused server language surface and deployment model.
- **Expanded runtime targets**: multi-platform support, performance improvements, and native integration strategy.
- **Ecosystem growth**: broader standard library surfaces, docs/learning resources, and community tooling.
- **LLM and editor integration**: higher-level workflows for building and editing Tao apps with AI assistance.

## Archived and detailed notes

- Completed feature checklists and old scratch planning are tracked in [TODO.Resolved.md](../TODO.Resolved.md).
- Design-heavy raw notes are moved to [Design WIP](Projects/Design%20WIP/).
