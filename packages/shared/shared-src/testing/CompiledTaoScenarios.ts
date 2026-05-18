import * as FS from '../fs'

/** TaoScenarioAppConfigObject is the nested app config override shape accepted by scenario JSON. */
export type TaoScenarioAppConfigObject = { [key: string]: string | TaoScenarioAppConfigObject }

/** CompiledTaoScenarioStep is one assertion or interaction within a compiled Tao scenario run. */
export type CompiledTaoScenarioStep =
  | { type: 'assertVisibleText'; text: string }
  | { type: 'assertInputValue'; target: CompiledTaoTextInputTarget; value: string }
  | { type: 'pressVisibleText'; text: string }
  | { type: 'typeText'; target: CompiledTaoTextInputTarget; value: string }

/** CompiledTaoTextInputTarget identifies a text input in a scenario step. */
export type CompiledTaoTextInputTarget = {
  label?: string
  placeholder?: string
  testID?: string
  text?: string
}

/** CompiledTaoWaitForOptions mirrors RTL `waitFor` options (timeout / poll interval) for compiled Tao scenario helpers. */
export type CompiledTaoWaitForOptions = { timeout?: number; interval?: number }

/** CompiledTaoScenario is a parsed `scenario.json` — steps to run, plus an optional skip flag. */
export type CompiledTaoScenario = {
  /** When truthy, shared scenario tests skip this folder: `true`, missing file, or a string reason for `test.todo`. */
  skip: boolean | string
  /** App config overrides passed to compile, e.g. `{ "provider": { "appId": "test-db" } }`. */
  app?: TaoScenarioAppConfigObject
  steps: CompiledTaoScenarioStep[]
}

/** DiscoveredCompiledTaoScenario pairs a scenario directory with its loaded config (or undefined when `scenario.json` is missing). */
export type DiscoveredCompiledTaoScenario = {
  scenarioDir: string
  scenario: CompiledTaoScenario | undefined
  skip: boolean | string
}

/** CompiledTaoScenarioCompileResult carries the filesystem path to the compiled output. */
export type CompiledTaoScenarioCompileResult = {
  outputPath: string
}

/** CompiledTaoScenarioRenderResult is the screen interface (Testing Library subset) returned after rendering the compiled app. */
export type CompiledTaoScenarioRenderResult = {
  getByText(text: string): unknown
  /** When present (e.g. RTL screen), duplicate visible text matches `assertVisibleText` without throwing. */
  queryAllByText?(text: string): unknown[]
  /** When present, `pressVisibleText` prefers the first matching pressable button by accessible name. */
  queryAllByRole?(role: string, options?: { name: string }): unknown[]
  /** assertInputValue checks a text input's current value. */
  assertInputValue(target: CompiledTaoTextInputTarget, value: string): void
  /** pressVisibleText dispatches a press on the element returned by `getByText` (e.g. Testing Library `fireEvent.press`). */
  pressVisibleText(text: string): void
  /** typeText dispatches a text-entry event against a target text input. */
  typeText(target: CompiledTaoTextInputTarget, value: string): void
  /** When present, `assertVisibleText` uses async wait (e.g. RTL `waitFor`) so post-mutation UI can settle. */
  waitFor?(callback: () => unknown, options?: CompiledTaoWaitForOptions): Promise<unknown>
}

/** CompiledTaoScenarioAdapter abstracts compile/render/cleanup so scenario tests work across Expo and headless runtimes. */
export type CompiledTaoScenarioAdapter = {
  compileScenario(args: {
    scenarioDir: string
    scenarioName: string
    scenario: CompiledTaoScenario
  }): Promise<CompiledTaoScenarioCompileResult> | CompiledTaoScenarioCompileResult
  renderCompiledApp(args: {
    outputPath: string
    scenarioDir: string
    scenario: CompiledTaoScenario
  }): Promise<CompiledTaoScenarioRenderResult> | CompiledTaoScenarioRenderResult
  cleanup(): Promise<void> | void
}

/** TaoScenarioAdapterCompileOpts passes `${scenarioName}.tao` path and output layout into a runtime compile helper. */
export type TaoScenarioAdapterCompileOpts = {
  path: string
  stdLibRoot?: string
  outputFileName: string
  app?: TaoScenarioAppConfigObject
}

/** createCompiledTaoScenarioAdapter builds a {@link CompiledTaoScenarioAdapter} from per-runtime compile, render, and cleanup hooks. */
export function createCompiledTaoScenarioAdapter(config: {
  stdLibRoot: string
  computeOutputFileName(scenarioName: string): string
  compile(
    opts: TaoScenarioAdapterCompileOpts,
  ): Promise<CompiledTaoScenarioCompileResult> | CompiledTaoScenarioCompileResult
  render(outputPath: string): Promise<CompiledTaoScenarioRenderResult> | CompiledTaoScenarioRenderResult
  cleanup(): void | Promise<void>
}): CompiledTaoScenarioAdapter {
  return {
    compileScenario({ scenarioDir, scenarioName, scenario }) {
      const outputFileName = config.computeOutputFileName(scenarioName)
      return config.compile({
        path: FS.resolvePath(scenarioDir, `${scenarioName}.tao`),
        stdLibRoot: config.stdLibRoot,
        outputFileName,
        app: scenario.app,
      })
    },
    renderCompiledApp: ({ outputPath }) => config.render(outputPath),
    cleanup: () => config.cleanup(),
  }
}

const repoRootDir = FS.resolvePath(__dirname, '../../../..')
const compiledTaoScenariosRootDir = FS.resolvePath(repoRootDir, 'Apps', 'Test Apps')

/** getCompiledTaoScenariosRootDir returns the repo’s `Apps/Test Apps` directory (each subfolder is one scenario). */
export function getCompiledTaoScenariosRootDir() {
  return compiledTaoScenariosRootDir
}

/** discoverCompiledTaoScenarios visits every immediate subdirectory of `rootDir` (sorted by path). When
 * `scenario.json` is missing, returns `skip: true` and `scenario: undefined`. When the file exists, loads
 * and validates via `loadCompiledTaoScenario` (throws on invalid shape). The returned `skip` is the scenario’s
 * `skip` field (boolean or string reason), or `true` when the file is absent. */
export function discoverCompiledTaoScenarios(rootDir = compiledTaoScenariosRootDir): DiscoveredCompiledTaoScenario[] {
  return FS.readDirWithFileTypes(rootDir)
    .filter(entry => entry.isDirectory())
    .map(entry => FS.resolvePath(rootDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .map(scenarioDir => {
      const scenarioPath = FS.resolvePath(scenarioDir, 'scenario.json')
      if (!FS.existsSync(scenarioPath)) {
        return { scenarioDir, scenario: undefined, skip: true }
      }
      const scenario = loadCompiledTaoScenario(scenarioDir)
      return { scenarioDir, scenario, skip: scenario.skip }
    })
}

/** loadCompiledTaoScenario reads `${scenarioDir}/scenario.json`, parses it, and validates shape */
export function loadCompiledTaoScenario(scenarioDir: string): CompiledTaoScenario {
  const scenarioPath = FS.resolvePath(scenarioDir, 'scenario.json')
  const rawScenario = JSON.parse(FS.readTextFile(scenarioPath)) as unknown

  return parseCompiledTaoScenario(rawScenario, scenarioPath)
}

/** runScenario drives the adapter lifecycle: `cleanup()` → compile → render → run steps. */
export async function runScenario(opts: {
  scenarioDir: string
  scenarioName: string
  scenario: CompiledTaoScenario
  adapter: CompiledTaoScenarioAdapter
}) {
  if (opts.scenario.skip) {
    return
  }

  await opts.adapter.cleanup()

  try {
    const compileResult = await opts.adapter.compileScenario({
      scenarioDir: opts.scenarioDir,
      scenarioName: opts.scenarioName,
      scenario: opts.scenario,
    })
    const renderResult = await opts.adapter.renderCompiledApp({
      outputPath: compileResult.outputPath,
      scenarioDir: opts.scenarioDir,
      scenario: opts.scenario,
    })

    for (const step of opts.scenario.steps) {
      await runStep(step, renderResult)
    }
  } finally {
    await opts.adapter.cleanup()
  }
}

/** parseCompiledTaoScenario parses and validates scenario JSON; throws descriptive `Error`s referencing `scenarioPath`. */
function parseCompiledTaoScenario(rawScenario: unknown, scenarioPath: string): CompiledTaoScenario {
  if (!isRecord(rawScenario)) {
    throw new Error(`Scenario must be an object: ${scenarioPath}`)
  }

  const { steps } = rawScenario
  if (!Array.isArray(steps)) {
    throw new Error(`Scenario must include a "steps" array: ${scenarioPath}`)
  }

  return {
    skip: rawScenario['skip'] as boolean | string,
    app: parseScenarioAppOverrides(rawScenario['app'], scenarioPath),
    steps: steps.map((step, index) => parseStep(step, scenarioPath, index)),
  }
}

/** parseScenarioAppOverrides validates optional scenario-level app compile overrides. */
function parseScenarioAppOverrides(value: unknown, scenarioPath: string): TaoScenarioAppConfigObject | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isScenarioAppConfigObject(value)) {
    throw new Error(`Scenario "app" must be an object when present: ${scenarioPath}`)
  }
  return value
}

/** isScenarioAppConfigObject returns true when value is a nested app config object with string leaves. */
function isScenarioAppConfigObject(value: unknown): value is TaoScenarioAppConfigObject {
  if (!isRecord(value)) {
    return false
  }
  return Object.values(value).every(val => typeof val === 'string' || isScenarioAppConfigObject(val))
}

const STEP_KEYS = ['assertVisibleText', 'assertInputValue', 'pressVisibleText', 'typeText'] as const

/** parseStep parses one step object with exactly one supported key. */
function parseStep(rawStep: unknown, scenarioPath: string, stepIndex: number): CompiledTaoScenarioStep {
  if (!isRecord(rawStep)) {
    throw new Error(`Scenario step must be an object: ${scenarioPath}#${stepIndex}`)
  }

  const present = STEP_KEYS.filter(k => rawStep[k] !== undefined)
  if (present.length !== 1) {
    throw new Error(
      `Scenario step must have exactly one of ${
        STEP_KEYS.map(k => JSON.stringify(k)).join(', ')
      }: ${scenarioPath}#${stepIndex}`,
    )
  }

  const key = present[0]
  switch (key) {
    case 'assertVisibleText': {
      const text = parseNonEmptyString(rawStep[key], key, scenarioPath, stepIndex)
      return { type: 'assertVisibleText', text }
    }
    case 'assertInputValue':
      return parseInputValueStep(rawStep[key], key, scenarioPath, stepIndex)
    case 'pressVisibleText': {
      const text = parseNonEmptyString(rawStep[key], key, scenarioPath, stepIndex)
      return { type: 'pressVisibleText', text }
    }
    case 'typeText':
      return parseInputValueStep(rawStep[key], key, scenarioPath, stepIndex)
  }
}

function parseInputValueStep(
  value: unknown,
  key: 'assertInputValue' | 'typeText',
  scenarioPath: string,
  stepIndex: number,
): Extract<CompiledTaoScenarioStep, { type: typeof key }> {
  if (!isRecord(value)) {
    throw new Error(`Scenario step ${JSON.stringify(key)} must be an object: ${scenarioPath}#${stepIndex}`)
  }
  const stepValue = parseString(value['value'], `${key}.value`, scenarioPath, stepIndex)
  return {
    target: parseTextInputTarget(value, key, scenarioPath, stepIndex),
    type: key,
    value: stepValue,
  } as Extract<CompiledTaoScenarioStep, { type: typeof key }>
}

function parseTextInputTarget(
  value: Record<string, unknown>,
  key: string,
  scenarioPath: string,
  stepIndex: number,
): CompiledTaoTextInputTarget {
  const targetKeys = ['placeholder', 'label', 'testID', 'text'] as const
  const present = targetKeys.filter(targetKey => value[targetKey] !== undefined)
  if (present.length !== 1) {
    throw new Error(
      `Scenario step ${JSON.stringify(key)} must target exactly one of ${
        targetKeys.map(targetKey => JSON.stringify(targetKey)).join(', ')
      }: ${scenarioPath}#${stepIndex}`,
    )
  }
  const targetKey = present[0]
  const targetValue = parseNonEmptyString(value[targetKey], `${key}.${targetKey}`, scenarioPath, stepIndex)
  return { [targetKey]: targetValue } as CompiledTaoTextInputTarget
}

function parseNonEmptyString(value: unknown, key: string, scenarioPath: string, stepIndex: number): string {
  const parsed = parseString(value, key, scenarioPath, stepIndex)
  if (parsed.length === 0) {
    throw new Error(`Scenario step ${JSON.stringify(key)} must be non-empty: ${scenarioPath}#${stepIndex}`)
  }
  return parsed
}

function parseString(value: unknown, key: string, scenarioPath: string, stepIndex: number): string {
  if (typeof value !== 'string') {
    throw new Error(`Scenario step ${JSON.stringify(key)} must be a string: ${scenarioPath}#${stepIndex}`)
  }
  return value
}

/** runStep runs one scenario step against the rendered app. */
async function runStep(step: CompiledTaoScenarioStep, renderResult: CompiledTaoScenarioRenderResult) {
  switch (step.type) {
    case 'assertVisibleText':
      if (renderResult.waitFor) {
        await renderResult.waitFor(() => {
          if (renderResult.queryAllByText) {
            if (renderResult.queryAllByText(step.text).length === 0) {
              renderResult.getByText(step.text)
            }
            return
          }
          renderResult.getByText(step.text)
        })
        return
      }
      if (renderResult.queryAllByText) {
        if (renderResult.queryAllByText(step.text).length === 0) {
          renderResult.getByText(step.text)
        }
        return
      }
      renderResult.getByText(step.text)
      return
    case 'pressVisibleText':
      renderResult.pressVisibleText(step.text)
      return
    case 'typeText':
      renderResult.typeText(step.target, step.value)
      return
    case 'assertInputValue':
      if (renderResult.waitFor) {
        await renderResult.waitFor(() => renderResult.assertInputValue(step.target, step.value))
        return
      }
      renderResult.assertInputValue(step.target, step.value)
      return
  }
}

/** isRecord returns true when value is a non-null object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
