import { compileTao, generateTaoDesignSuggestions } from '@compiler'
import type { TaoDesignLock } from '@compiler/design/design-lock'
import {
  buildTaoDesignLLMPrompt,
  createFixtureDesignSuggestionProvider,
  createTaoDesignLLMProvider,
  normalizeLLMDesignOutput,
  type TaoDesignCommandRunner,
  taoDesignLLMOutputSchema,
  type TaoDesignSuggestionProviderInput,
} from '@compiler/design/design-suggestion-provider'
import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'

const STD_LIB_ROOT = FS.resolvePath(__dirname, '../../tao-std-lib')

describe('UI design LLM provider:', () => {
  test('builds a prompt and schema from design requirements', () => {
    const input = designProviderInput()
    input.acceptedLock = acceptedPromptLock(input)
    const prompt = buildTaoDesignLLMPrompt(input)
    const schema = taoDesignLLMOutputSchema()

    expect(prompt).toContain('Generate a beautiful, restrained native React Native design theme')
    expect(prompt).toContain('app/main#PrimaryAction')
    expect(prompt).toContain('"brand.primary": "#2563EB"')
    expect(prompt).toContain('"pressed"')
    expect(prompt).toContain('backgroundColor')
    expect(stableJson(schema)).toContain('backgroundColor')
    expect(stableJson(schema)).toContain('baseStyle')
  })

  test('normalizes schema-valid provider output into lock entries', () => {
    const input = designProviderInput()
    const entries = normalizeLLMDesignOutput(input, validProviderOutput(input), 'codex-cli', 'gpt-test')

    expect(entries).toHaveLength(input.requirements.length)
    expect(entries[0]!.status).toBe('suggested')
    expect(entries[0]!.provenance.model).toBe('codex-cli:gpt-test')
    expect(entries[0]!.resolved.tokens?.['color']).toEqual({
      'brand.primary': '#2563EB',
      'text.body': '#1E293B',
    })
  })

  test('rejects missing, extra, unsupported, and invalid provider output', () => {
    const input = designProviderInput()
    const valid = validProviderOutput(input)
    expect(() =>
      normalizeLLMDesignOutput(
        input,
        { ...valid, entries: valid.entries.slice(0, 1) },
        'codex-cli',
        'gpt-test',
      )
    ).toThrow('missing required entry')

    expect(() =>
      normalizeLLMDesignOutput(
        input,
        { ...valid, entries: [...valid.entries, { ...valid.entries[0], identity: 'app/main#Unknown' }] },
        'codex-cli',
        'gpt-test',
      )
    ).toThrow('unknown entry')

    expect(() =>
      normalizeLLMDesignOutput(
        input,
        {
          ...valid,
          entries: [{ ...valid.entries[0]!, baseStyle: [{ key: 'position', value: 'absolute' }] }, valid.entries[1]!],
        },
        'codex-cli',
        'gpt-test',
      )
    ).toThrow('Unsupported React Native style key')

    expect(() =>
      normalizeLLMDesignOutput(
        input,
        {
          ...valid,
          entries: [
            { ...valid.entries[0]!, baseStyle: [{ key: 'backgroundColor', value: 'blue' }] },
            valid.entries[1]!,
          ],
        },
        'codex-cli',
        'gpt-test',
      )
    ).toThrow('Expected #RRGGBB color')
  })

  test('codex provider uses a read-only non-interactive command and parses JSON from stdout', async () => {
    const input = designProviderInput()
    let capturedCommand = ''
    let capturedArgs: readonly string[] = []
    let capturedTimeout = 0
    let capturedMaxOutput = 0
    const runner: TaoDesignCommandRunner = async (command, args, opts) => {
      capturedCommand = command
      capturedArgs = args
      capturedTimeout = opts.timeoutMs ?? 0
      capturedMaxOutput = opts.maxOutputBytes ?? 0
      return {
        status: 0,
        stderr: '',
        stdout: `Some preface {"example": true}\n${JSON.stringify(validProviderOutput(input))}\nTrailing { incomplete`,
      }
    }

    const result = await createTaoDesignLLMProvider({
      commandRunner: runner,
      model: 'gpt-test',
      provider: 'codex-cli',
    })(input)

    expect(capturedCommand).toBe('codex')
    expect(capturedArgs).toContain('exec')
    expect(capturedArgs).toContain('read-only')
    expect(capturedArgs).toContain('never')
    expect(capturedTimeout).toBe(120000)
    expect(capturedMaxOutput).toBe(5 * 1024 * 1024)
    expect(result.analyzer.profile).toBe('codex-cli')
    expect(result.entries).toHaveLength(input.requirements.length)
  })

  test('codex provider retries once when stdout fails validation', async () => {
    const input = designProviderInput()
    const prompts: string[] = []
    const runner: TaoDesignCommandRunner = async (_command, args) => {
      prompts.push(args[args.length - 1]!)
      if (prompts.length === 1) {
        return {
          status: 0,
          stderr: '',
          stdout: JSON.stringify({ entries: [] }),
        }
      }
      return {
        status: 0,
        stderr: '',
        stdout: JSON.stringify(validProviderOutput(input)),
      }
    }

    const result = await createTaoDesignLLMProvider({
      commandRunner: runner,
      provider: 'codex-cli',
    })(input)

    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toContain('previous output failed Tao design validation')
    expect(prompts[1]).toContain('Expected theme to be an object')
    expect(result.entries).toHaveLength(input.requirements.length)
  })

  test('claude provider uses json-schema output and parses wrapped result JSON', async () => {
    const input = designProviderInput()
    let capturedArgs: readonly string[] = []
    const runner: TaoDesignCommandRunner = async (_command, args) => {
      capturedArgs = args
      return {
        status: 0,
        stderr: '',
        stdout: JSON.stringify({ result: JSON.stringify(validProviderOutput(input)) }),
      }
    }

    const result = await createTaoDesignLLMProvider({
      commandRunner: runner,
      model: 'sonnet-test',
      provider: 'claude-cli',
    })(input)

    expect(capturedArgs).toContain('--json-schema')
    expect(capturedArgs).toContain('--tools')
    expect(result.analyzer.profile).toBe('claude-cli')
    expect(result.entries[0]!.provenance.model).toBe('claude-cli:sonnet-test')
  })

  test('provider command failures do not produce lock entries', async () => {
    const input = designProviderInput()
    const runner: TaoDesignCommandRunner = async () => ({
      status: 1,
      stderr: 'not authenticated',
      stdout: '',
    })

    await expect(
      createTaoDesignLLMProvider({
        commandRunner: runner,
        provider: 'codex-cli',
      })(input),
    ).rejects.toThrow('not authenticated')
  })

  test('provider command not-found errors are actionable', async () => {
    const input = designProviderInput()
    const runner: TaoDesignCommandRunner = async () => {
      const error = new Error('spawn codex ENOENT') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      throw error
    }

    await expect(
      createTaoDesignLLMProvider({
        commandRunner: runner,
        provider: 'codex-cli',
      })(input),
    ).rejects.toThrow('codex CLI not found in PATH')
  })

  test('fixture provider writes hermetic rich suggestions without model calls', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      const review = await generateTaoDesignSuggestions({
        file: appPath,
        stdLibRoot: STD_LIB_ROOT,
        suggestionProvider: createFixtureDesignSuggestionProvider(),
      })

      expect(review.lock.analyzer.profile).toBe('fixture-provider')
      expect(FS.readTextFile(review.suggestionPath)).toContain('brand.primary')
      expect(Object.values(review.lock.entries).some(entry => Object.keys(entry.resolved.baseStyle).length > 0)).toBe(
        true,
      )
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('compile remains deterministic and does not require any LLM provider', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      const development = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      expect(development.ok).toBe(true)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })
})

function designProviderInput(): TaoDesignSuggestionProviderInput {
  const requirements = [
    designRequirement('app/main#PrimaryAction', 'Button', ['PrimaryAction', 'Button'], 'main positive action'),
    designRequirement('app/main#BodyCopy', 'Text', ['BodyCopy', 'Text'], 'plain readable body copy'),
  ]
  return {
    appDesignDescription: 'calm launch operations dashboard',
    deterministicEntries: [],
    requirements,
  }
}

function designRequirement(identity: string, rootName: string, variantChain: string[], description: string) {
  return {
    description,
    designSpecIdentity: `${identity}|app:calm launch operations dashboard|spec:${description}`,
    identity,
    input: {
      analyzerVersion: 'deterministic-local-v1',
      appDesignDescription: 'calm launch operations dashboard',
      declarationKind: 'variant',
      designSpec: description,
      name: variantChain[0],
      rootKind: 'ui',
      rootName,
      schemaVersion: 1,
      sourceIdentity: identity,
      variantChain,
    },
    inputHash: `hash-${identity}`,
    kind: 'variant',
    rootName,
    sourceIdentity: identity,
    variantChain,
  }
}

function acceptedPromptLock(input: TaoDesignSuggestionProviderInput): TaoDesignLock {
  const req = input.requirements[0]!
  return {
    analyzer: { name: 'deterministic-local', profile: 'local', version: 'deterministic-local-v1' },
    appDesign: { description: input.appDesignDescription },
    entries: {
      [req.identity]: {
        identity: req.identity,
        inputHash: req.inputHash,
        provenance: {
          analyzerVersion: 'deterministic-local-v1',
          chosenRole: 'primary action',
          compositeRole: 'composite.action.primary',
          confidence: 0.91,
          designSpecIdentity: req.designSpecIdentity,
          inputHash: req.inputHash,
          model: 'deterministic-local',
          rationale: 'Accepted prompt fixture.',
          sourceIdentity: req.sourceIdentity,
        },
        resolved: {
          baseStyle: { backgroundColor: '#2563EB', borderRadius: 10 },
          compositeRole: 'composite.action.primary',
          states: { pressed: { opacity: 0.84 } },
          styleKey: 'style.accepted.primary',
          tokens: { color: { 'brand.primary': '#2563EB' } },
        },
        semantic: {
          compositeRole: 'composite.action.primary',
          confidence: 0.91,
          description: req.description,
          designSpecIdentity: req.designSpecIdentity,
          rationale: 'Accepted prompt fixture.',
          role: 'primary action',
          sourceIdentity: req.sourceIdentity,
        },
        status: 'accepted',
      },
    },
    schemaVersion: 1,
  }
}

function validProviderOutput(input: TaoDesignSuggestionProviderInput) {
  return {
    entries: input.requirements.map(req => ({
      baseStyle: req.rootName === 'Button'
        ? [
          { key: 'backgroundColor', value: '#2563EB' },
          { key: 'borderColor', value: '#2563EB' },
          { key: 'borderRadius', value: 10 },
          { key: 'borderWidth', value: 1 },
          { key: 'color', value: '#FFFFFF' },
          { key: 'paddingHorizontal', value: 14 },
          { key: 'paddingVertical', value: 9 },
        ]
        : [
          { key: 'color', value: '#1E293B' },
          { key: 'fontSize', value: 16 },
          { key: 'lineHeight', value: 22 },
        ],
      compositeRole: req.rootName === 'Button' ? 'composite.action.primary' : 'composite.text.body',
      confidence: 0.91,
      darkStyle: req.rootName === 'Button'
        ? [
          { key: 'backgroundColor', value: '#60A5FA' },
          { key: 'borderColor', value: '#60A5FA' },
          { key: 'color', value: '#0F172A' },
        ]
        : [{ key: 'color', value: '#F8FAFC' }],
      identity: req.identity,
      largeTextStyle: req.rootName === 'Text' ? [{ key: 'fontSize', value: 18 }] : [],
      rationale: 'Generated from app description and variant identity.',
      reducedMotionStyle: [],
      regularScreenStyle: [],
      role: req.rootName === 'Button' ? 'primary action' : 'body text',
      states: {
        disabled: req.rootName === 'Button' ? [{ key: 'opacity', value: 0.46 }] : [],
        focused: req.rootName === 'Button' ? [{ key: 'borderWidth', value: 2 }] : [],
        pressed: req.rootName === 'Button' ? [{ key: 'opacity', value: 0.84 }] : [],
        selected: req.rootName === 'Button' ? [{ key: 'borderWidth', value: 2 }] : [],
      },
      tokens: [],
    })),
    theme: {
      name: 'test aurora',
      rationale: 'A coherent test theme.',
      tokens: [
        { category: 'color', name: 'brand.primary', value: '#2563EB' },
        { category: 'color', name: 'text.body', value: '#1E293B' },
      ],
    },
  }
}

function writeDesignApp() {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-design-llm-'))
  const appPath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(
    appPath,
    `
    use Button, Col, Text from @tao/ui

    app DesignApp {
      design { description "Quiet team dashboard" }
      ui Home
    }

    variant PrimaryAction = Button <"main positive action">
    variant BodyCopy = Text <"plain readable body copy">

    ui Home <"calm dashboard home"> {
      render Col {
        BodyCopy "Hello"
        PrimaryAction "Continue", action { }
      }
    }
  `,
  )
  return { appPath, tmpDir }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
