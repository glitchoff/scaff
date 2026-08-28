import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, spawnSync as _sp } from 'node:child_process';
import { loadConfig } from '../core/registry/store.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';
import * as p from '@clack/prompts';
import { version } from '../cli/help.js';

function hasCmd(c: string): boolean {
  try { const r = _sp(process.platform === 'win32' ? 'where' : 'which', [c]); return r.status === 0; } catch { return false; }
}

const TEMPLATES = ['next', 'vite', 'bun', 'turbo', 't3'] as const;
type Template = (typeof TEMPLATES)[number];

const BANNER = `
  ███████╗ ██████╗ █████╗ ███████╗███████╗
  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝
  ███████╗██║     ███████║█████╗  █████╗
  ╚════██║██║     ██╔══██║██╔══╝  ██╔══╝
  ███████║╚██████╗██║  ██║██║     ██║
  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  v${version()}
`;

export async function runNew(configPath: string, args: ParsedArgs): Promise<number> {
  p.intro(BANNER);
  const config = loadConfig(configPath);
  const zones = Object.keys(config.zones);
  if (zones.length === 0) {
    p.log.error('No zones registered. Run `scaff -zone add <name> <dir>` first.');
    return 1;
  }

  const passthrough = args.positionals.includes('--') ? args.positionals.slice(args.positionals.indexOf('--') + 1) : [];
  const filteredPos = args.positionals.filter((p) => p !== '--' && !passthrough.includes(p));
  let name = filteredPos[0];
  let zone = opt(args.options, 'zone') ?? opt(args.options, 'in');
  let template = opt(args.options, 'template') as Template | undefined;

  try {
    if (!name) {
      const v = await p.text({ message:'Project name', validate(v){ if(!/^[a-z0-9-_]+$/i.test(v as string)) return 'Use letters, numbers, - _'; } }) as string|symbol;
      if(p.isCancel(v)) { p.cancel('Cancelled'); return 1; }
      name = v as string;
    }
    if (!name || !/^[a-z0-9-_]+$/i.test(name)) { p.log.error('Invalid project name'); return 1; }
    if (!zone) zone = await pickZone(config);
    if (!config.zones[zone]) { p.log.error(`Unknown zone "${zone}"`); return 1; }
    if (!template || !TEMPLATES.includes(template as Template)) template = await pickTemplate() as Template;
  } catch {
    p.cancel('Cancelled'); return 1;
  }

  const zoneDir = config.zones[zone] as unknown as string;
  const projectPath = path.join(zoneDir, name);
  if (fs.existsSync(projectPath)) { p.log.error(`"${projectPath}" already exists`); return 1; }

  const pm = detectPM(args);
  const cmd = buildCommand(template as Template, name, pm, passthrough, flag(args.options, 'yes'));
  p.log.info(`scaffolding ${template} -> ${projectPath}`);
  p.log.info(`$ ${cmd.join(' ')}`);
  const s = p.spinner(); s.start('Creating');
  const res = spawnSync(cmd.join(' '), { cwd: zoneDir, stdio: 'inherit', shell: true });
  s.stop(res.status===0?'Created':'Failed');
  if (res.status !== 0) { p.log.error('Scaffolding cancelled or failed'); return res.status ?? 1; }
  if (!fs.existsSync(projectPath)) { p.log.error(`Failed: "${projectPath}" not created`); return 1; }
  p.log.success(`Created ${name} in zone "${zone}" ${projectPath}`);
  p.outro(`cd ${projectPath}`);
  return 0;
}

function buildCommand(t: Template, name: string, pm: string, extra: string[], yes: boolean): string[] {
  const dlx = pm === 'bun' ? 'bunx' : pm === 'pnpm' ? 'pnpm dlx' : 'npx';
  if (extra.length) return [...dlx.split(' '), templatePkg(t), name, ...extra];
  if (yes) return [...dlx.split(' '), templatePkg(t), name, ...defaultFlags(t)];
  return [...dlx.split(' '), templatePkg(t), name];
}
function templatePkg(t: Template): string {
  return { next: 'create-next-app@latest', vite: 'create-vite@latest', bun: 'create-vite@latest', turbo: 'create-turbo@latest', t3: 'create-t3-app@latest' }[t];
}
function defaultFlags(t: Template): string[] {
  if (t === 'next') return ['--ts', '--eslint', '--tailwind', '--app', '--import-alias', '@/*'];
  if (t === 'vite') return ['--template', 'react-ts'];
  return [];
}
function detectPM(args: ParsedArgs): string {
  const pm = opt(args.options, 'pm');
  if (pm) return pm;
  if (fs.existsSync('bun.lockb') && hasCmd('bun')) return 'bun';
  if (hasCmd('pnpm')) return 'pnpm';
  if (hasCmd('bun')) return 'bun';
  if (hasCmd('yarn')) return 'yarn';
  return 'npm';
}
async function pickZone(config: ReturnType<typeof loadConfig>): Promise<string> {
  const names = Object.keys(config.zones).sort();
  const v = await p.select({ message:'Select zone', options: names.map(n=>({value:n, label: `${n}${(config as unknown as Record<string,string>).hot===n ? ' *hot':''}  ${config.zones[n]}`})) }) as string|symbol;
  if(p.isCancel(v)) throw new Error('cancel');
  return v as string;
}
async function pickTemplate(): Promise<string> {
  const v = await p.select({ message:'Select template', options:[
    { value:'next', label:'next  — Next.js' },
    { value:'vite', label:'vite  — Vite React-TS' },
    { value:'bun', label:'bun   — Bun + Vite' },
    { value:'turbo', label:'turbo — Turborepo' },
    { value:'t3', label:'t3    — T3 Stack' },
  ]}) as string|symbol;
  if(p.isCancel(v)) throw new Error('cancel');
  return v as string;
}
