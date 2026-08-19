import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from './types.js';

const CURRENT_VERSION = 1;

/** A fresh, empty config. */
export function emptyConfig(): Config {
  return { version: CURRENT_VERSION, primary: null, zones: {} };
}

/**
 * Load the config from disk. Returns an empty config on any read/parse/shape
 * failure — callers never have to guard against exceptions.
 */
export function loadConfig(configPath: string): Config {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (isConfig(parsed)) {
      return normalize(parsed);
    }
  } catch {
    // File missing, unreadable, or corrupt — start fresh.
  }
  return emptyConfig();
}

/** Persist the config to disk, creating parent directories as needed. */
export function saveConfig(configPath: string, config: Config): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function isConfig(value: unknown): value is Config {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v['version'] !== 'number') return false;
  if (typeof v['zones'] !== 'object' || v['zones'] === null) return false;
  if ('primary' in v && typeof v['primary'] !== 'string' && v['primary'] !== null) return false;
  return true;
}

/** Coerce a parsed config into a well-formed shape, dropping bad entries. */
function normalize(config: Config): Config {
  const zones: Record<string, string[]> = {};
  for (const [name, dirs] of Object.entries(config.zones)) {
    if (!isValidZoneName(name)) continue;
    const clean = (Array.isArray(dirs) ? dirs : [dirs]).filter(
      (d): d is string => typeof d === 'string' && d.length > 0,
    );
    if (clean.length > 0) zones[name] = clean;
  }
  const primary = config.primary && zones[config.primary] ? config.primary : null;
  return { version: CURRENT_VERSION, primary, zones };
}

/** Zone names may not start with `-` (reserved for commands) or contain `:`. */
export function isValidZoneName(name: string): boolean {
  return name.length > 0 && !name.startsWith('-') && !name.includes(':');
}