import chalk from 'chalk';
import { readPackage } from './locate.js';
const PKG = readPackage(import.meta.url) as { version: string };
export function version(): string { return PKG.version; }
export const HELP = `scaff — your projects, one word away  ${chalk.dim('v'+version())}

USAGE
  scaff <name>              open project in hot zone (cds)
  scaff <zone>:<name>       open project in specific zone
  scaff :<name>             shorthand for hot:<name>
  scaff .                   add current dir as zone (prompts)
  scaff new [name]          scaffold new project (only without -)
  scaff list [query]        interactive list (also -list) — picks and cds
  scaff config [--run]      configure project launch (.scaff) — wizard, --run executes

COMMANDS
  -add [name] [dir]         add zone (interactive, shows hot switch)
  -zone add <name> <dir>    add zone (single dir, first auto hot)
  -zone rm <name>           remove zone
  -zone ls                  list zones (★ [hot])
  -zone hot <name>          set hot zone
  -zone hot --clear         clear hot zone
  -zone info <name>         show zone dir
  -hot [name]               set hot (picker if no name)
  -list, list [query]       interactive list with [hot] label — cds into picked project
  -open [name]              open project (picker if no name, also cds)
  -setup                    shell integration (auto on first use, manual here)
  -update [--check]         update to latest + migrate + setup shell
  -help, -h                 help
  -version, -v              version
`;
