import { readPackage } from './locate.js';
const PKG = readPackage(import.meta.url) as { version: string };
export function version(): string { return PKG.version; }
export const HELP = `scaff — quick project opener

USAGE
  scaff <name>              open project in hot zone
  scaff <zone>:<name>       open project in specific zone
  scaff :<name>             shorthand for hot:<name>
  scaff .                   add current dir as zone (prompts name)
  scaff new [name]          scaffold new project
  scaff -zone ...           manage zones
  scaff -list [query]       interactive list (hot label)
  scaff -open [name]        open project

ZONE
  -zone add <name> <dir>    add zone (single dir)
  -zone rm <name>           remove zone
  -zone ls                  list zones
  -zone hot <name>|--clear  set/clear hot zone
  -zone info <name>         show zone dir
`;
