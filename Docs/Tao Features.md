# Tao Features

These are the main feature areas that define Tao as a UI-app language.

## Current Priorities

- **Data schema and queries:** finish the MVP schema/query flow, provider contract, and target app.
- **Layout and styling:** finish raw layout syntax first, then design themes and typed values before styling syntax.
- **Core language fit-and-finish:** improve functions, invocation shape, control statements, member access, arrays/tuples, and expression ergonomics.
- **Runtime and test quality:** keep compiler/runtime behavior stable across headless and Expo runtimes.

## Language Surface

- Alias statements are implemented.
- Composite expressions include arithmetic and string interpolation; objects, arrays, tuples, pipelines, and additional transformations remain open.
- Functions need syntax for declaration, invocation, parameters, return behavior, and render-function arguments.
- Handlers need event payload, mutation, async, and concurrent invocation syntax.
- Type system work lives in [Type Design - Preferred](./Projects/Type%20System/Type%20Design%20-%20Preferred.md), [Type Design - Alternatives](./Projects/Type%20System/Type%20Design%20-%20Alternatives.md), and [Type Implementation - Execution plan](./Projects/Type%20System/Type%20Implementation%20-%20Execution%20plan.md).

## UI And App Runtime

- UI layout is split into [UI Layout Concepts](./Tao%20Language%20Design/UI%20Layout%20Concepts.md) for the human model and [UI Layout Specification](./Tao%20Language%20Design/UI%20Layout%20Specification.md) for the active contract.
- Declaration kinds, render roots, `@@children`, named slots, renderer slots, and fragment boundaries live in [UI Declaration and Render Slots Specification](./Tao%20Language%20Design/UI%20Declaration%20and%20Render%20Slots%20Specification.md).
- Themes and typed values come after raw layout and before styling; see [UI Theme Design Doc](./Projects/UI%20-%20Layout%20and%20Styling/UI%20Themes/UI%20Theme%20Design%20Doc.md).
- Styling comes after the theme/value model; see [UI Styling Design Doc](./Projects/UI%20-%20Layout%20and%20Styling/UI%20Styling/UI%20Styling%20Design%20Doc.md).
- Animations, interactions, internationalisation, accessibility, and adaptation each have separate project plans under `Docs/Projects/`.

## Data, IO, And State

- Data sources, queries, caching, writes, provider capabilities, authentication, and RPC support belong to the data-query track.
- Network support needs offline/degraded detection, retries, timeouts, refresh states, and request tracing.
- Loading/error semantics need guard/check/boundary behavior for views and handlers.

## Developer Experience

- `tao fmt` should produce one canonical formatting form.
- Tao should support generated documentation, editor/LSP workflows, AST-supported editing, debugging, profiling, and source mapping.
- LLM and editor integration should help users build and edit Tao apps without expanding Tao beyond UI-app scope.

## Runtime, Packaging, And Release

- The standard library should cover UI, data, common locale/accessibility values, and compiler APIs.
- Module/package semantics need named imports, remote modules, versioning, locking, deterministic builds, and security review.
- Release tooling may include feature flags, managed rollouts, tracing, analytics, and auto-update behavior.

## Horizon

- Evaluate server-side Tao only where it complements data declarations, handlers, bridges, and deployment.
- Expand runtime targets, performance strategies, native integration, Studio previews, and educational resources after core app-building flows are stable.
