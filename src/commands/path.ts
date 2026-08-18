import { Command } from 'commander';
import { resolvePreferred, resolveProject } from '../resolver/index.js';

/**
 * Registers the `path` command on the given Commander program.
 *
 * Command:
 *   scaff path <project>
 *
 * Resolves <project> (preferring the `hot` zone) and prints its absolute path
 * to stdout. This backs the shell wrappers (`scaff.sh` / `scaff.ps1`) so a
 * project can be cd'd into from the current shell.
 */
export function registerPathCommand(program: Command, registryPath: string): void {
  program
    .command('path <project>')
    .description('Resolve a project (preferring the "hot" zone) and print its absolute path')
    .action((project: string) => {
      handleCdProject(project, registryPath);
    });
}

/**
 * Resolve a project for cd and print its path. Shared by the `path` command and
 * the default short-form `scaff <project>` invocation.
 */
export function handleCdProject(project: string, registryPath: string): void {
  const resolved = resolvePreferred(registryPath, project);

  if (resolved) {
    console.log(resolved.path);
    return;
  }

  const matches = resolveProject(registryPath, project);

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
  } else {
    console.error(`scaff: project "${project}" not found in any registered zone.`);
    console.error('');
    console.error('  • Check your zones with `scaff zone list`');
    console.error('  • Browse available projects with `scaff list`');
    console.error('  • Add a new zone with `scaff zone add <path>`');
  }

  process.exitCode = 1;
}