import * as fs from 'node:fs';
import * as path from 'node:path';
import * as p from '@clack/prompts';
import { loadProjectConfig, saveProjectConfig, detect, runProjectConfig, type ProjectConfig } from '../core/projectConfig/index.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag } from '../cli/args.js';

export async function runConfig(configPath: string, args: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const name = path.basename(cwd);
  if (flag(args.options,'run')) {
    const cfg = loadProjectConfig(cwd);
    if (!cfg) { p.log.error(`No scaff config in ${cwd}. Run scaff config to set up.`); return 1; }
    await runProjectConfig(cwd, cfg);
    return 0;
  }
  const existing = loadProjectConfig(cwd);
  if (!existing) return wizardNew(cwd, name);
  return wizardExisting(cwd, name, existing);
}

async function wizardNew(cwd:string, name:string){
  p.intro(`Configure ${name}`);
  const det = detect(cwd);

  const group = await p.group({
    wantEditor: () => p.confirm({ message:'Open an editor?', initialValue:true }),
    wantCommand: () => p.confirm({ message:'Start a dev command?', initialValue:true }),
    wantBrowser: () => p.confirm({ message:'Open a browser?', initialValue:true }),
    wantTerminal: () => p.confirm({ message:'Open project terminal?', initialValue:true }),
  }, { onCancel: ()=>{ p.cancel('Cancelled'); process.exit(0); } });
  if(p.isCancel(group)) return 1;

  let editor: string|null = null;
  if(group.wantEditor){
    const sel = await p.select({
      message:'Which editor?',
      options: det.editors.length
        ? [{value:'detect',label:'Detect installed'},{value:'code',label:'VS Code'},{value:'cursor',label:'Cursor'},{value:'windsurf',label:'Windsurf'},{value:'other',label:'Other'}]
        : [{value:'code',label:'VS Code'},{value:'cursor',label:'Cursor'},{value:'windsurf',label:'Windsurf'},{value:'other',label:'Other'}]
    }) as string|symbol;
    if(p.isCancel(sel)) return 1;
    if(sel==='detect'){
      const opts = det.editors.map(e=>({value:e, label: e==='code'?'VS Code': e==='cursor'?'Cursor':'Windsurf'}));
      const dsel = await p.select({ message:'Detected editors', options: opts as never }) as string|symbol;
      if(p.isCancel(dsel)) return 1;
      editor = dsel as string;
    } else if(sel==='other'){
      const v = await p.text({ message:'Editor command', placeholder:'code' }) as string|symbol;
      if(p.isCancel(v)) return 1; editor = (v as string)||'code';
    } else editor = sel as string;
  }

  let terminalMode: 'window'|'tab'|'current'|'none' = 'none';
  if(group.wantTerminal){
    const t = await p.select({
      message:'Where should command run?',
      options:[
        {value:'window', label:'New terminal window'},
        {value:'tab', label:'New terminal tab'},
        {value:'current', label:'Current terminal'},
        {value:'none', label:"Don't open a terminal"},
      ]
    }) as string|symbol;
    if(p.isCancel(t)) return 1; terminalMode = t as never;
  }

  let command: string|null = null;
  if(group.wantCommand){
    p.log.info(`Detected package manager: ${det.pm}`);
    const c = await p.select({
      message:'What should run?',
      options:[{value:det.command,label:det.command},{value:'pnpm start',label:'pnpm start'},{value:'custom',label:'Custom command'}]
    }) as string|symbol;
    if(p.isCancel(c)) return 1;
    if(c==='custom'){ const v = await p.text({message:'Custom command', placeholder:'pnpm dev'}) as string|symbol; if(p.isCancel(v)) return 1; command = (v as string)||'pnpm dev';}
    else command = c as string;
  }

  let browserUrl: string|null = null;
  if(group.wantBrowser){
    const b = await p.select({
      message:'Open a URL?',
      options:[{value:'detected',label:`Detected: ${det.url}`},{value:'custom',label:'Enter custom URL'},{value:'none',label:"Don't open automatically"}]
    }) as string|symbol;
    if(p.isCancel(b)) return 1;
    if(b==='detected') browserUrl = det.url;
    else if(b==='custom'){ const v = await p.text({message:'Custom URL', placeholder:'http://localhost:3000'}) as string|symbol; if(p.isCancel(v)) return 1; browserUrl = (v as string)||'http://localhost:3000';}
  }

  p.log.message(`Ready profile for ${name}\n  Editor: ${editor??'—'}  Terminal: ${terminalMode}  Command: ${command??'—'}  Browser: ${browserUrl??'—'}`);

  const final = await p.select({
    message:'Save?',
    options:[{value:'enable',label:'Save & enable'},{value:'manual',label:'Save without auto-run'},{value:'restart',label:'Start over'}]
  }) as string|symbol;
  if(p.isCancel(final)) return 1;
  if(final==='restart') return wizardNew(cwd, name);
  const cfg: ProjectConfig = { auto: final==='enable', editor, terminal:{mode: terminalMode}, command, browser:{url: browserUrl, wait:true} };
  saveProjectConfig(cwd, cfg);
  p.log.success(`Saved ${path.join(cwd,'.scaff')} ${cfg.auto?'(auto)':'(manual)'}`);
  try{
    const gi = path.join(cwd,'.gitignore');
    let content = fs.existsSync(gi)? fs.readFileSync(gi,'utf8') : '';
    if(!content.includes('.scaff')){
      const add = await p.confirm({ message:'Add .scaff to .gitignore?', initialValue:false }) as boolean|symbol;
      if(add===true){ fs.appendFileSync(gi, '\n.scaff\n'); p.log.info('Added .scaff to .gitignore'); }
    }
  }catch{}
  p.outro(`Run automatically with: scaff ${name}`);
  return 0;
}

async function wizardExisting(cwd:string, name:string, cfg:ProjectConfig){
  p.intro(name);
  p.log.message(`Auto-run: ${cfg.auto?'On':'Off'}  Editor: ${cfg.editor??'—'}  Terminal: ${cfg.terminal.mode}  Command: ${cfg.command??'—'}  Browser: ${cfg.browser.url??'—'}`);
  const sel = await p.select({
    message:'Choose',
    options:[
      {value:'run', label:'Run now'},
      {value:'edit', label:'Edit configuration'},
      {value:'disable', label:'Disable auto-run'},
      {value:'remove', label:'Remove configuration'},
    ]
  }) as string|symbol;
  if(p.isCancel(sel)) return 1;
  if(sel==='run'){ await runProjectConfig(cwd,cfg); return 0; }
  if(sel==='edit') return wizardNew(cwd,name);
  if(sel==='disable'){ cfg.auto=false; saveProjectConfig(cwd,cfg); p.log.warn('Auto-run disabled'); return 0; }
  if(sel==='remove'){
    const ok = await p.confirm({ message:'Remove .scaff?', initialValue:false }) as boolean|symbol;
    if(ok===true){ try{ fs.unlinkSync(path.join(cwd,'.scaff')); }catch{} p.log.error('Removed'); }
    return 0;
  }
  return 0;
}
