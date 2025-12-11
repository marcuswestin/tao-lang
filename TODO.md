# Tao Lang TODOs

Tao Lang

## STACK

Next tasks, in order:

#### Agent Setup

- [ ] Write Agents.md
- [ ] Write .Agents.justfile, along w Agents.md instructions
- [ ] Get mise mcp running while in dev mode

Prompt:

    Create Agents.md for this project. Do a careful search through the project to consider a succinct best practices Agents.md file. Make sure to setup ability to use mise mcp, including generating a .config/mise-gen-just-commands.toml, by either reading the output of `just help` or using the just dump function to generate toml. Create an `Agents.just` file, and instruct all agents to ONLY EVER use `just --justfile Agents.just <cmd>` commands; and that if there is need for a command that isn't available, then ask for permission to add a just command to do it. Keep justfile commands DRY, and favor fewer commands with passed in args, over many one-off commands.

#### Start compiling and running basic app

- [ ] Start app to implement against (Tao Studio)

#### Start stubbing out Docs

- [ ] Create Docs with explanation for Tao, and language design
