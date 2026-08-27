import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import * as rl from 'node:readline/promises';
import { loadProjectConfig, saveProjectConfig, detect, runProjectConfig, type ProjectConfig } from '../core/projectConfig/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';

function ask(q:string, def?:string): Promise<string> {
  const r = rl.createInterface({input: process.stdin, output: process.stdout});
  const prompt = def ? `${q} [${def}] ` : `${q} `;
  return r.question(prompt).then(v=>{ r.close(); return v.trim() || def || ''; });
}
async function confirm(q:string, def=true): Promise<boolean> {
  const v = await ask(`${q} (${def?'Y/n':'y/N'})`, def?'Y':'N');
  if(!v) return def;
  return v.toLowerCase().startsWith('y');
}
async function select(q:string, choices:string[]): Promise<string|null> {
  console.log(chalk.cyan(`\n${q}`));
  choices.forEach((c,i)=> console.log(`  ${i+1}) ${c}`));
  const v = await ask(`Pick 1-${choices.length}`, '1');
  const n = parseInt(v,10);
  if(isNaN(n) || n<1 || n>choices.length) return null;
  return choices[n-1]!;
}

export async function runConfig(configPath: string, args: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const name = path.basename(cwd);
  if (flag(args.options,'run')) {
    const cfg = loadProjectConfig(cwd);
    if (!cfg) { console.error(chalk.red(` No scaff config in ${cwd}. Run scaff config to set up.`)); return 1; }
    await runProjectConfig(cwd, cfg);
    return 0;
  }
  const existing = loadProjectConfig(cwd);
  if (!existing) return wizardNew(cwd, name);
  return wizardExisting(cwd, name, existing);
}

async function wizardNew(cwd:string, name:string){
  console.log(chalk.cyan(`\n Configure ${chalk.bold(name)}\n`));
  const wantEditor = await confirm('Open an editor?', true);
  const wantCommand = await confirm('Start a development command?', true);
  const wantBrowser = await confirm('Open a browser?', true);
  const wantTerminal = await confirm('Open project terminal?', true);

  const det = detect(cwd);
  let editor: string|null = null;
  if(wantEditor){
    if(det.editors.length){
      const sel = await select('Which editor?', ['Detect installed editors','VS Code','Cursor','Windsurf','Other']);
      if(!sel) return 1;
      if(sel==='Detect installed editors'){
        const opts = det.editors.map(e=>e==='code'?'VS Code': e==='cursor'?'Cursor':'Windsurf');
        const dsel = await select('Detected editors', opts);
        if(!dsel) return 1;
        editor = dsel==='VS Code'?'code': dsel==='Cursor'?'cursor':'windsurf';
      } else if(sel==='VS Code') editor='code';
      else if(sel==='Cursor') editor='cursor';
      else if(sel==='Windsurf') editor='windsurf';
      else editor = await ask('Editor command','code');
    } else {
      const sel = await select('Which editor?', ['VS Code','Cursor','Windsurf','Other']);
      if(!sel) return 1;
      if(sel==='Other') editor = await ask('Editor command','code');
      else editor = sel==='VS Code'?'code': sel==='Cursor'?'cursor':'windsurf';
    }
  }

  let terminalMode: 'window'|'tab'|'current'|'none' = 'none';
  if(wantTerminal){
    const t = await select('Where should the project command run?', ['New terminal window','New terminal tab','Current terminal',"Don't open a terminal"]);
    if(!t) return 1;
    if(t==='New terminal window') terminalMode='window';
    else if(t==='New terminal tab') terminalMode='tab';
    else if(t==='Current terminal') terminalMode='current';
    else terminalMode='none';
  }

  let command: string|null = null;
  if(wantCommand){
    console.log(chalk.dim(` Detected package manager: ${det.pm}`));
    const c = await select('What should run?', [det.command, 'pnpm start','Custom command']);
    if(!c) return 1;
    if(c==='Custom command') command = await ask('Custom command','pnpm dev');
    else command = c;
  }

  let browserUrl: string|null = null;
  let wait = true;
  if(wantBrowser){
    const b = await select('Open a URL?', [`Detected: ${det.url}`,'Enter a custom URL',"Don't open automatically"]);
    if(!b) return 1;
    if(b.startsWith('Detected')) browserUrl = det.url;
    else if(b==='Enter a custom URL') browserUrl = await ask('Custom URL','http://localhost:3000');
    else browserUrl = null;
  }

  console.log(chalk.cyan(`\n Ready profile for ${chalk.bold(name)}\n`));
  console.log(`  Editor     ${editor?chalk.green(editor):chalk.dim('—')}`);
  console.log(`  Terminal   ${terminalMode!=='none'?chalk.green(terminalMode):chalk.dim('—')}`);
  console.log(`  Command    ${command?chalk.green(command):chalk.dim('—')}`);
  console.log(`  Browser    ${browserUrl?chalk.green(browserUrl):chalk.dim('—')}`);
  console.log(chalk.dim(`\n Run automatically with: scaff ${name}\n`));

  const final = await select('Save?', ['Save & enable','Save without auto-run','Start over']);
  if(!final) return 1;
  if(final==='Start over') return wizardNew(cwd, name);
  const cfg: ProjectConfig = { auto: final==='Save & enable', editor, terminal:{mode: terminalMode}, command, browser:{url: browserUrl, wait} };
  saveProjectConfig(cwd, cfg);
  console.log(chalk.green(`\n ✔ Saved ${path.join(cwd,'.scaff')} ${cfg.auto?chalk.dim('(auto)') : chalk.yellow('(manual)')}`));
  try{
    const gi = path.join(cwd,'.gitignore');
    let content = fs.existsSync(gi)? fs.readFileSync(gi,'utf8') : '';
    if(!content.includes('.scaff')){
      const add = await confirm('Add .scaff to .gitignore?', false);
      if(add){ fs.appendFileSync(gi, '\n.scaff\n'); console.log(chalk.dim(' Added .scaff to .gitignore')); }
    }
  }catch{}
  return 0;
}

async function wizardExisting(cwd:string, name:string, cfg:ProjectConfig){
  console.log(chalk.cyan(`\n ${name}\n`));
  console.log(` Auto-run   ${cfg.auto?chalk.green('On'):chalk.yellow('Off')}`);
  console.log(` Editor     ${cfg.editor?chalk.green(cfg.editor):chalk.dim('—')}`);
  console.log(` Terminal   ${chalk.green(cfg.terminal.mode)}`);
  console.log(` Command    ${cfg.command?chalk.green(cfg.command):chalk.dim('—')}`);
  console.log(` Browser    ${cfg.browser.url?chalk.green(cfg.browser.url):chalk.dim('—')}\n`);
  const sel = await select('Choose', ['Run now','Edit configuration','Disable auto-run','Remove configuration']);
  if(!sel) return 1;
  if(sel==='Run now'){ await runProjectConfig(cwd,cfg); return 0; }
  if(sel==='Edit configuration') return wizardNew(cwd,name);
  if(sel==='Disable auto-run'){ cfg.auto=false; saveProjectConfig(cwd,cfg); console.log(chalk.yellow(' Auto-run disabled')); return 0; }
  if(sel==='Remove configuration'){
    const ok = await confirm('Remove .scaff?', false);
    if(ok){ try{ fs.unlinkSync(path.join(cwd,'.scaff')); }catch{} console.log(chalk.red(' Removed')); }
    return 0;
  }
  return 0;
}
