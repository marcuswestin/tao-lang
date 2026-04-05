import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

export type CompiledTaoScenarioAssertion = {
  type: 'textVisible'
  text: string
}

export type CompiledTaoScenario = {
  assertions: CompiledTaoScenarioAssertion[]
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
 * `scenario.json` exists it loads and validates via `loadCompiledTaoScenario` (throws on invalid shape). When
 * the file is missing it returns `isReady: false` and `scenario: undefined` without loading. */
export function discoverCompiledTaoScenarios(rootDir = compiledTaoScenariosRootDir): DiscoveredCompiledTaoScenario[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => resolvePath(rootDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .map(scenarioDir => {
      const isReady = existsSync(resolvePath(scenarioDir, 'scenario.json'))
      return {
        scenarioDir,
        scenario: isReady ? loadCompiledTaoScenario(scenarioDir) : undefined,
        isReady,
      }
    })
}

/** loadCompiledTaoScenario reads `${scenarioDir}/scenario.json`, parses it, and validates shape
 * (`assertions` array; each entry `type: "textVisible"` with non-empty `text`). Throws `Error` with the path
 * in the message when validation fails. */
export function loadCompiledTaoScenario(scenarioDir: string): CompiledTaoScenario {
  const scenarioPath = resolvePath(scenarioDir, 'scenario.json')
  const rawScenario = JSON.parse(readFileSync(scenarioPath, 'utf8')) as unknown

  return parseCompiledTaoScenario(rawScenario, scenarioPath)
}

/** runScenario drives the adapter lifecycle: `cleanup()` before work, then compile → render → run each assertion,
 * then `cleanup()` again in `finally`. Assertion behavior depends on `renderResult.getByText` (e.g. testing-library
 * will throw if text is missing). Any adapter or compile error propagates to the caller. */
export async function runScenario(opts: {
  scenarioDir: string
  scenarioName: string
  scenario: CompiledTaoScenario
  adapter: CompiledTaoScenarioAdapter
}) {
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

    for (const assertion of opts.scenario.assertions) {
      runAssertion(assertion, renderResult)
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

  const { assertions } = rawScenario
  if (!Array.isArray(assertions)) {
    throw new Error(`Scenario must include an "assertions" array: ${scenarioPath}`)
  }

  return {
    assertions: assertions.map((assertion, index) => parseAssertion(assertion, scenarioPath, index)),
  }
}

/** parseAssertion parses one assertion object; only `textVisible` is supported today. */
function parseAssertion(
  rawAssertion: unknown,
  scenarioPath: string,
  assertionIndex: number,
): CompiledTaoScenarioAssertion {
  if (!isRecord(rawAssertion)) {
    throw new Error(`Scenario assertion must be an object: ${scenarioPath}#${assertionIndex}`)
  }

  if (rawAssertion['type'] !== 'textVisible') {
    throw new Error(`Unsupported scenario assertion type: ${scenarioPath}#${assertionIndex}`)
  }
  if (typeof rawAssertion['text'] !== 'string' || rawAssertion['text'].length === 0) {
    throw new Error(`Scenario assertion must include non-empty "text": ${scenarioPath}#${assertionIndex}`)
  }

  return {
    type: 'textVisible',
    text: rawAssertion['text'],
  }
}

/** runAssertion delegates to `renderResult.getByText` for `textVisible` (callers usually rely on that to throw
 * when the string is absent from the tree). */
function runAssertion(assertion: CompiledTaoScenarioAssertion, renderResult: CompiledTaoScenarioRenderResult) {
  switch (assertion.type) {
    case 'textVisible':
      renderResult.getByText(assertion.text)
      return
  }
}

/** isRecord returns true when value is a non-null object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
