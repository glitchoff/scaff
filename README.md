# scaff — your projects, one word away

> Stop `cd`-ing through 6 folders to find that one repo. `scaff` remembers where your code lives.

`scaff` is a tiny, cross-platform CLI that lets you register **zones** (workspace roots) and then jump to any project by name — from anywhere.

```bash
scaff .                     # add current dir as zone (prompts name)
scaff -zone add hot ~/dev
scaff -zone hot hot

scaff my-api                # -> ~/dev/my-api  (hot zone, cds with shell integration)
scaff :new                  # -> hot:new  (shorthand)
scaff work:scaff            # -> ~/work/scaff  (explicit zone)
scaff new my-app            # scaffold new project (only command without -)
```

---

## Why scaff?

- **Zones** — name your workspace roots once, one dir per zone.
- **Hot zone** — mark one zone as `hot` for bare `scaff <name>` and `scaff :<name>` shorthand.
- **1-word jumps** — `scaff <name>` resolves in hot zone; `scaff :<name>` is same.
- **Explicit** — `scaff <zone>:<name>` hits any zone.
- **Interactive list** — `scaff -list [query]` picker with `[hot]` label via enquirer.
- **Actually cds you** — shell wrappers mean `scaff <project>` changes *your* shell's directory.
- **Cross-platform** — Windows, macOS, Linux. PowerShell, bash, zsh.

## Install

```bash
pnpm add -g scaff-up
npm i -g scaff-up
bun add -g scaff-up
```

### From source

```bash
pnpm install
pnpm build        # -> dist/
pnpm dev -- -help
```

**Requires:** Node.js 18+

## Quick start

```bash
# 1. Add current directory as zone
scaff .                     # prompts: zone name -> make hot?

# Or manually
scaff -zone add hot ~/projects
scaff -zone hot hot

# 2. Jump
scaff my-cool-app           # hot zone
scaff :my-cool-app          # same, shorthand
scaff work:internal-tool    # explicit zone

# 3. Interactive list (hot label)
scaff -list                 # picker, [hot] marked
scaff -list api             # filter by query
```

## Shell integration — the magic `cd`

`scaff` ships wrappers:
- `shell/scaff.ps1` — PowerShell
- `shell/scaff.sh` — bash / zsh

Auto-setup on first use. Manual: `source shell/scaff.sh` or `. .\shell\scaff.ps1`.

## Commands

| Command | What it does |
|---|---|
| `scaff <name>` | Resolve `<name>` in hot zone (cds) |
| `scaff :<name>` | Shorthand for `hot:<name>` |
| `scaff <zone>:<name>` | Resolve in specific zone |
| `scaff .` | Add current dir as zone (interactive) |
| `scaff new [name]` | Scaffold new project (only command **without** `-`, interactive) |
| `scaff -list [query]` | Interactive list with `[hot]` label |
| `scaff -open [name]` | Open project (prompts if no name) |
| `scaff -help` / `-h` | Show help |
| `scaff -version` / `-v` | Print version |

### Zone management

```bash
scaff -zone add <name> <dir>    # single dir per zone
scaff -zone rm <name>
scaff -zone ls                  # marks [hot]
scaff -zone hot <name>          # set hot zone
scaff -zone hot --clear         # clear hot
scaff -zone info <name>         # show zone dir
```

> Zone names can't start with `-` or contain `:` or be `.`. One directory per zone.

## Addressing

```
<name>        -> hot zone
:<name>       -> hot:<name> shorthand
<zone>:<name> -> specific zone
scaff .       -> add cwd as zone
```

## Configuration

- Stored as `config.json` in OS config dir:
  - Windows: `%APPDATA%\scaff\`
  - macOS: `~/Library/Application Support/scaff/`
  - Linux: `~/.config/scaff/`
- Override with `SCAFF_CONFIG_DIR=/custom/path`
- Shape: `{ version: 3, zones: Record<string, string>, hot: string | null }`
- v1 wipes old v2 data (multi-dir zones, primary) on first run — re-add zones.

## Development

```bash
pnpm dev          # tsx src/cli/main.ts
pnpm test         # vitest run
pnpm build        # tsup -> dist/
pnpm start        # node dist/main.js
```

## License

[MIT](./LICENSE)
