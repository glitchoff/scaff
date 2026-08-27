# scaff — your projects, one word away

> Stop `cd`-ing through 6 folders to find that one repo. `scaff` remembers where your code lives.

`scaff` is a tiny, zero-dependency, cross-platform CLI that lets you register **zones** (workspace roots) and then jump to any project by name — from anywhere.

```bash
scaff -zone add work ~/dev --primary
scaff -zone add oss ~/open-source

scaff my-api              # -> ~/dev/my-api  (cds you there with shell integration)
scaff oss:scaff           # -> ~/open-source/scaff
scaff -open my-api --with vscode
```

No config hunting. No absolute paths. Just names.

---

## Why scaff?

You have `~/dev`, `~/work/clients/acme`, `~/open-source`, maybe `D:\Projects` — projects scattered everywhere. `scaff` gives you one uniform way to say *take me there*.

- **Zones** — name your workspace roots once, forget the paths forever.
- **1-word jumps** — `scaff <name>` resolves against your primary zone.
- **Explicit when you need it** — `scaff <zone>:<name>` hits any zone directly.
- **Fuzzy finder** — `scaff -find` / `scaff -f api` to interactively pick.
- **Actually cds you** — shell wrappers mean `scaff <project>` changes *your* shell's directory, not just a subprocess.
- **Zero dependencies** — just Node 18+. No `commander`, no bloat.
- **Cross-platform** — Windows, macOS, Linux. PowerShell, bash, zsh.

## Install

```bash
pnpm add -g scaff-up      # pnpm
npm i -g scaff-up         # npm
bun add -g scaff-up       # bun
yarn global add scaff-up  # yarn
```

Then `scaff` is available everywhere.

### From source

```bash
pnpm install
pnpm build        # -> dist/
pnpm dev -- -help # run from source via tsx
```

**Requires:** Node.js 18+

## Quick start

```bash
# 1. Install shell integration (so `scaff <name>` actually cds you)
scaff -setup
# restart your shell, or reload your profile

# 2. Register a zone and make it primary
scaff -zone add hot ~/projects --primary

# 3. Jump
scaff my-cool-app              # cds into ~/projects/my-cool-app
scaff -path my-cool-app        # just prints ~/projects/my-cool-app
scaff -path hot:my-cool-app    # explicit zone:name form

# 4. Multiple zones? easy.
scaff -zone add work ~/work
scaff work:internal-tool       # hits the work zone
```

## Shell integration — the magic `cd`

A normal CLI can't change your shell's directory (it's a child process). `scaff` ships tiny wrappers that fix that:

- `shell/scaff.ps1` — PowerShell
- `shell/scaff.sh` — bash / zsh

```bash
scaff -setup                  # auto-detects your shell, patches your profile
scaff -setup --shell zsh      # target a specific shell
scaff -setup --shell powershell
```

It appends a `scaff` function to `$PROFILE` (PowerShell) or `~/.bashrc` / `~/.zshrc`. Afterwards `scaff <name>` really does `cd`.

> No `scaff -setup`? `scaff <name>` still works — it just prints the path instead of cd'ing.

Manual install if you prefer:
```bash
source shell/scaff.sh          # bash/zsh
. .\shell\scaff.ps1            # PowerShell
```

Uninstall: `scaff -setup --force` toggles, or remove the `scaff` function from your profile.

## Commands

All commands are `-` prefixed. Bare `scaff <token>` is shorthand for *resolve & print* (and `cd` when the shell wrapper is active).

| Command | What it does |
|---|---|
| `scaff <name>` | Resolve `<name>` in primary zone (cds with shell integration) |
| `scaff <zone>:<name>` | Resolve `<name>` in a specific zone |
| `scaff -help` / `-h` | Show help |
| `scaff -version` / `-v` | Print version |
| `scaff -setup [--shell ps\|bash\|zsh] [--yes] [--force]` | Install shell integration |
| `scaff -alias <name> [--force]` | Manage a short shell alias for scaff |
| `scaff -list` / `-ls [--zone <name>] [--all] [--json]` | List all projects grouped by zone |
| `scaff -find` / `-f [query] [--zone <name>] [--all] [--first] [--json]` | Fuzzy-find & pick a project |
| `scaff -path <name\|zone:name> [--first] [--json]` | Print resolved path |
| `scaff -open <name\|zone:name> [--with vscode\|terminal\|explorer] [--first]` | Open project in target |
| `scaff -new [name]` / `-create` | Scaffold a new project (interactive: next / vite / bun / turbo / t3) |

### Zone management

```bash
scaff -zone add <name> <dir> [dir...] [--primary]  # register (multiple dirs per zone!)
scaff -zone rm <name>                               # remove (alias: remove)
scaff -zone ls                                      # list zones (marks primary)
scaff -zone primary <name>                          # set primary zone
scaff -zone primary --clear                         # clear primary
scaff -zone info <name>                             # show zone's directories
```

> Zone names can't start with `-` or contain `:`. A zone can map to **multiple directories** — useful for merging `~/dev` + `~/work` under one name.

## Addressing & resolution

```
<name>        → searches only the primary zone
<zone>:<name> → searches that specific zone

# if multiple matches inside one zone (e.g. zone has 2 dirs with same project)
scaff my-app          # prompts you to pick
scaff my-app --first  # auto-picks first
scaff -find my        # fuzzy filter + picker
```

Errors are helpful:
- No primary set → `run scaff -zone primary <name> first, or use <zone>:<name>`
- Unknown zone → lists known zones
- No match → suggests `scaff -find` / `-list`

Missing zone directories are silently skipped. Dot-prefixed projects are hidden unless you pass `--all`.

## Opening projects

```bash
scaff -open my-app                    # default: vscode (falls back to file manager if `code` not found)
scaff -open my-app --with terminal    # new terminal rooted at project
scaff -open my-app --with explorer    # file manager
scaff -open work:my-app --with vscode --first
```

## Scaffolding new projects

```bash
scaff -new                    # interactive: asks name → zone → template
scaff -new my-app             # asks zone + template
scaff -new my-app --template next --zone hot --yes  # no prompts, delegates to create-next-app
scaff -new my-app --template t3 -- --db sqlite      # passthrough after -- goes to template CLI
```

Templates: `next` → `create-next-app`, `vite` → `create-vite`, `bun` → `bun create vite`, `turbo` → `create-turbo`, `t3` → `create-t3-app`. Follow-up questions (TypeScript? Tailwind? App Router?) are asked natively by the template CLI via `stdio: inherit` — scaff just handles *where*.

## Configuration

- Stored as `config.json` (legacy `registry.json` auto-migrated) in your OS config dir:
  - Windows: `%APPDATA%\scaff\`
  - macOS: `~/Library/Application Support/scaff/`
  - Linux: `~/.config/scaff/`
- Override with `SCAFF_CONFIG_DIR=/custom/path`
- Shape: `{ version: 2, zones: Record<string, string[]>, primary: string | null }`
- Upgrades: old configs auto-migrate on first run (backup to `config.json.bak` / `registry.json.bak`)

## Development

```bash
pnpm dev          # tsx src/cli/main.ts
pnpm test         # vitest run
pnpm test:watch   # watch mode
pnpm build        # tsup -> dist/
pnpm start        # node dist/main.js
```

Zero runtime dependencies. TypeScript + tsup + vitest.

## License

[MIT](./LICENSE) — do whatever, just don't blame us.
