import { Command } from 'commander';
import { getRegistryPath } from './config.js';
import { registerZoneCommands } from './commands/zone.js';
import { registerOpenCommand, handleOpenProject } from './commands/open.js';
import { registerListCommand } from './commands/list.js';

const VERSION = '0.1.0';

const registryPath = getRegistryPath();

const program = new Command();

program
  .name('scaff')
  .description(
    'Project workspace registry and launcher.\n\n' +
      'Quick start:\n' +
      '  scaff zone add hot /path/to/projects  # register a zone\n' +
      '  scaff <project>                        # open a project',
  )
  .version(VERSION, '-v, --version', 'Print the current version');

// ── Sub-command groups ────────────────────────────────────────────────────────
registerZoneCommands(program, registryPath);
registerOpenCommand(program, registryPath);
registerListCommand(program, registryPath);

// ── Default handler: scaff <project> ─────────────────────────────────────────
// Commander does not natively support a positional default argument when
// sub-commands are also registered.  We handle the case by checking whether
// the first argument matches no known command, then treating it as a project.
program
  .argument('[project]', 'Project name to resolve and open')
  .option('--with <target>', 'Launch target: vscode, terminal, or explorer', 'vscode')
  .action((project: string | undefined, options: { with: string }) => {
    if (!project) {
      program.help();
      return;
    }

    handleOpenProject(project, options.with as 'vscode' | 'terminal' | 'explorer', registryPath);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error('scaff: unexpected error —', (err as Error).message ?? err);
  process.exit(1);
});
