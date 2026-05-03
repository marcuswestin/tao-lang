import {
  defined,
  describe,
  expect,
  expectSingle,
  MultiFileParseResult,
  parseMultipleFiles,
  test,
} from './test-utils/test-harness'

// getDefinitionAt returns definition links for the given document path and position.
async function getDefinitionAt(
  result: MultiFileParseResult,
  docPath: string,
  line: number,
  character: number,
) {
  const doc = result.documents.get(docPath)!
  return result.workspace.getDocumentDefinition(doc, { line, character })
}

describe('TaoDefinitionProvider', () => {
  test('getDefinition on imported name in use statement returns link to declaration', async () => {
    const result = await parseMultipleFiles(
      [
        { path: '/project/app.tao', code: 'use Text from @tao/ui\nview MyView { }' },
        {
          path: '/tao-std-lib/tao/ui/Views.tao',
          code: 'share view Text Text text { inject ```ts return null ``` }',
        },
      ],
      { stdLibRoot: '/tao-std-lib' },
    )

    const link = expectSingle(await getDefinitionAt(result, '/project/app.tao', 0, 4))
    expect(link).toMatchObject({
      targetUri: expect.stringContaining('/tao-std-lib/tao/ui/Views.tao'),
      targetRange: defined,
      originSelectionRange: defined,
    })
  })

  test('getDefinition on same-module imported name returns link to declaration', async () => {
    const result = await parseMultipleFiles([
      { path: '/project/app.tao', code: 'use Button\nview MyView { }' },
      { path: '/project/other.tao', code: 'view Button { }' },
    ])

    const link = expectSingle(await getDefinitionAt(result, '/project/app.tao', 0, 4))
    expect(link).toMatchObject({
      targetUri: expect.stringContaining('/project/other.tao'),
    })
  })
})
