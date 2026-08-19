import { loadConfig } from '../core/registry/store.js';
import { listProjects } from '../core/resolve/index.js';
import { fuzzyMatches, pickProject } from '../core/pick/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';

/** `scaff -find [query]` / `-f` — fuzzy/interactive project finder. */
export async function runFind(configPath: string, args: ParsedArgs): Promise<number> {
  const config = loadConfig(configPath);
  const zoneFilter = opt(args.options, 'zone');
  const includeDot = flag(args.options, 'all');
  const all = listProjects(config, { zone: zoneFilter, includeDot });

  const query = args.positionals[0];
  let matches = all;
  if (query) {
    matches = fuzzyMatches(query, all);
    if (matches.length === 0) {
      console.error(`scaff: no projects match "${query}".`);
      return 1;
    }
  }

  if (flag(args.options, 'json')) {
    console.log(JSON.stringify(matches, null, 2));
    return 0;
  }

  const picked = await pickProject(matches, query ?? 'project', {
    first: flag(args.options, 'first'),
  });
  console.log(picked.path);
  return 0;
}