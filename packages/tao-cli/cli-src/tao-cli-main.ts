import { Command } from '@commander-js/extra-typings'
import { compileTao } from '@tao-compiler'
import chokidar from 'chokidar'
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Log } from '../../compiler/compiler-src/@shared/Log'
import {
  Assert,
  TaoError,
  throwUserInputRejectionError,
} from '../../compiler/compiler-src/@shared/TaoErrors'
import { hci } from './hci-human-computer-interaction'

export function taoCliMain() {
  const program = new Command()

  program.command('compile')
    .description('Compile a Tao file')
    .argument('[path]', 'The file to compile', (value) => path.resolve(value))
    .requiredOption('--runtime-dir <path>', 'The runtime to compile the code to', (value) => path.resolve(value))
    .option('--code <code>', 'Compile the given string of text, rather than a file')
    .option('--watch', 'Watch the file and recompile when it changes')
    .option('--verbose', 'Verbose output', false)
    .action(async (path, { watch, verbose, code, runtimeDir }) => {
      verbose = true
      hci.setVerbose(verbose)
      hci.wrapExecution(async () => {
        async function compileAndWrite() {
          hci.verboselyInform(`Compiling...`)
          const outputPath = await TaoSDK_compile({ path, code, runtimeDir })
          hci.inform(`Compiled to ${outputPath}`)
        }

        if (watch) {
          if (!path) {
            throwUserInputRejectionError('Watch mode requires a file to be provided')
          }
          chokidar.watch(path).on('change', compileAndWrite)
        }

        await compileAndWrite()
      })
    })

  program.parse(process.argv)
}

type TaoSDK_compileOpts = {
  path?: string | undefined
  code?: string | undefined
  runtimeDir: string
  outputFileName?: string
}
type TaoSDK_compileResult = { outputPath: string; result?: { code: string }; error?: TaoError }
export async function TaoSDK_compile(opts: TaoSDK_compileOpts): Promise<TaoSDK_compileResult> {
  Log.debug(`TaoSDK_compile opts: ${JSON.stringify(opts, null, 2)}`)
  if (!opts.path && !opts.code) {
    throwUserInputRejectionError('Missing <path>')
  } else if (opts.code && opts.path) {
    throwUserInputRejectionError('Provide EITHER <path> or --code, but not both')
  }

  if (opts.code) {
    opts.path = `/tmp/tao-cli-temp-${Date.now()}.tao`
    writeFileSync(opts.path, opts.code)
  }
  Assert(opts.path, 'path is set')

  try {
    const outputPath = await checkUserInputs(opts)
    const result = await compileTao({ file: opts.path })
    await writeFile(outputPath, result.code)
    if (result.errorReport) {
      throwUserInputRejectionError(result.errorReport.humanErrorMessage)
    }
    return { outputPath, result }
  } finally {
    if (opts.code) {
      unlinkSync(opts.path)
    }
  }
}

async function checkUserInputs(opts: TaoSDK_compileOpts) {
  const runtimeDir = path.resolve(opts.runtimeDir)
  if (!isDirectory(runtimeDir)) {
    throwUserInputRejectionError(`Runtime path is not a directory: ${runtimeDir}`)
  }
  const packageJsonPath = path.resolve(runtimeDir, 'package.json')
  if (!fileExists(packageJsonPath)) {
    throwUserInputRejectionError(`Runtime path does not contain a package.json file: ${runtimeDir}`)
  }
  const packageJson = readJsonFile(packageJsonPath)
  if (packageJson.name !== 'tao-expo-runtime') {
    throwUserInputRejectionError(`Runtime path is not a tao runtime: ${runtimeDir}`)
  }
  if (packageJson.version !== '0.1.0-dev') {
    throwUserInputRejectionError(`Runtime path is not expected version 0.1.0-dev: ${packageJson.version}`)
  }

  return path.resolve(runtimeDir, 'app/_gen-tao-compiler/app-output.tsx')
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false // does not exist or inaccessible
  }
}

async function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, content)
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false // does not exist or inaccessible
  }
}

function readJsonFile(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
}
