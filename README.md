# Tao Lang

Tao Lang is a programming language for building native and web apps.

- **[Docs/README.md](Docs/README.md)** — index of design docs, roadmap, features, and dev log.
- **Agents:** see [AGENTS.md](AGENTS.md) for agent startup rules, [skills/](skills/) for workflows, and [humans.md](humans.md) for maintaining the agent system.
- **License:** Tao is licensed under the GNU Affero General Public License version 3. See [LICENSE](LICENSE).
- **Contributions:** pull requests require a signed Contributor License Agreement. See [CONTRIBUTING.md](CONTRIBUTING.md).

### Get started

Run the bootstrap script:

```zsh
bash .config/bootstrap-dev-env.sh
```

### Extension Development

How to build and install the extension into your IDE:

- Build the extension with "cmd+shift+b".
- Then run vscode command "Developer: Restart Extension Host".
  - If you added the custom keybinding during setup, and installed recommended extension **multi-command**, then you don't need to run the vscode command.
