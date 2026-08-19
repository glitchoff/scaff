import { loadConfig } from '../core/registry/store.js';
import { listProjects } from '../core/resolve/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';

/** `scaff -list` / `-ls` — list projects across zones. */
export function runList(configPath: string, args: ParsedArgs): number {
  const config = loadConfig(configPath);
  const zoneFilter = opt(args.options, 'zone');
  const includeDot = flag(args.options, 'all');
  const projects = listProjects(config, { zone: zoneFilter, includeDot });

  if (flag(args.options, 'json')) {
    console.log(JSON.stringify(projects, null, 2));
    return 0;
  }

  if (projects.length === 0) {
    console.log('No projects found. Register a zone first with `scaff -zone add <name> <dir>`.');
    return 0;
  }

  const byZone = new Map<string, typeof projects>();
  for (const p of projects) {
    const group = byZone.get(p.zone) ?? [];
    group.push(p);
    byZone.set(p.zone, group);
  }

  for (const [zoneName, items] of byZone) {
    console.log(`\n[${zoneName}]  ${config.zones[zoneName]?.map((d) => d).join(' · ') ?? ''}`);
    for (const item of items) {
      console.log(`  • ${item.name}`);
    }
  }
  console.log('');
  return 0;
}