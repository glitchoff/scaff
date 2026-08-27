import { getConfigPath } from '../config.js';
import { parseArgs } from './args.js';
import { HELP, version } from './help.js';
import { runZone } from '../commands/zone.js';
import { runList } from '../commands/list.js';
import { runOpen } from '../commands/open.js';
import { runNew } from '../commands/new.js';
import { runZoneAddDot } from '../commands/zone.js';
import { loadConfig } from '../core/registry/store.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

const configPath = getConfigPath();

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const [first] = argv;

  if (first === undefined || first === '-h' || first === '-help' || first === '--help' || first === 'help') {
    console.log(HELP);
    return 0;
  }
  if (first === '-v' || first === '-version' || first === '--version' || first === 'version') {
    console.log(version());
    return 0;
  }
  if (first === '.') return runZoneAddDot(configPath);
  // reserved: new/create without -
  if (first === 'new' || first === 'create') return runNew(configPath, parseArgs(argv.slice(1)));
  if (first === '-new' || first === '-create') return runNew(configPath, parseArgs(argv.slice(1)));

  if (first.startsWith('-')) return dispatchCommand(first, argv.slice(1));

  // :name shorthand -> hot:name
  let token = first;
  if (token.startsWith(':')) {
    const cfg = loadConfig(configPath);
    if (!cfg.hot) { console.error('scaff: no hot zone set. Use scaff -zone add <name> <dir>'); return 1; }
    token = `${cfg.hot}:${token.slice(1)}`;
  }
  // bare project open
  const { runBare } = await import('../commands/path.js');
  return runBare(configPath, token);
}

function dispatchCommand(command: string, rest: string[]): Promise<number> {
  const args = parseArgs(rest);
  switch (command) {
    case '-list':
    case '-ls':
      return runList(configPath, args);
    case '-find':
    case '-f':
      return runList(configPath, args);
    case '-open':
      return runOpen(configPath, args);
    case '-zone':
      return Promise.resolve(runZone(configPath, args));
    case '-alias':
      { const { runAlias } = require('../commands/alias.js'); return runAlias(args); }
    default:
      console.error(`scaff: unknown command "${command}".`);
      console.log(HELP);
      return Promise.resolve(1);
  }
}

main().then(c=>{process.exitCode=c}).catch((err:unknown)=>{console.error('scaff: unexpected error —',(err as Error).message??err);process.exitCode=1});
