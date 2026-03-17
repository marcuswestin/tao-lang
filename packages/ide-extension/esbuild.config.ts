import { context } from 'esbuild'
import type { Plugin } from 'esbuild'
import { cpSync } from 'node:fs'
import process from 'node:process'

const watch = process.argv.includes('--watch')
const minify = process.argv.includes('--minify')

const success = watch ? 'Watch build succeeded' : 'Build succeeded'

function getTime(): string {
  return `[${
    new Date().toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }] `
}

const plugins: Plugin[] = [{
  name: 'watch-plugin',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length === 0) {
        cpSync('../tao-std-lib', '_gen-ide-extension/tao-std-lib', { recursive: true })
        console.log(getTime() + success)
      }
    })
  },
}]

const ctx = await context({
  // Entry points for the vscode extension and the language server
  entryPoints: ['extension-src/extension/main.ts', 'extension-src/language/main.ts'],
  outdir: '_gen-ide-extension',
  bundle: true,
  target: 'ES2017',
  // VSCode's extension host is still using cjs, so we need to transform the code
  format: 'cjs',
  // To prevent confusing node, we explicitly use the `.cjs` extension
  outExtension: {
    '.js': '.cjs',
  },
  loader: { '.ts': 'ts' },
  external: ['vscode'],
  platform: 'node',
  sourcemap: !minify,
  minify,
  plugins,
})

if (watch) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  await ctx.dispose()
}
