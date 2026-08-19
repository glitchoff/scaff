import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { packageRoot } from '../../cli/locate.js';

export type ShellName = 'powershell' | 'bash' | 'zsh';

const SETUP_START = '# >>> scaff shell integration >>>';
const SETUP_END = '# <<< scaff shell integration <<<';
const ALIAS_START = '# >>> scaff aliases >>>';
const ALIAS_END = '# <<< scaff aliases <<<';

// ---------------------------------------------------------------------------
// Detection & paths
// ---------------------------------------------------------------------------

export function detectShell(): ShellName {
  const shell = process.env['SHELL'] ?? '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (process.platform === 'win32') return 'powershell';
  return 'bash';
}

/** Absolute path to the shipped wrapper for the given shell. */
export function wrapperPath(shell: ShellName): string {
  const base = packageRoot(import.meta.url);
  return path.join(base, 'shell', shell === 'powershell' ? 'scaff.ps1' : 'scaff.sh');
}

/** Absolute path to the profile file for the given shell. */
export function profilePath(shell: ShellName): string {
  if (shell === 'bash') return path.join(os.homedir(), '.bashrc');
  if (shell === 'zsh') return path.join(os.homedir(), '.zshrc');
  return powershellProfile();
}

function powershellProfile(): string {
  for (const sh of ['pwsh', 'powershell']) {
    try {
      const r = spawnSync(sh, ['-NoProfile', '-Command', '$PROFILE'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
    } catch {
      // try the next candidate
    }
  }
  const home = process.env['USERPROFILE'] ?? os.homedir();
  return path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
}

// ---------------------------------------------------------------------------
// Setup (scaff function) block
// ---------------------------------------------------------------------------

/** Read a profile file, returning '' if it does not exist. */
function readProfile(profile: string): string {
  try {
    return fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : '';
  } catch {
    return '';
  }
}

function writeProfile(profile: string, content: string): void {
  fs.mkdirSync(path.dirname(profile), { recursive: true });
  fs.writeFileSync(profile, content, 'utf8');
}

/** Replace/replace a fenced block; returns the new content. */
function upsertBlock(content: string, start: string, end: string, block: string): string {
  const stripped = removeBlock(content, start, end);
  return stripped.replace(/\s*$/, '') + `\n\n${start}\n${block}\n${end}\n`;
}

/** Remove a fenced block (first occurrence), returning the new content. */
function removeBlock(content: string, start: string, end: string): string {
  const s = content.indexOf(start);
  if (s === -1) return content;
  const e = content.indexOf(end, s);
  if (e === -1) return content.slice(0, s);
  return content.slice(0, s) + content.slice(e + end.length);
}

export function hasSetupBlock(profile: string): boolean {
  return readProfile(profile).includes(SETUP_START);
}

export function installSetup(shell: ShellName, profile: string): boolean {
  const sourceLine = shell === 'powershell' ? `. "${wrapperPath(shell)}"` : `source "${wrapperPath(shell)}"`;
  const content = readProfile(profile);
  const next = upsertBlock(content, SETUP_START, SETUP_END, sourceLine);
  if (next === content) return false;
  writeProfile(profile, next);
  return true;
}

export function uninstallSetup(profile: string): boolean {
  const content = readProfile(profile);
  const next = removeBlock(content, SETUP_START, SETUP_END);
  if (next === content) return false;
  writeProfile(profile, next);
  return true;
}

// ---------------------------------------------------------------------------
// Alias block
// ---------------------------------------------------------------------------

/** List installed scaff aliases as `{ name, line }` pairs. */
export function listAliases(profile: string): Array<{ name: string; line: string }> {
  const content = readProfile(profile);
  const s = content.indexOf(ALIAS_START);
  const e = content.indexOf(ALIAS_END);
  if (s === -1 || e === -1) return [];
  const body = content.slice(s + ALIAS_START.length, e);
  const out: Array<{ name: string; line: string }> = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const name = parseAliasName(line);
    if (name) out.push({ name, line });
  }
  return out;
}

function parseAliasName(line: string): string | null {
  const bash = /^alias\s+([^\s=]+)=/.exec(line);
  if (bash) return bash[1]!;
  const ps = /^Set-Alias\s+([^\s]+)\s/.exec(line);
  if (ps) return ps[1]!;
  return null;
}

/** True if an alias with this name is already installed by scaff. */
export function hasAlias(profile: string, name: string): boolean {
  return listAliases(profile).some((a) => a.name === name);
}

/** Alias command line for a given shell. */
export function aliasLine(shell: ShellName, name: string): string {
  return shell === 'powershell' ? `Set-Alias ${name} scaff` : `alias ${name}=scaff`;
}

export function addAlias(shell: ShellName, profile: string, name: string): boolean {
  const line = aliasLine(shell, name);
  const content = readProfile(profile);
  const next = upsertBlock(content, ALIAS_START, ALIAS_END, line);
  if (next === content) return false;
  writeProfile(profile, next);
  return true;
}

export function removeAlias(profile: string, name: string): boolean {
  const content = readProfile(profile);
  const s = content.indexOf(ALIAS_START);
  const e = content.indexOf(ALIAS_END);
  if (s === -1 || e === -1) return false;
  const lines = content.slice(s + ALIAS_START.length, e).split(/\r?\n/);
  const remaining = lines
    .filter((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return true;
      return parseAliasName(line) !== name;
    })
    .join('\n');
  const next = content.slice(0, s + ALIAS_START.length) + '\n' + remaining + '\n' + content.slice(e);
  if (next === content) return false;
  writeProfile(profile, next);
  return true;
}