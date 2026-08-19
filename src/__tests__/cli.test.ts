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
  it('registers, lists, and clears a primary zone', () => {
    const d1 = mkDir('pers');
    mkDir('pers', 'app');
    expect(scaff(['-zone', 'add', 'hot', d1, '--primary']).status).toBe(0);
    expect(scaff(['-zone', 'ls']).stdout).toContain('(primary)');
    expect(scaff(['-zone', 'primary', '--clear']).status).toBe(0);
    expect(scaff(['-zone', 'ls']).stdout).not.toContain('(primary)');
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

describe('scaff -path', () => {
  it('resolves a bare name via the primary zone', () => {
    mkDir('pers', 'app');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers'), '--primary']);
    const r = scaff(['-path', 'app']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'pers', 'app'));
  });

  it('resolves an explicit zone:name', () => {
    mkDir('work', 'site');
    scaff(['-zone', 'add', 'work', path.join(tmpDir, 'work')]);
    const r = scaff(['-path', 'work:site']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'work', 'site'));
  });

  it('reports not-found for a bare name outside the primary zone', () => {
    mkDir('work', 'only');
    scaff(['-zone', 'add', 'work', path.join(tmpDir, 'work')]);
    const r = scaff(['-path', 'only']);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/not found/i);
  });

  it('reports no primary zone when none is set', () => {
    mkDir('pers', 'app');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers')]);
    const r = scaff(['-path', 'app']);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/primary zone/i);
  });

  it('auto-selects first with --first on ambiguity', () => {
    mkDir('pers', 'dup');
    mkDir('pers2', 'dup');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers'), path.join(tmpDir, 'pers2'), '--primary']);
    const r = scaff(['-path', 'dup', '--first']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'pers', 'dup'));
  });
});

describe('scaff -list', () => {
  it('lists projects and supports json', () => {
    mkDir('pers', 'app');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers'), '--primary']);
    const r = scaff(['-list', '--json']);
    const parsed = JSON.parse(r.stdout) as Array<{ name: string }>;
    expect(parsed.map((p) => p.name)).toContain('app');
  });
});

describe('scaff -find', () => {
  it('fuzzy matches a query', () => {
    mkDir('pers', 'react-app');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers'), '--primary']);
    const r = scaff(['-find', 'react', '--first']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toContain('react-app');
  });
});

describe('scaff command dispatch', () => {
  it('treats a bare token as a project, not a command', () => {
    mkDir('pers', 'setup');
    scaff(['-zone', 'add', 'hot', path.join(tmpDir, 'pers'), '--primary']);
    const r = scaff(['setup']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(path.join(tmpDir, 'pers', 'setup'));
  });

  it('shows help for -h and errors for unknown commands', () => {
    expect(scaff(['-h']).stdout).toMatch(/USAGE/);
    const r = scaff(['-nope']);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/unknown command/i);
  });
});