import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import Enquirer from 'enquirer';
import { loadProjectConfig, saveProjectConfig, detect, runProjectConfig, type ProjectConfig } from '../core/projectConfig/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';

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
  const { MultiSelect } = Enquirer as unknown as {MultiSelect: new(o:unknown)=>{run():Promise<string[]>}};
  const choices = await new MultiSelect({
    name:'actions', message: chalk.cyan('What should happen when this project opens? (Space to toggle)'),
    choices: [
      {name:'editor', message:'Open an editor', value:'editor'},
      {name:'command', message:'Start a development command', value:'command'},
      {name:'browser', message:'Open a browser', value:'browser'},
      {name:'terminal', message:'Open project terminal', value:'terminal'},
    ],
    initial:['editor','command','browser','terminal'],
  }).run().catch(()=>null) as string[]|null;
  if(!choices) { console.log(chalk.yellow(' Cancelled')); return 1; }
  const wantEditor = choices.includes('editor');
  const wantCommand = choices.includes('command');
  const wantBrowser = choices.includes('browser');
  const wantTerminal = choices.includes('terminal');

  const det = detect(cwd);
  let editor: string|null = null;
  if(wantEditor){
    const { Select } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}};
    let edChoices:string[] = [];
    if(det.editors.length){
      const sel = await new Select({
        name:'ed', message: chalk.cyan('Which editor?'),
        choices: ['Detect installed editors','VS Code','Cursor','Windsurf','Other']
      }).run().catch(()=>null);
      if(!sel) return 1;
      if(sel==='Detect installed editors'){
        const dsel = await new Select({name:'d', message: chalk.cyan('Detected editors'), choices: det.editors.map(e=>e==='code'?'VS Code': e==='cursor'?'Cursor':'Windsurf')}).run().catch(()=>null);
        if(!dsel) return 1;
        editor = dsel==='VS Code'?'code': dsel==='Cursor'?'cursor':'windsurf';
      } else if(sel==='VS Code') editor='code';
      else if(sel==='Cursor') editor='cursor';
      else if(sel==='Windsurf') editor='windsurf';
      else {
        const { Input } = Enquirer as unknown as {Input: new(o:unknown)=>{run():Promise<string>}};
        editor = await new Input({name:'other', message:'Editor command'}).run().catch(()=>null);
        if(!editor) return 1;
      }
    } else {
      const sel = await new Select({name:'ed', message: chalk.cyan('Which editor?'), choices:['VS Code','Cursor','Windsurf','Other']}).run().catch(()=>null);
      if(!sel) return 1;
      if(sel==='Other'){
        const { Input } = Enquirer as unknown as {Input: new(o:unknown)=>{run():Promise<string>}};
        editor = await new Input({name:'other', message:'Editor command'}).run().catch(()=>null);
      } else editor = sel==='VS Code'?'code': sel==='Cursor'?'cursor':'windsurf';
    }
  }

  let terminalMode: 'window'|'tab'|'current'|'none' = 'none';
  if(wantTerminal){
    const { Select } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}};
    const t = await new Select({name:'t', message: chalk.cyan('Where should the project command run?'), choices:['New terminal window','New terminal tab','Current terminal',"Don't open a terminal"]}).run().catch(()=>null);
    if(!t) return 1;
    if(t==='New terminal window') terminalMode='window';
    else if(t==='New terminal tab') terminalMode='tab';
    else if(t==='Current terminal') terminalMode='current';
    else terminalMode='none';
  }

  let command: string|null = null;
  if(wantCommand){
    const { Select, Input } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}, Input: new(o:unknown)=>{run():Promise<string>}};
    console.log(chalk.dim(` Detected package manager: ${det.pm}`));
    const c = await new Select({name:'c', message: chalk.cyan('What should run?'), choices:[det.command, 'pnpm start','Custom command']}).run().catch(()=>null);
    if(!c) return 1;
    if(c==='Custom command') command = await new Input({name:'cc', message:'Custom command'}).run().catch(()=>null);
    else command = c;
    if(!command) return 1;
  }

  let browserUrl: string|null = null;
  let wait = true;
  if(wantBrowser){
    const { Select, Input } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}, Input: new(o:unknown)=>{run():Promise<string>}};
    const b = await new Select({name:'b', message: chalk.cyan('Open a URL?'), choices:[`Detected: ${det.url}`,'Enter a custom URL',"Don't open automatically"]}).run().catch(()=>null);
    if(!b) return 1;
    if(b.startsWith('Detected')) browserUrl = det.url;
    else if(b==='Enter a custom URL') browserUrl = await new Input({name:'cu', message:'Custom URL'}).run().catch(()=>null);
    else browserUrl = null;
  }

  console.log(chalk.cyan(`\n Ready profile for ${chalk.bold(name)}\n`));
  console.log(`  Editor     ${editor?chalk.green(editor):chalk.dim('—')}`);
  console.log(`  Terminal   ${terminalMode!=='none'?chalk.green(terminalMode):chalk.dim('—')}`);
  console.log(`  Command    ${command?chalk.green(command):chalk.dim('—')}`);
  console.log(`  Browser    ${browserUrl?chalk.green(browserUrl):chalk.dim('—')}`);
  console.log(chalk.dim(`\n Run automatically with: scaff ${name}\n`));

  const { Select } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}};
  const final = await new Select({name:'f', message:'', choices:['Save & enable','Save without auto-run','Start over']}).run().catch(()=>null);
  if(!final) return 1;
  if(final==='Start over') return wizardNew(cwd, name);
  const cfg: ProjectConfig = { auto: final==='Save & enable', editor, terminal:{mode: terminalMode}, command, browser:{url: browserUrl, wait} };
  saveProjectConfig(cwd, cfg);
  console.log(chalk.green(`\n ✔ Saved ${path.join(cwd,'.scaff')} ${cfg.auto?chalk.dim('(auto)') : chalk.yellow('(manual)')}`));
  // gitignore prompt
  try{
    const gi = path.join(cwd,'.gitignore');
    let content = fs.existsSync(gi)? fs.readFileSync(gi,'utf8') : '';
    if(!content.includes('.scaff')){
      const { Confirm } = Enquirer as unknown as {Confirm: new(o:unknown)=>{run():Promise<boolean>}};
      const add = await new Confirm({name:'gi', message:'Add .scaff to .gitignore?', initial:false}).run().catch(()=>false);
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
  const { Select } = Enquirer as unknown as {Select: new(o:unknown)=>{run():Promise<string>}};
  const sel = await new Select({name:'s', message:'', choices:['Run now','Edit configuration','Disable auto-run','Remove configuration']}).run().catch(()=>null);
  if(!sel) return 1;
  if(sel==='Run now'){ await runProjectConfig(cwd,cfg); return 0; }
  if(sel==='Edit configuration') return wizardNew(cwd,name);
  if(sel==='Disable auto-run'){ cfg.auto=false; saveProjectConfig(cwd,cfg); console.log(chalk.yellow(' Auto-run disabled')); return 0; }
  if(sel==='Remove configuration'){
    const { Confirm } = Enquirer as unknown as {Confirm: new(o:unknown)=>{run():Promise<boolean>}};
    const ok = await new Confirm({name:'rm', message:'Remove .scaff?', initial:false}).run().catch(()=>false);
    if(ok){ try{ fs.unlinkSync(path.join(cwd,'.scaff')); }catch{} console.log(chalk.red(' Removed')); }
    return 0;
  }
  return 0;
}
