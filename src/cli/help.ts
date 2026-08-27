import { readPackage } from './locate.js';
const PKG = readPackage(import.meta.url) as { version: string };
export function version(): string { return PKG.version; }
export const HELP = `scaff — your projects, one word away

USAGE
  scaff <name>              open project in hot zone (cds with shell integration)
  scaff <zone>:<name>       open project in specific zone
  scaff :<name>             shorthand for hot:<name>  (e.g. scaff :new -> hot:new)
  scaff .                   add current directory as zone (prompts for zone name, optional make hot)
  scaff new [name]          scaffold a new project (only command without -)

COMMANDS
  -zone add <name> <dir>    add zone (single dir per zone)
  -zone rm <name>           remove zone
  -zone ls                  list zones (marks [hot])
  -zone hot <name>          set hot zone
  -zone hot --clear         clear hot zone
  -zone info <name>         show zone dir
  -list [query]             interactive list with [hot] label (filters by query)
  -open [name]              open project (prompts picker if no name)
  -help, -h                 show this help
  -version, -v              print version
`;
