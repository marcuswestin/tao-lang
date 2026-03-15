import { createTaoWorkspace } from '@compiler'
import { startLanguageServer } from 'langium/lsp'
import { NodeFileSystem } from 'langium/node'
import path from 'node:path'
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js'

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all)

// Resolve the std-lib relative to this bundle: _gen-ide-extension/language/ -> _gen-ide-extension/tao-std-lib/
const stdLibRoot = path.resolve(__dirname, '../tao-std-lib')

// Inject the shared services and language-specific services
const parser = createTaoWorkspace({ connection, ...NodeFileSystem }, { stdLibRoot })

// Start the language server with the shared services
startLanguageServer(parser.getShared())
