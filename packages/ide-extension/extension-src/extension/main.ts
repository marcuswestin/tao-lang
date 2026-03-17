import { Log, setLogTransport } from '@shared/Log.js'
import * as process from 'node:process'
import * as vscode from 'vscode'
import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node.js'
import { LanguageClient, TransportKind } from 'vscode-languageclient/node.js'

let client: LanguageClient
const channel = vscode.window.createOutputChannel('My Extension', { log: true })

/** activate starts the bundled Tao language server client. In Development extension mode it also routes `Log` through the
 * output channel so LSP traffic is visible in the panel. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    channel.show(true)

    setLogTransport({
      log: channel.debug as (...args: unknown[]) => void,
      wrap: channel.debug,
      debug: channel.debug,
      info: channel.info,
      warn: channel.warn,
      error: channel.trace,
      taoError(error, ...args) {
        channel.error(error.getLogMessage(), ...args)
      },
      trace: channel.trace,
      success: channel.info,
      instruct: channel.info,
      reject: channel.error,
    })
  }

  Log.info('Start Language Server ...')
  client = await startLanguageClient(context)
  Log.info('Language Server started')

  Log.info('Extension activated')
}

/** deactivate stops the language client when the extension unloads; no-op if activation never ran. */
export function deactivate(): Thenable<void> | undefined {
  if (client) {
    return client.stop()
  }
  return undefined
}

/** startLanguageClient starts `_gen-ide-extension/language/main.cjs` over IPC. When the host runs the extension in debug
 * mode, Node `--inspect` is enabled; set `DEBUG_BREAK` to wait for a debugger (`DEBUG_SOCKET` overrides the port). */
async function startLanguageClient(context: vscode.ExtensionContext): Promise<LanguageClient> {
  const serverModule = context.asAbsolutePath('_gen-ide-extension/language/main.cjs')

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
  // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
  const debugOptions = {
    execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`],
  }

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
  }

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: '*', language: 'tao' }],
  }

  // Create the language client and start the client.
  const client = new LanguageClient(
    'tao',
    'Tao Language Server',
    serverOptions,
    clientOptions,
  )

  // Start the client. This will also launch the server
  await client.start()
  return client
}
