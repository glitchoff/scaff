import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { getConfigDir } from '../../config.js';
import { version } from '../../cli/help.js';
import { commandExists } from '../launch/index.js';

const REGISTRY_URL = 'https://registry.npmjs.org/scaff-up/latest';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface Cache { lastCheck: number; latest: string; }

function cachePath(): string { return path.join(getConfigDir(), '.update-cache.json'); }

function readCache(): Cache | null {
  try { return JSON.parse(fs.readFileSync(cachePath(), 'utf8')) as Cache; } catch { return null; }
}
function writeCache(latest: string): void {
  try { fs.mkdirSync(path.dirname(cachePath()), { recursive: true }); fs.writeFileSync(cachePath(), JSON.stringify({ lastCheck: Date.now(), latest }), 'utf8'); } catch {}
}

async function fetchLatest(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(REGISTRY_URL, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json() as { version: string };
    return j.version ?? null;
  } catch { return null; }
}

function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) > (b[i] ?? 0) ) return true; else if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  return false;
}

/** Fire-and-forget check; prints notification if newer version available. */
export async function checkForUpdate(): Promise<void> {
  if (process.env['SCAFF_NO_UPDATE_CHECK']) return;
  const current = version();
  const cached = readCache();
  let latest: string | null = null;
  if (cached && Date.now() - cached.lastCheck < CHECK_INTERVAL_MS) {
    latest = cached.latest;
  } else {
    latest = await fetchLatest();
    if (latest) writeCache(latest);
  }
  if (latest && isNewer(latest, current)) {
    console.log(`\n  scaff update available ${current} → ${latest}\n  Run: scaff -update\n`);
  }
}

export async function runUpdate(checkOnly: boolean): Promise<number> {
  const current = version();
  const latest = await fetchLatest();
  if (!latest) { console.error('scaff: could not check for updates'); return 1; }
  if (!isNewer(latest, current)) { console.log(`scaff is up to date (${current})`); } else {
    console.log(`scaff update available ${current} → ${latest}`);
    if (checkOnly) return 0;
    const pm = commandExists('pnpm') ? 'pnpm' : commandExists('bun') ? 'bun' : 'npm';
    const cmdStr = pm === 'pnpm' ? 'pnpm add -g scaff-up@latest' : pm === 'bun' ? 'bun add -g scaff-up' : 'npm i -g scaff-up@latest';
    console.log(`→ ${cmdStr}`);
    try {
      execSync(cmdStr, { stdio: 'inherit', shell: true });
    } catch (e) {
      const s = (e as { status?: number }).status;
      console.error(`scaff: update failed${s ? ` (exit ${s})` : ''}`);
      return s ?? 1;
    }
    writeCache(latest); console.log(`✔ Updated to ${latest}.`);
  }
  // Always run migrate/setup after update (or if already up to date)
  try {
    const { loadConfig } = await import('../registry/store.js');
    const { getConfigPath } = await import('../../config.js');
    loadConfig(getConfigPath()); // triggers migration
    console.log('✔ Config migrated');
  } catch {}
  try {
    const { detectShell, profilePath, installSetup } = await import('../shells/index.js');
    const shell = detectShell(); const profile = profilePath(shell);
    installSetup(shell, profile);
    console.log(`✔ Shell integration installed for ${shell} (${profile}) - restart shell`);
  } catch (e) { console.error(`scaff: setup failed ${(e as Error).message}`); }
  return 0;
}
