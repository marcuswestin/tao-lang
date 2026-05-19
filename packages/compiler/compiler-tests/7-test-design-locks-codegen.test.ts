import {
  acceptTaoDesignSuggestions,
  compileTao,
  compileTaoSource,
  generateTaoDesignSuggestions,
} from '@compiler/compiler-main'
import { makeEmptyDesignLock, stableStringify, type TaoDesignLock } from '@compiler/design/design-lock'
import { FS } from '@shared'
import { describe, expect, test } from './test-utils/test-harness'

const STD_LIB_ROOT = FS.resolvePath(FS.joinPath(__dirname, '../../tao-std-lib'))

describe('UI design inference locks and codegen:', () => {
  test('writes deterministic suggestions, accepted locks, and production compiles', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      const accepted = await acceptTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      expect(FS.isFile(accepted.suggestionPath)).toBe(true)
      expect(FS.isFile(accepted.acceptedPath)).toBe(true)
      expect(accepted.diagnostics.some(d => d.kind === 'new-entry')).toBe(true)
      expect(Object.values(accepted.lock.entries).every(entry => entry.status === 'accepted')).toBe(true)
      expect(FS.readTextFile(accepted.acceptedPath)).toBe(`${stableStringify(accepted.lock)}\n`)

      const locked = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT, designMode: 'production' })
      expect(locked.ok).toBe(true)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('production rejects missing or stale locks while body edits do not stale entries', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      const missing = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT, designMode: 'production' })
      expect(missing.ok).toBe(false)
      if (!missing.ok) {
        expect(missing.errorReport.getHumanErrorMessage()).toContain('Missing accepted design lock')
      }

      const accepted = await acceptTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      const lock = JSON.parse(FS.readTextFile(accepted.acceptedPath)) as TaoDesignLock
      lock.generatedAt = '2099-01-01T00:00:00.000Z'
      FS.writeFile(accepted.acceptedPath, `${stableStringify(lock)}\n`)

      FS.writeFile(appPath, designAppSource({ text: 'Hello after body edit' }))
      const bodyEdit = await generateTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      expect(bodyEdit.diagnostics.some(d => d.kind === 'changed-entry' || d.kind === 'stale-entry')).toBe(false)

      FS.writeFile(appPath, designAppSource({ spec: 'secondary dashboard home' }))
      const stale = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT, designMode: 'production' })
      expect(stale.ok).toBe(false)
      if (!stale.ok) {
        expect(stale.errorReport.getHumanErrorMessage()).toContain('Stale accepted design entry')
      }
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('production rejects malformed accepted locks', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      const acceptedPath = FS.joinPath(tmpDir, 'tao.design.lock')
      const lock = makeEmptyDesignLock({ description: 'Quiet team dashboard' })
      lock.schemaVersion = 999
      FS.writeFile(acceptedPath, `${stableStringify(lock)}\n`)

      const result = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT, designMode: 'production' })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        const message = result.errorReport.getHumanErrorMessage()
        expect(message).toContain('Invalid Tao design lock')
        expect(message).toContain('schemaVersion must be 1')
      }
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('deterministic fallback uses one app palette across roles', async () => {
    const { appPath, tmpDir } = writePaletteApp()
    try {
      const review = await generateTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      const entries = Object.values(review.lock.entries)
      const primary = entries.find(entry => entry.identity.endsWith('#PrimaryAction'))
      const secondary = entries.find(entry => entry.identity.endsWith('#SecondaryAction'))

      expect(primary?.semantic.compositeRole).toBe('composite.action.primary')
      expect(secondary?.semantic.compositeRole).toBe('composite.action.secondary')
      expect(primary?.resolved.baseStyle['backgroundColor']).toBeDefined()
      expect(secondary?.resolved.baseStyle['borderColor']).toBeDefined()
      expect(primary?.resolved.baseStyle['backgroundColor']).toBe(secondary?.resolved.baseStyle['borderColor'])
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('suggestion update drops stale accepted entries and labels changed entries', async () => {
    const { appPath, tmpDir } = writeDesignApp()
    try {
      await acceptTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      FS.writeFile(appPath, designAppSource({ includeVariant: false, spec: 'secondary dashboard home' }))
      const review = await generateTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })

      expect(review.diagnostics.some(d => d.kind === 'changed-entry')).toBe(true)
      expect(review.diagnostics.some(d => d.kind === 'stale-entry')).toBe(true)
      expect(Object.keys(review.lock.entries).some(identity => identity.includes('#HomeVariant'))).toBe(false)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('bootstrap emits centered content frame with screen-size aware padding', async () => {
    const result = await compileDesignSource(designAppSource())
    const bootstrap = result.files.find(f => f.relativePath === 'app-bootstrap.tsx')?.content ?? ''

    expect(bootstrap).toContain('_compiledTaoAppContentFrameStyle')
    expect(bootstrap).toContain('_compiledTaoAppContentMaxWidth = 720')
    expect(bootstrap).toContain('alignSelf:')
    expect(bootstrap).toContain('_compiledTaoAppContentCompactPadding')
    expect(bootstrap).toContain('_compiledTaoAppContentRegularPadding')
    expect(bootstrap).toContain("_taoDesignContext.screenSize === 'compact'")
    expect(bootstrap).toContain('<RN.View style={_compiledTaoAppContentFrameStyle(_taoDesignContext)}')
  })

  test('bootstrap emits a seeded accent name and passes it through TaoDesignProvider', async () => {
    const result = await compileDesignSource(designAppSource())
    const bootstrap = result.files.find(f => f.relativePath === 'app-bootstrap.tsx')?.content ?? ''

    expect(bootstrap).toMatch(/const _compiledTaoAppAccentName = "(blue|teal|green|amber|rose|indigo)"/)
    expect(bootstrap).toContain('accentName: _compiledTaoAppAccentName')
    expect(bootstrap).toContain('<TaoDesignProvider value={_compiledTaoAppDesignContextOverrides}>')
  })

  test('generated modules import design runtime and every referenced style key exists', async () => {
    const result = await compileDesignSource(designAppSource())
    const designModule = result.files.find(f => f.relativePath === 'tao-design.ts')?.content ?? ''
    const bootstrap = result.files.find(f => f.relativePath === 'app-bootstrap.tsx')?.content ?? ''
    const emitted = result.files.map(f => f.content).join('\n')
    const referencedStyleKeys = [...emitted.matchAll(/resolveStyle\("([^"]+)"/g)].map(match => match[1]!)

    expect(designModule).toContain(
      "import { createTaoDesign, type TaoDesignInput } from './use/@tao/tao-runtime/tao-design-runtime'",
    )
    expect(designModule).not.toContain('@ts-nocheck')
    expect(designModule).not.toContain('tokens:')
    expect(designModule).not.toContain('adaptations: {}')
    expect(designModule).not.toContain('states: {}')
    expect(emitted).toContain('TaoDesignProvider')
    expect(bootstrap).toContain('_compiledTaoAppRootBackground')
    expect(bootstrap).not.toContain("backgroundColor: 'black'")
    expect(referencedStyleKeys.length).toBeGreaterThan(0)
    for (const styleKey of referencedStyleKeys) {
      expect(designModule).toContain(JSON.stringify(styleKey))
    }
  })

  test('variant wrappers pass target design style before variant style', async () => {
    const result = await compileDesignSource(variantButtonAppSource())
    const emitted = result.files.map(f => f.content).join('\n')
    const variantWrapper = emitted.match(/const PrimaryAction = function PrimaryAction_View[\s\S]*?\n      }/)?.[0]
      ?? ''

    expect(variantWrapper).toContain('<Button {..._ViewProps} _taoDesignStyle={(state) => [resolveStyle("style.')
    expect(variantWrapper).toContain("_ViewProps._taoDesignStyle === 'function'")
  })

  test('variant wrappers preserve styled target view declarations', async () => {
    const result = await compileDesignSource(variantViewAppSource())
    const emitted = result.files.map(f => f.content).join('\n')
    const variantWrapper = emitted.match(/const FeaturedHome = function FeaturedHome_View[\s\S]*?\n      }/)?.[0]
      ?? ''

    expect(variantWrapper).toContain('<Home {..._ViewProps} _taoDesignStyle={[resolveStyle("style.')
    expect(variantWrapper).toContain('_ViewProps._taoDesignStyle]}')
  })

  test('warning panel specs infer warning surface instead of warning action', async () => {
    const { appPath, tmpDir } = writeWarningPanelApp()
    try {
      const review = await generateTaoDesignSuggestions({ file: appPath, stdLibRoot: STD_LIB_ROOT })
      const warning = Object.values(review.lock.entries).find(entry => entry.identity.endsWith('#WarningPanel'))

      expect(warning?.semantic.compositeRole).toBe('composite.surface.warning')
      expect(warning?.resolved.baseStyle['backgroundColor']).toBe('#fff7ed')
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })
})

function writeDesignApp(opts: DesignAppSourceOpts = {}) {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-design-inference-'))
  const appPath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(appPath, designAppSource(opts))
  return { appPath, tmpDir }
}

async function compileDesignSource(source: string) {
  const result = await compileTaoSource({ source, stdLibRoot: STD_LIB_ROOT })
  if (!result.ok) {
    throw new Error(result.errorReport.getHumanErrorMessage())
  }
  return result
}

function writePaletteApp() {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-design-palette-'))
  const appPath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(
    appPath,
    `
    use Button, Col from @tao/ui

    app DesignApp {
      design { description "Focused productivity tool" }
      ui Root
    }

    variant PrimaryAction = Button <"primary action">
    variant SecondaryAction = Button <"secondary quiet action">

    ui Root {
      render Col {
        PrimaryAction "Save", action { }
        SecondaryAction "Cancel", action { }
      }
    }
  `,
  )
  return { appPath, tmpDir }
}

function variantButtonAppSource() {
  return `
    use Button from @tao/ui

    app DesignApp {
      design { description "Focused productivity tool" }
      ui Root
    }

    variant PrimaryAction = Button <"primary add action">

    ui Root {
      render PrimaryAction "Add", action { }
    }
  `
}

function variantViewAppSource() {
  return `
    use Button, Col from @tao/ui

    app DesignApp {
      design { description "Focused productivity tool" }
      ui Root
    }

    variant FeaturedHome = Home <"featured home treatment">

    ui Home <"base home screen surface"> {
      render Col {
        Button "Save", action { }
      }
    }

    ui Root {
      render FeaturedHome
    }
  `
}

function writeWarningPanelApp() {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-design-warning-panel-'))
  const appPath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(
    appPath,
    `
    use Box from @tao/ui

    app DesignApp {
      design { description "Focused productivity tool" }
      ui Root
    }

    ui WarningPanel <"warning panel"> {
      render Box
    }

    ui Root {
      render WarningPanel
    }
  `,
  )
  return { appPath, tmpDir }
}

type DesignAppSourceOpts = {
  includeVariant?: boolean
  spec?: string
  text?: string
}

function designAppSource(opts: DesignAppSourceOpts = {}) {
  const includeVariant = opts.includeVariant ?? true
  const rootName = includeVariant ? 'HomeVariant' : 'Home'
  const variant = includeVariant ? 'variant HomeVariant = Home <"default home variant">\n\n' : ''
  return `
    use Row, Text from @tao/ui

    app DesignApp {
      design { description "Quiet team dashboard" }
      ui ${rootName}
    }

    ${variant}ui Home <"${opts.spec ?? 'primary dashboard home'}"> {
      render Row {
        Text "${opts.text ?? 'Hello'}"
      }
    }
  `
}
