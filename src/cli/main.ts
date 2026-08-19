import { getConfigPath } from '../config.js';
import { parseArgs } from './args.js';
import { HELP, version } from './help.js';
import { runZone } from '../commands/zone.js';
import { runPath, runBare } from '../commands/path.js';
import { runList } from '../commands/list.js';
import { runFind } from '../commands/find.js';
import { runOpen } from '../commands/open.js';
import { runSetup } from '../commands/setup.js';
import { runAlias } from '../commands/alias.js';

const configPath = getConfigPath();

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const [first] = argv;

  if (first === undefined || first === '-h' || first === '-help' || first === '--help') {
    console.log(HELP);
    return 0;
  }
  if (first === '-v' || first === '-version' || first === '--version') {
    console.log(version());
    return 0;
  }

  if (first.startsWith('-')) {
    return dispatchCommand(first, argv.slice(1));
  }

  // Bare project token — resolve & print the path (the shell wrapper cds).
  return runBare(configPath, first);
}

function dispatchCommand(command: string, rest: string[]): Promise<number> {
  const args = parseArgs(rest);
  switch (command) {
    case '-setup':
      return runSetup(args);
    case '-alias':
      return runAlias(args);
    case '-list':
    case '-ls':
      return Promise.resolve(runList(configPath, args));
    case '-find':
    case '-f':
      return runFind(configPath, args);
    case '-path':
      return runPath(configPath, args);
    case '-open':
      return runOpen(configPath, args);
    case '-zone':
      return Promise.resolve(runZone(configPath, args));
    default:
      console.error(`scaff: unknown command "${command}".`);
      console.log('');
      console.log(HELP);
      return Promise.resolve(1);
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    console.error('scaff: unexpected error —', (err as Error).message ?? err);
    process.exitCode = 1;
  });