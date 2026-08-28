import * as fs from 'node:fs';
import * as path from 'node:path';
import * as p from '@clack/prompts';
import { loadProjectConfig, saveProjectConfig, detect, runProjectConfig, type ProjectConfig } from '../core/projectConfig/index.js';
import { flag } from '../cli/args.js';
import type { ParsedArgs } from '../cli/args.js';

export async function runConfig(configPath: string, args: ParsedArgs): Promise<number> {
  const cwd = process.cwd();
  const cfg = loadProjectConfig(cwd);
  if (flag(args.options,'run')) {
    if (!cfg) { p.log.error(`No .scaff in ${cwd}. Run scaff config.`); return 1; }
    await runProjectConfig(cwd, cfg);
    return 0;
  }
  if (!cfg) return createFlow(cwd);
  return editFlow(cwd, cfg);
}

// --- create: one screen, 3 questions ---
async function createFlow(cwd: string){
  const det = detect(cwd);
  p.intro(`scaff config — ${path.basename(cwd)}`);
  p.log.info(`detected: ${det.pm} · ${det.command} · ${det.url}`);

  const res = await p.group({
    editor: () => p.select({
      message: 'Editor',
      options: [
        { value: det.editors[0] ?? 'code', label: det.editors[0] ?? 'code', hint: det.editors[0] ? 'detected' : undefined },
        { value: 'none', label: 'none' },
        { value: 'other', label: 'other…' },
      ],
    }),
    command: () => p.text({ message: 'Command', placeholder: det.command, defaultValue: det.command }),
    url: () => p.text({ message: 'Browser URL (empty = none)', placeholder: det.url }),
  }, { onCancel: ()=>{ p.cancel('Cancelled'); process.exit(0); }});

  let editor = res.editor as string;
  if (editor === 'other') {
    const v = await p.text({ message: 'Editor command', placeholder: 'code' }) as string;
    editor = v?.trim() || 'code';
  }
  if (editor === 'none') editor = '';

  const command = (res.command as string)?.trim() || null;
  const url = (res.url as string)?.trim() || null;

  const auto = await p.confirm({ message: 'Auto-run on scaff jump?', initialValue: true }) as boolean;
  const cfg: ProjectConfig = { auto, editor: editor || null, command, browser: { url } };
  save(cwd, cfg);
  p.outro(`Saved .scaff — scaff config --run to test`);
  return 0;
}

// --- edit: flat list, pick field to change ---
async function editFlow(cwd: string, cfg: ProjectConfig){
  p.intro(path.basename(cwd));
  p.log.message(`${fmt(cfg)}`);

  const sel = await p.select({
    message: 'Action',
    options: [
      { value: 'run', label: 'Run now' },
      { value: 'editor', label: `editor: ${cfg.editor ?? '—'}` },
      { value: 'command', label: `command: ${cfg.command ?? '—'}` },
      { value: 'url', label: `url: ${cfg.browser.url ?? '—'}` },
      { value: 'toggle', label: `auto: ${cfg.auto ? 'on' : 'off'}` },
      { value: 'remove', label: 'Remove .scaff' },
    ],
  }) as string|symbol;
  if (p.isCancel(sel)) return 1;

  if (sel === 'run') { await runProjectConfig(cwd, cfg); return 0; }
  if (sel === 'toggle') { cfg.auto = !cfg.auto; save(cwd, cfg); p.log.success(`auto ${cfg.auto?'on':'off'}`); return 0; }
  if (sel === 'remove') {
    const ok = await p.confirm({ message: 'Remove .scaff?' }) as boolean;
    if (ok) { try{ fs.unlinkSync(path.join(cwd,'.scaff')); }catch{} p.log.success('Removed'); }
    return 0;
  }
  if (sel === 'editor') {
    const v = await p.text({ message: 'Editor (empty = none)', placeholder: 'code', defaultValue: cfg.editor ?? '' }) as string;
    cfg.editor = v?.trim() || null; save(cwd, cfg); p.log.success(`editor → ${cfg.editor ?? '—'}`); return 0;
  }
  if (sel === 'command') {
    const v = await p.text({ message: 'Command (empty = none)', placeholder: 'pnpm dev', defaultValue: cfg.command ?? '' }) as string;
    cfg.command = v?.trim() || null; save(cwd, cfg); p.log.success(`command → ${cfg.command ?? '—'}`); return 0;
  }
  if (sel === 'url') {
    const v = await p.text({ message: 'URL (empty = none)', placeholder: 'http://localhost:3000', defaultValue: cfg.browser.url ?? '' }) as string;
    cfg.browser.url = v?.trim() || null; save(cwd, cfg); p.log.success(`url → ${cfg.browser.url ?? '—'}`); return 0;
  }
  return 0;
}

function fmt(c: ProjectConfig){ return `editor ${c.editor??'—'} · command ${c.command??'—'} · url ${c.browser.url??'—'} · auto ${c.auto?'on':'off'}`; }

function save(cwd: string, cfg: ProjectConfig){
  saveProjectConfig(cwd, cfg);
  const gi = path.join(cwd,'.gitignore');
  try{
    const cur = fs.existsSync(gi) ? fs.readFileSync(gi,'utf8') : '';
    if (!cur.includes('.scaff')) fs.appendFileSync(gi, '\n.scaff\n');
  }catch{}
}
