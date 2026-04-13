# 2026-03-14 Compiled Code Testing

Run compiled Tao apps, by rendering them, programmatically interacting with them, and verifying the rendered content. We will use https://oss.callstack.com/react-native-testing-library for this.

## Scope

The compiler's `codegen/app/` pipeline now has separate modules for each codegen concern (views, aliases, expressions, injections, etc.), but none of them have tests. The existing runtime tests in `expo-runtime` use Jest and are slow to run.

This project adds fast, focused tests directly in `packages/compiler` (using `bun test`). Each codegen module gets a corresponding test file that:

1. Compiles Tao test code into a compiled app to test
2. Runs the generated TypeScript/JSX using `@testing-library/react-native`
3. Optionally interacts with the app programmatically
4. Uses the library's queries (`getByText`, `getByRole`, etc.) to assert on the actual rendered component tree

This gives us confidence that the compiler produces correct, renderable React Native components — without needing the full Expo runtime. We test what the user sees, not what the code looks like.

### Steps

- [ ] Set up `@testing-library/react-native` in `packages/compiler`
  - [ ] Install `@testing-library/react-native`, `react`, `react-native`, `react-test-renderer` as dev dependencies
  - [ ] Verify `bun test` can render RN components with the testing library
  - [ ] Add a codegen test helper to `compiler-tests/test-utils/` that compiles Tao code and returns a renderable component
- [ ] Add render tests for each module (one test file per codegen file)
  - [ ] `view-gen.test.ts` — rendered views contain expected text, children, and structure (empty view, view with children, nested views, view with props)
  - [ ] `alias-gen.test.ts` — aliased values appear correctly in rendered output
  - [ ] `expression-gen.test.ts` — string literals, number literals, named references render their values
  - [ ] `injection-gen.test.ts` — inject blocks produce working rendered RN components
  - [ ] `file-toplevel-gen.test.ts` — apps with use statements, app decl, and view decls render correctly
  - [ ] `app-gen-main.test.ts` — full compiled app renders with `CompiledTaoApp` wrapper and expected content
  - [ ] `app-gen-error.test.ts` — error app renders red error UI with error message text
- [ ] Integrate with existing test infrastructure
  - [ ] Ensure `./just-agents test` runs the new codegen tests
