import { Command } from 'commander';
import { createRequire } from 'node:module';
import { getRegistryPath } from './config.js';
import { registerZoneCommands } from './commands/zone.js';
import { registerOpenCommand } from './commands/open.js';
import { registerPathCommand, handleCdProject } from './commands/path.js';
import { registerSetupCommand } from './commands/setup.js';
import { registerListCommand } from './commands/list.js';

const require = createRequire(import.meta.url);
const VERSION = require('../package.json').version as string;

const registryPath = getRegistryPath();

const program = new Command();

program
  .name('scaff')
  .description(
    'Project workspace registry and launcher.\n\n' +
      'Quick start:\n' +
      '  scaff zone add /path/to/projects  # register the default "hot" zone\n' +
      '  scaff <project>                   # cd into a project (via shell wrapper)',
  )
  .version(VERSION, '-v, --version', 'Print the current version');

// ── Sub-command groups ────────────────────────────────────────────────────────
registerZoneCommands(program, registryPath);
registerOpenCommand(program, registryPath);
registerPathCommand(program, registryPath);
registerSetupCommand(program);
registerListCommand(program, registryPath);

// ── Default handler: scaff <project> ─────────────────────────────────────────
// Commander does not natively support a positional default argument when
// sub-commands are also registered.  We handle the case by checking whether
// the first argument matches no known command, then treating it as a project.
// The shorthand prints the resolved path so a shell wrapper can cd into it.
program
  .argument('[project]', 'Project name to resolve (prefers the "hot" zone)')
  .action((project: string | undefined) => {
    if (!project) {
      program.help();
      return;
    }

    handleCdProject(project, registryPath);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error('scaff: unexpected error —', (err as Error).message ?? err);
  process.exit(1);
});
