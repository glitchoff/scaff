import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import chalk from 'chalk';

export interface ProjectConfig {
  auto: boolean;
  editor: string | null;
  terminal: { mode: 'window'|'tab'|'current'|'none' };
  command: string | null;
  browser: { url: string | null, wait: boolean };
}

const FILE = '.scaff';

export function configPath(cwd: string){ return path.join(cwd, FILE); }
export function loadProjectConfig(dir: string): ProjectConfig|null {
  try{
    const raw = fs.readFileSync(configPath(dir),'utf8');
    const j = JSON.parse(raw);
    return j as ProjectConfig;
  }catch{ return null; }
}
export function saveProjectConfig(dir:string, cfg:ProjectConfig){ fs.writeFileSync(configPath(dir), JSON.stringify(cfg,null,2),'utf8'); }

export function detect(cwd:string): {framework:string, pm:string, command:string, url:string, editors:string[]} {
  let pm='npm'; if(fs.existsSync(path.join(cwd,'pnpm-lock.yaml'))) pm='pnpm'; else if(fs.existsSync(path.join(cwd,'bun.lockb'))) pm='bun'; else if(fs.existsSync(path.join(cwd,'yarn.lock'))) pm='yarn';
  let framework='unknown'; let url='http://localhost:3000';
  try{
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd,'package.json'),'utf8'));
    const deps = {...pkg.dependencies, ...pkg.devDependencies};
    if(deps['next']) { framework='Next.js'; url='http://localhost:3000'; }
    else if(deps['vite']||deps['@vitejs/plugin-react']) { framework='Vite'; url='http://localhost:5173'; }
  }catch{}
  const command = pm==='pnpm'?'pnpm dev': pm==='bun'?'bun dev': pm==='yarn'?'yarn dev':'npm run dev';
  const editors:string[]=[];
  const which = process.platform==='win32'?'where':'which';
  for(const e of ['code','cursor','windsurf']){
    try{ if(spawnSync(which,[e]).status===0) editors.push(e); }catch{}
  }
  return {framework, pm, command, url, editors};
}

async function pollUrl(url:string, timeout=45000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    try{ const res = await fetch(url,{signal:AbortSignal.timeout(2000)}); if(res.ok||res.status<500) return true; }catch{}
    await new Promise(r=>setTimeout(r,1000));
  }
  return false;
}

export async function runProjectConfig(dir:string, cfg:ProjectConfig){
  console.log(chalk.dim(`→ ${path.basename(dir)}`));
  if(cfg.editor){
    console.log(chalk.green(`✔ Opening editor ${cfg.editor}`));
    try{ const cp=spawn(cfg.editor,[dir],{detached:true, stdio:'ignore'}); cp.on('error',()=>console.log(chalk.yellow(` editor "${cfg.editor}" not found in PATH`))); cp.unref(); }catch{}
  }
  if(cfg.command && cfg.terminal.mode!=='none'){
    console.log(chalk.green(`✔ Starting ${cfg.command} in ${cfg.terminal.mode}`));
    try{
      if(cfg.terminal.mode==='window' || cfg.terminal.mode==='tab'){
        if(process.platform==='win32'){
          const wtOk = spawnSync('where',['wt']).status===0;
          if(wtOk){ const cp=spawn('wt',['new-tab','-d',dir,'powershell','-NoExit','-Command',cfg.command],{detached:true, stdio:'ignore'}); cp.on('error',()=>{}); cp.unref(); }
          else { const cp=spawn('cmd',['/c','start','', 'powershell','-NoExit','-Command',`cd /d "${dir}" && ${cfg.command}`],{detached:true, stdio:'ignore'}); cp.on('error',()=>{}); cp.unref(); }
        } else spawn('bash',['-c',`cd "${dir}" && ${cfg.command}`],{detached:true, stdio:'ignore'}).unref();
      } else spawn(cfg.command,{cwd:dir, shell:true, stdio:'inherit'});
    }catch{}
  } else if(cfg.command && cfg.terminal.mode==='none'){
    console.log(chalk.dim(`→ Running ${cfg.command} (current terminal)`));
    try{ spawn(cfg.command,{cwd:dir, shell:true, stdio:'inherit'}); }catch{}
  }
  if(cfg.browser.url){
    if(cfg.browser.wait){
      console.log(chalk.yellow(`◌ Waiting for ${cfg.browser.url}...`));
      const ok = await pollUrl(cfg.browser.url);
      if(ok) console.log(chalk.green('✔ Server ready'));
      else {
        console.log(chalk.yellow('⚠ Server didn\'t become available in time.'));
        try{
          const { confirm } = await import('@clack/prompts');
          const yes = await confirm({ message:'Open browser anyway?', initialValue:true }) as boolean|symbol;
          if(yes!==true) return;
        }catch{}
      }
    }
    console.log(chalk.green(`✔ Opening browser ${cfg.browser.url}`));
    try{
      const url=cfg.browser.url;
      if(process.platform==='win32') spawn('cmd',['/c','start','',url],{detached:true, stdio:'ignore'}).unref();
      else if(process.platform==='darwin') spawn('open',[url],{detached:true, stdio:'ignore'}).unref();
      else spawn('xdg-open',[url],{detached:true, stdio:'ignore'}).unref();
    }catch{}
  }
}
