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
    case 'hot':
      return zonePrimary(configPath, args);
    case 'info':
      return zoneInfo(configPath, args);
    default:
      console.error('scaff: unknown -zone subcommand. Use: add | rm | ls | hot | info');
      return 1;
  }
}

export async function runZoneAddDot(configPath: string): Promise<number> {
  const dir = path.resolve('.');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.error(`scaff: not a directory: ${dir}`); return 1; }
  const Enquirer = (await import('enquirer')).default as unknown as { Input: new(o:unknown)=>{run():Promise<string>}, Confirm: new(o:unknown)=>{run():Promise<boolean>} };
  const namePrompt = new Enquirer.Input({ name:'name', message:`zone name for ${dir}:`, validate:(v:string)=>isValidZoneName(v)?true:'invalid name' });
  const name = await namePrompt.run();
  const config = loadConfig(configPath);
  if (config.zones[name]) { console.error(`scaff: zone "${name}" already exists (no overwrite)`); return 1; }
  config.zones[name]=dir;
  if (!config.hot) config.hot=name;
  else {
    const confirm = new Enquirer.Confirm({ name:'hot', message:'make hot?', initial:false });
    if (await confirm.run()) config.hot=name;
  }
  saveConfig(configPath, config);
  console.log(`✔ Zone "${name}" added (${dir})${config.hot===name?' [hot]':''}`);
  return 0;
}

function zoneAdd(configPath: string, args: ParsedArgs): number {
  const [name, dirArg] = args.positionals.slice(1);
  if (!name || !dirArg) {
    console.error('scaff: usage: -zone add <name> <dir>');
    return 1;
  }
  if (!isValidZoneName(name)) {
    console.error(`scaff: invalid zone name "${name}"`);
    return 1;
  }
  const resolved = path.resolve(dirArg);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    console.error(`scaff: not a directory: ${resolved}`);
    return 1;
  }
  const config = loadConfig(configPath);
  if (config.zones[name]) { console.error(`scaff: zone "${name}" already exists`); return 1; }
  config.zones[name] = resolved;
  if (!config.hot) config.hot = name;
  saveConfig(configPath, config);
  console.log(`✔ Zone "${name}" registered (${resolved})${config.hot===name?' [hot]':''}.`);
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
  if (config.hot === name) config.hot = null;
  saveConfig(configPath, config);
  console.log(`✔ Zone "${name}" removed.`);
  return 0;
}

function zoneLs(configPath: string): number {
  const config = loadConfig(configPath);
  const names = Object.keys(config.zones);
  if (names.length === 0) {
    console.log('No zones. Use `scaff .` or `scaff -zone add <name> <dir>`.');
    return 0;
  }
  names.sort();
  for (const n of names) {
    console.log(`[${n}]${config.hot === n ? ' [hot]' : ''} -> ${config.zones[n]}`);
  }
  return 0;
}

function zonePrimary(configPath: string, args: ParsedArgs): number {
  const config = loadConfig(configPath);
  if (flag(args.options, 'clear')) {
    config.hot = null;
    saveConfig(configPath, config);
    console.log('✔ Hot zone cleared.');
    return 0;
  }
  const name = args.positionals[1];
  if (!name) {
    console.error('scaff: usage: -zone hot <name> | -zone hot --clear');
    return 1;
  }
  if (!config.zones[name]) {
    console.error(`scaff: zone "${name}" is not registered.`);
    return 1;
  }
  config.hot = name;
  saveConfig(configPath, config);
  console.log(`✔ Hot zone set to "${name}".`);
  return 0;
}

function zoneInfo(configPath: string, args: ParsedArgs): number {
  const name = args.positionals[1];
  if (!name) {
    console.error('scaff: usage: -zone info <name>');
    return 1;
  }
  const d = loadConfig(configPath).zones[name];
  if (!d) { console.error(`scaff: zone "${name}" not registered.`); return 1; }
  console.log(`[${name}] -> ${d}`);
  return 0;
}