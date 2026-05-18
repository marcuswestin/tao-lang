import { describe, resolveReferences, test } from './test-utils/test-harness'

describe('scope resolution', () => {
  test('alias reference resolves to alias statement', async () => {
    const doc = await resolveReferences(`
      ui MyView {
        render inject \`\`\`ts return null \`\`\`
        alias X = 1
        alias Y = X
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const aliasY = view.block.statements.last.as_AssignmentDeclaration
    aliasY.value.as_MemberAccessExpression.root.as_AssignmentDeclaration.expect('name').toBe('X')
  })

  test('alias used as view argument resolves', async () => {
    const doc = await resolveReferences(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui MyView {
        render inject \`\`\`ts return null \`\`\`
        alias Msg = "hi"
        alias Check = Msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.last.as_AssignmentDeclaration
    alias.value.as_MemberAccessExpression.root.match({ $type: 'AssignmentDeclaration' })
  })

  test('view parameter resolves as identifier reference', async () => {
    const doc = await resolveReferences(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui MyView Label text {
        render inject \`\`\`ts return null \`\`\`
        alias X = Label
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.second.as_AssignmentDeclaration
    alias.value.as_MemberAccessExpression.root.match({ $type: 'ParameterDeclaration' })
  })

  test('multiple aliases resolve independently', async () => {
    const doc = await resolveReferences(`
      ui Text Value text { render inject \`\`\`ts return null \`\`\` }
      ui MyView {
        render inject \`\`\`ts return null \`\`\`
        alias A = "hello"
        alias B = 42
        alias Check = A
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.last.as_AssignmentDeclaration
    alias.value.as_MemberAccessExpression.root.match({ $type: 'AssignmentDeclaration' })
  })
})
