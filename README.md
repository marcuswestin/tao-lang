# Tao Lang

Tao Lang is a programming language for building native and web apps.

To contribute to Tao:

```zsh
bash .config/bootstrap-dev-env.sh
just test
just dev
```

To build and install the IDE extension in VSCode/Cursor:

- Press: "cmd+shift+b"
- Run: "Developer: Restart Extension Host"
  - To skip this step, add to your keybindings: `{ "key": "cmd+shift+b", "command": "multiCommand.buildExtensionThenRestartHost" }`

## Repo Structure:

- **[Docs/README.md](Docs/README.md)** — index of design docs, roadmap, features, and dev log.
- **Agents:** see [AGENTS.md](AGENTS.md) for agent startup rules, [skills/](skills/) for workflows, and [humans.md](humans.md) for maintaining the agent system.
- **License:** Tao is licensed under the GNU Affero General Public License version 3. See [LICENSE](LICENSE).
- **Contributions:** pull requests require a signed Contributor License Agreement. See [CONTRIBUTING.md](CONTRIBUTING.md).
