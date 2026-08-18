# scaff

A cross-platform developer CLI for project workspace registration, resolution, and launching.

`scaff` lets you register *zones* (workspace root directories), then resolve and open any project inside them by name — in VS Code, a terminal, or your file manager. No more hunting through nested folders or typing out long absolute paths.

## Features

- **Zones** — register named workspace root directories once, then forget the paths.
- **Name-based resolution** — open a project by its directory name from anywhere.
- **Ambiguity handling** — if a name exists in multiple zones, `scaff` reports the conflict instead of guessing.
- **Multiple launch targets** — VS Code, a terminal, or the platform file manager.
- **Cross-platform** — Windows, macOS, and Linux.
- **Zero dependencies beyond `commander`.**

## Installation

```bash
pnpm install
pnpm build
```

The `scaff` binary is then available via the `bin` field in `package.json`.

### Prerequisites

- Node.js 18+ (for `--with vscode`, the `code` CLI must be in your PATH; otherwise `scaff` falls back to the file manager).

## Usage

### Quick start

```bash
# Register a zone (a workspace root directory)
scaff zone add hot /path/to/projects

# Open a project by name in VS Code
scaff my-project

# Or specify a launch target explicitly
scaff open my-project --with terminal
```

### Commands

| Command | Description |
| --- | --- |
| `scaff zone add <name> <path>` | Register a new named zone pointing to a directory |
| `scaff zone remove <name>` | Remove a registered zone by name (`rm` alias) |
| `scaff zone list` | List all registered zones (`ls` alias) |
| `scaff list` | List every project found across all zones |
| `scaff open <project>` | Resolve and open a project by name |
| `scaff <project>` | Shorthand for `scaff open <project>` |
| `scaff --version` | Print the current version |
| `scaff --help` | Show help |

### Launch targets

`scaff open <project> --with <target>` supports:

- `vscode` (default) — opens via the `code` CLI; falls back to the file manager if not found.
- `terminal` — opens a terminal window rooted at the project.
- `explorer` — opens the platform's file manager.

## How it works

- **Configuration** lives in a `registry.json` file stored in the platform config directory (`%APPDATA%\scaff\` on Windows, `~/Library/Application Support/scaff/` on macOS, `~/.config/scaff/` on Linux). Set `SCAFF_CONFIG_DIR` to override this.
- **Zones** map a friendly name to an absolute directory path. When you resolve a project, `scaff` scans each registered zone's immediate subdirectories for a matching name.
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
