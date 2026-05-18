import { FS } from '@shared'
import { loadCompiledTaoScenario } from '@shared/testing'
import { describe, expect, test } from 'bun:test'

describe('shared:', () => {
  test('FS.tmpdir resolves to a non-empty path', () => {
    expect(FS.tmpdir().length).toBeGreaterThan(0)
  })

  test('scenario parser accepts text input interaction steps', () => {
    const scenario = loadScenario({
      app: { provider: { name: 'Memory' } },
      steps: [
        { typeText: { placeholder: 'New task title', value: 'Buy oat milk' } },
        { assertInputValue: { placeholder: 'New task title', value: '' } },
      ],
    })

    expect(scenario.steps).toEqual([
      { type: 'typeText', target: { placeholder: 'New task title' }, value: 'Buy oat milk' },
      { type: 'assertInputValue', target: { placeholder: 'New task title' }, value: '' },
    ])
  })

  test('scenario parser rejects ambiguous text input targets', () => {
    const scenarioDir = writeScenario({
      steps: [
        { typeText: { label: 'Task', placeholder: 'New task title', value: 'Buy oat milk' } },
      ],
    })

    expect(() => loadCompiledTaoScenario(scenarioDir)).toThrow('must target exactly one')
  })
})

function loadScenario(rawScenario: unknown) {
  return loadCompiledTaoScenario(writeScenario(rawScenario))
}

function writeScenario(rawScenario: unknown): string {
  const scenarioDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-scenario-'))
  FS.writeFile(FS.joinPath(scenarioDir, 'scenario.json'), JSON.stringify(rawScenario))
  return scenarioDir
}
