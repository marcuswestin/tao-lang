import { FS } from '@shared'
import {
  discoverCompiledTaoScenarios,
  runScenario,
} from '@shared/testing'
import { createExpoScenarioAdapter } from '../test-runtime'

const expoScenarioAllowList = new Set(['Layout Showcase', 'Navigation', 'Simple test render', 'Std lib text render'])
// Expo scenario tests compile through the runtime package before rendering; React Navigation adds enough
// module initialization that the default Jest timeout is tight on cold local runs.
const expoScenarioTimeoutMs = 15_000

const expoSharedScenarios = discoverCompiledTaoScenarios()
  .filter(({ scenarioDir }) => expoScenarioAllowList.has(FS.basename(scenarioDir)))

describe('expo runtime shared scenarios', () => {
  for (const { scenarioDir, scenario, skip } of expoSharedScenarios) {
    const scenarioName = FS.basename(scenarioDir)
    if (skip) {
      test.todo(scenarioName + ' (' + skip + ')')
      continue
    }
    test(scenarioName, async () => {
      await runScenario({
        scenarioName,
        scenarioDir,
        scenario: scenario!,
        adapter: createExpoScenarioAdapter(),
      })
    }, expoScenarioTimeoutMs)
  }
})
