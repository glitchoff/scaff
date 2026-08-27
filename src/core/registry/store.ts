import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from './types.js';

export const CURRENT_VERSION = 2;

/** A fresh, empty config. */
export function emptyConfig(): Config {
  return { version: CURRENT_VERSION, primary: null, zones: {} };
}

/**
 * Load the config from disk. Handles:
 * - legacy `registry.json` → auto-migrates to `config.json`
 * - versioned migration chain (1 → 2 …)
 * - corrupt/missing → empty config
 * On successful migration, backs up old file and saves upgraded config.
 */
export function loadConfig(configPath: string): Config {
  // Check legacy path first (pre-0.3 `registry.json` in same dir)
  const legacyPath = path.join(path.dirname(configPath), 'registry.json');
  let raw: string | null = null;
  let parsed: unknown = null;
  let sourcePath: string | null = null;

  for (const p of [configPath, legacyPath]) {
    try {
      raw = fs.readFileSync(p, 'utf8');
      parsed = JSON.parse(raw) as unknown;
      sourcePath = p;
      break;
    } catch {
      continue;
    }
  }

  if (parsed === null) return emptyConfig();

  // Legacy shape: { zones, primary } without version or with zones as string (old single-dir)
  const normalized = coerceLegacy(parsed);
  if (!isConfig(normalized)) return emptyConfig();

  const migrated = migrate(normalized);

  // Persist upgrade if version bumped or legacy file was used
  if (migrated.version !== (normalized as Config).version || sourcePath === legacyPath) {
    try {
      if (sourcePath === legacyPath && fs.existsSync(legacyPath)) {
        fs.copyFileSync(legacyPath, `${legacyPath}.bak`);
      } else if (raw !== null) {
        fs.copyFileSync(configPath, `${configPath}.bak`);
      }
    } catch { /* backup best-effort */ }
    const clean = normalize(migrated);
    try { saveConfig(configPath, clean); } catch { /* ignore save failure */ }
    return clean;
  }

  return normalize(migrated);
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

/** Coerce legacy shapes (single string dir, missing version, hot zone) into Config. */
function coerceLegacy(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const v = value as Record<string, unknown>;
  // Old `hot` string → zones.hot
  if (!v['zones'] && typeof v['hot'] === 'string') {
    return { version: 1, primary: 'hot', zones: { hot: [v['hot']] } };
  }
  // zones values as single string → array
  if (v['zones'] && typeof v['zones'] === 'object') {
    const zones = v['zones'] as Record<string, unknown>;
    for (const k of Object.keys(zones)) {
      if (typeof zones[k] === 'string') zones[k] = [zones[k] as string];
    }
  }
  if (!('version' in v)) (v as Record<string, unknown>)['version'] = 1;
  return v;
}

function migrate(config: Config): Config {
  let c: Config = { ...config, zones: { ...config.zones } };
  // 1 → 2 : ensure version =2, no structural change (reserve for future fields)
  if (c.version < 2) c.version = 2;
  return c;
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