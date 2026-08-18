import { Command } from 'commander';
import { listProjects } from '../resolver/index.js';

/**
 * Registers the `list` command on the given Commander program.
 *
 * Command:
 *   scaff list   List all projects found across every registered zone
 */
export function registerListCommand(program: Command, registryPath: string): void {
  program
    .command('list')
    .alias('ls')
    .description('List all projects found across every registered zone')
    .action(() => {
      const projects = listProjects(registryPath);

      if (projects.length === 0) {
        console.log(
          'No projects found. Register a zone first with `scaff zone add <name> <path>`.',
        );
        return;
      }

      // Group by zone for readable output
      const byZone = new Map<string, typeof projects>();
      for (const p of projects) {
        const group = byZone.get(p.zone) ?? [];
        group.push(p);
        byZone.set(p.zone, group);
      }

      for (const [zoneName, items] of byZone) {
        console.log(`\n[${zoneName}]  ${items[0]!.path.replace(/[\\/][^\\/]*$/, '')}`);
        for (const item of items) {
          console.log(`  • ${item.name}`);
        }
      }
      console.log('');
    });
}
