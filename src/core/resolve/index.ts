import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from '../registry/types.js';
import { parseAddress, type Address } from './address.js';
import { namesMatch } from './match.js';

/** A resolved project candidate. */
export interface Project {
  zone: string;
  name: string;
  path: string;
}

/** A resolution failure with a user-facing message. */
export class ResolveError extends Error {}

/**
 * Resolve a project token (bare name or `zone:name`) into candidate matches.
 *
 * Bare names search only the primary zone; explicit addresses search that zone.
 * Returns all matches — callers decide via the picker how to handle >1.
 */
export function resolveToken(config: Config, token: string): Project[] {
  const addr = parseAddress(token);
  if (addr.zone !== null) {
    return resolveInZone(config, addr);
  }
  return resolveBare(config, addr);
}

function resolveBare(config: Config, addr: Address): Project[] {
  if (!config.hot || !config.zones[config.hot]) {
    throw new ResolveError(
      'no hot zone set — run `scaff -zone hot <name>` first, or use `scaff <zone>:<name>`.',
    );
  }
  return searchDirs(config.hot, config.zones[config.hot], addr.name);
}

function resolveInZone(config: Config, addr: Address): Project[] {
  const zone = addr.zone as string;
  const dirs = config.zones[zone] as unknown as string|string[];
  if (!dirs) {
    const known = Object.keys(config.zones);
    const hint = known.length ? ` known zones: ${known.join(', ')}` : ' no zones registered';
    throw new ResolveError(`unknown zone "${zone}".${hint}`);
  }
  return searchDirs(zone, dirs as unknown as string, addr.name);
}

function searchDirs(zone: string, dirs: string|string[], name: string): Project[] {
  const matches: Project[] = [];
  for (const dir of (Array.isArray(dirs)?dirs:[dirs] as string[])) {
    if (!fs.existsSync(dir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (namesMatch(entry.name, name)) {
        matches.push({ zone, name: entry.name, path: path.join(dir, entry.name) });
      }
    }
  }
  return matches;
}

/** Enumerate every project across zones (optional zone filter, dot-dir rule). */
export function listProjects(
  config: Config,
  opts: { zone?: string; includeDot?: boolean } = {},
): Project[] {
  const zones = opts.zone ? [opts.zone] : Object.keys(config.zones);
  const projects: Project[] = [];
  for (const zone of zones) {
    const dirs = config.zones[zone] as unknown as string|string[];
    if (!dirs) continue;
    for (const dir of (Array.isArray(dirs)?dirs:[dirs] as string[])) {
      if (!fs.existsSync(dir)) continue;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!opts.includeDot && entry.name.startsWith('.')) continue;
        projects.push({ zone, name: entry.name, path: path.join(dir, entry.name) });
      }
    }
  }
  return projects.sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name));
}

/** Enumerate the directories of a single zone as Projects. */
export function zoneProjects(config: Config, zone: string): Project[] {
  return listProjects(config, { zone });
}