import { describe, expect, test } from 'bun:test'
import { buildWorkspaceWithFiles } from './test-utils/test-harness'

type WorkspaceResult = Awaited<ReturnType<typeof buildWorkspaceWithFiles>>

// getDefinitionAt returns definition links for the given document path and position.
async function getDefinitionAt(
  result: WorkspaceResult,
  docPath: string,
  line: number,
  character: number,
) {
  const doc = result.documents.get(docPath)!
  return result.workspace.definitionProvider.getDefinition(doc, {
    textDocument: { uri: doc.uri.toString() },
    position: { line, character },
  })
}

describe('TaoDefinitionProvider', () => {
  test('getDefinition on imported name in use statement returns link to declaration', async () => {
    const result = await buildWorkspaceWithFiles(
      [
        { path: '/project/app.tao', code: 'use Text from tao/ui\nview MyView { }' },
        {
          path: '/tao-std-lib/tao/ui/Views.tao',
          code: 'share view Text value string { inject ```ts return null ``` }',
        },
      ],
      { stdLibRoot: '/tao-std-lib' },
    )

    const links = await getDefinitionAt(result, '/project/app.tao', 0, 4)

    expect(links).toBeDefined()
    expect(links).toHaveLength(1)
    const [link] = links!
    expect(link.targetUri).toContain('/tao-std-lib/tao/ui/Views.tao')
    expect(link.targetRange).toBeDefined()
    expect(link.originSelectionRange).toBeDefined()
  })

  test('getDefinition on same-module imported name returns link to declaration', async () => {
    const result = await buildWorkspaceWithFiles([
      { path: '/project/app.tao', code: 'use Button\nview MyView { }' },
      { path: '/project/other.tao', code: 'view Button { }' },
    ])

    const links = await getDefinitionAt(result, '/project/app.tao', 0, 4)

    expect(links).toBeDefined()
    expect(links).toHaveLength(1)
    const [link] = links!
    expect(link.targetUri).toContain('/project/other.tao')
  })
})
