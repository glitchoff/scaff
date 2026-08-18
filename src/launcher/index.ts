import { spawn, spawnSync } from 'node:child_process';

export type LaunchTarget = 'vscode' | 'terminal' | 'explorer';

// ---------------------------------------------------------------------------
// Individual launchers
// ---------------------------------------------------------------------------

/** Open a directory in VS Code via the `code` CLI. */
export function openInVSCode(projectPath: string): void {
  spawnDetached('code', [projectPath]);
}

/** Open a directory in the platform's default file manager. */
export function openInExplorer(projectPath: string): void {
  const platform = process.platform;

  if (platform === 'win32') {
    spawnDetached('explorer', [projectPath]);
  } else if (platform === 'darwin') {
    spawnDetached('open', [projectPath]);
  } else {
    spawnDetached('xdg-open', [projectPath]);
  }
}

/** Open a new terminal window/tab rooted at the given directory. */
export function openInTerminal(projectPath: string): void {
  const platform = process.platform;

  if (platform === 'win32') {
    // Prefer Windows Terminal; fall back gracefully if not installed
    if (commandExists('wt')) {
      spawnDetached('wt', ['-d', projectPath]);
    } else {
      spawnDetached('cmd', ['/k', `cd /d "${projectPath}"`]);
    }
  } else if (platform === 'darwin') {
    spawnDetached('osascript', [
      '-e',
      `tell application "Terminal" to do script "cd '${projectPath}'"`,
    ]);
  } else {
    // Linux — try common terminal emulators in preference order
    const terminals: Array<[string, string[]]> = [
      ['gnome-terminal', ['--working-directory', projectPath]],
      ['konsole', ['--workdir', projectPath]],
      ['xterm', ['-e', `cd "${projectPath}" && bash`]],
    ];

    for (const [term, args] of terminals) {
      if (commandExists(term)) {
        spawnDetached(term, args);
        return;
      }
    }

    console.error(
      'scaff: could not find a terminal emulator (tried gnome-terminal, konsole, xterm).',
    );
  }
}

// ---------------------------------------------------------------------------
// Public dispatcher
// ---------------------------------------------------------------------------

/**
 * Open a resolved project path with the requested launch target.
 *
 * Default: 'vscode'. Falls back to explorer if `code` is not in PATH.
 */
export function openProject(projectPath: string, target: LaunchTarget = 'vscode'): void {
  switch (target) {
    case 'vscode':
      if (commandExists('code')) {
        openInVSCode(projectPath);
      } else {
        console.warn(
          'scaff: `code` command not found — opening in file manager instead.',
        );
        openInExplorer(projectPath);
      }
      break;
    case 'terminal':
      openInTerminal(projectPath);
      break;
    case 'explorer':
      openInExplorer(projectPath);
      break;
  }
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/** Spawn a detached child process, fully detached from the parent's stdio. */
function spawnDetached(command: string, args: string[]): void {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });
  child.unref();
}

/**
 * Synchronously check whether a command exists in PATH.
 * Uses `where` on Windows, `which` on Unix-like systems.
 *
 * Exported so tests can verify the path-dispatching logic by stubbing this.
 */
export function commandExists(cmd: string): boolean {
  try {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [cmd], { encoding: 'utf8' });
    return result.status === 0;
  } catch {
    return false;
  }
}
