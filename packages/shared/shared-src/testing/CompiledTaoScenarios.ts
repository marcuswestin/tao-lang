import * as FS from '../fs'

export type CompiledTaoScenarioStep =
  | { type: 'assertVisibleText'; text: string }
  | { type: 'pressVisibleText'; text: string }

export type CompiledTaoScenario = {
  /** When truthy, shared scenario tests skip this folder: `true`, missing file, or a string reason for `test.todo`. */
  skip: boolean | string
  steps: CompiledTaoScenarioStep[]
}

export type DiscoveredCompiledTaoScenario = {
  scenarioDir: string
  scenario: CompiledTaoScenario | undefined
  skip: boolean | string
}

export type CompiledTaoScenarioCompileResult = {
  outputPath: string
}

export type CompiledTaoScenarioRenderResult = {
  getByText(text: string): unknown
  /** When present (e.g. RTL screen), duplicate visible text matches `assertVisibleText` without throwing. */
  queryAllByText?(text: string): unknown[]
  /** When present, `pressVisibleText` prefers the first matching pressable button by accessible name. */
  queryAllByRole?(role: string, options?: { name: string }): unknown[]
  /** pressVisibleText dispatches a press on the element returned by `getByText` (e.g. Testing Library `fireEvent.press`). */
  pressVisibleText(text: string): void
}

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
    compileScenario({ scenarioDir, scenarioName }) {
      const outputFileName = config.computeOutputFileName(scenarioName)
      return config.compile({
        path: FS.resolvePath(scenarioDir, `${scenarioName}.tao`),
        stdLibRoot: config.stdLibRoot,
        outputFileName,
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
      runStep(step, renderResult)
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
    steps: steps.map((step, index) => parseStep(step, scenarioPath, index)),
  }
}

const STEP_KEYS = ['assertVisibleText', 'pressVisibleText'] as const

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
  const text = rawStep[key]
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`Scenario step ${JSON.stringify(key)} must be a non-empty string: ${scenarioPath}#${stepIndex}`)
  }

  switch (key) {
    case 'assertVisibleText':
      return { type: 'assertVisibleText', text }
    case 'pressVisibleText':
      return { type: 'pressVisibleText', text }
  }
}

/** runStep runs one scenario step against the rendered app. */
function runStep(step: CompiledTaoScenarioStep, renderResult: CompiledTaoScenarioRenderResult) {
  switch (step.type) {
    case 'assertVisibleText':
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
  }
}

/** isRecord returns true when value is a non-null object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
