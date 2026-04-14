/** loadCompiledTaoAppModuleFromPath clears `require.cache` for `outputPath`, `require`s it, and returns the module namespace. */
export function loadCompiledTaoAppModuleFromPath(outputPath: string): { default: unknown } {
  const resolvedModulePath = require.resolve(outputPath)
  delete require.cache[resolvedModulePath]
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(resolvedModulePath) as { default: unknown }
}

/** loadCompiledTaoAppDefaultFromPath returns the module’s `default` export after the same cache-bust + `require` as {@link loadCompiledTaoAppModuleFromPath}. */
export function loadCompiledTaoAppDefaultFromPath<T>(outputPath: string): T {
  return loadCompiledTaoAppModuleFromPath(outputPath).default as T
}

/** PressVisibleTextScreen is the subset of a Testing Library render result used to resolve press targets. */
export type PressVisibleTextScreen = {
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
export function attachPressVisibleText(
  screen: PressVisibleTextScreen,
  fireEvent: { press(target: unknown): void },
): { pressVisibleText(text: string): void } {
  return {
    pressVisibleText(text: string) {
      pressVisibleTextOnScreen(screen, fireEvent, text)
    },
  }
}
