#!/usr/bin/env bun
/**
 * Auto-generates mise tasks from Justfile recipes.
 * Run with: bun .config/gen-mise-tasks.ts
 * Or via: just _agent-gen-mise-tasks
 */

const OUTPUT_FILE = '.config/mise-gen-just-commands.toml'

interface JustRecipe {
  name: string
  doc: string | null
  private: boolean
  parameters: { name: string }[]
}

interface JustDump {
  recipes: Record<string, JustRecipe>
}

async function main() {
  // Get Justfile recipes as JSON
  const proc = Bun.spawn(['just', '--dump', '--dump-format', 'json'], {
    stdout: 'pipe',
  })
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    console.error('Failed to dump Justfile')
    process.exit(1)
  }

  const dump: JustDump = JSON.parse(output)

  // Filter to public recipes without parameters (exclude private/internal ones)
  const recipes = Object.values(dump.recipes)
    .filter((r) => !r.private && r.parameters.length === 0 && !r.name.startsWith('_'))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Generate TOML
  const lines: string[] = [
    '# Auto-generated from Justfile - do not edit manually',
    '# Regenerate with: just _agent-gen-mise-tasks',
    '',
  ]

  for (const recipe of recipes) {
    const desc = recipe.doc ?? recipe.name
    lines.push(`[tasks.${recipe.name}]`)
    lines.push(`description = ${JSON.stringify(desc)}`)
    lines.push(`run = "just ${recipe.name}"`)
    lines.push('')
  }

  await Bun.write(OUTPUT_FILE, lines.join('\n'))
  console.log(`Generated ${OUTPUT_FILE} with ${recipes.length} tasks`)
}

main()
