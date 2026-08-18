import { Command } from 'commander';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

type ShellName = 'powershell' | 'bash' | 'zsh';

const MARKER = '# scaff shell integration';

/**
 * Registers the `setup` command on the given Commander program.
 *
 * Command:
 *   scaff setup [--shell powershell|bash|zsh]
 *
 * Installs the shell wrapper (scaff.ps1 / scaff.sh) into the current shell's
 * profile so that `scaff <project>` cds into the resolved project instead of
 * just printing a path.
 */
export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Install shell integration so `scaff <project>` cds into the project')
    .option('--shell <shell>', 'Shell to configure: powershell, bash, or zsh')
    .action((options: { shell?: string }) => {
      runSetup(options.shell);
    });
}

function runSetup(shellOpt?: string): void {
  const shell = (shellOpt as ShellName | undefined) ?? detectShell();
  const wrapper = wrapperPath(shell);
  const profile = profilePath(shell);

  if (!fs.existsSync(wrapper)) {
    console.error(`scaff: could not find shell wrapper at ${wrapper}`);
    process.exitCode = 1;
    return;
  }

  const sourceLine = shell === 'powershell' ? `. "${wrapper}"` : `source "${wrapper}"`;
  const block = `\n${MARKER}\n${sourceLine}\n`;

  try {
    let content = '';
    if (fs.existsSync(profile)) {
      content = fs.readFileSync(profile, 'utf8');
    }

    if (content.includes(MARKER)) {
      console.log(`✔ Shell integration already installed in ${profile}`);
      return;
    }

    fs.mkdirSync(path.dirname(profile), { recursive: true });
    fs.appendFileSync(profile, block, 'utf8');

    console.log(`✔ Installed scaff shell integration for ${shell}.`);
    console.log(`  Profile: ${profile}`);
    console.log('  Restart your shell, or reload your profile, then try `scaff <project>`.');
  } catch (err) {
    console.error(`scaff: failed to update profile — ${(err as Error).message}`);
    process.exitCode = 1;
  }
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
      const r = spawnSync(sh, ['-NoProfile', '-Command', '$PROFILE'], { encoding: 'utf8' });
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