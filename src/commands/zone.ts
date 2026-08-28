import * as fs from 'node:fs';
import * as path from 'node:path';
import { isValidZoneName, loadConfig, saveConfig } from '../core/registry/store.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';
import chalk from 'chalk';

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
  if (!process.stdin.isTTY || !process.stdout.isTTY) { console.error('scaff: run `scaff .` in an interactive terminal'); return 1; }
  const { text, confirm } = await import('@clack/prompts');
  const name = await text({ message: `zone name for ${dir}:`, validate(v){ if(!isValidZoneName(v as string)) return 'invalid name (no - or : or .)'; } }) as string|symbol;
  if (typeof name === 'symbol') return 1;
  const trimmed = (name as string).trim();
  if (!trimmed) return 1;
  const config = loadConfig(configPath);
  if (config.zones[trimmed]) { console.error(`scaff: zone "${trimmed}" already exists (no overwrite)`); return 1; }
  config.zones[trimmed]=dir;
  if (!config.hot) config.hot=trimmed;
  else {
    const makeHot = await confirm({ message:'make hot?', initialValue:false }) as boolean|symbol;
    if (makeHot === true) config.hot=trimmed;
  }
  saveConfig(configPath, config);
  console.log(`✔ Zone "${trimmed}" added (${dir})${config.hot===trimmed?' [hot]':''}`);
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
    console.log(chalk.yellow('No zones. Use `scaff .` or `scaff -add` or `scaff -zone add <name> <dir>`.'));
    return 0;
  }
  names.sort();
  for (const n of names) {
    const isHot = config.hot === n;
    console.log(`${isHot?chalk.red('★'): ' '} ${chalk.bold(n)}${isHot?chalk.red(' [hot]'):chalk.dim('')} ${chalk.dim('->')} ${config.zones[n]}`);
  }
  return 0;
}

export async function runZoneAddInteractive(configPath: string, args: ParsedArgs): Promise<number> {
  const Enquirer = (await import('enquirer')).default as unknown as { Input: new(o:unknown)=>{run():Promise<string>}, Confirm: new(o:unknown)=>{run():Promise<boolean>} };
  let name = args.positionals[0];
  let dirArg = args.positionals[1];
  if (!name) {
    const p = new Enquirer.Input({ name:'name', message: chalk.cyan('Zone name'), validate:(v:string)=>isValidZoneName(v)?true:'invalid (no - or :)' });
    name = await p.run();
  }
  if (!dirArg) {
    const p = new Enquirer.Input({ name:'dir', message: chalk.cyan('Folder path'), initial: process.cwd(), validate:(v:string)=>fs.existsSync(path.resolve(v))?true:'not found' });
    dirArg = await p.run();
  }
  if (!isValidZoneName(name)) { console.error(chalk.red(` invalid zone name "${name}"`)); return 1; }
  const resolved = path.resolve(dirArg);
  if (!fs.existsSync(resolved)) { console.error(chalk.red(` not a directory: ${resolved}`)); return 1; }
  const config = loadConfig(configPath);
  if (config.zones[name]) { console.error(chalk.red(` zone "${name}" already exists`)); return 1; }
  const wasHot = config.hot;
  if (!config.hot) config.hot = name;
  config.zones[name]=resolved;
  saveConfig(configPath, config);
  console.log(chalk.green(`✔ Zone "${chalk.bold(name)}" added ${chalk.dim(resolved)} ${config.hot===name?chalk.red('[hot]'):''}`));
  if (wasHot) console.log(chalk.dim(`  Current hot: "${wasHot}"`));
  if (config.hot===name && wasHot!==name && wasHot) {
    // already set as hot because first zone, still inform
  }
  if (config.hot !== name) {
    console.log(chalk.yellow(`  "${name}" is not hot (hot is "${config.hot}")`));
    const c = new Enquirer.Confirm({ name:'switch', message: chalk.cyan(`Switch hot to "${name}"?`), initial:false });
    if (await c.run()) { config.hot=name; saveConfig(configPath, config); console.log(chalk.green(`✔ Hot switched to "${name}"`)); }
  } else if (!wasHot) {
    console.log(chalk.green(`  "${name}" is now ${chalk.red('hot')} (first zone)`));
  } else if (wasHot===name) {
    // already hot
  }
  return 0;
}

export async function runZoneHotSet(configPath: string, args: ParsedArgs): Promise<number> {
  const config = loadConfig(configPath);
  const names = Object.keys(config.zones);
  if (names.length===0) { console.error(chalk.red(' No zones. Use scaff -add first.')); return 1; }
  let target = args.positionals[0];
  if (!target) {
    const Enquirer = (await import('enquirer')).default as unknown as { AutoComplete: new(o:unknown)=>{run():Promise<string>} };
    const p = new Enquirer.AutoComplete({ name:'hot', message: chalk.cyan('Pick hot zone'), choices: names.map(n=>({name:n, message:`${n}${config.hot===n?chalk.red(' [hot]'):''} ${chalk.dim(config.zones[n] as string)}`})) });
    target = await p.run();
  }
  if (!config.zones[target]) { console.error(chalk.red(` zone "${target}" not found`)); return 1; }
  config.hot=target; saveConfig(configPath, config);
  console.log(chalk.green(`✔ Hot is now "${chalk.bold(target)}" ${chalk.dim(config.zones[target] as string)}`));
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