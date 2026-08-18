import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { addZone, removeZone, listZones } from '../registry/index.js';

/**
 * Registers the `zone` sub-command group on the given Commander program.
 *
 * Commands:
 *   scaff zone add <name> <path>   Register a new named zone
 *   scaff zone remove <name>       Remove a zone by name
 *   scaff zone list                List all registered zones
 */
export function registerZoneCommands(program: Command, registryPath: string): void {
  const zone = program
    .command('zone')
    .description('Manage registered project zones (workspace root directories)');

  // ── zone add ─────────────────────────────────────────────────────────────
  zone
    .command('add <name> <path>')
    .description('Register a named zone pointing to a directory')
    .action((name: string, rawPath: string) => {
      const resolved = path.resolve(rawPath);

      if (!fs.existsSync(resolved)) {
        console.error(`scaff: path does not exist: ${resolved}`);
        process.exitCode = 1;
        return;
      }

      if (!fs.statSync(resolved).isDirectory()) {
        console.error(`scaff: path is not a directory: ${resolved}`);
        process.exitCode = 1;
        return;
      }

      addZone(registryPath, name, resolved);
      console.log(`✔ Zone "${name}" registered → ${resolved}`);
    });

  // ── zone remove ──────────────────────────────────────────────────────────
  zone
    .command('remove <name>')
    .alias('rm')
    .description('Remove a registered zone by name')
    .action((name: string) => {
      try {
        removeZone(registryPath, name);
        console.log(`✔ Zone "${name}" removed.`);
      } catch (err) {
        console.error(`scaff: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // ── zone list ────────────────────────────────────────────────────────────
  zone
    .command('list')
    .alias('ls')
    .description('List all registered zones')
    .action(() => {
      const zones = listZones(registryPath);

      if (zones.length === 0) {
        console.log('No zones registered. Use `scaff zone add <name> <path>` to add one.');
        return;
      }

      const nameWidth = Math.max(...zones.map((z) => z.name.length), 4);
      console.log(`${'NAME'.padEnd(nameWidth)}  PATH`);
      console.log(`${'─'.repeat(nameWidth)}  ${'─'.repeat(40)}`);
      for (const z of zones) {
        console.log(`${z.name.padEnd(nameWidth)}  ${z.path}`);
      }
    });
}
