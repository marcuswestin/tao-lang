import { readdirSync, readFileSync } from 'node:fs'
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
  scenario: CompiledTaoScenario
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

// getCompiledTaoScenariosRootDir Return the shared compiled Tao scenario root directory.
export function getCompiledTaoScenariosRootDir() {
  return compiledTaoScenariosRootDir
}

// discoverCompiledTaoScenarios Load all shared compiled Tao scenarios in deterministic order.
export function discoverCompiledTaoScenarios(rootDir = compiledTaoScenariosRootDir): DiscoveredCompiledTaoScenario[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => resolvePath(rootDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .map(scenarioDir => ({
      scenarioDir,
      scenario: loadCompiledTaoScenario(scenarioDir),
    }))
}

// loadCompiledTaoScenario Load and validate a single shared compiled Tao scenario.
export function loadCompiledTaoScenario(scenarioDir: string): CompiledTaoScenario {
  const scenarioPath = resolvePath(scenarioDir, 'scenario.json')
  const rawScenario = JSON.parse(readFileSync(scenarioPath, 'utf8')) as unknown

  return parseCompiledTaoScenario(rawScenario, scenarioPath)
}

// runScenario Compile, render, and assert a shared compiled Tao scenario.
export async function runScenario(opts: {
  scenarioDir: string
  scenario: CompiledTaoScenario
  adapter: CompiledTaoScenarioAdapter
}) {
  await opts.adapter.cleanup()

  try {
    const compileResult = await opts.adapter.compileScenario({
      scenarioDir: opts.scenarioDir,
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

function runAssertion(assertion: CompiledTaoScenarioAssertion, renderResult: CompiledTaoScenarioRenderResult) {
  switch (assertion.type) {
    case 'textVisible':
      renderResult.getByText(assertion.text)
      return
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
