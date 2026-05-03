# Tao Lang TODOs

Active scratchpad only. Use this file for what is being tackled now/soon.

Historical completed work is archived in `TODO.Resolved.md`.
Design-debate/raw language notes are in `Docs/Projects/Design WIP/`.

## Process

For each feature:

1. Create a target Tao app that demonstrates the feature.
2. Derive/update spec docs from that app.
3. Create an implementation plan.
4. Add or update tests.
5. Implement and keep tests green.

## Now

- [ ] Add instantdb skills: npx skills add instantdb/skills
- [ ] Gather up libs to consider pulling in:
  - https://github.com/react-navigation/react-navigation
  - https://github.com/callstack/linaria
  - https://github.com/callstack/react-native-pager-view
  - https://www.callstack.com/open-source

- [ ] Do this for entire repo: Let's pause, and take a moment. Enjoy where we are, and allow for lifting our eyes up a bit.
  - Review this plan thoroughly. Take a pause to consider where in the roadmap and this feature implementation stage we are. Take the timee to consider if now is the time to also tackle some transformations or simplifications that will structurally improve the codebase with respect to queries and data and mutations. For this milestone phase, allow us to do an architectural overview; and if we see meaningful opportunities, let's consider taking the time now to do them. It usually never gets simpler to do with time ..
  - This is an opportunitu! To make our project more beatuiful; and to help our future selves with less compliexity and more enjoyment
- [ ] TRY: CAN WE DO NEWLINE TERMINATION???
- [ ] Decide: do we move codegen from a class, to an object with functions; so that we can pass them without => fat arrow wrappers? The class has no state after all. (think through if they will have before doing this.)
- [ ] The compile parameters should exactly match the app { ... } configuration: `--app.<field name>.<field name> <value string>`
- Fixes:
  - [ ] Does InstantDB have any type helpers to convert a typescript object literal const type into an InstantDB schema type?
    - If yes, use that for type safety in our generated ts.
- [ ] Move the choice of dev_app path somewhere such that it gets re-evaluated on dev-watch reloads (manual); and ideally it's in a file that's being watched so that just changing it changes the dev compiled app.
- [ ] Move over the IDB local setup commands from Claude or Codex
  - clone repo
  - Update max_replication_slots=20 and max_wal_senders=20
  - Run `docker exec -it postgres-1 psql -U postgres -c "SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots;"`

- [ ] Research Triplit vs instantdb: https://gist.github.com/kirankunigiri/bf07a3510e8d9493af05620fb413ff5a

- [ ] Schemas and Queries
  - [ ] Keep implementation aligned with:
    - `Docs/Projects/Data Schema and Queries/Process Docs/Queries Design - Preferred.md`
    - `Docs/Projects/Data Schema and Queries/Process Docs/Queries Design - Alternatives.md`
    - `Docs/Projects/Data Schema and Queries/Process Docs/Prior Art - Query Languages.md`
    - `Docs/Projects/Data Schema and Queries/Process Docs/Runtime - TanStack Query and InstantDB.md`
  - [ ] Align `Docs/Tao Language Design.md` data description with the preferred schema as grammar converges.
  - [ ] Implementation: schema, runtime interface, one provider.
- [ ] Arrays/Lists and Tuples/Pairs.
- [ ] Event and Handler Syntax.
- [ ] Functions.
- [ ] Layout System.
- [ ] Studio App.
- [ ] Formatter: collapse consecutive `}` tokens to a single spaced line (e.g. `} } } }`).

## Soon

- [ ] Improve testing
  - [ ] Add view keys.
  - [ ] Improve default test app visual baseline (black background, white text).
  - [ ] Compiled Tao scenario harness (`scenario.json`, `CompiledTaoScenarios.ts`, `tao-test-runtime-helpers.ts`): the JSON step list and ad-hoc runtime pull-in were a quick cut; consider a **TypeScript** scenario module (or similar) that owns real `expect` calls and types, and simplify discovery / compile / render adapter boundaries.
- [ ] Type-system correctness checks:
  - [ ] `type Title is text` + `Button Title, Action UpBy3` should error when `Title` is used as a value incorrectly.
  - [ ] `type Title is text` + `alias Title "Up by 3"` should not error.
- [ ] Objects/Items follow-up cleanup.
- [ ] State access render performance research and implementation.
  - Research:
    - https://legendapp.com/open-source/state/v2/react/react-introduction/
    - https://legendapp.com/open-source/state/v2/react/react-api/
    - https://legendapp.com/open-source/state/v2/react/fine-grained-reactivity/
    - https://legendapp.com/open-source/state/v2/react/helpers-and-hooks/
  - Tracing/debug build: https://legendapp.com/open-source/state/v2/react/tracing/
- [ ] Simplify validator boundaries so AST validity checks stay upstream (validator first, codegen trusts contract).
- [ ] Greatly simplify test harness ergonomics (smaller tests, less boilerplate).

## Backlog

- [ ] Runtime cleanup and type cleanup.
- [ ] Consolidate/restructure validators (`UseStatement` and `TaoLangValidator` boundary).
- [ ] Split validator into multiple files (e.g. extract type-checking into its own file).
- [ ] Review, simplify, and plan `tao-type-system.ts`.
- [ ] Module metadata support.
- [ ] Duplicate declaration diagnostics in a module.
- [ ] Revisit whitespace/newline sensitivity rules in render syntax (see Design WIP/Language Syntax Brainstorm for candidates).
- [ ] Ensure filtered test running works cleanly for just and `./agent`.
- [ ] State Libraries.
- [ ] Move parser tests into the parser package.
- [ ] Remove unused imports (potentially as a Tao→Tao compilation target rewrite).
- [ ] Map view render statements to the DOM in Chrome DevTools (right-click an element, jump to source). Likely depends on view keys.
- [ ] Require shared declarations to be explained (text describing functionality, intended use, expected behavior).
- [ ] Centralize Node imports through a single shared module (`path`, `fs`, etc).
- [ ] Convert function-oriented files to classes where it pays.
- [ ] Lint categories: enable oxlint `suspicious` + `nursery`; consider `warn` for `pedantic` / `restriction` / `style`.
- [ ] Review and rationalize Just recipe dependencies and declarations.
- [ ] Formatter: allow consecutive lines of the same statement type to have no blank line between them.
- [ ] Tao-fenced syntax highlighting in markdown — two candidate approaches:
  - Tagged template: `` const foo = tao`view View {}` `` where `tao` is a parse fn.
  - Comment-prefixed fence: `// tao-lang-syntax:` immediately above a regular fence.
  - Then surface the same highlighting in the VS Code extension.
- [ ] Add a "philosophy / stakes" section to AGENTS.md (Tao DX matters; quality posture; the language will be used by hundreds of thousands of engineers and tens of thousands of designers).
- [ ] Naming and conventions hygiene:
  - [ ] Acronym casing (`URL` not `Url`) and private recipe naming consistency.
- [ ] Cleanups:
  - [ ] Simplify `TaoWorkspace` shared workspace integration shape.
  - [ ] Extract shared runtime manifest parsing and compiled-app test helpers for runtime packages.

## Dev environment / tooling

- [ ] Upgrade packages with pending expected-version bumps (`expo`, `expo-linking`, `expo-web-browser`).
- [ ] Evaluate dev workflow improvements (voice mode, direct CLI/editor workflows, command surface cleanup).
- [ ] Try removing the agent restriction and see what development is like without it.
- [ ] Keep Justfile/agent-command surface concise and discoverable; consider moving more recipes to q-dev.
- [ ] Editors to evaluate: google antigravity, Gemini code assist, gemini cli, Claude code direct, Codex code direct.
- [ ] Tools to try out: Conductor, Whispr flow, Clawdbot.

## Archived during documentation cleanup

- [x] Legacy large DONE section removed from active TODO scratchpad; retained in `TODO.Resolved.md` and git history.
- [x] Raw syntax/design debate bullets moved to:
  - `Docs/Projects/Design WIP/Language Syntax Brainstorm.md`
  - `Docs/Projects/Design WIP/UI Layout and Styling.md`
  - `Docs/Projects/Design WIP/Error Handling.md`
  - `Docs/Projects/Design WIP/App Routing and Navigation.md`
- [x] Consolidated `Docs/Projects/Misc/TODO-scratch-archive-git-HEAD.md` into `TODO.md`, `TODO.Resolved.md`, and `Docs/Projects/Design WIP/Language Syntax Brainstorm.md`, then deleted the archive file.
