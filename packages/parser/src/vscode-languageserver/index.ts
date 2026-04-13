/** vscode-languageserver aggregates LSP re-exports (`vscode-languageserver` includes protocol types; avoid a second `export *` from `vscode-languageserver-types` — duplicate symbols break ESM). */
export * from 'vscode-languageserver'
export { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js'
