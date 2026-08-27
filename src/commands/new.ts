import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, spawnSync as _sp } from 'node:child_process';
import { loadConfig } from '../core/registry/store.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';
import Enquirer from 'enquirer';
import chalk from 'chalk';

function hasCmd(c: string): boolean {
  try { const r = _sp(process.platform === 'win32' ? 'where' : 'which', [c]); return r.status === 0; } catch { return false; }
}

const TEMPLATES = ['next', 'vite', 'bun', 'turbo', 't3'] as const;
type Template = (typeof TEMPLATES)[number];

const BANNER = chalk.cyan(`
  ███████╗ ██████╗ █████╗ ███████╗███████╗
  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝
  ███████╗██║     ███████║█████╗  █████╗
  ╚════██║██║     ██╔══██║██╔══╝  ██╔══╝
  ███████║╚██████╗██║  ██║██║     ██║
  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ${chalk.dim('v0.4')}
`);

export async function runNew(configPath: string, args: ParsedArgs): Promise<number> {
  console.log(BANNER);
  const config = loadConfig(configPath);
  const zones = Object.keys(config.zones);
  if (zones.length === 0) {
    console.error(chalk.red('  No zones registered. Run `scaff -zone add <name> <dir>` first.'));
    return 1;
  }

  const passthrough = args.positionals.includes('--') ? args.positionals.slice(args.positionals.indexOf('--') + 1) : [];
  const filteredPos = args.positionals.filter((p) => p !== '--' && !passthrough.includes(p));
  let name = filteredPos[0];
  let zone = opt(args.options, 'zone') ?? opt(args.options, 'in');
  let template = opt(args.options, 'template') as Template | undefined;

  try {
    if (!name) {
      const res = await (Enquirer as unknown as { prompt: (q: unknown) => Promise<Record<string,string>> }).prompt({
        type: 'input', name: 'name', message: chalk.cyan('Project name'),
        validate: (v: string) => /^[a-z0-9-_]+$/i.test(v) || 'Use letters, numbers, - _',
      });
      name = res.name;
    }
    if (!name || !/^[a-z0-9-_]+$/i.test(name)) { console.error(chalk.red('  Invalid project name')); return 1; }
    if (!zone) zone = await pickZone(config);
    if (!config.zones[zone]) { console.error(chalk.red(`  Unknown zone "${zone}"`)); return 1; }
    if (!template || !TEMPLATES.includes(template as Template)) template = await pickTemplate() as Template;
  } catch {
    console.log(chalk.yellow('\n  Cancelled.'));
    return 1;
  }

  const zoneDir = config.zones[zone] as unknown as string;
  const projectPath = path.join(zoneDir, name);
  if (fs.existsSync(projectPath)) { console.error(chalk.red(`  "${projectPath}" already exists`)); return 1; }

  const pm = detectPM(args);
  const cmd = buildCommand(template as Template, name, pm, passthrough, flag(args.options, 'yes'));
  console.log(chalk.dim(`\n→ scaffolding ${chalk.bold(template)} → ${projectPath}`));
  console.log(chalk.dim(`  $ ${cmd.join(' ')}\n`));
  const res = spawnSync(cmd.join(' '), { cwd: zoneDir, stdio: 'inherit', shell: true });
  if (res.status !== 0) { console.error(chalk.red('  Scaffolding cancelled or failed')); return res.status ?? 1; }
  if (!fs.existsSync(projectPath)) { console.error(chalk.red(`  Failed: "${projectPath}" not created (wizard cancelled?)`)); return 1; }
  console.log(chalk.green(`\n✔ Created ${chalk.bold(name)} in zone "${zone}" ${chalk.dim(projectPath)}`));
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
  const choices = names.map((n) => ({ name: n, message: `${n}${(config as unknown as Record<string,string>).hot===n ? chalk.yellow(' *hot'):''}  ${chalk.dim(config.zones[n] as unknown as string)}` }));
  const res = await (Enquirer as unknown as { prompt: (q: unknown) => Promise<Record<string,string>> }).prompt({
    type: 'select', name: 'zone', message: 'Select zone', choices,
    initial: names.indexOf(((config as unknown as Record<string,string>).hot) ?? names[0]!),
  });
  return res.zone;
}
async function pickTemplate(): Promise<string> {
  const choices = [
    { name: 'next', message: `${chalk.cyan('next')}  — Next.js (create-next-app)` },
    { name: 'vite', message: `${chalk.magenta('vite')}  — Vite React-TS` },
    { name: 'bun', message: `${chalk.yellow('bun')}   — Bun + Vite` },
    { name: 'turbo', message: `${chalk.blue('turbo')} — Turborepo` },
    { name: 't3', message: `${chalk.green('t3')}    — T3 Stack (Next + tRPC + Prisma)` },
  ];
  const res = await (Enquirer as unknown as { prompt: (q: unknown) => Promise<Record<string,string>> }).prompt({
    type: 'select', name: 'tpl', message: 'Select template', choices,
  });
  return res.tpl;
}
