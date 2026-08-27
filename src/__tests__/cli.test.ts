import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const TSX_BIN = path.resolve('node_modules', 'tsx', 'dist', 'cli.mjs');
const MAIN = path.resolve('src', 'cli', 'main.ts');

let tmpDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaff-cli-'));
  env = { ...process.env, SCAFF_CONFIG_DIR: tmpDir };
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function scaff(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(process.execPath, [TSX_BIN, MAIN, ...args], {
    encoding: 'utf8',
    env,
    cwd: path.resolve('.'),
  });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status };
}

function mkDir(...parts: string[]): string {
  const p = path.join(tmpDir, ...parts);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

describe('scaff -zone', () => {
  it('registers, lists, and clears hot zone', () => {
    const d1 = mkDir('pers');
    expect(scaff(['-zone', 'add', 'hot', d1]).status).toBe(0);
    scaff(['-zone', 'hot', 'hot']);
    expect(scaff(['-zone', 'ls']).stdout).toContain('hot [hot]');
    expect(scaff(['-zone', 'hot', '--clear']).status).toBe(0);
    expect(scaff(['-zone', 'ls']).stdout).not.toContain('hot [hot]');
  });

  it('rejects a zone name that starts with -', () => {
    const d1 = mkDir('pers');
    const r = scaff(['-zone', 'add', '-bad', d1]);
    expect(r.status).not.toBe(0);
  });

  it('errors when removing an unknown zone', () => {
    const r = scaff(['-zone', 'rm', 'nope']);
    expect(r.status).not.toBe(0);
  });
});

describe('scaff bare open', () => {
  it('resolves a bare name via hot zone', () => {
    mkDir('pers', 'app');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers')]);
    scaff(['-zone', 'hot', 'hot']);
    const r = scaff(['app']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'pers', 'app'));
  });

  it('resolves an explicit zone:name', () => {
    mkDir('work', 'site');
    scaff(['-zone', 'add', 'work', path.join(tmpDir, 'work')]);
    const r = scaff(['work:site']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'work', 'site'));
  });

  it('resolves :name shorthand via hot', () => {
    mkDir('pers', 'myapp');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers')]);
    scaff(['-zone', 'hot', 'hot']);
    const r = scaff([':myapp']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'pers', 'myapp'));
  });
});

describe('scaff command dispatch', () => {
  it('shows help for -h and errors for unknown commands', () => {
    expect(scaff(['-h']).stdout).toMatch(/USAGE/);
    const r = scaff(['-nope']);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/unknown command/i);
  });
});

