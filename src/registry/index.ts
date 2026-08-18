import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Registry, Zone } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read and parse the registry JSON from disk. Returns an empty registry on
 *  any read/parse failure — callers never have to guard against exceptions. */
export function readRegistry(registryPath: string): Registry {
  try {
    const raw = fs.readFileSync(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    // Validate shape — must have a `zones` object
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'zones' in parsed &&
      typeof (parsed as Record<string, unknown>)['zones'] === 'object' &&
      (parsed as Record<string, unknown>)['zones'] !== null
    ) {
      return parsed as Registry;
    }
  } catch {
    // File missing, unreadable, or corrupt — start fresh
  }

  return { zones: {} };
}

/** Persist the registry to disk, creating parent directories as needed. */
export function writeRegistry(registryPath: string, registry: Registry): void {
  const dir = path.dirname(registryPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new named zone, or overwrite an existing one with the same name.
 * The path is stored as-is; callers are responsible for resolution before passing.
 */
export function addZone(registryPath: string, name: string, zonePath: string): void {
  const registry = readRegistry(registryPath);
  registry.zones[name] = zonePath;
  writeRegistry(registryPath, registry);
}

/**
 * Remove a zone by name.
 * @throws {Error} if the named zone does not exist.
 */
export function removeZone(registryPath: string, name: string): void {
  const registry = readRegistry(registryPath);

  if (!(name in registry.zones)) {
    throw new Error(`Zone "${name}" is not registered.`);
  }

  delete registry.zones[name];
  writeRegistry(registryPath, registry);
}

/**
 * Return all registered zones as an array, sorted by name for consistent output.
 */
export function listZones(registryPath: string): Zone[] {
  const registry = readRegistry(registryPath);
  return Object.entries(registry.zones)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, zonePath]) => ({ name, path: zonePath }));
}
