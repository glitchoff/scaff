import { Command } from 'commander';
import { resolveProject } from '../resolver/index.js';
import { openProject, type LaunchTarget } from '../launcher/index.js';

/**
 * Registers the `open` command on the given Commander program.
 *
 * Command:
 *   scaff open <project> [--with vscode|terminal|explorer]
 *
 * Resolves <project> through registered zones and opens it with the chosen
 * launch target. Defaults to VS Code (falls back to explorer if not installed).
 */
export function registerOpenCommand(program: Command, registryPath: string): void {
  program
    .command('open <project>')
    .description('Resolve and open a project by name')
    .option(
      '--with <target>',
      'Launch target: vscode, terminal, or explorer (default: vscode)',
      'vscode',
    )
    .action((project: string, options: { with: string }) => {
      handleOpenProject(project, options.with as LaunchTarget, registryPath);
    });
}

/**
 * Core open logic, extracted so `main.ts` can also call it for the default
 * short-form `scaff <project>` invocation.
 */
export function handleOpenProject(
  project: string,
  target: LaunchTarget = 'vscode',
  registryPath: string,
): void {
  const matches = resolveProject(registryPath, project);

  if (matches.length === 0) {
    console.error(`scaff: project "${project}" not found in any registered zone.`);
    console.error('');
    console.error('  • Check your zones with `scaff zone list`');
    console.error('  • Browse available projects with `scaff list`');
    console.error('  • Add a new zone with `scaff zone add <name> <path>`');
    process.exitCode = 1;
    return;
  }

  if (matches.length > 1) {
    console.error(
      `scaff: "${project}" is ambiguous — found in ${matches.length} zones:`,
    );
    for (const m of matches) {
      console.error(`  [${m.zone}]  ${m.path}`);
    }
    console.error(
      '\nRename one of the projects or remove the conflicting zone to resolve the ambiguity.',
    );
    process.exitCode = 1;
    return;
  }

  const resolved = matches[0]!;
  console.log(`Opening ${resolved.path} …`);
  openProject(resolved.path, target);
}
