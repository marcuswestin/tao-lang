import { validationMessages } from '@compiler/validation/tao-lang-validator'
import { FS } from '@shared'
import { expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, expect, parseAST, parseASTWithErrors, parseTaoFully, test } from './test-utils/test-harness'

const STD_LIB_ROOT = FS.resolvePath(FS.joinPath(__dirname, '../../tao-std-lib'))

describe('UI design inference syntax and validation:', () => {
  test('parses app design blocks, declaration specs, and variant chains', async () => {
    const file = await parseAST(
      `
      use Text from @tao/ui

      app DesignApp {
        design { description "Quiet team dashboard" }
        ui DefaultHome
      }

      variant DefaultHome = CompactHome <"primary home variant">
      variant CompactHome = Home

      ui Home <"main dashboard surface"> {
        render Text "Hello"
      }
    `,
      STD_LIB_ROOT,
    )

    const app = file.statements[1].as_AppDeclaration
    app.appStatements.first.as_AppDesignBlock.description.value.segments.first.expect('text').toBe(
      'Quiet team dashboard',
    )
    file.statements[2].as_VariantDeclaration.expect('name').toBe('DefaultHome')
    file.statements[4].as_ViewDeclaration.designSpec.description.segments.first.expect('text').toBe(
      'main dashboard surface',
    )
  })

  test('validates app roots and render calls through variants', async () => {
    await parseTaoFully(
      `
      use Row, Text from @tao/ui

      app DesignApp {
        design { description "Compact app" }
        ui HomeVariant
      }

      variant HomeVariant = Home <"default home">

      ui Home {
        render Row {
          BodyText "Hello"
        }
      }

      variant BodyText = Text <"body copy">
    `,
      STD_LIB_ROOT,
    )
  })

  test('rejects variant cycles', async () => {
    const report = await parseASTWithErrors(`
      variant A = B
      variant B = A
      ui Root {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(report, validationMessages.variantCycle)
  })

  test('rejects interpolated design descriptions and specs', async () => {
    const report = await parseASTWithErrors(`
      alias Name = "dashboard"
      app DesignApp {
        design { description "Quiet \${Name}" }
        ui Root
      }
      ui Root <"Root \${Name}"> {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(report, validationMessages.designStringMustBePlain)
  })

  test('rejects non-string specs and render-site specs', async () => {
    const badDeclaration = await parseASTWithErrors(`
      ui Root <auto> {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expect(badDeclaration.parserErrors.length).toBeGreaterThan(0)

    const badRender = await parseASTWithErrors(
      `
      use Text from @tao/ui
      ui Root {
        render Text <"body"> "Hello"
      }
    `,
      STD_LIB_ROOT,
    )
    expect(badRender.parserErrors.length).toBeGreaterThan(0)
  })
})
