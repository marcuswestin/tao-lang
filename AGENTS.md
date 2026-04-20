# Tao Lang development agent instructions

---

- **CRITICAL:** `./just-agents` is your one way to interact with the codebase.
- **ALWAYS** use `./just-agents <cmd> <args>` for all commands.
- **ALWAYS** start your session by listing available commands: `./just-agents help`
- **CRITICAL:** You may ONLY run commands with `./just-agents <cmd> <args>`.
- **CRITICAL:** Execute shell commands with `./just-agents shell "<shell cmd>" "<args>"`.
- **ALWAYS** use it for piping commands too, e.g: `./just-agents shell ls | ./just-agents shell head -n 20`
- **CRITICAL**: **Never** modify just-agents.Justfile without asking first (unless the user explicitly asked for a change to agent commands in that file).
- Favor using `./just-agents shell mv <src> <dest>` over rewriting files and then deleting them.
- **Justfile Documentation:**
  - **If** you need to lookup `just`, first check: https://cheatography.com/linux-china/cheat-sheets/justfile/
  - **If** you need more details, see:: https://just.systems/man/en/

---

## Dev Notes:

- For new features, always update validator and formatter with new tests, if applicable.

---

## Misc Instructions:

- **ONLY** delete files if you know it is appropriate, and can likely be restored by git checking it out back out before a commit is done.
- **Git / commits:** follow `.cursor/skills/tao-git-workflow/SKILL.md` (attach when committing). In short: run `./just-agents fix` and `./just-agents prep-commit` before landing work unless the user opts out.
- **Git / merge:** never run `./just-agents git-dangerously` with `fetch`, `checkout`, `switch`, `pull`, `merge`, `push`, `rebase`, or similar merge/remote work unless the user **explicitly** instructed a merge (or the same skill’s equally explicit remote step); see `tao-git-workflow` and the comment block in `just-agents.Justfile`.
- **Git / merge:** after merging **`main` into a feature branch** (or rebasing onto it), run **`./just-agents prep-commit`** until green **before** squash merge, push, or treating the branch as merge-ready; see **`tao-git-workflow`** (_After integrating `main` on a feature branch_) and **`prep-feature-branch-merge`**.
- **ALWAYS** use the return type of an invoked function (either implicitly or explicitly) rather than redeclaring an identical type. Don't: `type AType = { ... }; let foo: AType = fn();`, Do: `let foo = fn();`
- _NEVER_ use imports from generated files in our main source code.

### Code HYGIENE: DRY and LESS IS MORE.

- **CRITICAL:** DRY: Aim for DRY code
  - Favor shared functions.
  - Whenever you can, DELETE code.
  - Within reason, EXTEND existing code rather than adding new.
- **CRITICAL:** LESS IS MORE
  - Do not add unnecessary code. The less code the better.
  - When in doubt, delete code.
- **CRITICAL:** Do not add a second public API that duplicates another’s behavior and return shape (same inputs, same `getFile` / `getErrors` / build steps) just to expose one extra field or a slightly different assertion message. **Extend** the existing function’s return type or options instead, and keep a **single** implementation.
- **Before** copying a helper, search for an existing one (`grep`/semantic search) and **prefer** composing or widening it over parallel copies.
- Shared private builders are fine, but there should be **one** obvious exported entry point per use case, not two near-identical exports.

## Documentation:

- **ALWAYS** jsdoc all TS functions, in the form: `/** <fn name> <verb> <desc> */`, e.g `/** getUserById returns the user with the given id */`.
- **USUALLY** jsdoc on a single line, unless more is appropriate: `/** <fn name> <verb> <desc> */`.
- **ALWAYS** start multiline jsdoc lines right after `/**` without a newline; and end with `*/` right at the end of the last line, without a newline before it.
- **SOMETIMES** jsdoc additional details with list items when appropriate: `/** <fn name> <verb> <desc>\n * - ...\n * - ...\n */`.
- **USUALLY** prefer conventional acronym casing in new identifiers (`URL`, `HTTP`), not mid-word `Url`/`Http`, unless matching an external API.

- `README.md` - Human instructions
- `Justfile` - Human command runner file (`just <command> <args>`)
- `LICENSE` - Project license

Agent instructions:

- `AGENTS.md` - Agent instructions
- `just-agents` - Agent command runner (`./just-agents <command> <args>`)
- `just-agents.Justfile` - Agent commands

## Cursor: rules, commands, skills

**Authoritative paths** (edit these when improving agent guidance):

| Area                  | Location                                          | Notes                                                                                                                             |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Core agent text       | `AGENTS.md` (this file), `CLAUDE.md`              | Stacked in Cursor; commands, testing, and repo rules live in **`AGENTS.md`**; **`CLAUDE.md`** is short editor/workflow tone only. |
| Enforced command gate | `.cursor/rules/running-commands.mdc`              | `alwaysApply: true` — keep tiny; duplicate only what must never be missed.                                                        |
| Other Cursor rules    | `.cursor/rules/*.mdc`, `.cursor/rules/**/RULE.md` | Usually `alwaysApply: false` + `globs` so they load when relevant files are open.                                                 |
| Slash commands        | `.cursor/commands/*.md`                           | Optional; repo workflows live in **skills** under `.cursor/skills/`.                                                              |
| Skills                | `.cursor/skills/**/SKILL.md`                      | User-attached or explicitly referenced; not auto-loaded for every message unless your client pins them.                           |
| Hooks                 | `.cursor/hooks.json`                              | Repo automation around agent/IDE events.                                                                                          |
| Human runner          | `Justfile`                                        | `just` recipes for people; agents use `./just-agents` only.                                                                       |

**Project skills (attach when relevant):** `tao-git-workflow`, `create-spec-file`, `create-project`, `implement-from-spec`, `implement-todo-batch`, `prep-feature-branch-merge`, `plan-next-from-todo`, `check-for-improvements`.

**What tends to sit in context vs on-demand**

- **Every relevant turn:** `running-commands.mdc` (`alwaysApply: true`), plus project instructions that include `AGENTS.md` / `CLAUDE.md` when the editor loads them.
- **When editing matching paths:** rules with `globs` (e.g. Bun, compiler AST, formatter).
- **On demand:** skills you attach in chat (e.g. `tao-git-workflow`, `implement-from-spec`), optional `.cursor/commands/*`, MCP tools you call.

Misc configs and artifacts:

- `.builds/` - build artifacts
- `.config/` - configs for tools
- `.cursor/` + `.vscode/` - IDE configs
- `.*` - config files required in project root. Symlinked to `.config/*`

Tao Lang Project Docs:

- **`Docs/`** — Design, roadmap, features, example `.tao` files, etc

### Tao Lang implementation: packages/*

- `packages/parser/` - Langium grammar and generated AST for Tao Lang
- `packages/compiler/` - Validator and compiler (using Langium)
- `packages/tao-cli/` - Tao CLI: `tao <...>`
- `packages/tao-std-lib/` - Standard library: e.g `use tao/ui Col, Row, Text`
- `packages/ide-extension/` - Tao Lang VSCode/Cursor Extension
- `packages/expo-runtime/` - Tao App runtime: Expo react native harness for compiled Tao apps
- `packages/shared/` - Code shared across all packages. TypeScript modules, internal scripts, etc

To run a command in a package, use `./just-agents <package> <command> <args>`
Examples:

- Run `test` in `packages/expo-runtime`: `./just-agents expo-runtime test`
- Run `build` in `packages/compiler`: `./just-agents compiler build`

### Testing:

- Run tests: `./just-agents test`, `./just-agents test <test name filter>`
  - Run ALL tests, including slow ones: `./just-agents test-all <test name filter>`
- Test files are named `<name>.test.ts`
