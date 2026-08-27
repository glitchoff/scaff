import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from './types.js';

export const CURRENT_VERSION = 3;

export function emptyConfig(): Config {
  return { version: CURRENT_VERSION, hot: null, zones: {} };
}

export function loadConfig(configPath: string): Config {
  let raw: string | null = null;
  let parsed: unknown = null;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return emptyConfig();
  }
  if (!isConfig(parsed)) return emptyConfig();
  // wipe old data if version mismatch or old shape (array zones / primary)
  const v = parsed as unknown as Record<string, unknown>;
  if (v['version'] !== CURRENT_VERSION || 'primary' in v || hasArrayZones(v)) {
    const clean = emptyConfig();
    try { saveConfig(configPath, clean); } catch {}
    return clean;
  }
  return normalize(parsed as Config);
}

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
  return true;
}

function hasArrayZones(v: Record<string, unknown>): boolean {
  const zones = v['zones'] as Record<string, unknown>;
  return Object.values(zones).some((x) => Array.isArray(x));
}

function normalize(config: Config): Config {
  const zones: Record<string, string> = {};
  for (const [name, dir] of Object.entries(config.zones)) {
    if (!isValidZoneName(name)) continue;
    if (typeof dir === 'string' && dir.length > 0) zones[name] = dir;
  }
  let hot = (config as unknown as Record<string, unknown>)['hot'] as string | null;
  let hotClean = hot && zones[hot] ? hot : null;
  if (!hotClean && Object.keys(zones).length === 1) hotClean = Object.keys(zones)[0]!;
  if (hotClean !== hot) {
    // persist auto hot fix
  }
  return { version: CURRENT_VERSION, hot: hotClean, zones };
}

export function isValidZoneName(name: string): boolean {
  return name.length > 0 && !name.startsWith('-') && !name.includes(':') && name !== '.';
}
