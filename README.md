# scaff

A cross-platform developer CLI for project workspace registration, resolution, and launching.

`scaff` lets you register *zones* (workspace root directories), then resolve and open any project inside them by name — in VS Code, a terminal, or your file manager. No more hunting through nested folders or typing out long absolute paths.

The default zone is **`hot`**: register a workspace root once with `scaff zone add <path>` and it's stored as the `hot` zone. `scaff <project>` then resolves against `hot/` and — with the shell integration installed via `scaff setup` — **cds you straight into the project from your current shell**.

## Features

- **Zones** — register named workspace root directories once, then forget the paths.
- **Name-based resolution** — open a project by its directory name from anywhere.
- **Ambiguity handling** — if a name exists in multiple zones, `scaff` reports the conflict instead of guessing.
- **Multiple launch targets** — VS Code, a terminal, or the platform file manager.
- **Cross-platform** — Windows, macOS, and Linux.
- **Zero dependencies beyond `commander`.**

## Installation

Install globally with your preferred package manager:

```bash
# pnpm
pnpm add -g scaff-up

# npm
npm install -g scaff-up

# bun
bun add -g scaff-up

# yarn
yarn global add scaff-up
```

You can then use the `scaff` command anywhere.

### Building from source

```bash
pnpm install
pnpm build
```

The `scaff` binary is available via the `bin` field in `package.json`.

### Prerequisites

- Node.js 18+ (for `--with vscode`, the `code` CLI must be in your PATH; otherwise `scaff` falls back to the file manager).

## Usage

### Shell integration (cd into projects)

A CLI subprocess cannot change your shell's working directory, so `scaff` ships
wrappers (`shell/scaff.ps1` for PowerShell, `shell/scaff.sh` for bash/zsh) that
make `scaff <project>` actually `cd` you into the project.

```bash
scaff setup            # installs the wrapper into your shell profile
# restart your shell, or reload your profile, then:
scaff my-project       # cds into hot/my-project
```

`scaff setup` detects your shell and appends the wrapper to your profile
(`$PROFILE` on PowerShell, `~/.bashrc` / `~/.zshrc` otherwise). Use
`scaff setup --shell powershell|bash|zsh` to target a specific shell.
Alternatively, source the wrapper manually:
`source shell/scaff.sh` or `. .\shell\scaff.ps1`.

### Quick start

```bash
# Register a zone — the name defaults to "hot"
scaff zone add /path/to/projects

# cd into a project from the current shell (requires shell integration)
scaff my-project

# Print the resolved path without cd'ing
scaff path my-project

# Or open it with an explicit launch target
scaff open my-project --with vscode
```

### Commands

| Command | Description |
| --- | --- |
| `scaff setup` | Install shell integration so `scaff <project>` cds into the project |
| `scaff zone add [name] <path>` | Register a new zone (name defaults to `hot`) |
| `scaff zone remove <name>` | Remove a registered zone by name (`rm` alias) |
| `scaff zone list` | List all registered zones (`ls` alias) |
| `scaff list` | List every project found across all zones |
| `scaff path <project>` | Resolve a project (preferring `hot`) and print its absolute path |
| `scaff open <project>` | Resolve and open a project |
| `scaff <project>` | Shorthand for `scaff path <project>` (cds when shell integration is active) |
| `scaff --version` | Print the current version |
| `scaff --help` | Show help |

### Launch targets

`scaff open <project> --with <target>` supports:

- `vscode` (default) — opens via the `code` CLI; falls back to the file manager if not found.
- `terminal` — opens a terminal window rooted at the project.
- `explorer` — opens the platform's file manager.

## How it works

- **Configuration** lives in a `registry.json` file stored in the platform config directory (`%APPDATA%\scaff\` on Windows, `~/Library/Application Support/scaff/` on macOS, `~/.config/scaff/` on Linux). Set `SCAFF_CONFIG_DIR` to override this.
- **Zones** map a friendly name to an absolute directory path. The default zone is `hot` — registering with `scaff zone add <path>` stores it under that name.
- When you resolve a project, `scaff` scans each registered zone's immediate subdirectories for a matching name. A match inside the `hot` zone always wins; otherwise an unambiguous match elsewhere is used, and true conflicts are reported instead of guessed.
- Zones whose directories no longer exist are silently skipped.

## Development

```bash
pnpm dev          # Run from source via tsx
pnpm test         # Run the test suite (vitest)
pnpm test:watch   # Watch mode
pnpm build        # Build to dist/ (tsup)
pnpm start        # Run the built output
```

## License

[MIT](./LICENSE)
