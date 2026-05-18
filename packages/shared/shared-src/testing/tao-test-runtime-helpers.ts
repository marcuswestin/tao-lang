import type { CompiledTaoTextInputTarget, CompiledTaoWaitForOptions } from './CompiledTaoScenarios'

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
  getByDisplayValue?(value: string): unknown
  getByLabelText?(label: string): unknown
  getByPlaceholderText?(placeholder: string): unknown
  getByTestId?(testID: string): unknown
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

/** typeTextOnScreen dispatches a React Native `changeText` event against a target text input. */
function typeTextOnScreen(
  screen: PressVisibleTextScreen,
  fireEvent: { changeText(target: unknown, value: string): void },
  target: CompiledTaoTextInputTarget,
  value: string,
): void {
  fireEvent.changeText(resolveTextInputTarget(screen, target), value)
}

/** assertInputValueOnScreen checks the current controlled value for a targeted text input. */
function assertInputValueOnScreen(
  screen: PressVisibleTextScreen,
  target: CompiledTaoTextInputTarget,
  value: string,
): void {
  const input = resolveTextInputTarget(screen, target)
  const props = input && typeof input === 'object' && 'props' in input
    ? (input as { props?: { value?: unknown } }).props
    : undefined
  if (props === undefined && screen.getByDisplayValue) {
    screen.getByDisplayValue(value)
    return
  }
  if (props?.value !== value) {
    throw new Error(`Expected input value ${JSON.stringify(value)}, got ${JSON.stringify(props?.value)}`)
  }
}

function resolveTextInputTarget(screen: PressVisibleTextScreen, target: CompiledTaoTextInputTarget): unknown {
  if (target.placeholder !== undefined) {
    if (!screen.getByPlaceholderText) {
      throw new Error('This scenario runtime cannot target inputs by placeholder.')
    }
    return screen.getByPlaceholderText(target.placeholder)
  }
  if (target.label !== undefined) {
    if (!screen.getByLabelText) {
      throw new Error('This scenario runtime cannot target inputs by label.')
    }
    return screen.getByLabelText(target.label)
  }
  if (target.testID !== undefined) {
    if (!screen.getByTestId) {
      throw new Error('This scenario runtime cannot target inputs by testID.')
    }
    return screen.getByTestId(target.testID)
  }
  if (target.text === undefined) {
    throw new Error('Text input target must include placeholder, label, testID, or text.')
  }
  return screen.getByText(target.text)
}

/** RuntimeTestingDeps carries RTL callbacks so shared helpers never import `@testing-library/react-native`. */
export type RuntimeTestingDeps = {
  cleanup(): void
  /** render receives the compiled module's default export (component) and returns the Testing Library screen. */
  render(element: unknown): PressVisibleTextScreen & Record<string, unknown>
  fireEvent: { changeText(target: unknown, value: string): void; press(target: unknown): void }
  /** RTL `waitFor` — used by scenario `assertVisibleText` when UI updates asynchronously (widened so RN Testing Library assignable without a hard `@shared` → RTL type dependency). */
  waitFor(callback: () => unknown, options?: CompiledTaoWaitForOptions): Promise<unknown>
}

/** RenderCompiledTaoAppResult is the RTL screen plus the loaded module namespace and {@link attachPressVisibleText} helper. */
export type RenderCompiledTaoAppResult =
  & PressVisibleTextScreen
  & Record<string, unknown>
  & {
    compiledModule: { default: unknown }
    assertInputValue(target: CompiledTaoTextInputTarget, value: string): void
    pressVisibleText(text: string): void
    typeText(target: CompiledTaoTextInputTarget, value: string): void
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
    assertInputValue(target: CompiledTaoTextInputTarget, value: string) {
      assertInputValueOnScreen(screen, target, value)
    },
    typeText(target: CompiledTaoTextInputTarget, value: string) {
      typeTextOnScreen(screen, deps.fireEvent, target, value)
    },
    // eslint-disable-next-line @typescript-eslint/unbound-method -- RTL `waitFor` does not rely on `this` from `deps`.
    waitFor: deps.waitFor,
  }
}
