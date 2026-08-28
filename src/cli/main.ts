import { getConfigPath } from '../config.js';
import { parseArgs } from './args.js';
import { HELP, version } from './help.js';
import { runZone } from '../commands/zone.js';
import { runList } from '../commands/list.js';
import { runOpen } from '../commands/open.js';
import { runNew } from '../commands/new.js';
import { runZoneAddDot } from '../commands/zone.js';
import { loadConfig } from '../core/registry/store.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

const configPath = getConfigPath();

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const [first] = argv;

  if (first === undefined || first === '-h' || first === '-help' || first === '--help' || first === 'help') {
    console.log(HELP);
    return 0;
  }
  if (first === '-v' || first === '-version' || first === '--version' || first === 'version') {
    console.log(version());
    return 0;
  }
  if (first === '.') return runZoneAddDot(configPath);
  // reserved without -: new/create/list/ls
  if (first === 'new' || first === 'create') return runNew(configPath, parseArgs(argv.slice(1)));
  if (first === '-new' || first === '-create') return runNew(configPath, parseArgs(argv.slice(1)));
  if (first === 'list' || first === 'ls') return runList(configPath, parseArgs(argv.slice(1)));
  if (first === 'config' || first === '-config') {
    const { runConfig } = await import('../commands/config.js');
    return runConfig(configPath, parseArgs(argv.slice(1)));
  }

  if (first.startsWith('-')) return dispatchCommand(first, argv.slice(1));

  // :name shorthand -> hot:name
  let token = first;
  if (token.startsWith(':')) {
    const cfg = loadConfig(configPath);
    if (!cfg.hot) { console.error('scaff: no hot zone set. Use scaff -zone add <name> <dir>'); return 1; }
    token = `${cfg.hot}:${token.slice(1)}`;
  }
  // bare project open - check auto config after resolve but also run via runBare wrapper
  const { runBare } = await import('../commands/path.js');
  const code = await runBare(configPath, token);
  if(code===0){
    try{
      const { resolveToken } = await import('../core/resolve/index.js');
      const cfg = loadConfig(configPath);
      const projects = resolveToken(cfg, token);
      if(projects.length){
        const { loadProjectConfig, runProjectConfig } = await import('../core/projectConfig/index.js');
        const pc = loadProjectConfig(projects[0]!.path);
        if(pc?.auto) await runProjectConfig(projects[0]!.path, pc);
      }
    }catch{}
  }
  return code;
}

function dispatchCommand(command: string, rest: string[]): Promise<number> {
  const args = parseArgs(rest);
  switch (command) {
    case '-setup':
      return import('../commands/setup.js').then(m=>m.runSetup(args));
    case '-add':
      return import('../commands/zone.js').then(m=>m.runZoneAddInteractive(configPath, args));
    case '-list':
    case '-ls':
      return runList(configPath, args);
    case '-find':
    case '-f':
      return import('../commands/find.js').then(m=>m.runFind(configPath, args));
    case '-open':
      return runOpen(configPath, args);
    case '-zone':
      return Promise.resolve(runZone(configPath, args));
    case '-alias':
      { const { runAlias } = require('../commands/alias.js'); return runAlias(args); }
    case '-hot':
      return import('../commands/zone.js').then(m=>m.runZoneHotSet(configPath, args));
    default:
      console.error(`scaff: unknown command "${command}".`);
      console.log(HELP);
      return Promise.resolve(1);
  }
}

async function maybePromptSetup(): Promise<void> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return;
  const cfg = loadConfig(configPath) as unknown as Record<string,unknown>;
  if (cfg['_setupPrompted']) return;
  try {
    const { detectShell, hasSetupBlock, profilePath } = await import('../core/shells/index.js');
    const shell = detectShell();
    const profile = profilePath(shell);
    if (hasSetupBlock(profile)) { (cfg['_setupPrompted']=true); try{ const {saveConfig}=await import('../core/registry/store.js'); saveConfig(configPath, cfg as never);}catch{} return; }
    const Enquirer = (await import('enquirer')).default as unknown as { Confirm: new(o:unknown)=>{run():Promise<boolean>} };
    const confirm = new Enquirer.Confirm({ name:'setup', message:'Run scaff anywhere — add shell integration? [Y/n]', initial:true });
    const yes = await confirm.run().catch(()=>false);
    (cfg['_setupPrompted']=true);
    try{ const {saveConfig}=await import('../core/registry/store.js'); saveConfig(configPath, cfg as never);}catch{}
    if (yes) {
      const { installSetup } = await import('../core/shells/index.js');
      installSetup(shell, profile);
      console.log(`✔ Shell integration added to ${profile} — restart your shell.`);
    }
  } catch {}
}

main().then(async c=>{ if(c===0) await maybePromptSetup(); process.exitCode=c}).catch((err:unknown)=>{console.error('scaff: unexpected error —',(err as Error).message??err);process.exitCode=1});
