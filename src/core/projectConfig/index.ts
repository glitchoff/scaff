import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export interface ProjectConfig {
  auto: boolean;
  editor: string | null;
  terminal?: { mode: 'window'|'tab'|'current'|'none' };
  command: string | null;
  browser: { url: string | null };
}

const FILE = '.scaff';

export function configPath(cwd: string){ return path.join(cwd, FILE); }
export function loadProjectConfig(dir: string): ProjectConfig|null {
  try{
    const raw = fs.readFileSync(configPath(dir),'utf8');
    const j = JSON.parse(raw);
    // migrate old shape
    if(j.terminal===undefined) j.terminal={mode:'current'};
    if(j.browser?.wait!==undefined) delete j.browser.wait;
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
  for(const e of ['code','cursor','windsurf','code-insiders','zed','antigravity','antigravity-ide']){
    try{ if(spawnSync(which,[e]).status===0) editors.push(e); }catch{}
  }
  return {framework, pm, command, url, editors};
}

export async function runProjectConfig(dir:string, cfg:ProjectConfig, opts: { emitMarker?: boolean } = {}){
  const emitMarker = opts.emitMarker ?? false;
  const log = (...a: unknown[]) => console.error(...a);
  // banner for config projects
  log(`\u2500\u2500 scaff \u2500 ${path.basename(dir)} \u2500\u2500`);
  log(` editor ${cfg.editor ?? '—'} \u00B7 command ${cfg.command ?? '—'} \u00B7 url ${cfg.browser.url ?? '—'}`);
  if(cfg.editor){
    log(`[ok] Opening editor ${cfg.editor}`);
    try{ const cp=spawn(cfg.editor,[dir],{detached:true, stdio:'ignore'}); cp.on('error',()=>log(` editor "${cfg.editor}" not found in PATH`)); cp.unref(); }catch{}
  }
  if(cfg.browser.url){
    log(`[ok] Opening browser ${cfg.browser.url}`);
    try{
      const url=cfg.browser.url;
      if(process.platform==='win32') spawn('cmd',['/c','start','',url],{detached:true, stdio:'ignore'}).unref();
      else if(process.platform==='darwin') spawn('open',[url],{detached:true, stdio:'ignore'}).unref();
      else spawn('xdg-open',[url],{detached:true, stdio:'ignore'}).unref();
    }catch{}
  }
  if(cfg.command){
    if(emitMarker){
      console.error(`__SCAFF_RUN__${cfg.command}`);
    } else {
      console.error(`> Running ${cfg.command}`);
      try{
        const { execSync } = await import('node:child_process');
        execSync(cfg.command, { cwd: dir, stdio: 'inherit', shell: true as unknown as string });
      }catch(e: unknown){
        const s=(e as {status?:number}).status;
        if(s) log(`Command exited with code ${s}`);
      }
    }
  }
}
