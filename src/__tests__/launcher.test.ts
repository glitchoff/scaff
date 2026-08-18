import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// We need to mock child_process BEFORE importing the launcher module so that
// the spawnSync used by commandExists is intercepted.
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({ unref: vi.fn() }),
  spawnSync: vi.fn(),
}));

import { spawn, spawnSync } from 'node:child_process';
import {
  commandExists,
  openInExplorer,
  openInTerminal,
  openInVSCode,
  openProject,
} from '../launcher/index.js';

const mockSpawn = vi.mocked(spawn);
const mockSpawnSync = vi.mocked(spawnSync);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: every command "exists"
  mockSpawnSync.mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);
});

// ---------------------------------------------------------------------------
// commandExists
// ---------------------------------------------------------------------------

describe('commandExists', () => {
  it('returns true when the checker exits with status 0', () => {
    mockSpawnSync.mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>);
    expect(commandExists('code')).toBe(true);
  });

  it('returns false when the checker exits with status 1', () => {
    mockSpawnSync.mockReturnValueOnce({ status: 1 } as ReturnType<typeof spawnSync>);
    expect(commandExists('nonexistent-command')).toBe(false);
  });

  it('returns false when spawnSync throws', () => {
    mockSpawnSync.mockImplementationOnce(() => { throw new Error('not found'); });
    expect(commandExists('bad')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// openInVSCode
// ---------------------------------------------------------------------------

describe('openInVSCode', () => {
  it('spawns `code` with the project path', () => {
    openInVSCode('/projects/my-app');
    expect(mockSpawn).toHaveBeenCalledWith('code', ['/projects/my-app'], expect.objectContaining({ detached: true }));
  });
});

// ---------------------------------------------------------------------------
// openInExplorer
// ---------------------------------------------------------------------------

describe('openInExplorer', () => {
  it('spawns explorer on windows', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    openInExplorer('/projects/my-app');
    expect(mockSpawn).toHaveBeenCalledWith('explorer', ['/projects/my-app'], expect.anything());
    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  });

  it('spawns `open` on macOS', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    openInExplorer('/projects/my-app');
    expect(mockSpawn).toHaveBeenCalledWith('open', ['/projects/my-app'], expect.anything());
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  });

  it('spawns `xdg-open` on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    openInExplorer('/projects/my-app');
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/projects/my-app'], expect.anything());
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  });
});

// ---------------------------------------------------------------------------
// openProject dispatcher
// ---------------------------------------------------------------------------

describe('openProject', () => {
  it('spawns `code` when target is vscode and code exists', () => {
    mockSpawnSync.mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);
    openProject('/projects/my-app', 'vscode');
    expect(mockSpawn).toHaveBeenCalledWith('code', ['/projects/my-app'], expect.anything());
  });

  it('falls back to explorer when target is vscode but code is missing', () => {
    // commandExists('code') → false
    mockSpawnSync.mockReturnValueOnce({ status: 1 } as ReturnType<typeof spawnSync>);
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    openProject('/projects/my-app', 'vscode');
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/projects/my-app'], expect.anything());
  });

  it('delegates to openInExplorer when target is explorer', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    openProject('/projects/my-app', 'explorer');
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/projects/my-app'], expect.anything());
  });
});

// ---------------------------------------------------------------------------
// openInTerminal
// ---------------------------------------------------------------------------

describe('openInTerminal', () => {
  it('spawns wt on windows when available', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    // First commandExists call for 'wt' → true
    mockSpawnSync.mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>);
    openInTerminal('D:\\Projects\\my-app');
    expect(mockSpawn).toHaveBeenCalledWith('wt', ['-d', 'D:\\Projects\\my-app'], expect.anything());
  });

  it('falls back to cmd on windows when wt is unavailable', () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    // commandExists('wt') → false
    mockSpawnSync.mockReturnValueOnce({ status: 1 } as ReturnType<typeof spawnSync>);
    openInTerminal('D:\\Projects\\my-app');
    expect(mockSpawn).toHaveBeenCalledWith('cmd', expect.arrayContaining(['/k']), expect.anything());
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  });
});
