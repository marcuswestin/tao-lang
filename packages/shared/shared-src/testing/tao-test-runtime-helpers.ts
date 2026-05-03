import type { CompiledTaoWaitForOptions } from './CompiledTaoScenarios'

/** loadCompiledTaoAppModuleFromPath clears `require.cache` for `outputPath`, `require`s it, and returns the module namespace. */
export function loadCompiledTaoAppModuleFromPath(outputPath: string): { default: unknown } {
  const resolvedModulePath = require.resolve(outputPath)
  delete require.cache[resolvedModulePath]
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(resolvedModulePath) as { default: unknown }
}

/** PressVisibleTextScreen is the subset of a Testing Library render result used to resolve press targets. */
export type PressVisibleTextScreen = {
  getByText(text: string): unknown
  queryAllByRole(role: string, options?: { name: string }): unknown[]
  getAllByText(text: string): unknown[]
}

/** pressVisibleTextOnScreen dispatches a press on the first `button` with accessible `name`, else the first text match. */
function pressVisibleTextOnScreen(
  screen: PressVisibleTextScreen,
  fireEvent: { press(target: unknown): void },
  text: string,
): void {
  const buttons = screen.queryAllByRole('button', { name: text })
  if (buttons.length > 0) {
    fireEvent.press(buttons[0]!)
    return
  }
  const nodes = screen.getAllByText(text)
  fireEvent.press(nodes[0]!)
}

/** attachPressVisibleText returns `{ pressVisibleText }` for merging into a Testing Library render result. */
function attachPressVisibleText(
  screen: PressVisibleTextScreen,
  fireEvent: { press(target: unknown): void },
): { pressVisibleText(text: string): void } {
  return {
    pressVisibleText(text: string) {
      pressVisibleTextOnScreen(screen, fireEvent, text)
    },
  }
}

/** RuntimeTestingDeps carries RTL callbacks so shared helpers never import `@testing-library/react-native`. */
export type RuntimeTestingDeps = {
  cleanup(): void
  /** render receives the compiled module's default export (component) and returns the Testing Library screen. */
  render(element: unknown): PressVisibleTextScreen & Record<string, unknown>
  fireEvent: { press(target: unknown): void }
  /** RTL `waitFor` — used by scenario `assertVisibleText` when UI updates asynchronously (widened so RN Testing Library assignable without a hard `@shared` → RTL type dependency). */
  waitFor(callback: () => unknown, options?: CompiledTaoWaitForOptions): Promise<unknown>
}

/** RenderCompiledTaoAppResult is the RTL screen plus the loaded module namespace and {@link attachPressVisibleText} helper. */
export type RenderCompiledTaoAppResult =
  & PressVisibleTextScreen
  & Record<string, unknown>
  & {
    compiledModule: { default: unknown }
    pressVisibleText(text: string): void
    waitFor(callback: () => unknown, options?: CompiledTaoWaitForOptions): Promise<unknown>
  }

/** renderCompiledTaoApp loads the module at `outputPath` (cache-bust `require`), runs `cleanup`, `render(default)`, and merges `pressVisibleText`. */
export function renderCompiledTaoApp(outputPath: string, deps: RuntimeTestingDeps): RenderCompiledTaoAppResult {
  deps.cleanup()
  const compiledModule = loadCompiledTaoAppModuleFromPath(outputPath)
  const screen = deps.render(compiledModule.default)
  return {
    ...screen,
    compiledModule,
    ...attachPressVisibleText(screen, deps.fireEvent),
    // eslint-disable-next-line @typescript-eslint/unbound-method -- RTL `waitFor` does not rely on `this` from `deps`.
    waitFor: deps.waitFor,
  }
}
