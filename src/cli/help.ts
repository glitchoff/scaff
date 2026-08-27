import { readPackage } from './locate.js';

const PKG = readPackage(import.meta.url) as { version: string };

export function version(): string {
  return PKG.version;
}

export const HELP = `scaff — project workspace registry and launcher

USAGE
  scaff <name>                cd into a primary-zone project (needs shell setup)
  scaff <zone>:<name>         cd into a project in a specific zone
  scaff -<command> ...        run a command (all commands are '-' prefixed)

PROJECT ADDRESSING
  <name>          resolve against the primary zone's directories
  <zone>:<name>   resolve against a specific zone (works for any zone)

COMMANDS
  -h, -help                 show this help
  -v, -version              print the version
  -setup                    install/uninstall shell integration (cd support)
  -alias <name>             manage a short alias for scaff
  -list  (-ls)              list projects across zones
  -find  (-f)  [query]      fuzzy/interactive project finder
  -path <name|zone:name>    print the resolved absolute path
  -open <name|zone:name>    resolve and open a project
  -new  [name]              scaffold a new project (interactive)
  -create [name]            alias for -new
  -zone ...                 manage zones

ZONE COMMANDS
  -zone add <name> <dir> [dir...]   register a zone (one or more dirs)
  -zone add <name> <dir> --primary  register and set as primary
  -zone rm <name>                   remove a zone
  -zone ls                          list zones (marks the primary)
  -zone primary <name>              set the primary zone
  -zone primary --clear             clear the primary zone
  -zone info <name>                 show a zone's directories

OPTIONS (within commands)
  --first              auto-select the first candidate instead of prompting
  --all                include dot-prefixed directories
  --json               machine-readable output
  --zone <name>        restrict to a zone
  --with <target>      vscode | terminal | explorer
  --yes                skip confirmation prompts
  --shell <shell>      powershell | bash | zsh
  --force              override conflicting aliases
`;