import { createTaoWorkspace, NodeFileSystem, startLanguageServer } from '@compiler'
import { createConnection, ProposedFeatures } from '@parser/vscode-languageserver'
import { FS } from '@shared'

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all)

// Resolve the std-lib relative to this bundle: _gen-ide-extension/language/ -> _gen-ide-extension/tao-std-lib/
const stdLibRoot = FS.resolvePath(__dirname, '../tao-std-lib')

// Inject the shared services and language-specific services
const parser = createTaoWorkspace({ connection, ...NodeFileSystem }, { stdLibRoot })

// Start the language server with the shared services
startLanguageServer(parser.getShared())
