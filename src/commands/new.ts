import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as readline from 'node:readline';
import { loadConfig } from '../core/registry/store.js';
import type { ParsedArgs } from '../cli/args.js';
import { flag, opt } from '../cli/args.js';

const TEMPLATES = ['next', 'vite', 'bun', 'turbo', 't3'] as const;
type Template = (typeof TEMPLATES)[number];

export async function runNew(configPath: string, args: ParsedArgs): Promise<number> {
  const config = loadConfig(configPath);
  const zones = Object.keys(config.zones);
  if (zones.length === 0) {
    console.error('scaff: no zones registered. Run `scaff -zone add <name> <dir>` first.');
    return 1;
  }

  // Passthrough after -- (forward to create-* CLI)
  const passthrough = args.positionals.includes('--')
    ? args.positionals.slice(args.positionals.indexOf('--') + 1)
    : [];
  const filteredPos = args.positionals.filter((p) => p !== '--' && !passthrough.includes(p));

  let name = filteredPos[0];
  let zone = opt(args.options, 'zone') ?? opt(args.options, 'in');
  let template = opt(args.options, 'template') as Template | undefined;

  if (!name) name = await ask(`Project name: `);
  if (!name || !/^[a-z0-9-_]+$/i.test(name)) {
    console.error('scaff: invalid project name (use letters, numbers, - _)');
    return 1;
  }
  if (!zone) zone = await pickZone(config);
  if (!config.zones[zone]) {
    console.error(`scaff: unknown zone "${zone}"`);
    return 1;
  }
  if (!template || !TEMPLATES.includes(template as Template)) {
    template = (await pickTemplate()) as Template;
  }

  const zoneDir = config.zones[zone]![0]!;
  const projectPath = path.join(zoneDir, name);
  if (fs.existsSync(projectPath)) {
    console.error(`scaff: "${projectPath}" already exists`);
    return 1;
  }

  const pm = detectPM(args);
  const cmd = buildCommand(template as Template, name, pm, passthrough, flag(args.options, 'yes'));

  console.log(`\n→ scaffolding ${template} → ${projectPath}`);
  console.log(`  $ ${cmd.join(' ')}\n`);

  const res = spawnSync(cmd[0]!, cmd.slice(1), { cwd: zoneDir, stdio: 'inherit', shell: true });
  if (res.status !== 0) return res.status ?? 1;

  console.log(`\n✔ Created ${name} in zone "${zone}"`);
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
  if (fs.existsSync('bun.lockb')) return 'bun';
  return 'pnpm';
}

async function pickZone(config: ReturnType<typeof loadConfig>): Promise<string> {
  const names = Object.keys(config.zones).sort();
  console.log('');
  names.forEach((n, i) => console.log(`  ${i + 1}) ${n}${config.primary === n ? ' *primary' : ''}  ${config.zones[n]![0]}`));
  const ans = await ask(`Zone [${config.primary ?? names[0]}]: `);
  if (!ans) return config.primary ?? names[0]!;
  const idx = parseInt(ans, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= names.length) return names[idx - 1]!;
  if (config.zones[ans]) return ans;
  return config.primary ?? names[0]!;
}

async function pickTemplate(): Promise<string> {
  console.log('');
  TEMPLATES.forEach((t, i) => console.log(`  ${i + 1}) ${t}`));
  const ans = await ask(`Template [next]: `);
  if (!ans) return 'next';
  const idx = parseInt(ans, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= TEMPLATES.length) return TEMPLATES[idx - 1]!;
  if (TEMPLATES.includes(ans as Template)) return ans;
  return 'next';
}

function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}
