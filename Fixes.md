# Fixes needed

Report generated **2026-04-08**.

## How this was run

1. **`./just-agents gen`** (parser / Langium codegen).
2. **Per-package tests** via `./just-agents <recipe> test` for each recipe that exists in `just-agents.Justfile` and defines `test` in that package’s `Justfile`.
3. **`./just-agents test-all`** for the usual monorepo aggregate (see caveat below).

---

## Per-package results (`./just-agents … test`)

| Package / command                         | Command used                               | Result               | Notes                                                                                                                         |
| ----------------------------------------- | ------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **compiler**                              | `./just-agents compiler test`              | **Pass**             | 102 pass, 0 fail (6 files).                                                                                                   |
| **tao-cli**                               | `./just-agents cli test`                   | **Fail**             | 1 pass, 2 fail — same two cases as root `bun test`.                                                                           |
| **expo-runtime**                          | `./just-agents expo-runtime test`          | **Fail**             | 2 test suites failed (see below).                                                                                             |
| **headless-test-runtime**                 | `./just-agents headless-test-runtime test` | **Fail**             | 5 failed, 2 todo, 1 passed (8 tests).                                                                                         |
| **formatter**                             | `./just-agents formatter test`             | **Not run**          | `just-agents` has no `formatter` recipe; root `Justfile` has `formatter *ARGS` → use `just formatter test` locally if needed. |
| **shared**, **parser**, **ide-extension** | —                                          | **No `test` recipe** | Those `Justfile`s do not define `test`.                                                                                       |

---

## Aggregate: `./just-agents test-all`

- **168 pass**, **1 todo**, **2 fail** (171 tests, 11 files) during the root **`bun test`** phase.
- **Caveat:** Root `test-all` runs `just test` then `expo-runtime` tests. Because **`just test` exits non-zero**, the **expo-runtime** step is **not executed** in that recipe chain. Failures in **expo-runtime** were observed only when **`./just-agents expo-runtime test`** was run **separately**.

---

## What is broken (by theme)

### 1. Langium `compileNode` template crash (`sliced[0]` undefined)

**Stack:** `langium/.../template-node.js` → `compileOneTaoFileModule` (`app-gen-main.ts` ~38) → `generateTypescriptReactNativeApp`.

**Where it shows up:**

- **`tao-cli`:** `cli: > compile file with use statement` (Kitchen Sink + `stdLibRoot`).
- **`headless-test-runtime`:** shared scenarios **Handlers, State and Actions**, **Kitchen Sink**, **Std lib text render** (`Failed to compile Tao for the headless runtime` wrapping the same TypeError).

**Likely cause / fix direction:** Same as before: the tagged template used for the file preamble in `compileOneTaoFileModule` does not satisfy Langium’s `findIndentationAndTemplateStructure` (e.g. first logical line empty or indentation mismatch). Fix the template shape or avoid that template pattern for the preamble.

---

### 2. Compiled output missing random `Text` literal (`needle` not in emitted files)

**Where:** `tao-cli` — `cli: > compile and run with cli` (`test-tao-cli.test.ts`).

**Symptom:** `expect(res.files.some(f => f.content.includes(needle))).toBe(true)` → received `false`.

**Fix direction:** Trace view/prop / expression codegen so the string literal is present in generated sources, or align the test with an intentional output change.

---

### 3. Generated `app.tsx` is invalid TSX (parser: “Unexpected token, expected `{`”)

**Symptom:** Babel parses generated `app/app.tsx` and fails around **line 8**; file contains **`// TODO: Compile ViewDeclaration`** placeholders and incomplete structure.

**Where:**

- **`expo-runtime`:** `expo runtime shared scenarios › Simple test render` (`app/_gen-runtime-tests/test-simple-test-render/tao-app/app/app.tsx`).
- **`headless-test-runtime`:** `compiles and renders Tao code through the CLI entrypoint`, and shared scenario **Simple test render** (under `src/_gen-tao-compiler/` or `src/_gen-runtime-tests/` as reported in the log).

**Fix direction:** View declaration codegen is stubbed or incomplete for these scenarios; implement or wire codegen so `app.tsx` exports valid React Native / TSX.

---

### 4. Jest cannot resolve `@compiler` when pulling in CLI

**Where:** **`expo-runtime`** — `tests - expo-runtime/test-runtime.jest-test.tsx` — suite failed to run:

`Cannot find module '@compiler' from '../tao-cli/cli-src/tao-cli-main.ts'`.

**Fix direction:** Align Jest `moduleNameMapper` / `modulePaths` (or test setup) with the monorepo aliases used by `tao-cli-main.ts`, or avoid importing that entry in Jest without the same resolution as Bun.

---

## Quick reference: failing tests by package

| Package                   | Failing tests / suites                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tao-cli**               | `compile and run with cli`; `compile file with use statement`                                                                                                 |
| **expo-runtime**          | `shared-scenarios.jest-test.tsx` — Simple test render (syntax in generated app); `test-runtime.jest-test.tsx` — suite failed (@compiler resolution)           |
| **headless-test-runtime** | CLI compile/render path + shared scenarios: Handlers…, Kitchen Sink, Simple test render, Std lib text render (mix of compile crash and invalid generated app) |

---

## Summary

| Priority theme                         | Symptom                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| **`app-gen-main.ts` Langium template** | Runtime crash on compile for apps that use multi-file / stdlib paths |
| **View codegen / stubs**               | Generated `app.tsx` invalid; TODO comments left in output            |
| **String literal in minimal UI**       | CLI integration test does not find `needle` in emitted files         |
| **expo-runtime Jest + `@compiler`**    | One suite cannot load `tao-cli-main`                                 |

**compiler** package **unit tests** currently **green**; the regressions surface in **CLI integration** and **Jest-based runtime** packages.
