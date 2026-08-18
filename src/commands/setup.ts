import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

type ShellName = 'powershell' | 'bash' | 'zsh';

const MARKER_START = '# >>> scaff shell integration >>>';
const MARKER_END = '# <<< scaff shell integration <<<';
// Legacy marker used by scaff <= 0.1.5 — a single comment line with no end
// marker. The whole block ran to the end of the profile, so we strip from
// this line to EOF when we encounter it.
const LEGACY_MARKER = '# scaff shell integration';

/**
 * Registers the `setup` command on the given Commander program.
 *
 * Command:
 *   scaff setup [--shell powershell|bash|zsh]
 *
 * Installs the shell wrapper (scaff.ps1 / scaff.sh) into the current shell's
 * profile so that `scaff <project>` cds into the resolved project instead of
 * just printing a path. Re-running setup upgrades an existing integration
 * (including the legacy <= 0.1.5 block) in place.
 */
export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Install shell integration so `scaff <project>` cds into the project')
    .option('--shell <shell>', 'Shell to configure: powershell, bash, or zsh')
    .option('--force', 'Reinstall the integration even if already up to date')
    .action((options: { shell?: string; force?: boolean }) => {
      runSetup(options.shell, options.force);
    });
}

function runSetup(shellOpt?: string, force?: boolean): void {
  const shell = (shellOpt as ShellName | undefined) ?? detectShell();
  const wrapper = wrapperPath(shell);
  const profile = profilePath(shell);

  if (!fs.existsSync(wrapper)) {
    console.error(`scaff: could not find shell wrapper at ${wrapper}`);
    process.exitCode = 1;
    return;
  }

  const sourceLine = shell === 'powershell' ? `. "${wrapper}"` : `source "${wrapper}"`;
  const block = `\n${MARKER_START}\n${sourceLine}\n${MARKER_END}\n`;

  try {
    let content = '';
    if (fs.existsSync(profile)) {
      content = fs.readFileSync(profile, 'utf8');
    }

    const hadNewBlock = content.includes(MARKER_START);
    const hadLegacyBlock = !hadNewBlock && content.includes(LEGACY_MARKER);

    // Always strip any pre-existing scaff integration so we can write a clean,
    // up-to-date block. This is what makes `scaff setup` idempotent and able
    // to upgrade older installs (including the fragile legacy wrapper that
    // cached the shim path once at profile-load time).
    let cleaned = stripBlock(content);
    const changed = cleaned !== content;

    if ((hadNewBlock || hadLegacyBlock) && !changed && !force) {
      console.log(`✔ Shell integration already installed in ${profile}`);
      return;
    }

    cleaned = cleaned.trimEnd() + block;

    fs.mkdirSync(path.dirname(profile), { recursive: true });
    fs.writeFileSync(profile, cleaned, 'utf8');

    if (hadLegacyBlock) {
      console.log(`✔ Upgraded legacy scaff shell integration in ${profile}.`);
    } else if (hadNewBlock) {
      console.log(`✔ Updated scaff shell integration in ${profile}.`);
    } else {
      console.log(`✔ Installed scaff shell integration for ${shell}.`);
    }
    console.log(`  Profile: ${profile}`);
    console.log('  Restart your shell, or reload your profile, then try `scaff <project>`.');
  } catch (err) {
    console.error(`scaff: failed to update profile — ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

/**
 * Remove any scaff integration block from the profile text.
 *
 * Handles two shapes:
 *   1. Current: a fenced block from MARKER_START to MARKER_END (may appear
 *      anywhere in the file; only the fenced region is removed).
 *   2. Legacy (<= 0.1.5): a single `# scaff shell integration` marker with no
 *      end marker, written by `appendFileSync` at the end of the profile.
 *      Everything from that line to the end of the file is removed.
 */
function stripBlock(content: string): string {
  // (1) Current fenced block — repeat in case of duplicates.
  const startIdx = content.indexOf(MARKER_START);
  if (startIdx !== -1) {
    const endIdx = content.indexOf(MARKER_END, startIdx);
    if (endIdx !== -1) {
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx + MARKER_END.length);
      return stripBlock((before + after));
    }
  }

  // (2) Legacy single-marker block — from the marker to EOF.
  const legacyIdx = content.indexOf(LEGACY_MARKER);
  if (legacyIdx !== -1) {
    return content.slice(0, legacyIdx);
  }

  return content;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectShell(): ShellName {
  const shell = process.env['SHELL'] ?? '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (process.platform === 'win32') return 'powershell';
  return 'bash';
}

/** Absolute path to the shipped wrapper for the given shell. */
function wrapperPath(shell: ShellName): string {
  const pkgRoot = path.resolve(__dirname, '..');
  return path.join(pkgRoot, 'shell', shell === 'powershell' ? 'scaff.ps1' : 'scaff.sh');
}

/** Absolute path to the profile file for the given shell. */
function profilePath(shell: ShellName): string {
  if (shell === 'bash') return path.join(os.homedir(), '.bashrc');
  if (shell === 'zsh') return path.join(os.homedir(), '.zshrc');
  return powershellProfile();
}

/**
 * Ask PowerShell for its actual $PROFILE path (handles pwsh vs Windows
 * PowerShell 5.1 and OneDrive-redirected Documents folders).
 */
function powershellProfile(): string {
  for (const sh of ['pwsh', 'powershell']) {
    try {
      const r = spawnSync(sh, ['-NoProfile', '-Command', '$PROFILE'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (r.status === 0 && r.stdout.trim()) {
        return r.stdout.trim();
      }
    } catch {
      // try the next candidate
    }
  }

  const home = process.env['USERPROFILE'] ?? os.homedir();
  return path.join(home, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
}