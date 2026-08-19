import * as fs from 'node:fs';
import * as path from 'node:path';
import { isValidZoneName, loadConfig, saveConfig } from '../core/registry/store.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';

export async function runZone(configPath: string, args: ParsedArgs): Promise<number> {
  const sub = args.positionals[0];
  switch (sub) {
    case 'add':
      return zoneAdd(configPath, args);
    case 'rm':
    case 'remove':
      return zoneRm(configPath, args);
    case 'ls':
    case 'list':
      return zoneLs(configPath);
    case 'primary':
      return zonePrimary(configPath, args);
    case 'info':
      return zoneInfo(configPath, args);
    default:
      console.error('scaff: unknown -zone subcommand. Use: add | rm | ls | primary | info');
      return 1;
  }
}

function zoneAdd(configPath: string, args: ParsedArgs): number {
  const [name, ...dirs] = args.positionals.slice(1);
  if (!name || dirs.length === 0) {
    console.error('scaff: usage: -zone add <name> <dir> [dir...]');
    return 1;
  }
  if (!isValidZoneName(name)) {
    console.error(`scaff: invalid zone name "${name}" (cannot start with '-' or contain ':')`);
    return 1;
  }
  const resolved = dirs.map((d) => path.resolve(d));
  for (const d of resolved) {
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) {
      console.error(`scaff: not a directory: ${d}`);
      return 1;
    }
  }
  const config = loadConfig(configPath);
  config.zones[name] = resolved;
  if (flag(args.options, 'primary')) config.primary = name;
  saveConfig(configPath, config);
  console.log(`✔ Zone "${name}" registered (${resolved.length} dir${resolved.length === 1 ? '' : 's'}).`);
  return 0;
}

function zoneRm(configPath: string, args: ParsedArgs): number {
  const name = args.positionals[1];
  if (!name) {
    console.error('scaff: usage: -zone rm <name>');
    return 1;
  }
  const config = loadConfig(configPath);
  if (!config.zones[name]) {
    console.error(`scaff: zone "${name}" is not registered.`);
    return 1;
  }
  delete config.zones[name];
  if (config.primary === name) config.primary = null;
  saveConfig(configPath, config);
  console.log(`✔ Zone "${name}" removed.`);
  return 0;
}

function zoneLs(configPath: string): number {
  const config = loadConfig(configPath);
  const names = Object.keys(config.zones);
  if (names.length === 0) {
    console.log('No zones registered. Use `scaff -zone add <name> <dir>` to add one.');
    return 0;
  }
  names.sort();
  const marker = (n: string) => (config.primary === n ? ' (primary)' : '');
  for (const n of names) {
    console.log(`[${n}]${marker(n)}`);
    for (const d of config.zones[n]!) {
      console.log(`  • ${d}`);
    }
  }
  return 0;
}

function zonePrimary(configPath: string, args: ParsedArgs): number {
  const config = loadConfig(configPath);
  if (flag(args.options, 'clear')) {
    config.primary = null;
    saveConfig(configPath, config);
    console.log('✔ Primary zone cleared.');
    return 0;
  }
  const name = args.positionals[1];
  if (!name) {
    console.error('scaff: usage: -zone primary <name> | -zone primary --clear');
    return 1;
  }
  if (!config.zones[name]) {
    console.error(`scaff: zone "${name}" is not registered.`);
    return 1;
  }
  config.primary = name;
  saveConfig(configPath, config);
  console.log(`✔ Primary zone set to "${name}".`);
  return 0;
}

function zoneInfo(configPath: string, args: ParsedArgs): number {
  const name = args.positionals[1];
  if (!name) {
    console.error('scaff: usage: -zone info <name>');
    return 1;
  }
  const config = loadConfig(configPath);
  const dirs = config.zones[name];
  if (!dirs) {
    console.error(`scaff: zone "${name}" is not registered.`);
    return 1;
  }
  console.log(`[${name}]${config.primary === name ? ' (primary)' : ''}`);
  for (const d of dirs) {
    console.log(`  • ${d}`);
  }
  return 0;
}