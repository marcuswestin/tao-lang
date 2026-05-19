# Tao Project Roadmap

This is the shared source of truth for Tao project selection, current priority order, planning status, and the v1 feature inventory. V1 means the **Buildable App MVP**: Tao can build, run, test, and prepare a small real Expo/React Native app with data, navigation, UI, styling, interactions, error states, and core tooling.

Each section names a major feature area, gives the current high-level status, separates the MVP remainder from later work, and links to the document that owns the detailed plan where one exists.

## Focus Queue

Short list of the highest-priority work. The full project queue and feature inventory below remain the source of truth for status and detail.

1. Data Schema and Queries MVP
2. Navigation and routing
3. Android runtime bring-up
4. Core language surface
5. Forms and inputs
6. Runtime targets: production builds and staging builds
7. Demo apps: Still and Rooms
8. Live preview in the Tao VS Code extension

## Current Project Queue

Use this table to decide the next project and keep planning state visible. Detailed project work belongs in sibling research and plan docs under `Docs/Projects/`.

| Priority | Project                               | Status         | Research doc                                                                                                            | Plan doc                                                                                                        | Next step                             | Notes                                                                          |
| -------- | ------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| 1        | Data Schema and Queries MVP           | Ready to merge | [Research](./Projects/Data%20Schema%20and%20Queries%20MVP%20Project%20Research.md)                                      | [Plan](./Projects/Data%20Schema%20and%20Queries%20MVP%20Project%20Plan.md)                                      | Run `merge-feature-branch`            | Review fixes landed; live InstantDB dev-app acceptance confirmed on 2026-05-19 |
| 2        | Navigation and routing                | Reviewed       | [Research](./Projects/Navigation%20and%20Routing%20Project%20Research.md)                                               | [Plan](./Projects/Navigation%20and%20Routing%20Project%20Plan.md)                                               | Run `project-5-implement-project`     | Implement the navigation v1 plan                                               |
| 3        | Android runtime bring-up              | Selected       | -                                                                                                                       | -                                                                                                               | Run `project-2-research-project`      | Get Tao Expo/runtime flow running on Android                                   |
| 4        | Demo apps: Still and Rooms            | Planned        | [Still](./Projects/Still%20App%20Project%20Research.md); [Rooms](./Projects/Rooms%20Chat%20App%20Project%20Research.md) | [Still](./Projects/Still%20App%20Project%20Plan.md); [Rooms](./Projects/Rooms%20Chat%20App%20Project%20Plan.md) | Run `project-4-review-project-plan`   | Implement the personal focus and realtime chat demos                           |
| 5        | Design, styling, and native coherence | Planned        | -                                                                                                                       | [Plan](./Projects/UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Design%20Inference%20Project%20Plan.md)      | Run `project-4-review-project-plan`   | Make Tao apps beautiful, native-feeling, and coherent                          |
| 6        | Layout era architecture improvements  | Planned        | -                                                                                                                       | [Plan](./Projects/UI%20-%20Layout%20Era%20Architecture%20Improvements%20Plan.md)                                | Run `project-2-research-project`      | Compiler architecture cleanup                                                  |
| 7        | Project workflow skills and roadmap   | Implemented    | -                                                                                                                       | -                                                                                                               | Run `project-6-review-implementation` | Workflow closure item                                                          |
| 8        | Agent skill opportunity workflow      | Implemented    | -                                                                                                                       | -                                                                                                               | Run `project-6-review-implementation` | Workflow closure item                                                          |

Project queue status values:

- `Unselected`: candidate exists but has not been selected for active work.
- `Selected`: user selected the project, but research has not started.
- `Researching`: `project-2-research-project` is in progress.
- `Ready for plan`: research records the decisions needed to write the plan.
- `Planned`: project plan exists and is ready for review.
- `Reviewed`: project plan has passed plan review and is ready for implementation.
- `In implementation`: implementation branch or worktree is active.
- `Implemented`: planned implementation work is complete and ready for implementation review.
- `Reviewed implementation`: implementation review is complete and ready for merge prep.
- `Ready to merge`: branch is validated and ready for the merge workflow.
- `Merged`: work has landed in `main`, with possible follow-up still visible.
- `Complete`: work has landed and no immediate follow-up remains.

Feature inventory fields:

- `Design:` high-level design state from active docs and the current branch.
- `Implementation:` high-level repo state from the current branch.
- `MVP remaining:` work needed before the Buildable App MVP.
- `Deferred:` explicitly later work.
- `Project docs:` owning plan/spec links; `Needs project doc` means the area is known but has no dedicated active plan yet.

## Core Language Surface

- Status: Design: syntax/semantics are documented as a working language spec with several open edges; Implementation: declarations, aliases, expressions, render statements, view/function/action blocks, and validation exist in the parser/compiler.
- MVP remaining: finish control-flow shape including `if`/`else`, invocation ergonomics, member/property access, return behavior, async/action syntax, and diagnostic priorities needed by real app code.
- Deferred: richer pipelines, destructuring, advanced transformations, broad server-side language features, and non-UI-app language expansion.
- Project docs: [Language Spec - Syntax Semantics](./Tao%20Language%20Design/Language%20Spec%20-%20Syntax%20Semantics.md).

## Type System And Semantic Types

- Status: Design: nominal types, interfaces, structural matching, semantic scalar types, narrowing, and Typir integration are planned; Implementation: meaningful type matching and follow-up phases are underway, with several typed-argument and local-parameter cases already represented.
- MVP remaining: complete the v1 type contract for view/action/function parameters, data fields, member access, collection/list/tuple shapes, contextual literals, `when ... is ... -> ...` type/value matching with narrowing and exhaustiveness, diagnostics, and generated TypeScript precision.
- Deferred: generics, union-heavy modeling, type functions, computed fields, extensive runtime value guards, and broad polymorphism.
- Project docs: [Type Design - Preferred](./Projects/Type%20System/Type%20Design%20-%20Preferred.md), [Type System - Followups](./Projects/Type%20System/Type%20System%20-%20Followups.md), [Semantic Types](./Projects/Design%20WIP/Semantic%20Types.md).

## Modules, Packages, Imports, And Library Boundaries

- Status: Design: module/import semantics are covered at the language level, while package/version/security policy is still broader roadmap work; Implementation: cross-file parsing, scoping, imports, std-lib roots, and generated app compilation are present.
- MVP remaining: make module/import behavior reliable for the Buildable App MVP, define std-lib ownership boundaries, and keep app/library build outputs deterministic.
- Deferred: remote modules, package registries, version locking, compatibility policy, package signing, and full security review workflow.
- Project docs: [Language Spec - Syntax Semantics](./Tao%20Language%20Design/Language%20Spec%20-%20Syntax%20Semantics.md), [Automatic Library Bridges](./Projects/Library%20Bridges/Automatic%20Library%20Bridges.md), Needs project doc for package/versioning policy.

## UI Declarations, Frames, Layouts, Render Roots, Children, And Slots

- Status: Design: `ui`, `frame`, `layout`, material roots, fragments, `@@children`, named slots, and renderer slots have active specs; Implementation: the current branch has parser/compiler/runtime work for declaration kinds, render roots, slots, and trusted std-lib views.
- MVP remaining: settle any remaining slot grammar, ship a proper reusable `List` view with renderer row slots, empty state, and stable keys, validate root/fragment boundaries, ensure formatter coverage, and exercise the model in real test apps.
- Deferred: advanced renderer-slot composition, value-returning slots, broad app-entry syntax alternatives, and reusable composition patterns not needed by the first app.
- Project docs: [UI Declaration and Render Slots Specification](./Tao%20Language%20Design/UI%20Declaration%20and%20Render%20Slots%20Specification.md), [UI Layout Concepts](./Tao%20Language%20Design/UI%20Layout%20Concepts.md).

## Layout Behavior, Responsive/Adaptive Layout, Safe Areas, And Keyboard-Aware Layout

- Status: Design: standard layout views and the layout/styling boundary are actively specified; Implementation: `Row`, `Col`, `Box`, `Stack`, `WrappingRow`, layout validation, codegen, runtime lowering, and layout tests are underway.
- MVP remaining: finish the raw layout MVP, cover responsive/adaptive essentials, preserve React Native/Expo mapping, and decide the minimum safe-area and keyboard-aware layout contract.
- Deferred: grid/table/masonry, absolute positioning, overflow/layers, container queries, measure functions, display-contents edge cases, and outside-bounds effects.
- Project docs: [UI Layout Specification](./Tao%20Language%20Design/UI%20Layout%20Specification.md), [Layout and Styling Project Plan](./Projects/UI%20-%20Layout%20and%20Styling/Layout%20and%20Styling%20Project%20Plan.md), [Layout MVP Implementation Plan](./Projects/UI%20-%20Layout%20and%20Styling/Layout%20MVP%20Implementation%20Plan.md).

## Design Inference, Appearance, Variants, And Visual Defaults

- Status: Design: design inference is the active direction: app intent, design specs, variants, composite roles, accepted design locks, resolved style keys, and React Native/Expo lowering; Implementation: design inference is planned but not implemented.
- MVP remaining: parse app design blocks, design specs, and design-only variants; implement accepted/suggested design locks; generate resolved design TypeScript; add runtime resolver helpers and diagnostics.
- Deferred: explicit styling language, source-authored token dictionaries, render-site design specs, structural variants, Style Dictionary export, broad effects, and advanced adaptation axes.
- Project docs: [UI Design Inference Concepts](./Tao%20Language%20Design/UI%20Design%20Inference%20Concepts.md), [UI Design Inference Specification](./Tao%20Language%20Design/UI%20Design%20Inference%20Specification.md), [UI Design Inference Project Plan](./Projects/UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Design%20Inference%20Project%20Plan.md), [UI Appearance Future Work](./Projects/UI%20-%20Layout%20and%20Styling/UI%20Design/UI%20Appearance%20Future%20Work.md).

## Navigation, Routing, Links, Typed Params, Tabs/Stacks, And Guarded Routes

- Status: Design: semantic, pathless-by-default navigation v1 is specified; Implementation: the Expo runtime still uses Expo Router today, but the planned implementation targets direct React Navigation 7 static config and removes Expo Router once the direct shell exists.
- MVP remaining: implement app `navigation`, top-level `navigator`, `stack`, `tabs`, `screen`, `tab`, primitive `param`, optional `path`, navigation actions, React Navigation IR/codegen/runtime lowering, example migration, and Expo Router removal.
- Deferred: drawer navigation, route guards/auth, React Navigation 8, native-tab/Liquid Glass backend work, complex nested router URL reconstruction, universal-link policy, multi-window/deep platform routing, and generated route documentation.
- Project docs: [App Routing and Navigation](./Projects/Design%20WIP/App%20Routing%20and%20Navigation.md), [Navigation Research](./Projects/Navigation%20and%20Routing%20Project%20Research.md), [Navigation Plan](./Projects/Navigation%20and%20Routing%20Project%20Plan.md).

## Actions, Events, Interactions, Async Behavior, And App Lifecycle Events

- Status: Design: user events, action lifecycle, data/network events, time events, app/platform events, event payloads, `does`, and `emit` are planned; Implementation: action blocks exist, while the full event/action runtime surface is not complete.
- MVP remaining: implement the minimum event wiring for buttons/forms/navigation/data writes, define async and concurrent action behavior, and expose app lifecycle events needed by real apps.
- Deferred: advanced gesture-event composition, scheduled/background events, rich event buses, custom event protocols, and complex concurrency policy.
- Project docs: [Interactions Project Plan](./Projects/Interactions%20and%20Events/Interactions%20Project%20Plan.md).

## Local State, Bindings, Reactivity, And Render Performance

- Status: Design: state appears throughout the language sketches, test apps, and TODOs, with known research around fine-grained React state access; Implementation: file-level and view-level `state`, state updates, nested object state updates, and action-driven state changes exist.
- MVP remaining: define state scope and lifecycle clearly, settle input/state binding ergonomics, add stable view keys where stateful repetition needs them, and prove render performance for normal app state updates.
- Deferred: external state-library abstraction, advanced fine-grained reactivity, time-travel/debug tooling, global store policy, and broad state synchronization beyond data providers.
- Project docs: Needs project doc; related: [Language Spec - Syntax Semantics](./Tao%20Language%20Design/Language%20Spec%20-%20Syntax%20Semantics.md), [Interactions Project Plan](./Projects/Interactions%20and%20Events/Interactions%20Project%20Plan.md).

## Forms, Inputs, Validation, Submit/Change/Focus Behavior, And Keyboard Ergonomics

- Status: Design: forms are implied by interaction, data, keyboard, and app examples, but there is no dedicated form plan; Implementation: basic UI/data/action pieces exist, but Tao does not yet own a coherent forms model.
- MVP remaining: define input controls, local form state, field validation, submit/change/focus events, keyboard behavior, disabled/loading states, and accessible error display.
- Deferred: complex form builders, dynamic schemas, offline draft syncing, file uploads, masked inputs, and advanced validation libraries.
- Project docs: Needs project doc; related: [Interactions Project Plan](./Projects/Interactions%20and%20Events/Interactions%20Project%20Plan.md), [Error Handling](./Projects/Design%20WIP/Error%20Handling.md).

## Data Schemas, Queries, Mutations, Guards, And Loading States

- Status: Design: schema/query/write semantics, query identity, provider boundaries, and guard-based loading are documented for the current data MVP; Implementation: data blocks, raw and structured queries, query aliases, `for`, `guard`, `create`, provider overrides, schema push, Memory, InstantDB, `where`, `exists`/`missing`, ordering, `date` fields, and strict row-handle `update` are implemented for the reviewed sprint slice.
- MVP remaining: broader data MVP work still includes `if`/`else`, relationship-heavy target app coverage, provider capability validation, the literal target app path, and auth/session boundaries needed by real apps.
- Deferred: advanced projection typing, pagination, delete, aggregation, query-on-query, generic provider layer, explicit invalidation DSL, and broad REST/GraphQL/Supabase support.
- Project docs: [Data Schema and Queries MVP Project Plan](./Projects/Data%20Schema%20and%20Queries%20MVP%20Project%20Plan.md), [Queries MVP Plan](./Projects/Data%20Schema%20and%20Queries/Queries%20MVP%20Plan.md), [Data and Queries - Design](./Projects/Data%20Schema%20and%20Queries/Process%20Docs/Data%20and%20Queries%20-%20Design.md), [Queries MVP Target App](./Projects/Data%20Schema%20and%20Queries/Queries%20MVP%20Target%20App.tao).

## Data Providers, Auth/Session, Local Storage, Offline Behavior, Sync, And Relationships

- Status: Design: provider-owned execution, TanStack/InstantDB mapping, relationship loading, runtime query values, and provider auth boundaries are documented; Implementation: Memory and InstantDB providers exist with V1 filter, existence, ordering, create, and strict row-handle update support, runtime admin secrets are stripped from generated app code, and native storage/cache dependencies are present.
- MVP remaining: add capability manifests, make unsupported provider shapes fail at compile time, clarify auth/session boundaries, and prove relationship loading in a real app.
- Deferred: full offline sync, conflict resolution, optimistic-update policy, REST/GraphQL/Supabase providers, local-only stores, and Tao-owned cache internals.
- Project docs: [Runtime - TanStack Query and InstantDB](./Projects/Data%20Schema%20and%20Queries/Process%20Docs/Runtime%20-%20TanStack%20Query%20and%20InstantDB.md), [Data and Queries - Design](./Projects/Data%20Schema%20and%20Queries/Process%20Docs/Data%20and%20Queries%20-%20Design.md), Needs project doc for auth/session and offline sync.

## Error Handling, Boundaries, Warnings, Diagnostics, And Recoverable App States

- Status: Design: guard/check/boundary semantics and data loading/error/NaV questions are documented as unresolved; Implementation: compiler diagnostics exist, but full recoverable app-state and boundary behavior is not finished.
- MVP remaining: settle `guard`/`check` behavior, view/action boundary semantics, warning severity, build-profile policy, and user-facing loading/error/empty state patterns.
- Deferred: advanced typed error unions, broad exception modeling, custom recovery policies, waivers, and production error-reporting integrations.
- Project docs: [Error Handling](./Projects/Design%20WIP/Error%20Handling.md), [Data and Queries - Design](./Projects/Data%20Schema%20and%20Queries/Process%20Docs/Data%20and%20Queries%20-%20Design.md).

## Accessibility, Internationalization, Localization, Directionality, And Adaptation

- Status: Design: roles, labels, hints, focus, announcements, contrast, text scaling, localization, pluralization, formatting, locale assets, directionality, and warning policy are planned; Implementation: some runtime dependencies and layout/styling hooks exist, but Tao-owned a11y/i18n/l10n semantics are not complete.
- MVP remaining: define minimum roles/labels/hints/states, text scaling, contrast warnings, raw string localization, number/date formatting, and physical-vs-logical layout behavior.
- Deferred: rich plural/gender/case systems, advanced locale asset selection, full logical layout, generated localization workflows, and comprehensive accessibility linting.
- Project docs: [Internationalisation and Accessibility Project Plan](./Projects/A11y%20I18N%20and%20L10N/Internationalisation%20and%20Accessibility%20Project%20Plan.md).

## Motion, Transforms, Gestures, Transitions, And Reduced-Motion Behavior

- Status: Design: static transforms, state transitions, enter/exit animations, layout transitions, gestures, sequences, runtime facade, and reduced motion are planned; Implementation: runtime dependencies include Reanimated, Gesture Handler, and worklets, but Tao motion syntax/runtime is not complete.
- MVP remaining: choose the v1 motion surface, map it to React Native/Expo behavior, validate reduced-motion behavior, and provide deterministic test/runtime fallbacks.
- Deferred: complex gesture choreography, custom animation engines, timeline editors, advanced sequencing, and platform-specific high-end effects.
- Project docs: [Animations Project Plan](./Projects/Animations%20Transformations%20and%20Motion/Animations%20Project%20Plan.md).

## Native/Platform Services, Media, Assets, Permissions, And Device APIs

- Status: Design: React Native/Expo is the authority and library bridge manifests are planned for platform support, permissions, hooks, components, actions, and headless behavior; Implementation: the Expo runtime already includes images, fonts, symbols, haptics, linking, web browser, splash/status/system UI, safe area, net info, storage, and gesture dependencies.
- MVP remaining: decide the minimal platform APIs exposed directly in Tao, route the rest through bridge manifests, validate permission needs, and define headless-test behavior for unsupported native capabilities.
- Deferred: camera, notifications, maps, sensors, files, secure storage, background tasks, custom native modules, and broad device integrations.
- Project docs: [Automatic Library Bridges](./Projects/Library%20Bridges/Automatic%20Library%20Bridges.md), [Expo Runtime README](../packages/expo-runtime/README.md), [Headless Test Runtime README](../packages/headless-test-runtime/README.md), Needs project doc for native services.

## Runtime Targets: Expo Native, Web, Headless Tests, App Shell, And Runtime Manifest

- Status: Design: Expo native/web and headless runtime boundaries are documented; Implementation: Expo runtime, headless runtime, app shell, generated app compile flow, and runtime package tests exist.
- MVP remaining: harden the generated app shell, Android bring-up, shared runtime manifest parsing, compiled-app test helpers, web behavior, source maps, and runtime parity expectations.
- Deferred: additional runtime targets, advanced platform adaptation, runtime plugin hosting, production observability hooks, and deep performance tuning.
- Project docs: [Expo Runtime README](../packages/expo-runtime/README.md), [Headless Test Runtime README](../packages/headless-test-runtime/README.md), [SourceMapping Plan](./Projects/Misc/SourceMapping-Plan.md), Needs project doc for runtime manifest.

## Parser, Compiler, Formatter, CLI, Source Maps, And IDE/Editor Tooling

- Status: Design: language, formatting, source mapping, CLI, and generated-app workflows have active docs or package READMEs; Implementation: Langium parser, compiler validation/codegen, formatter, CLI compile/fmt/watch/schema push, source-map work, and tests exist.
- MVP remaining: keep grammar, validation, formatter, compiler, CLI, and source maps in sync across all v1 language features; improve diagnostics and editor-friendly output.
- Deferred: full LSP/productized IDE extension, AST-aware editing, generated documentation tooling, advanced debug/profiling UI, and rich refactoring support.
- Project docs: [Formatter](./Tao%20Language%20Design/Features/Formatter.md), [SourceMapping Plan](./Projects/Misc/SourceMapping-Plan.md), [Tao CLI README](../packages/tao-cli/README.md), [Language Spec - Syntax Semantics](./Tao%20Language%20Design/Language%20Spec%20-%20Syntax%20Semantics.md).

## Testing, Scenario Harnesses, Previews, Visual Checks, And Example Apps

- Status: Design: compiler/runtime tests, test apps, and TODOs point toward richer scenario modules and real expects; Implementation: parser/compiler/runtime tests, headless runtime tests, Expo runtime tests, Kitchen Sink/Data/Layout apps, and check/test commands exist.
- MVP remaining: make scenario coverage representative of the Buildable App MVP, add typed scenario modules where needed, add stable view keys/debug handles for repeated or inspectable UI, cover bad network/loading/error paths, and keep example apps canonical.
- Deferred: full visual regression infrastructure, automated device matrices, load testing, snapshot-heavy preview workflows, and productized design review tools.
- Project docs: [Compiler Tests README](../packages/compiler/compiler-tests/README.md), [Headless Test Runtime README](../packages/headless-test-runtime/README.md), Needs project doc for scenario harness and visual previews.

## Studio, Authoring Workflows, Live Preview, And Design/Test Iteration

- Status: Design: Studio and preview workflows are a known horizon area, but not yet owned by a dedicated active plan; Implementation: app/example infrastructure exists, while productized Studio authoring remains early.
- MVP remaining: decide whether Studio is required for the Buildable App MVP or only needs enough hooks for live preview and app iteration.
- Deferred: full visual editor, state matrix explorer, design-system authoring, collaborative editing, and production app builder workflows.
- Project docs: Needs project doc.

## App Config, Environments, Secrets, Deployment, Release, Feature Flags, And Observability

- Status: Design: provider config, schema push, admin/runtime secret separation, release tooling, tracing, analytics, and auto-update are recognized but not yet unified; Implementation: CLI app compile/schema push, runtime config generation, admin-token stripping, Expo/EAS dependencies, logs, and source-map packages exist.
- MVP remaining: define app config shape, environment handling, secret boundaries, build/release command expectations, feature flag minimums, and observability required for a first real app.
- Deferred: managed rollouts, analytics product integration, crash reporting, OTA policy automation, package versioning workflow, and security review process.
- Project docs: [Tao CLI README](../packages/tao-cli/README.md), [Expo Runtime README](../packages/expo-runtime/README.md), Needs project doc for app config/release/observability.

## Documentation, Tutorials, Examples, Project Docs, And Agent/Repo Operating Workflows

- Status: Design: documentation index, active project docs, archive boundaries, agent guide, skill workflows, and the agent-opportunity lifecycle exist; Implementation: docs are organized enough to navigate, and local skills can now capture friction, recommend skill work, and create Tao-local skills.
- MVP remaining: keep this master plan current, create missing project docs for known gaps, maintain canonical examples, review opportunity-derived recommendations, and ensure docs describe the branch reality before features are treated as done.
- Deferred: full public tutorial set, cookbook, generated API docs, product site, interactive lessons, and external contributor program.
- Project docs: [Tao Documentation Index](./Tao%20Documentation%20Index.md), [Core Tenets](../CORE_TENETS.md), [Agent Guide](../AGENTS.md), [Agent Opportunities](../agent-opportunities.md), Needs project docs for missing feature owners.
