import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

export type CompiledTaoScenarioStep =
  | { type: 'assertVisibleText'; text: string }
  | { type: 'pressVisibleText'; text: string }

export type CompiledTaoScenario = {
  /** When true, `discoverCompiledTaoScenarios` sets `isReady: false` (same as missing `scenario.json`). */
  skip: boolean
  steps: CompiledTaoScenarioStep[]
}

export type DiscoveredCompiledTaoScenario = {
  scenarioDir: string
  scenario: CompiledTaoScenario | undefined
  isReady: boolean
}

export type CompiledTaoScenarioCompileResult = {
  outputPath: string
}

export type CompiledTaoScenarioRenderResult = {
  getByText(text: string): unknown
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

const repoRootDir = resolvePath(__dirname, '../../..')
const compiledTaoScenariosRootDir = resolvePath(repoRootDir, 'Apps', 'Test Apps')

/** getCompiledTaoScenariosRootDir returns the repo’s `Apps/Test Apps` directory (each subfolder is one scenario). */
export function getCompiledTaoScenariosRootDir() {
  return compiledTaoScenariosRootDir
}

/** discoverCompiledTaoScenarios visits every immediate subdirectory of `rootDir` (sorted by path). When
 * `scenario.json` is missing, returns `isReady: false` and `scenario: undefined`. When the file exists, loads
 * and validates via `loadCompiledTaoScenario` (throws on invalid shape). If parsed `skip` is true, returns
 * `isReady: false` and `scenario: undefined` (treat like not ready to run). */
export function discoverCompiledTaoScenarios(rootDir = compiledTaoScenariosRootDir): DiscoveredCompiledTaoScenario[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => resolvePath(rootDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .map(scenarioDir => {
      const scenarioPath = resolvePath(scenarioDir, 'scenario.json')
      if (!existsSync(scenarioPath)) {
        return { scenarioDir, scenario: undefined, isReady: false }
      }
      const scenario = loadCompiledTaoScenario(scenarioDir)
      const isReady = !scenario.skip
      return { scenarioDir, scenario, isReady }
    })
}

/** loadCompiledTaoScenario reads `${scenarioDir}/scenario.json`, parses it, and validates shape */
export function loadCompiledTaoScenario(scenarioDir: string): CompiledTaoScenario {
  const scenarioPath = resolvePath(scenarioDir, 'scenario.json')
  const rawScenario = JSON.parse(readFileSync(scenarioPath, 'utf8')) as unknown

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
    skip: rawScenario['skip'] === true,
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
