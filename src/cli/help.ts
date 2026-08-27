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

COMMANDS
  -add [name] [dir]         add zone (interactive, asks folder+name, shows hot switch)
  -zone add <name> <dir>    add zone (single dir)
  -zone rm <name>           remove zone
  -zone ls                  list zones (★ [hot])
  -zone hot <name>          set hot zone
  -zone hot --clear         clear hot zone
  -zone info <name>         show zone dir
  -hot [name]               set hot (interactive picker if no name)
  -list [query]             interactive list with [hot] label
  -open [name]              open project (picker if no name)
  -help, -h                 help
  -version, -v              version
`;
