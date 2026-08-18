import * as fs from 'node:fs';
import * as path from 'node:path';
import { readRegistry } from '../registry/index.js';

/** A project found inside a registered zone. */
export interface ResolvedProject {
  zone: string;
  name: string;
  path: string;
}

/**
 * Attempt to find a project by name across all registered zones.
 *
 * Returns all matches — there may be more than one if the same directory name
 * appears in multiple zones.  Callers decide how to handle ambiguity.
 */
export function resolveProject(
  registryPath: string,
  projectName: string,
): ResolvedProject[] {
  const registry = readRegistry(registryPath);
  const matches: ResolvedProject[] = [];

  for (const [zoneName, zonePath] of Object.entries(registry.zones)) {
    // Skip zones whose base directory no longer exists
    if (!fs.existsSync(zonePath)) {
      continue;
    }

    const candidate = path.join(zonePath, projectName);

    try {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) {
        matches.push({ zone: zoneName, name: projectName, path: candidate });
      }
    } catch {
      // Directory not found in this zone — continue searching
    }
  }

  return matches;
}

/**
 * Enumerate every project directory across all registered zones.
 * Zones whose paths no longer exist on disk are silently skipped.
 */
export function listProjects(registryPath: string): ResolvedProject[] {
  const registry = readRegistry(registryPath);
  const projects: ResolvedProject[] = [];

  for (const [zoneName, zonePath] of Object.entries(registry.zones)) {
    if (!fs.existsSync(zonePath)) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(zonePath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        projects.push({
          zone: zoneName,
          name: entry.name,
          path: path.join(zonePath, entry.name),
        });
      }
    }
  }

  return projects.sort((a, b) =>
    a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name),
  );
}
